// Authentication Manager
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.init();
    }

    async init() {
        // Check for stored session
        const savedSession = localStorage.getItem('expensepro_session');
        if (savedSession) {
            try {
                const session = JSON.parse(savedSession);
                if (session.user && session.expires > Date.now()) {
                    this.currentUser = session.user;
                    this.isAuthenticated = true;
                    
                    // Update UI
                    this.updateUI();
                    
                    // Show dashboard
                    document.getElementById('login-screen').style.display = 'none';
                    document.getElementById('app-container').style.display = 'grid';
                    
                    // Load initial data
                    this.loadInitialData();
                } else {
                    // Session expired
                    localStorage.removeItem('expensepro_session');
                }
            } catch (error) {
                console.error('Session restore error:', error);
                localStorage.removeItem('expensepro_session');
            }
        }
        
        // Set up login form
        this.setupLoginForm();
    }

    setupLoginForm() {
        const loginForm = document.getElementById('login-form');
        const togglePassword = document.getElementById('toggle-password');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.login();
            });
        }
        
        if (togglePassword) {
            togglePassword.addEventListener('click', () => {
                const passwordInput = document.getElementById('password');
                const icon = togglePassword.querySelector('i');
                
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                } else {
                    passwordInput.type = 'password';
                    icon.className = 'fas fa-eye';
                }
            });
        }
        
        // Auto-focus username field
        const usernameInput = document.getElementById('username');
        if (usernameInput && !this.isAuthenticated) {
            setTimeout(() => usernameInput.focus(), 100);
        }
    }

    async login() {
        const username = document.getElementById('username')?.value.trim();
        const password = document.getElementById('password')?.value;
        const rememberMe = document.getElementById('remember-me')?.checked;
        const errorDiv = document.getElementById('login-error');
        
        // Clear previous error
        if (errorDiv) {
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
        }
        
        // Validate inputs
        if (!username || !password) {
            this.showError('Please enter both username and password');
            return;
        }
        
        // Show loading
        this.showLoading(true);
        
        try {
            // Authenticate with database
            const result = await db.authenticate(username, password);
            
            if (result.success) {
                // Save session
                this.currentUser = result.user;
                this.isAuthenticated = true;
                
                const session = {
                    user: result.user,
                    expires: Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000) // 30 days or 1 day
                };
                
                localStorage.setItem('expensepro_session', JSON.stringify(session));
                
                // Update UI
                this.updateUI();
                
                // Show dashboard
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('app-container').style.display = 'grid';
                
                // Load initial data
                this.loadInitialData();
                
                // Show welcome notification
                Utils.showNotification(`Welcome back, ${result.user.fullName}!`, 'success');
            } else {
                this.showError(result.error || 'Invalid credentials');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Login failed. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    async logout() {
        try {
            // Log activity
            if (this.currentUser) {
                await db.logActivity(this.currentUser.username, 'logout', 'User logged out');
            }
            
            // Clear session
            this.currentUser = null;
            this.isAuthenticated = false;
            localStorage.removeItem('expensepro_session');
            
            // Reset UI
            document.getElementById('app-container').style.display = 'none';
            document.getElementById('login-screen').style.display = 'flex';
            
            // Clear form
            const loginForm = document.getElementById('login-form');
            if (loginForm) loginForm.reset();
            
            // Clear error
            const errorDiv = document.getElementById('login-error');
            if (errorDiv) {
                errorDiv.style.display = 'none';
                errorDiv.textContent = '';
            }
            
            // Show logout notification
            Utils.showNotification('Successfully logged out', 'info');
            
            // Focus username field
            const usernameInput = document.getElementById('username');
            if (usernameInput) usernameInput.focus();
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    updateUI() {
        if (!this.currentUser) return;
        
        // Update header
        const headerUsername = document.getElementById('header-username');
        const userAvatar = document.getElementById('header-avatar');
        const userAvatarImg = document.getElementById('header-avatar-img');
        const userAvatarText = document.getElementById('header-avatar-text');
        
        if (headerUsername) {
            headerUsername.textContent = this.currentUser.fullName;
        }
        
        if (userAvatar) {
            if (this.currentUser.profilePhoto) {
                userAvatarImg.src = this.currentUser.profilePhoto;
                userAvatarImg.style.display = 'block';
                userAvatarText.style.display = 'none';
            } else {
                userAvatarImg.style.display = 'none';
                userAvatarText.style.display = 'flex';
                userAvatarText.textContent = this.currentUser.fullName.charAt(0).toUpperCase();
            }
        }
        
        // Show/hide admin elements
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(el => {
            el.style.display = this.currentUser.role === 'Admin' ? 'block' : 'none';
        });
        
        // Set page title based on role
        const pageTitle = document.getElementById('page-title');
        const pageSubtitle = document.getElementById('page-subtitle');
        
        if (pageTitle && pageSubtitle) {
            pageTitle.textContent = 'Dashboard';
            pageSubtitle.textContent = `Welcome back, ${this.currentUser.fullName}!`;
        }
    }

    async loadInitialData() {
        try {
            // Load notifications
            this.loadNotifications();
            
            // Load initial dashboard data
            if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            }
            
            // Load user preferences
            this.loadUserPreferences();
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    async loadNotifications() {
        try {
            // Get pending transactions for admin
            let pendingCount = 0;
            
            if (this.currentUser.role === 'Admin') {
                const pendingTransactions = await db.getTransactions({ status: 'Pending' });
                pendingCount = pendingTransactions.length;
            } else {
                // For regular users, count their pending transactions
                const userTransactions = await db.getTransactions({ 
                    userId: this.currentUser.username,
                    status: 'Pending' 
                });
                pendingCount = userTransactions.length;
            }
            
            // Update notification badge
            const notificationBadge = document.getElementById('notification-count');
            if (notificationBadge) {
                notificationBadge.textContent = pendingCount;
                notificationBadge.style.display = pendingCount > 0 ? 'flex' : 'none';
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    async loadUserPreferences() {
        try {
            // Load user preferences from localStorage
            const prefs = localStorage.getItem(`user_prefs_${this.currentUser.username}`);
            if (prefs) {
                const preferences = JSON.parse(prefs);
                
                // Apply preferences
                if (preferences.theme === 'dark') {
                    document.body.classList.add('dark-mode');
                }
                
                if (preferences.defaultPage) {
                    // Navigate to default page
                    const navItem = document.querySelector(`[data-page="${preferences.defaultPage}"]`);
                    if (navItem) {
                        navItem.click();
                    }
                }
            }
        } catch (error) {
            console.error('Error loading user preferences:', error);
        }
    }

    saveUserPreferences(preferences) {
        if (!this.currentUser) return;
        
        try {
            const existing = localStorage.getItem(`user_prefs_${this.currentUser.username}`);
            const currentPrefs = existing ? JSON.parse(existing) : {};
            
            const newPrefs = { ...currentPrefs, ...preferences };
            localStorage.setItem(`user_prefs_${this.currentUser.username}`, JSON.stringify(newPrefs));
        } catch (error) {
            console.error('Error saving user preferences:', error);
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('login-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            
            // Add animation
            errorDiv.style.animation = 'none';
            setTimeout(() => {
                errorDiv.style.animation = 'slideIn 0.3s ease';
            }, 10);
        }
    }

    showLoading(show) {
        const loginBtn = document.querySelector('.btn-login');
        if (loginBtn) {
            if (show) {
                loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
                loginBtn.disabled = true;
            } else {
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
                loginBtn.disabled = false;
            }
        }
    }

    async changePassword(currentPassword, newPassword) {
        if (!this.currentUser) return false;
        
        try {
            // Verify current password
            const result = await db.authenticate(this.currentUser.username, currentPassword);
            if (!result.success) {
                return { success: false, error: 'Current password is incorrect' };
            }
            
            // Update password
            const updateResult = await db.updateUser(this.currentUser.username, {
                password: newPassword
            });
            
            if (updateResult.success) {
                // Log activity
                await db.logActivity(this.currentUser.username, 'password_change', 'Changed password');
                return { success: true };
            } else {
                return { success: false, error: updateResult.error };
            }
        } catch (error) {
            console.error('Change password error:', error);
            return { success: false, error: 'Failed to change password' };
        }
    }

    async updateProfile(profileData) {
        if (!this.currentUser) return false;
        
        try {
            const updateResult = await db.updateUser(this.currentUser.username, profileData);
            
            if (updateResult.success) {
                // Update current user data
                this.currentUser = { ...this.currentUser, ...profileData };
                
                // Update session
                const savedSession = localStorage.getItem('expensepro_session');
                if (savedSession) {
                    const session = JSON.parse(savedSession);
                    session.user = this.currentUser;
                    localStorage.setItem('expensepro_session', JSON.stringify(session));
                }
                
                // Update UI
                this.updateUI();
                
                return { success: true };
            } else {
                return { success: false, error: updateResult.error };
            }
        } catch (error) {
            console.error('Update profile error:', error);
            return { success: false, error: 'Failed to update profile' };
        }
    }

    async uploadProfilePhoto(file) {
        if (!this.currentUser) return null;
        
        try {
            // Convert file to base64
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            
            // Save to database
            const fileData = {
                filename: file.name,
                type: file.type,
                size: file.size,
                data: base64,
                userId: this.currentUser.username
            };
            
            const fileResult = await db.saveFile(fileData);
            
            if (fileResult.success) {
                // Update user profile
                const updateResult = await this.updateProfile({
                    profilePhoto: base64
                });
                
                if (updateResult.success) {
                    return base64;
                }
            }
            
            return null;
        } catch (error) {
            console.error('Upload profile photo error:', error);
            return null;
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    hasPermission(requiredRole) {
        if (!this.currentUser) return false;
        
        const roleHierarchy = {
            'User': 1,
            'Manager': 2,
            'Admin': 3
        };
        
        const userLevel = roleHierarchy[this.currentUser.role] || 0;
        const requiredLevel = roleHierarchy[requiredRole] || 0;
        
        return userLevel >= requiredLevel;
    }

    isAdmin() {
        return this.currentUser?.role === 'Admin';
    }
}

// Create global auth instance
const auth = new AuthManager();

// Export for use in other modules
export default auth;

// Global logout function
window.logout = () => {
    Utils.confirm('Are you sure you want to logout?', 'Logout').then(confirmed => {
        if (confirmed) {
            auth.logout();
        }
    });
};