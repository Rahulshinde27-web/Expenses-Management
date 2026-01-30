// ExpensePro ERP Application
class ExpenseProApp {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.db = null;
        this.init();
    }

    async init() {
        console.log('Initializing ExpensePro App...');
        
        // Show loading screen
        this.updateLoadingMessage('Initializing application...');
        
        try {
            // Initialize database
            await this.initDatabase();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Check for saved session
            await this.checkSavedSession();
            
            // Hide loading screen
            setTimeout(() => {
                document.getElementById('loading-screen').style.display = 'none';
                console.log('App initialized successfully');
            }, 500);
            
        } catch (error) {
            console.error('App initialization error:', error);
            this.updateLoadingMessage('Error initializing. Please refresh the page.');
            this.showError('Initialization failed: ' + error.message);
        }
    }

    updateLoadingMessage(message) {
        const messageEl = document.getElementById('loading-message');
        if (messageEl) {
            messageEl.textContent = message;
        }
    }

    async initDatabase() {
        console.log('Initializing database...');
        this.updateLoadingMessage('Setting up database...');
        
        return new Promise((resolve, reject) => {
            try {
                const request = indexedDB.open('ExpenseProDB', 1);
                
                request.onerror = (event) => {
                    console.error('Database error:', event.target.error);
                    reject(new Error('Failed to open database'));
                };
                
                request.onsuccess = (event) => {
                    this.db = event.target.result;
                    console.log('Database initialized successfully');
                    resolve();
                };
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    
                    // Create users store
                    if (!db.objectStoreNames.contains('users')) {
                        const usersStore = db.createObjectStore('users', { keyPath: 'username' });
                        usersStore.createIndex('role', 'role', { unique: false });
                        
                        // Add default users
                        const transaction = event.target.transaction;
                        const store = transaction.objectStore('users');
                        
                        store.add({
                            username: 'admin',
                            password: 'admin123',
                            role: 'Admin',
                            fullName: 'System Administrator',
                            email: 'admin@expensepro.com',
                            department: 'Administration',
                            createdAt: new Date().toISOString()
                        });
                        
                        store.add({
                            username: 'user',
                            password: 'user123',
                            role: 'User',
                            fullName: 'Regular User',
                            email: 'user@expensepro.com',
                            department: 'Operations',
                            createdAt: new Date().toISOString()
                        });
                    }
                    
                    // Create transactions store
                    if (!db.objectStoreNames.contains('transactions')) {
                        const transactionsStore = db.createObjectStore('transactions', { keyPath: 'id' });
                        transactionsStore.createIndex('userId', 'userId', { unique: false });
                        transactionsStore.createIndex('status', 'status', { unique: false });
                        transactionsStore.createIndex('date', 'date', { unique: false });
                    }
                    
                    // Create settings store
                    if (!db.objectStoreNames.contains('settings')) {
                        const settingsStore = db.createObjectStore('settings', { keyPath: 'key' });
                        
                        const transaction = event.target.transaction;
                        const store = transaction.objectStore('settings');
                        
                        // Default settings
                        store.add({
                            key: 'expenseCodes',
                            value: ['Travel', 'Food', 'Accommodation', 'Transport', 'Office Supplies']
                        });
                        
                        store.add({
                            key: 'costCenters',
                            value: ['Head Office', 'Branch Office', 'Sales', 'Marketing', 'IT']
                        });
                        
                        store.add({
                            key: 'tallyLedgers',
                            value: ['Cash', 'Bank', 'Petty Cash', 'Credit Card']
                        });
                        
                        store.add({
                            key: 'approvers',
                            value: ['Admin', 'Finance Manager']
                        });
                    }
                };
                
            } catch (error) {
                console.error('Database initialization error:', error);
                reject(error);
            }
        });
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.login();
            });
        }
        
        // Toggle password visibility
        const togglePassword = document.getElementById('toggle-password');
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
        
        // Menu toggle for mobile
        const menuToggle = document.getElementById('menu-toggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                document.getElementById('sidebar').classList.toggle('open');
            });
        }
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                const sidebar = document.getElementById('sidebar');
                const menuToggle = document.getElementById('menu-toggle');
                
                if (sidebar && sidebar.classList.contains('open') &&
                    !sidebar.contains(e.target) &&
                    !menuToggle.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            }
        });
    }

    async checkSavedSession() {
        console.log('Checking saved session...');
        
        try {
            const savedSession = localStorage.getItem('expensepro_session');
            if (savedSession) {
                const session = JSON.parse(savedSession);
                
                // Check if session is still valid (less than 24 hours old)
                if (session.expires > Date.now()) {
                    // Verify user still exists in database
                    const user = await this.getUser(session.username);
                    if (user) {
                        this.currentUser = user;
                        this.isAuthenticated = true;
                        this.showApp();
                        return;
                    }
                } else {
                    // Session expired
                    localStorage.removeItem('expensepro_session');
                }
            }
            
            // No valid session found, show login
            this.showLogin();
            
        } catch (error) {
            console.error('Error checking session:', error);
            this.showLogin();
        }
    }

    async login() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('login-error');
        
        // Clear previous error
        if (errorDiv) {
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
        }
        
        // Validate inputs
        if (!username || !password) {
            this.showError('Please enter both username and password', 'login-error');
            return;
        }
        
        try {
            // Get user from database
            const user = await this.getUser(username);
            
            if (!user) {
                this.showError('User not found', 'login-error');
                return;
            }
            
            if (user.password !== password) {
                this.showError('Invalid password', 'login-error');
                return;
            }
            
            // Login successful
            this.currentUser = {
                username: user.username,
                fullName: user.fullName,
                role: user.role,
                email: user.email,
                department: user.department
            };
            
            this.isAuthenticated = true;
            
            // Save session
            const session = {
                username: user.username,
                expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
            };
            localStorage.setItem('expensepro_session', JSON.stringify(session));
            
            // Update last login
            await this.updateUser(user.username, { lastLogin: new Date().toISOString() });
            
            // Show app
            this.showApp();
            
            // Show success message
            this.showAlert(`Welcome back, ${user.fullName}!`, 'success');
            
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Login failed. Please try again.', 'login-error');
        }
    }

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            this.currentUser = null;
            this.isAuthenticated = false;
            localStorage.removeItem('expensepro_session');
            this.showLogin();
            this.showAlert('Successfully logged out', 'info');
        }
    }

    showLogin() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app-screen').style.display = 'none';
        
        // Clear login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.reset();
        
        // Clear error
        const errorDiv = document.getElementById('login-error');
        if (errorDiv) {
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
        }
    }

    showApp() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'block';
        
        // Update UI
        this.updateUI();
        
        // Show dashboard
        this.showPage('dashboard');
    }

    updateUI() {
        if (!this.currentUser) return;
        
        // Update user info
        document.getElementById('user-name').textContent = this.currentUser.fullName;
        document.getElementById('user-avatar-text').textContent = this.currentUser.fullName.charAt(0).toUpperCase();
        
        // Show/hide admin elements
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(el => {
            el.style.display = this.currentUser.role === 'Admin' ? 'block' : 'none';
        });
    }

    async showPage(page) {
        console.log('Showing page:', page);
        
        // Update active navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeItem = document.querySelector(`[data-page="${page}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
        
        // Update page title
        document.getElementById('page-title').textContent = this.getPageTitle(page);
        document.getElementById('page-subtitle').textContent = this.getPageSubtitle(page);
        
        // Load page content
        await this.loadPageContent(page);
        
        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.remove('open');
        }
    }

    getPageTitle(page) {
        const titles = {
            'dashboard': 'Dashboard',
            'transactions': 'Transactions',
            'add-transaction': 'Add Transaction',
            'reports': 'Reports',
            'admin': 'Admin Panel',
            'profile': 'My Profile',
            'settings': 'Settings'
        };
        
        return titles[page] || 'ExpensePro';
    }

    getPageSubtitle(page) {
        const subtitles = {
            'dashboard': 'Welcome back!',
            'transactions': 'Manage your transactions',
            'add-transaction': 'Record a new transaction',
            'reports': 'View and export reports',
            'admin': 'System administration',
            'profile': 'Manage your profile',
            'settings': 'Application settings'
        };
        
        return subtitles[page] || '';
    }

    async loadPageContent(page) {
        const contentEl = document.getElementById('page-content');
        if (!contentEl) return;
        
        // Show loading
        contentEl.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div class="spinner" style="margin: 0 auto 20px;"></div>
                <p>Loading...</p>
            </div>
        `;
        
        try {
            let html = '';
            
            switch (page) {
                case 'dashboard':
                    html = await this.loadDashboard();
                    break;
                    
                case 'transactions':
                    html = await this.loadTransactions();
                    break;
                    
                case 'add-transaction':
                    html = await this.loadAddTransaction();
                    break;
                    
                case 'reports':
                    html = await this.loadReports();
                    break;
                    
                case 'admin':
                    if (this.currentUser.role === 'Admin') {
                        html = await this.loadAdmin();
                    } else {
                        html = this.getAccessDeniedHTML();
                    }
                    break;
                    
                default:
                    html = '<p>Page not implemented yet</p>';
            }
            
            contentEl.innerHTML = html;
            
            // Initialize page-specific functionality
            this.initializePage(page);
            
        } catch (error) {
            console.error('Error loading page:', error);
            contentEl.innerHTML = `
                <div class="alert error">
                    <p>Error loading page: ${error.message}</p>
                </div>
            `;
        }
    }

    async loadDashboard() {
        try {
            // Get user's transactions
            const transactions = await this.getTransactions({ 
                userId: this.currentUser.username 
            });
            
            // Calculate stats
            const stats = this.calculateStats(transactions);
            
            return `
                <div class="dashboard">
                    <!-- Stats Grid -->
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-header">
                                <div class="stat-icon income">
                                    <i class="fas fa-arrow-up"></i>
                                </div>
                            </div>
                            <div class="stat-value">₹${stats.totalIncome.toLocaleString()}</div>
                            <div class="stat-label">Total Income</div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-header">
                                <div class="stat-icon expense">
                                    <i class="fas fa-arrow-down"></i>
                                </div>
                            </div>
                            <div class="stat-value">₹${stats.totalExpense.toLocaleString()}</div>
                            <div class="stat-label">Total Expenses</div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-header">
                                <div class="stat-icon pending">
                                    <i class="fas fa-clock"></i>
                                </div>
                            </div>
                            <div class="stat-value">${stats.pendingCount}</div>
                            <div class="stat-label">Pending Approvals</div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-header">
                                <div class="stat-icon balance">
                                    <i class="fas fa-wallet"></i>
                                </div>
                            </div>
                            <div class="stat-value">₹${stats.netBalance.toLocaleString()}</div>
                            <div class="stat-label">Net Balance</div>
                        </div>
                    </div>
                    
                    <!-- Quick Actions -->
                    <div style="margin: 30px 0; display: flex; gap: 12px; flex-wrap: wrap;">
                        <button class="btn btn-primary" onclick="app.showPage('add-transaction')">
                            <i class="fas fa-plus"></i> Add Transaction
                        </button>
                        <button class="btn btn-success" onclick="app.showPage('reports')">
                            <i class="fas fa-chart-bar"></i> View Reports
                        </button>
                        ${this.currentUser.role === 'Admin' ? `
                            <button class="btn btn-warning" onclick="app.showPage('admin')">
                                <i class="fas fa-user-shield"></i> Admin Panel
                            </button>
                        ` : ''}
                    </div>
                    
                    <!-- Recent Transactions -->
                    <div style="background: white; border-radius: var(--border-radius); padding: 24px; margin-top: 20px;">
                        <h3 style="margin-bottom: 20px;">Recent Transactions</h3>
                        ${transactions.length > 0 ? `
                            <div class="table-container">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Description</th>
                                            <th>Type</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${transactions.slice(0, 10).map(txn => `
                                            <tr>
                                                <td>${new Date(txn.date).toLocaleDateString()}</td>
                                                <td>${txn.description || 'No description'}</td>
                                                <td>${txn.type}</td>
                                                <td>₹${parseFloat(txn.amount).toLocaleString()}</td>
                                                <td>
                                                    <span class="badge-${txn.status.toLowerCase()}">
                                                        ${txn.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                            ${transactions.length > 10 ? `
                                <div style="text-align: center; margin-top: 16px;">
                                    <button class="btn btn-outline" onclick="app.showPage('transactions')">
                                        View All Transactions (${transactions.length})
                                    </button>
                                </div>
                            ` : ''}
                        ` : `
                            <div class="empty-state">
                                <i class="fas fa-receipt"></i>
                                <h3>No Transactions</h3>
                                <p>You haven't added any transactions yet.</p>
                                <button class="btn btn-primary" onclick="app.showPage('add-transaction')">
                                    Add Your First Transaction
                                </button>
                            </div>
                        `}
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error('Error loading dashboard:', error);
            return `
                <div class="alert error">
                    <p>Error loading dashboard: ${error.message}</p>
                </div>
            `;
        }
    }

    async loadTransactions() {
        try {
            const transactions = await this.getTransactions({ 
                userId: this.currentUser.role === 'Admin' ? undefined : this.currentUser.username 
            });
            
            return `
                <div class="transactions">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h3>All Transactions</h3>
                        <button class="btn btn-primary" onclick="app.showPage('add-transaction')">
                            <i class="fas fa-plus"></i> Add New
                        </button>
                    </div>
                    
                    ${transactions.length > 0 ? `
                        <div class="table-container">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        ${this.currentUser.role === 'Admin' ? '<th>User</th>' : ''}
                                        <th>Description</th>
                                        <th>Type</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${transactions.map(txn => `
                                        <tr>
                                            <td>${new Date(txn.date).toLocaleDateString()}</td>
                                            ${this.currentUser.role === 'Admin' ? `<td>${txn.userId}</td>` : ''}
                                            <td>${txn.description || 'No description'}</td>
                                            <td>${txn.type}</td>
                                            <td>₹${parseFloat(txn.amount).toLocaleString()}</td>
                                            <td>
                                                <span class="badge-${txn.status.toLowerCase()}">
                                                    ${txn.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div class="action-buttons">
                                                    ${txn.status === 'Pending' && this.currentUser.role === 'Admin' ? `
                                                        <button class="btn btn-sm btn-success" onclick="app.approveTransaction('${txn.id}')">
                                                            <i class="fas fa-check"></i>
                                                        </button>
                                                        <button class="btn btn-sm btn-danger" onclick="app.rejectTransaction('${txn.id}')">
                                                            <i class="fas fa-times"></i>
                                                        </button>
                                                    ` : ''}
                                                    <button class="btn btn-sm btn-outline" onclick="app.viewTransaction('${txn.id}')">
                                                        <i class="fas fa-eye"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        
                        <div style="margin-top: 20px; padding: 16px; background: var(--gray-100); border-radius: 8px;">
                            <p><strong>Total Transactions:</strong> ${transactions.length}</p>
                            <p><strong>Total Amount:</strong> ₹${transactions.reduce((sum, txn) => sum + parseFloat(txn.amount || 0), 0).toLocaleString()}</p>
                        </div>
                    ` : `
                        <div class="empty-state">
                            <i class="fas fa-search"></i>
                            <h3>No Transactions Found</h3>
                            <p>There are no transactions to display.</p>
                            <button class="btn btn-primary" onclick="app.showPage('add-transaction')">
                                Add Your First Transaction
                            </button>
                        </div>
                    `}
                </div>
            `;
            
        } catch (error) {
            console.error('Error loading transactions:', error);
            return `
                <div class="alert error">
                    <p>Error loading transactions: ${error.message}</p>
                </div>
            `;
        }
    }

    async loadAddTransaction() {
        try {
            // Get settings for dropdowns
            const expenseCodes = await this.getSetting('expenseCodes') || [];
            const costCenters = await this.getSetting('costCenters') || [];
            const tallyLedgers = await this.getSetting('tallyLedgers') || [];
            const approvers = await this.getSetting('approvers') || [];
            
            return `
                <div class="add-transaction">
                    <h3 style="margin-bottom: 24px;">Add New Transaction</h3>
                    
                    <form id="transaction-form" onsubmit="app.submitTransaction(event)">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                            <div class="form-group">
                                <label>Transaction Type *</label>
                                <select id="type" class="form-control" required>
                                    <option value="">Select Type</option>
                                    <option value="Income">Income</option>
                                    <option value="Expense">Expense</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>Date *</label>
                                <input type="date" id="date" class="form-control" 
                                       value="${new Date().toISOString().split('T')[0]}" required>
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                            <div class="form-group">
                                <label>Amount (₹) *</label>
                                <input type="number" id="amount" class="form-control" 
                                       step="0.01" min="0" required placeholder="0.00">
                            </div>
                            
                            <div class="form-group">
                                <label>Approver</label>
                                <select id="approver" class="form-control">
                                    <option value="">Select Approver</option>
                                    ${approvers.map(approver => `
                                        <option value="${approver}">${approver}</option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                            <div class="form-group">
                                <label>Expense Code</label>
                                <select id="code" class="form-control">
                                    <option value="">Select Code</option>
                                    ${expenseCodes.map(code => `
                                        <option value="${code}">${code}</option>
                                    `).join('')}
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>Cost Center</label>
                                <select id="center" class="form-control">
                                    <option value="">Select Center</option>
                                    ${costCenters.map(center => `
                                        <option value="${center}">${center}</option>
                                    `).join('')}
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>Tally Ledger</label>
                                <select id="ledger" class="form-control">
                                    <option value="">Select Ledger</option>
                                    ${tallyLedgers.map(ledger => `
                                        <option value="${ledger}">${ledger}</option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 16px;">
                            <label>Description *</label>
                            <textarea id="description" class="form-control" 
                                      rows="3" required placeholder="Enter transaction description..."></textarea>
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 24px;">
                            <label>Attachment (Optional)</label>
                            <input type="file" id="attachment" class="form-control" 
                                   accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx">
                            <small style="color: var(--gray-500); font-size: 12px;">
                                Supported formats: PDF, Images, Word, Excel (Max 10MB)
                            </small>
                        </div>
                        
                        <div style="display: flex; gap: 12px;">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-paper-plane"></i> Submit Transaction
                            </button>
                            <button type="reset" class="btn btn-outline" onclick="this.form.reset()">
                                <i class="fas fa-undo"></i> Reset
                            </button>
                            <button type="button" class="btn btn-outline" onclick="app.showPage('transactions')">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                        </div>
                    </form>
                </div>
            `;
            
        } catch (error) {
            console.error('Error loading add transaction form:', error);
            return `
                <div class="alert error">
                    <p>Error loading form: ${error.message}</p>
                </div>
            `;
        }
    }

    async loadReports() {
        return `
            <div class="reports">
                <h3 style="margin-bottom: 24px;">Reports</h3>
                
                <div style="background: white; border-radius: var(--border-radius); padding: 24px; margin-bottom: 24px;">
                    <h4 style="margin-bottom: 16px;">Generate Report</h4>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                        <div class="form-group">
                            <label>Report Type</label>
                            <select id="report-type" class="form-control">
                                <option value="summary">Summary Report</option>
                                <option value="detailed">Detailed Report</option>
                                <option value="monthly">Monthly Report</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Period</label>
                            <select id="report-period" class="form-control">
                                <option value="this_month">This Month</option>
                                <option value="last_month">Last Month</option>
                                <option value="this_year">This Year</option>
                                <option value="last_year">Last Year</option>
                            </select>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 12px;">
                        <button class="btn btn-primary" onclick="app.generateReport()">
                            <i class="fas fa-chart-bar"></i> Generate Report
                        </button>
                        <button class="btn btn-success" onclick="app.exportReport()">
                            <i class="fas fa-download"></i> Export to CSV
                        </button>
                    </div>
                </div>
                
                <div style="background: white; border-radius: var(--border-radius); padding: 24px;">
                    <h4 style="margin-bottom: 16px;">Report Preview</h4>
                    <div id="report-preview">
                        <div class="empty-state">
                            <i class="fas fa-chart-bar"></i>
                            <h3>No Report Generated</h3>
                            <p>Generate a report to preview it here</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadAdmin() {
        try {
            // Get all users
            const users = await this.getAllUsers();
            // Get pending transactions
            const pendingTransactions = await this.getTransactions({ status: 'Pending' });
            
            return `
                <div class="admin">
                    <h3 style="margin-bottom: 24px;">Admin Panel</h3>
                    
                    <!-- Stats -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
                        <div style="background: white; border-radius: var(--border-radius); padding: 20px; text-align: center;">
                            <div style="font-size: 32px; font-weight: bold; color: var(--primary);">${users.length}</div>
                            <div style="color: var(--gray-500); font-size: 14px;">Total Users</div>
                        </div>
                        
                        <div style="background: white; border-radius: var(--border-radius); padding: 20px; text-align: center;">
                            <div style="font-size: 32px; font-weight: bold; color: var(--warning);">${pendingTransactions.length}</div>
                            <div style="color: var(--gray-500); font-size: 14px;">Pending Approvals</div>
                        </div>
                        
                        <div style="background: white; border-radius: var(--border-radius); padding: 20px; text-align: center;">
                            <div style="font-size: 32px; font-weight: bold; color: var(--success);">${users.filter(u => u.role === 'Admin').length}</div>
                            <div style="color: var(--gray-500); font-size: 14px;">Admins</div>
                        </div>
                    </div>
                    
                    <!-- Pending Approvals -->
                    <div style="background: white; border-radius: var(--border-radius); padding: 24px; margin-bottom: 24px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                            <h4>Pending Approvals (${pendingTransactions.length})</h4>
                            <button class="btn btn-sm btn-outline" onclick="app.showPage('transactions')">
                                View All
                            </button>
                        </div>
                        
                        ${pendingTransactions.length > 0 ? `
                            <div class="table-container">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>User</th>
                                            <th>Date</th>
                                            <th>Description</th>
                                            <th>Amount</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${pendingTransactions.slice(0, 10).map(txn => `
                                            <tr>
                                                <td>${txn.userId}</td>
                                                <td>${new Date(txn.date).toLocaleDateString()}</td>
                                                <td>${txn.description || 'No description'}</td>
                                                <td>₹${parseFloat(txn.amount).toLocaleString()}</td>
                                                <td>
                                                    <div class="action-buttons">
                                                        <button class="btn btn-sm btn-success" onclick="app.approveTransaction('${txn.id}')">
                                                            <i class="fas fa-check"></i> Approve
                                                        </button>
                                                        <button class="btn btn-sm btn-danger" onclick="app.rejectTransaction('${txn.id}')">
                                                            <i class="fas fa-times"></i> Reject
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        ` : `
                            <div style="text-align: center; padding: 40px; color: var(--gray-500);">
                                <i class="fas fa-check-circle" style="font-size: 48px; margin-bottom: 16px;"></i>
                                <p>No pending approvals</p>
                            </div>
                        `}
                    </div>
                    
                    <!-- User Management -->
                    <div style="background: white; border-radius: var(--border-radius); padding: 24px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                            <h4>User Management</h4>
                            <button class="btn btn-sm btn-primary" onclick="app.addUser()">
                                <i class="fas fa-user-plus"></i> Add User
                            </button>
                        </div>
                        
                        <div class="table-container">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Username</th>
                                        <th>Full Name</th>
                                        <th>Role</th>
                                        <th>Department</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${users.map(user => `
                                        <tr>
                                            <td>${user.username}</td>
                                            <td>${user.fullName}</td>
                                            <td>
                                                <span class="badge-${user.role === 'Admin' ? 'approved' : 'pending'}">
                                                    ${user.role}
                                                </span>
                                            </td>
                                            <td>${user.department || '-'}</td>
                                            <td>
                                                <div class="action-buttons">
                                                    <button class="btn btn-sm btn-outline" onclick="app.editUser('${user.username}')">
                                                        <i class="fas fa-edit"></i>
                                                    </button>
                                                    ${user.username !== this.currentUser.username ? `
                                                        <button class="btn btn-sm btn-danger" onclick="app.deleteUser('${user.username}')">
                                                            <i class="fas fa-trash"></i>
                                                        </button>
                                                    ` : ''}
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error('Error loading admin panel:', error);
            return `
                <div class="alert error">
                    <p>Error loading admin panel: ${error.message}</p>
                </div>
            `;
        }
    }

    getAccessDeniedHTML() {
        return `
            <div style="text-align: center; padding: 60px 40px;">
                <i class="fas fa-lock" style="font-size: 64px; color: var(--danger); margin-bottom: 20px;"></i>
                <h3 style="margin-bottom: 16px;">Access Denied</h3>
                <p style="color: var(--gray-500); margin-bottom: 24px;">
                    You don't have permission to access this page.
                </p>
                <button class="btn btn-primary" onclick="app.showPage('dashboard')">
                    Return to Dashboard
                </button>
            </div>
        `;
    }

    initializePage(page) {
        // Initialize page-specific functionality
        if (page === 'add-transaction') {
            // Set today's date as default
            const dateInput = document.getElementById('date');
            if (dateInput && !dateInput.value) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }
        }
    }

    async submitTransaction(event) {
        event.preventDefault();
        
        try {
            const form = event.target;
            const formData = new FormData(form);
            
            // Validate required fields
            const type = formData.get('type');
            const date = formData.get('date');
            const amount = formData.get('amount');
            const description = formData.get('description');
            
            if (!type || !date || !amount || !description) {
                this.showAlert('Please fill all required fields', 'error');
                return;
            }
            
            if (parseFloat(amount) <= 0) {
                this.showAlert('Amount must be greater than 0', 'error');
                return;
            }
            
            // Create transaction object
            const transaction = {
                id: 'txn-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                userId: this.currentUser.username,
                type: type,
                date: date,
                amount: parseFloat(amount),
                description: description,
                code: formData.get('code') || '',
                center: formData.get('center') || '',
                ledger: formData.get('ledger') || '',
                approver: formData.get('approver') || '',
                status: 'Pending',
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString()
            };
            
            // Handle file attachment
            const fileInput = document.getElementById('attachment');
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                if (file.size > 10 * 1024 * 1024) {
                    this.showAlert('File size must be less than 10MB', 'error');
                    return;
                }
                
                // Convert file to base64
                const base64 = await this.fileToBase64(file);
                transaction.attachment = {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: base64
                };
            }
            
            // Save transaction
            await this.saveTransaction(transaction);
            
            // Show success message
            this.showAlert('Transaction submitted successfully!', 'success');
            
            // Reset form
            form.reset();
            
            // Go to transactions page
            setTimeout(() => {
                this.showPage('transactions');
            }, 1500);
            
        } catch (error) {
            console.error('Error submitting transaction:', error);
            this.showAlert('Error submitting transaction: ' + error.message, 'error');
        }
    }

    async approveTransaction(transactionId) {
        if (!confirm('Are you sure you want to approve this transaction?')) {
            return;
        }
        
        try {
            await this.updateTransactionStatus(transactionId, 'Approved');
            this.showAlert('Transaction approved successfully!', 'success');
            
            // Refresh current page
            const currentPage = document.querySelector('.nav-item.active')?.dataset.page || 'dashboard';
            this.showPage(currentPage);
            
        } catch (error) {
            console.error('Error approving transaction:', error);
            this.showAlert('Error approving transaction: ' + error.message, 'error');
        }
    }

    async rejectTransaction(transactionId) {
        if (!confirm('Are you sure you want to reject this transaction?')) {
            return;
        }
        
        try {
            await this.updateTransactionStatus(transactionId, 'Rejected');
            this.showAlert('Transaction rejected successfully!', 'success');
            
            // Refresh current page
            const currentPage = document.querySelector('.nav-item.active')?.dataset.page || 'dashboard';
            this.showPage(currentPage);
            
        } catch (error) {
            console.error('Error rejecting transaction:', error);
            this.showAlert('Error rejecting transaction: ' + error.message, 'error');
        }
    }

    async viewTransaction(transactionId) {
        try {
            const transaction = await this.getTransaction(transactionId);
            if (!transaction) {
                this.showAlert('Transaction not found', 'error');
                return;
            }
            
            // Create modal view
            const modalHtml = `
                <div style="background: white; border-radius: var(--border-radius); padding: 24px; max-width: 600px; margin: 0 auto;">
                    <h3 style="margin-bottom: 24px;">Transaction Details</h3>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                        <div>
                            <strong>Transaction ID:</strong>
                            <p>${transaction.id}</p>
                        </div>
                        <div>
                            <strong>Date:</strong>
                            <p>${new Date(transaction.date).toLocaleDateString()}</p>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                        <div>
                            <strong>Type:</strong>
                            <p>${transaction.type}</p>
                        </div>
                        <div>
                            <strong>Amount:</strong>
                            <p>₹${parseFloat(transaction.amount).toLocaleString()}</p>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <strong>Description:</strong>
                        <p>${transaction.description || 'No description'}</p>
                    </div>
                    
                    ${transaction.code || transaction.center || transaction.ledger ? `
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                            ${transaction.code ? `
                                <div>
                                    <strong>Expense Code:</strong>
                                    <p>${transaction.code}</p>
                                </div>
                            ` : ''}
                            ${transaction.center ? `
                                <div>
                                    <strong>Cost Center:</strong>
                                    <p>${transaction.center}</p>
                                </div>
                            ` : ''}
                            ${transaction.ledger ? `
                                <div>
                                    <strong>Tally Ledger:</strong>
                                    <p>${transaction.ledger}</p>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                        <div>
                            <strong>Status:</strong>
                            <p>
                                <span class="badge-${transaction.status.toLowerCase()}">
                                    ${transaction.status}
                                </span>
                            </p>
                        </div>
                        <div>
                            <strong>Approver:</strong>
                            <p>${transaction.approver || 'Not assigned'}</p>
                        </div>
                    </div>
                    
                    <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px;">
                        <button class="btn btn-outline" onclick="this.closest('.modal').remove()">
                            Close
                        </button>
                    </div>
                </div>
            `;
            
            this.showModal(modalHtml);
            
        } catch (error) {
            console.error('Error viewing transaction:', error);
            this.showAlert('Error viewing transaction: ' + error.message, 'error');
        }
    }

    async generateReport() {
        try {
            const reportType = document.getElementById('report-type')?.value || 'summary';
            const period = document.getElementById('report-period')?.value || 'this_month';
            
            // Calculate date range
            const now = new Date();
            let startDate, endDate;
            
            switch (period) {
                case 'this_month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    break;
                case 'last_month':
                    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                    break;
                case 'this_year':
                    startDate = new Date(now.getFullYear(), 0, 1);
                    endDate = new Date(now.getFullYear(), 11, 31);
                    break;
                case 'last_year':
                    startDate = new Date(now.getFullYear() - 1, 0, 1);
                    endDate = new Date(now.getFullYear() - 1, 11, 31);
                    break;
                default:
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            }
            
            // Get transactions for the period
            const transactions = await this.getTransactions({ 
                userId: this.currentUser.role === 'Admin' ? undefined : this.currentUser.username 
            });
            
            // Filter by date
            const filteredTransactions = transactions.filter(txn => {
                const txnDate = new Date(txn.date);
                return txnDate >= startDate && txnDate <= endDate;
            });
            
            // Calculate stats
            const stats = this.calculateStats(filteredTransactions);
            
            // Generate report HTML
            let reportHtml = `
                <h3>${this.getReportTitle(reportType)}</h3>
                <p style="color: var(--gray-500); margin-bottom: 24px;">
                    Period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}
                </p>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
                    <div style="background: var(--gray-100); border-radius: 8px; padding: 16px;">
                        <div style="font-size: 24px; font-weight: bold;">${filteredTransactions.length}</div>
                        <div style="color: var(--gray-500);">Total Transactions</div>
                    </div>
                    <div style="background: var(--gray-100); border-radius: 8px; padding: 16px;">
                        <div style="font-size: 24px; font-weight: bold; color: var(--success);">₹${stats.totalIncome.toLocaleString()}</div>
                        <div style="color: var(--gray-500);">Total Income</div>
                    </div>
                    <div style="background: var(--gray-100); border-radius: 8px; padding: 16px;">
                        <div style="font-size: 24px; font-weight: bold; color: var(--danger);">₹${stats.totalExpense.toLocaleString()}</div>
                        <div style="color: var(--gray-500);">Total Expenses</div>
                    </div>
                    <div style="background: var(--gray-100); border-radius: 8px; padding: 16px;">
                        <div style="font-size: 24px; font-weight: bold; color: var(--primary);">₹${stats.netBalance.toLocaleString()}</div>
                        <div style="color: var(--gray-500);">Net Balance</div>
                    </div>
                </div>
            `;
            
            if (reportType === 'detailed' && filteredTransactions.length > 0) {
                reportHtml += `
                    <h4 style="margin-bottom: 16px;">Transaction Details</h4>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    ${this.currentUser.role === 'Admin' ? '<th>User</th>' : ''}
                                    <th>Description</th>
                                    <th>Type</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filteredTransactions.map(txn => `
                                    <tr>
                                        <td>${new Date(txn.date).toLocaleDateString()}</td>
                                        ${this.currentUser.role === 'Admin' ? `<td>${txn.userId}</td>` : ''}
                                        <td>${txn.description || 'No description'}</td>
                                        <td>${txn.type}</td>
                                        <td>₹${parseFloat(txn.amount).toLocaleString()}</td>
                                        <td>
                                            <span class="badge-${txn.status.toLowerCase()}">
                                                ${txn.status}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }
            
            // Update report preview
            const previewEl = document.getElementById('report-preview');
            if (previewEl) {
                previewEl.innerHTML = reportHtml;
            }
            
            this.showAlert('Report generated successfully!', 'success');
            
        } catch (error) {
            console.error('Error generating report:', error);
            this.showAlert('Error generating report: ' + error.message, 'error');
        }
    }

    getReportTitle(reportType) {
        switch (reportType) {
            case 'summary': return 'Summary Report';
            case 'detailed': return 'Detailed Transaction Report';
            case 'monthly': return 'Monthly Report';
            default: return 'Report';
        }
    }

    async exportReport() {
        try {
            // Get transactions
            const transactions = await this.getTransactions({ 
                userId: this.currentUser.role === 'Admin' ? undefined : this.currentUser.username 
            });
            
            if (transactions.length === 0) {
                this.showAlert('No transactions to export', 'warning');
                return;
            }
            
            // Convert to CSV
            let csv = 'Date,Type,Description,Amount,Status,Approver\n';
            
            transactions.forEach(txn => {
                csv += `"${new Date(txn.date).toLocaleDateString()}","${txn.type}","${txn.description || ''}",${txn.amount},"${txn.status}","${txn.approver || ''}"\n`;
            });
            
            // Create download link
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `expensepro-report-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            
            this.showAlert('Report exported successfully!', 'success');
            
        } catch (error) {
            console.error('Error exporting report:', error);
            this.showAlert('Error exporting report: ' + error.message, 'error');
        }
    }

    async addUser() {
        const html = `
            <div style="background: white; border-radius: var(--border-radius); padding: 24px; max-width: 500px; margin: 0 auto;">
                <h3 style="margin-bottom: 24px;">Add New User</h3>
                
                <form id="add-user-form" onsubmit="app.saveNewUser(event)">
                    <div class="form-group" style="margin-bottom: 16px;">
                        <label>Username *</label>
                        <input type="text" id="new-username" class="form-control" required>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 16px;">
                        <label>Full Name *</label>
                        <input type="text" id="new-fullname" class="form-control" required>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 16px;">
                        <label>Password *</label>
                        <input type="password" id="new-password" class="form-control" required>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 16px;">
                        <label>Role *</label>
                        <select id="new-role" class="form-control" required>
                            <option value="User">User</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 24px;">
                        <label>Department</label>
                        <input type="text" id="new-department" class="form-control">
                    </div>
                    
                    <div style="display: flex; gap: 12px;">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Save User
                        </button>
                        <button type="button" class="btn btn-outline" onclick="this.closest('.modal').remove()">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        this.showModal(html);
    }

    async saveNewUser(event) {
        event.preventDefault();
        
        try {
            const username = document.getElementById('new-username').value.trim();
            const fullName = document.getElementById('new-fullname').value.trim();
            const password = document.getElementById('new-password').value;
            const role = document.getElementById('new-role').value;
            const department = document.getElementById('new-department').value.trim();
            
            if (!username || !fullName || !password || !role) {
                this.showAlert('Please fill all required fields', 'error');
                return;
            }
            
            // Check if user already exists
            const existingUser = await this.getUser(username);
            if (existingUser) {
                this.showAlert('Username already exists', 'error');
                return;
            }
            
            // Create user object
            const user = {
                username: username,
                password: password,
                role: role,
                fullName: fullName,
                department: department || '',
                email: '',
                createdAt: new Date().toISOString(),
                lastLogin: null
            };
            
            // Save user
            await this.saveUser(user);
            
            // Close modal
            document.querySelector('.modal')?.remove();
            
            // Show success message
            this.showAlert('User added successfully!', 'success');
            
            // Refresh admin page
            this.showPage('admin');
            
        } catch (error) {
            console.error('Error saving user:', error);
            this.showAlert('Error saving user: ' + error.message, 'error');
        }
    }

    async editUser(username) {
        try {
            const user = await this.getUser(username);
            if (!user) {
                this.showAlert('User not found', 'error');
                return;
            }
            
            const html = `
                <div style="background: white; border-radius: var(--border-radius); padding: 24px; max-width: 500px; margin: 0 auto;">
                    <h3 style="margin-bottom: 24px;">Edit User</h3>
                    
                    <form id="edit-user-form" onsubmit="app.updateUser('${username}', event)">
                        <div class="form-group" style="margin-bottom: 16px;">
                            <label>Username</label>
                            <input type="text" class="form-control" value="${user.username}" disabled>
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 16px;">
                            <label>Full Name *</label>
                            <input type="text" id="edit-fullname" class="form-control" value="${user.fullName}" required>
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 16px;">
                            <label>New Password (leave empty to keep current)</label>
                            <input type="password" id="edit-password" class="form-control">
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 16px;">
                            <label>Role *</label>
                            <select id="edit-role" class="form-control" required>
                                <option value="User" ${user.role === 'User' ? 'selected' : ''}>User</option>
                                <option value="Admin" ${user.role === 'Admin' ? 'selected' : ''}>Admin</option>
                            </select>
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 24px;">
                            <label>Department</label>
                            <input type="text" id="edit-department" class="form-control" value="${user.department || ''}">
                        </div>
                        
                        <div style="display: flex; gap: 12px;">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> Save Changes
                            </button>
                            <button type="button" class="btn btn-outline" onclick="this.closest('.modal').remove()">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            `;
            
            this.showModal(html);
            
        } catch (error) {
            console.error('Error editing user:', error);
            this.showAlert('Error loading user details: ' + error.message, 'error');
        }
    }

    async updateUser(username, event) {
        event.preventDefault();
        
        try {
            const fullName = document.getElementById('edit-fullname').value.trim();
            const password = document.getElementById('edit-password').value;
            const role = document.getElementById('edit-role').value;
            const department = document.getElementById('edit-department').value.trim();
            
            if (!fullName || !role) {
                this.showAlert('Please fill all required fields', 'error');
                return;
            }
            
            // Get existing user
            const user = await this.getUser(username);
            if (!user) {
                this.showAlert('User not found', 'error');
                return;
            }
            
            // Update user
            user.fullName = fullName;
            user.role = role;
            user.department = department || '';
            
            if (password) {
                user.password = password;
            }
            
            // Save updated user
            await this.saveUser(user);
            
            // Close modal
            document.querySelector('.modal')?.remove();
            
            // Show success message
            this.showAlert('User updated successfully!', 'success');
            
            // Refresh admin page
            this.showPage('admin');
            
        } catch (error) {
            console.error('Error updating user:', error);
            this.showAlert('Error updating user: ' + error.message, 'error');
        }
    }

    async deleteUser(username) {
        if (username === this.currentUser.username) {
            this.showAlert('You cannot delete your own account', 'error');
            return;
        }
        
        if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
            return;
        }
        
        try {
            await this.deleteUserFromDB(username);
            this.showAlert('User deleted successfully!', 'success');
            
            // Refresh admin page
            this.showPage('admin');
            
        } catch (error) {
            console.error('Error deleting user:', error);
            this.showAlert('Error deleting user: ' + error.message, 'error');
        }
    }

    showModal(content) {
        // Remove existing modal
        const existingModal = document.querySelector('.modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 20px;
        `;
        
        modal.innerHTML = content;
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        document.body.appendChild(modal);
    }

    showAlert(message, type = 'info') {
        const container = document.getElementById('alert-container');
        if (!container) return;
        
        const alert = document.createElement('div');
        alert.className = `alert ${type}`;
        alert.innerHTML = `
            ${message}
            <button style="float: right; background: none; border: none; cursor: pointer;" 
                    onclick="this.parentElement.remove()">×</button>
        `;
        
        container.appendChild(alert);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }

    showError(message, elementId = 'alert-container') {
        this.showAlert(message, 'error');
    }

    calculateStats(transactions) {
        const stats = {
            totalIncome: 0,
            totalExpense: 0,
            pendingCount: 0,
            netBalance: 0
        };
        
        transactions.forEach(txn => {
            const amount = parseFloat(txn.amount) || 0;
            
            if (txn.type === 'Income') {
                stats.totalIncome += amount;
            } else {
                stats.totalExpense += amount;
            }
            
            if (txn.status === 'Pending') {
                stats.pendingCount++;
            }
        });
        
        stats.netBalance = stats.totalIncome - stats.totalExpense;
        
        return stats;
    }

    // Database Methods
    getUser(username) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            const transaction = this.db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            const request = store.get(username);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('Failed to get user'));
        });
    }

    getAllUsers() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            const transaction = this.db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(new Error('Failed to get users'));
        });
    }

    saveUser(user) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            const transaction = this.db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            const request = store.put(user);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Failed to save user'));
        });
    }

    updateUser(username, userData) {
        return this.saveUser({ ...userData, username });
    }

    deleteUserFromDB(username) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            const transaction = this.db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            const request = store.delete(username);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Failed to delete user'));
        });
    }

    getTransactions(filters = {}) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            const transaction = this.db.transaction(['transactions'], 'readonly');
            const store = transaction.objectStore('transactions');
            const request = store.getAll();
            
            request.onsuccess = () => {
                let transactions = request.result || [];
                
                // Apply filters
                if (filters.userId) {
                    transactions = transactions.filter(t => t.userId === filters.userId);
                }
                
                if (filters.status) {
                    transactions = transactions.filter(t => t.status === filters.status);
                }
                
                // Sort by date (newest first)
                transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
                
                resolve(transactions);
            };
            
            request.onerror = () => reject(new Error('Failed to get transactions'));
        });
    }

    getTransaction(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            const transaction = this.db.transaction(['transactions'], 'readonly');
            const store = transaction.objectStore('transactions');
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('Failed to get transaction'));
        });
    }

    saveTransaction(transaction) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            const dbTransaction = this.db.transaction(['transactions'], 'readwrite');
            const store = dbTransaction.objectStore('transactions');
            const request = store.put(transaction);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Failed to save transaction'));
        });
    }

    updateTransactionStatus(id, status) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            const transaction = this.db.transaction(['transactions'], 'readwrite');
            const store = transaction.objectStore('transactions');
            const request = store.get(id);
            
            request.onsuccess = () => {
                const txn = request.result;
                if (!txn) {
                    reject(new Error('Transaction not found'));
                    return;
                }
                
                txn.status = status;
                txn.lastModified = new Date().toISOString();
                
                const updateRequest = store.put(txn);
                updateRequest.onsuccess = () => resolve();
                updateRequest.onerror = () => reject(new Error('Failed to update transaction'));
            };
            
            request.onerror = () => reject(new Error('Failed to get transaction'));
        });
    }

    getSetting(key) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result?.value || []);
            request.onerror = () => reject(new Error('Failed to get setting'));
        });
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create global app instance
    window.app = new ExpenseProApp();
    
    // Make showPage globally available
    window.showPage = (page) => window.app?.showPage(page);
    
    // Make logout globally available
    window.logout = () => window.app?.logout();
});

// Add keyboard shortcut for login
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.id === 'password') {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.dispatchEvent(new Event('submit'));
        }
    }
});