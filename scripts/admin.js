// Admin Manager
class AdminManager {
    constructor() {
        this.init();
    }

    init() {
        // Set up event listeners
        this.setupEventListeners();
        
        // Load admin data if on admin page
        if (this.isOnAdminPage()) {
            this.loadAdminData();
        }
    }

    setupEventListeners() {
        // User management
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-user-action]')) {
                const action = e.target.closest('[data-user-action]').dataset.userAction;
                const username = e.target.closest('[data-user-action]').dataset.userId;
                this.handleUserAction(action, username);
            }
        });
        
        // Settings save
        const saveSettingsBtn = document.getElementById('save-settings');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        }
        
        // System actions
        document.querySelectorAll('[data-system-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.systemAction;
                this.handleSystemAction(action);
            });
        });
    }

    isOnAdminPage() {
        return document.getElementById('admin-section')?.style.display === 'block';
    }

    async loadAdminData() {
        try {
            // Show loading
            this.showLoading(true);
            
            // Check if user is admin
            if (!auth.isAdmin()) {
                Utils.showNotification('Admin access required', 'error');
                return;
            }
            
            // Load pending approvals
            await this.loadPendingApprovals();
            
            // Load user statistics
            await this.loadUserStatistics();
            
            // Load system statistics
            await this.loadSystemStatistics();
            
            // Load recent activities
            await this.loadRecentActivities();
            
            // Hide loading
            this.showLoading(false);
            
        } catch (error) {
            console.error('Error loading admin data:', error);
            this.showLoading(false);
            Utils.showNotification('Error loading admin data', 'error');
        }
    }

    async loadPendingApprovals() {
        try {
            const pendingTransactions = await db.getTransactions({ status: 'Pending' });
            
            // Update UI
            this.updatePendingApprovalsTable(pendingTransactions);
            
            // Update stats
            const pendingCount = document.getElementById('admin-pending-count');
            if (pendingCount) {
                pendingCount.textContent = pendingTransactions.length;
            }
            
        } catch (error) {
            console.error('Error loading pending approvals:', error);
            throw error;
        }
    }

    updatePendingApprovalsTable(transactions) {
        const tableBody = document.querySelector('#pending-approvals-table tbody');
        if (!tableBody) return;
        
        if (transactions.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-check-circle"></i>
                        <p>No pending approvals</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        transactions.forEach(transaction => {
            const date = Utils.formatDate(transaction.date, 'dd/MM/yyyy');
            const amount = Utils.formatCurrency(transaction.amount);
            const created = Utils.formatDate(transaction.createdAt, 'dd/MM/yyyy HH:mm');
            
            html += `
                <tr data-transaction-id="${transaction.id}">
                    <td>
                        <div class="user-info">
                            <div class="user-avatar-small">
                                ${transaction.userId?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                                <strong>${transaction.userId}</strong>
                                <small class="text-muted d-block">${created}</small>
                            </div>
                        </div>
                    </td>
                    <td>${date}</td>
                    <td>
                        <div class="transaction-desc">
                            <strong>${transaction.description || 'No description'}</strong>
                            <small class="text-muted">${transaction.category || 'Uncategorized'}</small>
                        </div>
                    </td>
                    <td>${transaction.type}</td>
                    <td class="${transaction.type === 'Expense' ? 'text-danger' : 'text-success'}">
                        ${transaction.type === 'Expense' ? '-' : '+'} ${amount}
                    </td>
                    <td>
                        ${transaction.attachments?.length > 0 ? `
                            <button class="btn btn-sm btn-outline" 
                                    onclick="viewAttachments('${transaction.id}')">
                                <i class="fas fa-paperclip"></i>
                            </button>
                        ` : '-'}
                    </td>
                    <td>${transaction.approver || '-'}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-success" 
                                    onclick="approveTransaction('${transaction.id}')">
                                <i class="fas fa-check"></i> Approve
                            </button>
                            <button class="btn btn-sm btn-danger" 
                                    onclick="rejectTransaction('${transaction.id}')">
                                <i class="fas fa-times"></i> Reject
                            </button>
                            <button class="btn btn-sm btn-primary" 
                                    onclick="viewTransaction('${transaction.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
    }

    async loadUserStatistics() {
        try {
            const users = await db.getAllUsers();
            const transactions = await db.getTransactions();
            
            // Calculate user statistics
            const userStats = users.map(user => {
                const userTransactions = transactions.filter(t => t.userId === user.username);
                const stats = Utils.calculateStats(userTransactions);
                
                return {
                    username: user.username,
                    fullName: user.fullName,
                    role: user.role,
                    department: user.department,
                    totalTransactions: userTransactions.length,
                    ...stats,
                    lastActivity: user.lastLogin ? Utils.formatDate(user.lastLogin, 'dd/MM/yyyy HH:mm') : 'Never'
                };
            });
            
            // Update UI
            this.updateUserStatisticsTable(userStats);
            
            // Update user count
            const userCount = document.getElementById('admin-user-count');
            if (userCount) {
                userCount.textContent = users.length;
            }
            
        } catch (error) {
            console.error('Error loading user statistics:', error);
            throw error;
        }
    }

    updateUserStatisticsTable(userStats) {
        const tableBody = document.querySelector('#user-stats-table tbody');
        if (!tableBody) return;
        
        if (userStats.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state">
                        <i class="fas fa-users"></i>
                        <p>No users found</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        userStats.forEach(stats => {
            html += `
                <tr>
                    <td>
                        <div class="user-info">
                            <div class="user-avatar-small">
                                ${stats.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <strong>${stats.fullName}</strong>
                                <small class="text-muted d-block">${stats.username}</small>
                            </div>
                        </div>
                    </td>
                    <td><span class="badge ${stats.role === 'Admin' ? 'badge-approved' : 'badge-pending'}">${stats.role}</span></td>
                    <td>${stats.department || '-'}</td>
                    <td>${stats.totalTransactions}</td>
                    <td class="text-success">${Utils.formatCurrency(stats.totalIncome)}</td>
                    <td class="text-danger">${Utils.formatCurrency(stats.totalExpense)}</td>
                    <td>
                        <span class="badge ${stats.netBalance >= 0 ? 'badge-approved' : 'badge-rejected'}">
                            ${Utils.formatCurrency(stats.netBalance)}
                        </span>
                    </td>
                    <td>${stats.pendingCount}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-outline" 
                                    data-user-action="edit" 
                                    data-user-id="${stats.username}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline" 
                                    data-user-action="reset-password" 
                                    data-user-id="${stats.username}">
                                <i class="fas fa-key"></i>
                            </button>
                            ${stats.username !== auth.getCurrentUser()?.username ? `
                                <button class="btn btn-sm btn-danger" 
                                        data-user-action="delete" 
                                        data-user-id="${stats.username}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
    }

    async loadSystemStatistics() {
        try {
            const stats = await db.getStatistics();
            
            // Update UI
            this.updateSystemStats(stats);
            
        } catch (error) {
            console.error('Error loading system statistics:', error);
            throw error;
        }
    }

    updateSystemStats(stats) {
        if (!stats) return;
        
        // Update system stats cards
        const elements = {
            'system-total-transactions': stats.totalTransactions,
            'system-total-users': stats.totalUsers,
            'system-total-admins': stats.totalAdmins,
            'system-total-amount': Utils.formatCurrency(stats.totalAmount),
            'system-total-income': Utils.formatCurrency(stats.totalIncome),
            'system-total-expense': Utils.formatCurrency(stats.totalExpense),
            'system-net-balance': Utils.formatCurrency(stats.netBalance),
            'system-pending-count': stats.pendingCount,
            'system-approved-count': stats.approvedCount,
            'system-rejected-count': stats.rejectedCount
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    async loadRecentActivities() {
        try {
            const logs = await db.getLogs({ limit: 50 });
            
            // Update UI
            this.updateRecentActivities(logs);
            
        } catch (error) {
            console.error('Error loading recent activities:', error);
            throw error;
        }
    }

    updateRecentActivities(logs) {
        const container = document.getElementById('recent-activities');
        if (!container) return;
        
        if (logs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>No recent activities</p>
                </div>
            `;
            return;
        }
        
        let html = '<div class="activities-list">';
        logs.forEach(log => {
            const time = Utils.formatDate(log.timestamp, 'HH:mm');
            const date = Utils.formatDate(log.timestamp, 'dd/MM/yyyy');
            const icon = this.getActivityIcon(log.action);
            const color = this.getActivityColor(log.action);
            
            html += `
                <div class="activity-item">
                    <div class="activity-icon" style="background: ${color}20; color: ${color};">
                        <i class="fas fa-${icon}"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-header">
                            <strong>${log.userId}</strong>
                            <span class="activity-time">${time}</span>
                        </div>
                        <p class="activity-details">${this.getActivityDescription(log.action, log.details)}</p>
                        <small class="activity-date">${date}</small>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
    }

    getActivityIcon(action) {
        const icons = {
            'login': 'sign-in-alt',
            'logout': 'sign-out-alt',
            'transaction_create': 'plus-circle',
            'transaction_update': 'edit',
            'transaction_delete': 'trash',
            'transaction_status': 'check-circle',
            'user_create': 'user-plus',
            'user_update': 'user-edit',
            'password_change': 'key',
            'data_import': 'file-import',
            'data_export': 'file-export',
            'settings_update': 'cog'
        };
        
        return icons[action] || 'info-circle';
    }

    getActivityColor(action) {
        const colors = {
            'login': 'var(--success-color)',
            'logout': 'var(--info-color)',
            'transaction_create': 'var(--primary-color)',
            'transaction_update': 'var(--warning-color)',
            'transaction_delete': 'var(--danger-color)',
            'transaction_status': 'var(--success-color)',
            'user_create': 'var(--success-color)',
            'user_update': 'var(--warning-color)',
            'password_change': 'var(--info-color)',
            'data_import': 'var(--primary-color)',
            'data_export': 'var(--info-color)',
            'settings_update': 'var(--warning-color)'
        };
        
        return colors[action] || 'var(--gray-500)';
    }

    getActivityDescription(action, details) {
        const descriptions = {
            'login': 'logged in',
            'logout': 'logged out',
            'transaction_create': 'created a transaction',
            'transaction_update': 'updated a transaction',
            'transaction_delete': 'deleted a transaction',
            'transaction_status': 'updated transaction status',
            'user_create': 'created a user',
            'user_update': 'updated user profile',
            'password_change': 'changed password',
            'data_import': 'imported data',
            'data_export': 'exported data',
            'settings_update': 'updated settings'
        };
        
        return `${descriptions[action] || action}${details ? `: ${details}` : ''}`;
    }

    showLoading(show) {
        const sections = ['pending-approvals-table', 'user-stats-table', 'recent-activities'];
        
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (!section) return;
            
            if (show) {
                section.classList.add('loading');
            } else {
                section.classList.remove('loading');
            }
        });
    }

    async handleUserAction(action, username) {
        try {
            switch (action) {
                case 'edit':
                    await this.editUser(username);
                    break;
                    
                case 'reset-password':
                    await this.resetUserPassword(username);
                    break;
                    
                case 'delete':
                    await this.deleteUser(username);
                    break;
                    
                case 'toggle-status':
                    await this.toggleUserStatus(username);
                    break;
            }
        } catch (error) {
            console.error('User action error:', error);
            Utils.showNotification('Error performing action', 'error');
        }
    }

    async editUser(username) {
        try {
            const user = await db.get('users', username);
            if (!user) {
                Utils.showNotification('User not found', 'error');
                return;
            }
            
            // Create edit form
            const formHtml = `
                <div class="form-row">
                    <div class="form-group">
                        <label>Username</label>
                        <input type="text" class="form-control" value="${user.username}" disabled>
                    </div>
                    <div class="form-group">
                        <label>Full Name *</label>
                        <input type="text" id="edit-fullname" class="form-control" value="${user.fullName}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="edit-email" class="form-control" value="${user.email || ''}">
                    </div>
                    <div class="form-group">
                        <label>Department</label>
                        <input type="text" id="edit-department" class="form-control" value="${user.department || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label>Role *</label>
                    <select id="edit-role" class="form-control" required>
                        <option value="User" ${user.role === 'User' ? 'selected' : ''}>User</option>
                        <option value="Admin" ${user.role === 'Admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </div>
            `;
            
            const result = await Utils.createModal('Edit User', formHtml, [
                { text: 'Cancel', action: 'cancel', class: 'btn-outline' },
                { text: 'Save Changes', action: 'save', class: 'btn-primary' }
            ]);
            
            if (result === 'save') {
                const updateData = {
                    fullName: document.getElementById('edit-fullname').value,
                    email: document.getElementById('edit-email').value,
                    department: document.getElementById('edit-department').value,
                    role: document.getElementById('edit-role').value
                };
                
                const updateResult = await db.updateUser(username, updateData);
                
                if (updateResult.success) {
                    Utils.showNotification('User updated successfully', 'success');
                    this.loadUserStatistics();
                } else {
                    Utils.showNotification(updateResult.error, 'error');
                }
            }
            
        } catch (error) {
            console.error('Edit user error:', error);
            throw error;
        }
    }

    async resetUserPassword(username) {
        try {
            const confirmed = await Utils.confirm(
                `Reset password for user "${username}"? A temporary password will be generated.`
            );
            
            if (!confirmed) return;
            
            // Generate temporary password
            const tempPassword = Math.random().toString(36).slice(-8);
            
            const updateResult = await db.updateUser(username, {
                password: tempPassword
            });
            
            if (updateResult.success) {
                // Show password to admin
                const showPassword = await Utils.confirm(
                    `Password reset successful. Temporary password: ${tempPassword}\n\nCopy this password and provide it to the user.`,
                    'Password Reset'
                );
                
                if (showPassword) {
                    // Copy to clipboard
                    navigator.clipboard.writeText(tempPassword).then(() => {
                        Utils.showNotification('Password copied to clipboard', 'success');
                    });
                }
                
                Utils.showNotification('Password reset successfully', 'success');
            } else {
                Utils.showNotification(updateResult.error, 'error');
            }
            
        } catch (error) {
            console.error('Reset password error:', error);
            throw error;
        }
    }

    async deleteUser(username) {
        try {
            // Prevent deleting own account
            if (username === auth.getCurrentUser()?.username) {
                Utils.showNotification('Cannot delete your own account', 'error');
                return;
            }
            
            const confirmed = await Utils.confirm(
                `Are you sure you want to delete user "${username}"? This action cannot be undone.`
            );
            
            if (!confirmed) return;
            
            // Delete user from database
            await db.delete('users', username);
            
            // Delete user's transactions
            const userTransactions = await db.getTransactions({ userId: username });
            for (const transaction of userTransactions) {
                await db.deleteTransaction(transaction.id, 'admin');
            }
            
            Utils.showNotification('User deleted successfully', 'success');
            this.loadUserStatistics();
            
        } catch (error) {
            console.error('Delete user error:', error);
            throw error;
        }
    }

    async toggleUserStatus(username) {
        // Implementation for user status toggle
        Utils.showNotification('Feature coming soon', 'info');
    }

    async handleSystemAction(action) {
        try {
            switch (action) {
                case 'backup':
                    await this.createBackup();
                    break;
                    
                case 'restore':
                    await this.restoreBackup();
                    break;
                    
                case 'clear-data':
                    await this.clearData();
                    break;
                    
                case 'export-logs':
                    await this.exportLogs();
                    break;
                    
                case 'system-info':
                    await this.showSystemInfo();
                    break;
            }
        } catch (error) {
            console.error('System action error:', error);
            Utils.showNotification('Error performing system action', 'error');
        }
    }

    async createBackup() {
        try {
            const confirmed = await Utils.confirm(
                'Create a backup of all system data?'
            );
            
            if (!confirmed) return;
            
            const result = await db.backup();
            
            if (result.success) {
                Utils.showNotification('Backup created successfully', 'success');
            } else {
                Utils.showNotification(result.error, 'error');
            }
            
        } catch (error) {
            console.error('Backup error:', error);
            throw error;
        }
    }

    async restoreBackup() {
        try {
            // Create file input
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const confirmed = await Utils.confirm(
                    'Restore from backup? This will replace all current data.'
                );
                
                if (!confirmed) return;
                
                const result = await db.restore(file);
                
                if (result.success) {
                    Utils.showNotification('Backup restored successfully', 'success');
                    
                    // Reload application
                    location.reload();
                } else {
                    Utils.showNotification(result.error, 'error');
                }
            };
            
            input.click();
            
        } catch (error) {
            console.error('Restore error:', error);
            throw error;
        }
    }

    async clearData() {
        try {
            const confirmed = await Utils.confirm(
                'Clear all system data? This action cannot be undone.'
            );
            
            if (!confirmed) return;
            
            const type = await Utils.createModal('Clear Data', `
                <p>Select what to clear:</p>
                <div class="form-group">
                    <select id="clear-type" class="form-control">
                        <option value="all">All Data</option>
                        <option value="transactions">Transactions Only</option>
                        <option value="logs">Logs Only</option>
                        <option value="files">Files Only</option>
                    </select>
                </div>
            `, [
                { text: 'Cancel', action: 'cancel', class: 'btn-outline' },
                { text: 'Clear', action: 'clear', class: 'btn-danger' }
            ]);
            
            if (type === 'clear') {
                const clearType = document.getElementById('clear-type').value;
                
                switch (clearType) {
                    case 'all':
                        await Promise.all([
                            db.clearStore('transactions'),
                            db.clearStore('logs'),
                            db.clearStore('files')
                        ]);
                        break;
                        
                    case 'transactions':
                        await db.clearStore('transactions');
                        break;
                        
                    case 'logs':
                        await db.clearStore('logs');
                        break;
                        
                    case 'files':
                        await db.clearStore('files');
                        break;
                }
                
                Utils.showNotification('Data cleared successfully', 'success');
                
                // Reload data
                this.loadAdminData();
                dashboard.loadDashboardData();
            }
            
        } catch (error) {
            console.error('Clear data error:', error);
            throw error;
        }
    }

    async exportLogs() {
        try {
            const logs = await db.getLogs();
            
            if (logs.length === 0) {
                Utils.showNotification('No logs to export', 'warning');
                return;
            }
            
            const csvData = logs.map(log => ({
                Timestamp: Utils.formatDate(log.timestamp, 'yyyy-MM-dd HH:mm:ss'),
                User: log.userId,
                Action: log.action,
                Details: log.details
            }));
            
            const filename = `system-logs-${new Date().toISOString().split('T')[0]}.csv`;
            Utils.exportToCSV(csvData, filename);
            
            Utils.showNotification(`Exported ${logs.length} log entries`, 'success');
            
        } catch (error) {
            console.error('Export logs error:', error);
            throw error;
        }
    }

    async showSystemInfo() {
        try {
            const stats = await db.getStatistics();
            const settings = await db.getAllSettings();
            const users = await db.getAllUsers();
            
            const infoHtml = `
                <div class="system-info">
                    <div class="info-section">
                        <h4>Database Information</h4>
                        <table class="info-table">
                            <tr><td>Database Name:</td><td>ExpenseProDB</td></tr>
                            <tr><td>Database Version:</td><td>${db.version}</td></tr>
                            <tr><td>Total Users:</td><td>${users.length}</td></tr>
                            <tr><td>Total Transactions:</td><td>${stats?.totalTransactions || 0}</td></tr>
                            <tr><td>Total Logs:</td><td>${stats?.totalLogs || 0}</td></tr>
                        </table>
                    </div>
                    
                    <div class="info-section">
                        <h4>System Settings</h4>
                        <table class="info-table">
                            ${Object.entries(settings).map(([key, value]) => `
                                <tr><td>${key}:</td><td>${typeof value === 'object' ? JSON.stringify(value) : value}</td></tr>
                            `).join('')}
                        </table>
                    </div>
                    
                    <div class="info-section">
                        <h4>Browser Information</h4>
                        <table class="info-table">
                            <tr><td>User Agent:</td><td>${navigator.userAgent}</td></tr>
                            <tr><td>Platform:</td><td>${navigator.platform}</td></tr>
                            <tr><td>Language:</td><td>${navigator.language}</td></tr>
                            <tr><td>Online:</td><td>${navigator.onLine ? 'Yes' : 'No'}</td></tr>
                            <tr><td>Storage:</td><td>${navigator.storage ? 'Available' : 'Not Available'}</td></tr>
                        </table>
                    </div>
                </div>
            `;
            
            await Utils.createModal('System Information', infoHtml, [
                { text: 'Close', action: 'close', class: 'btn-outline' }
            ]);
            
        } catch (error) {
            console.error('System info error:', error);
            throw error;
        }
    }

    async saveSettings() {
        try {
            const form = document.getElementById('settings-form');
            if (!form) return;
            
            const formData = new FormData(form);
            const settings = {};
            
            formData.forEach((value, key) => {
                if (value) {
                    // Parse JSON values
                    try {
                        settings[key] = JSON.parse(value);
                    } catch {
                        settings[key] = value;
                    }
                }
            });
            
            // Save settings
            const promises = Object.entries(settings).map(([key, value]) => 
                db.updateSetting(key, value)
            );
            
            await Promise.all(promises);
            
            Utils.showNotification('Settings saved successfully', 'success');
            
        } catch (error) {
            console.error('Save settings error:', error);
            Utils.showNotification('Error saving settings', 'error');
        }
    }

    async addNewUser(userData) {
        try {
            const result = await db.createUser(userData);
            
            if (result.success) {
                Utils.showNotification('User added successfully', 'success');
                this.loadUserStatistics();
                return { success: true };
            } else {
                return { success: false, error: result.error };
            }
            
        } catch (error) {
            console.error('Add user error:', error);
            return { success: false, error: 'Failed to add user' };
        }
    }

    async getSystemAnalytics() {
        try {
            const stats = await db.getStatistics();
            const users = await db.getAllUsers();
            const logs = await db.getLogs({ limit: 100 });
            
            return {
                stats,
                users,
                logs,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('Get analytics error:', error);
            return null;
        }
    }
}

// Create global admin instance
const admin = new AdminManager();

// Global functions for admin actions
window.approveTransaction = async (id) => {
    const result = await transactions.updateTransactionStatus(id, 'Approved');
    if (!result.success && result.error) {
        Utils.showNotification(result.error, 'error');
    }
};

window.rejectTransaction = async (id) => {
    const result = await transactions.updateTransactionStatus(id, 'Rejected');
    if (!result.success && result.error) {
        Utils.showNotification(result.error, 'error');
    }
};

// Export for use in other modules
export default admin;
