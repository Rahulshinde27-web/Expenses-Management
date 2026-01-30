// Local Database Manager
class Database {
    constructor() {
        this.dbName = 'ExpenseProDB';
        this.version = 2;
        this.db = null;
        this.init();
    }

    // Initialize database
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = (event) => {
                console.error('Database error:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('Database initialized');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Users store
                if (!db.objectStoreNames.contains('users')) {
                    const usersStore = db.createObjectStore('users', { keyPath: 'username' });
                    usersStore.createIndex('role', 'role', { unique: false });
                    usersStore.createIndex('email', 'email', { unique: true });
                    
                    // Add default users
                    const defaultUsers = [
                        {
                            username: 'admin',
                            password: 'admin123',
                            role: 'Admin',
                            fullName: 'System Administrator',
                            email: 'admin@expensepro.com',
                            department: 'Administration',
                            profilePhoto: '',
                            createdAt: new Date().toISOString(),
                            lastLogin: null
                        },
                        {
                            username: 'user',
                            password: 'user123',
                            role: 'User',
                            fullName: 'Regular User',
                            email: 'user@expensepro.com',
                            department: 'Operations',
                            profilePhoto: '',
                            createdAt: new Date().toISOString(),
                            lastLogin: null
                        }
                    ];
                    
                    const transaction = event.target.transaction;
                    const store = transaction.objectStore('users');
                    defaultUsers.forEach(user => store.add(user));
                }

                // Transactions store
                if (!db.objectStoreNames.contains('transactions')) {
                    const transactionsStore = db.createObjectStore('transactions', { keyPath: 'id' });
                    transactionsStore.createIndex('userId', 'userId', { unique: false });
                    transactionsStore.createIndex('date', 'date', { unique: false });
                    transactionsStore.createIndex('type', 'type', { unique: false });
                    transactionsStore.createIndex('status', 'status', { unique: false });
                    transactionsStore.createIndex('approver', 'approver', { unique: false });
                    transactionsStore.createIndex('createdBy', 'createdBy', { unique: false });
                }

                // Settings store
                if (!db.objectStoreNames.contains('settings')) {
                    const settingsStore = db.createObjectStore('settings', { keyPath: 'key' });
                    
                    // Default settings
                    const defaultSettings = [
                        {
                            key: 'expenseCodes',
                            value: ['Travel', 'Food', 'Accommodation', 'Transport', 'Office Supplies', 'Equipment', 'Training', 'Marketing']
                        },
                        {
                            key: 'costCenters',
                            value: ['Head Office', 'Branch Office', 'Sales', 'Marketing', 'IT', 'HR', 'Operations', 'Finance']
                        },
                        {
                            key: 'tallyLedgers',
                            value: ['Cash', 'Bank', 'Petty Cash', 'Credit Card', 'Accounts Payable', 'Accounts Receivable']
                        },
                        {
                            key: 'approvers',
                            value: ['Admin', 'Finance Manager', 'Department Head']
                        },
                        {
                            key: 'departments',
                            value: ['Administration', 'Finance', 'IT', 'Sales', 'Marketing', 'Operations', 'HR']
                        },
                        {
                            key: 'currency',
                            value: '₹'
                        },
                        {
                            key: 'taxRate',
                            value: 18
                        }
                    ];
                    
                    const transaction = event.target.transaction;
                    const store = transaction.objectStore('settings');
                    defaultSettings.forEach(setting => store.add(setting));
                }

                // Categories store
                if (!db.objectStoreNames.contains('categories')) {
                    const categoriesStore = db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
                    categoriesStore.createIndex('type', 'type', { unique: false });
                    categoriesStore.createIndex('parentId', 'parentId', { unique: false });
                    
                    // Default categories
                    const defaultCategories = [
                        { id: 1, name: 'Income', type: 'income', color: '#10b981', icon: 'fa-money-bill-wave' },
                        { id: 2, name: 'Expense', type: 'expense', color: '#ef4444', icon: 'fa-shopping-cart' },
                        { id: 3, name: 'Salary', type: 'income', parentId: 1, color: '#3b82f6', icon: 'fa-briefcase' },
                        { id: 4, name: 'Freelance', type: 'income', parentId: 1, color: '#8b5cf6', icon: 'fa-laptop-code' },
                        { id: 5, name: 'Travel', type: 'expense', parentId: 2, color: '#f59e0b', icon: 'fa-plane' },
                        { id: 6, name: 'Food', type: 'expense', parentId: 2, color: '#ec4899', icon: 'fa-utensils' },
                        { id: 7, name: 'Rent', type: 'expense', parentId: 2, color: '#6366f1', icon: 'fa-home' },
                        { id: 8, name: 'Utilities', type: 'expense', parentId: 2, color: '#14b8a6', icon: 'fa-bolt' }
                    ];
                    
                    const transaction = event.target.transaction;
                    const store = transaction.objectStore('categories');
                    defaultCategories.forEach(category => store.add(category));
                }

                // Logs store
                if (!db.objectStoreNames.contains('logs')) {
                    const logsStore = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
                    logsStore.createIndex('userId', 'userId', { unique: false });
                    logsStore.createIndex('action', 'action', { unique: false });
                    logsStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Files store (for attachments)
                if (!db.objectStoreNames.contains('files')) {
                    db.createObjectStore('files', { keyPath: 'id' });
                }
            };
        });
    }

    // Generic database operations
    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async getAll(storeName, indexName = null, query = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            let request;

            if (indexName) {
                const index = store.index(indexName);
                request = query ? index.getAll(query) : index.getAll();
            } else {
                request = store.getAll();
            }

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async update(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async query(storeName, indexName, query) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(query);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    // User operations
    async authenticate(username, password) {
        try {
            const user = await this.get('users', username);
            if (!user) {
                return { success: false, error: 'User not found' };
            }
            
            if (user.password !== password) {
                return { success: false, error: 'Invalid password' };
            }
            
            // Update last login
            user.lastLogin = new Date().toISOString();
            await this.update('users', user);
            
            // Log login activity
            await this.logActivity(username, 'login', 'User logged in');
            
            return { 
                success: true, 
                user: {
                    username: user.username,
                    fullName: user.fullName,
                    role: user.role,
                    email: user.email,
                    department: user.department,
                    profilePhoto: user.profilePhoto
                }
            };
        } catch (error) {
            console.error('Authentication error:', error);
            return { success: false, error: 'Authentication failed' };
        }
    }

    async createUser(userData) {
        try {
            // Check if user exists
            const existingUser = await this.get('users', userData.username);
            if (existingUser) {
                return { success: false, error: 'Username already exists' };
            }

            // Create new user
            const user = {
                username: userData.username,
                password: userData.password,
                role: userData.role || 'User',
                fullName: userData.fullName,
                email: userData.email || '',
                department: userData.department || '',
                profilePhoto: userData.profilePhoto || '',
                createdAt: new Date().toISOString(),
                lastLogin: null
            };

            await this.add('users', user);
            await this.logActivity('admin', 'user_create', `Created user: ${userData.username}`);
            
            return { success: true, user };
        } catch (error) {
            console.error('Create user error:', error);
            return { success: false, error: 'Failed to create user' };
        }
    }

    async updateUser(username, userData) {
        try {
            const user = await this.get('users', username);
            if (!user) {
                return { success: false, error: 'User not found' };
            }

            // Update allowed fields
            if (userData.password) user.password = userData.password;
            if (userData.fullName) user.fullName = userData.fullName;
            if (userData.email) user.email = userData.email;
            if (userData.department) user.department = userData.department;
            if (userData.profilePhoto !== undefined) user.profilePhoto = userData.profilePhoto;

            await this.update('users', user);
            await this.logActivity(username, 'user_update', 'Updated profile');
            
            return { success: true, user };
        } catch (error) {
            console.error('Update user error:', error);
            return { success: false, error: 'Failed to update user' };
        }
    }

    async getAllUsers() {
        try {
            const users = await this.getAll('users');
            return users.map(user => ({
                username: user.username,
                fullName: user.fullName,
                role: user.role,
                email: user.email,
                department: user.department,
                profilePhoto: user.profilePhoto,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            }));
        } catch (error) {
            console.error('Get all users error:', error);
            return [];
        }
    }

    // Transaction operations
    async createTransaction(transactionData, userId) {
        try {
            const id = Utils.generateId('txn');
            const timestamp = new Date().toISOString();
            
            const transaction = {
                id,
                ...transactionData,
                userId,
                createdBy: userId,
                createdAt: timestamp,
                lastModified: timestamp,
                status: transactionData.status || 'Pending',
                attachments: transactionData.attachments || []
            };

            await this.add('transactions', transaction);
            await this.logActivity(userId, 'transaction_create', `Created transaction: ${id}`);
            
            return { success: true, transaction };
        } catch (error) {
            console.error('Create transaction error:', error);
            return { success: false, error: 'Failed to create transaction' };
        }
    }

    async getTransaction(id) {
        try {
            const transaction = await this.get('transactions', id);
            return transaction;
        } catch (error) {
            console.error('Get transaction error:', error);
            return null;
        }
    }

    async getTransactions(filter = {}) {
        try {
            let transactions = await this.getAll('transactions');
            
            // Apply filters
            if (filter.userId) {
                transactions = transactions.filter(t => t.userId === filter.userId);
            }
            
            if (filter.type) {
                transactions = transactions.filter(t => t.type === filter.type);
            }
            
            if (filter.status) {
                transactions = transactions.filter(t => t.status === filter.status);
            }
            
            if (filter.month !== undefined) {
                transactions = transactions.filter(t => {
                    const date = new Date(t.date);
                    return date.getMonth() === parseInt(filter.month);
                });
            }
            
            if (filter.year !== undefined) {
                transactions = transactions.filter(t => {
                    const date = new Date(t.date);
                    return date.getFullYear() === parseInt(filter.year);
                });
            }
            
            if (filter.dateRange) {
                transactions = transactions.filter(t => {
                    const date = new Date(t.date);
                    return date >= new Date(filter.dateRange.start) && 
                           date <= new Date(filter.dateRange.end);
                });
            }
            
            // Sort by date (newest first)
            transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            return transactions;
        } catch (error) {
            console.error('Get transactions error:', error);
            return [];
        }
    }

    async updateTransaction(id, updateData) {
        try {
            const transaction = await this.get('transactions', id);
            if (!transaction) {
                return { success: false, error: 'Transaction not found' };
            }

            // Update fields
            Object.keys(updateData).forEach(key => {
                if (key !== 'id' && key !== 'createdAt' && key !== 'createdBy') {
                    transaction[key] = updateData[key];
                }
            });
            
            transaction.lastModified = new Date().toISOString();
            await this.update('transactions', transaction);
            
            await this.logActivity(updateData.updatedBy || 'system', 'transaction_update', 
                                 `Updated transaction: ${id}`);
            
            return { success: true, transaction };
        } catch (error) {
            console.error('Update transaction error:', error);
            return { success: false, error: 'Failed to update transaction' };
        }
    }

    async deleteTransaction(id, userId) {
        try {
            await this.delete('transactions', id);
            await this.logActivity(userId, 'transaction_delete', `Deleted transaction: ${id}`);
            return { success: true };
        } catch (error) {
            console.error('Delete transaction error:', error);
            return { success: false, error: 'Failed to delete transaction' };
        }
    }

    async updateTransactionStatus(id, status, comment, updatedBy) {
        try {
            const transaction = await this.get('transactions', id);
            if (!transaction) {
                return { success: false, error: 'Transaction not found' };
            }

            transaction.status = status;
            transaction.comments = transaction.comments || [];
            transaction.comments.push({
                text: comment,
                by: updatedBy,
                timestamp: new Date().toISOString()
            });
            
            transaction.lastModified = new Date().toISOString();
            await this.update('transactions', transaction);
            
            await this.logActivity(updatedBy, 'transaction_status', 
                                 `${status} transaction: ${id}`);
            
            return { success: true, transaction };
        } catch (error) {
            console.error('Update status error:', error);
            return { success: false, error: 'Failed to update status' };
        }
    }

    // Settings operations
    async getSetting(key) {
        try {
            const setting = await this.get('settings', key);
            return setting ? setting.value : null;
        } catch (error) {
            console.error('Get setting error:', error);
            return null;
        }
    }

    async updateSetting(key, value) {
        try {
            const setting = { key, value };
            await this.update('settings', setting);
            return { success: true };
        } catch (error) {
            console.error('Update setting error:', error);
            return { success: false, error: 'Failed to update setting' };
        }
    }

    async getAllSettings() {
        try {
            const settings = await this.getAll('settings');
            const result = {};
            settings.forEach(setting => {
                result[setting.key] = setting.value;
            });
            return result;
        } catch (error) {
            console.error('Get all settings error:', error);
            return {};
        }
    }

    // Category operations
    async getCategories(type = null) {
        try {
            let categories;
            if (type) {
                categories = await this.query('categories', 'type', type);
            } else {
                categories = await this.getAll('categories');
            }
            return categories;
        } catch (error) {
            console.error('Get categories error:', error);
            return [];
        }
    }

    async addCategory(category) {
        try {
            const newCategory = {
                ...category,
                createdAt: new Date().toISOString()
            };
            await this.add('categories', newCategory);
            return { success: true, category: newCategory };
        } catch (error) {
            console.error('Add category error:', error);
            return { success: false, error: 'Failed to add category' };
        }
    }

    // File operations
    async saveFile(fileData) {
        try {
            const id = Utils.generateId('file');
            const file = {
                id,
                ...fileData,
                uploadedAt: new Date().toISOString()
            };
            await this.add('files', file);
            return { success: true, id };
        } catch (error) {
            console.error('Save file error:', error);
            return { success: false, error: 'Failed to save file' };
        }
    }

    async getFile(id) {
        try {
            const file = await this.get('files', id);
            return file;
        } catch (error) {
            console.error('Get file error:', error);
            return null;
        }
    }

    // Log operations
    async logActivity(userId, action, details) {
        try {
            const log = {
                userId,
                action,
                details,
                timestamp: new Date().toISOString()
            };
            await this.add('logs', log);
        } catch (error) {
            console.error('Log activity error:', error);
        }
    }

    async getLogs(filter = {}) {
        try {
            let logs = await this.getAll('logs');
            
            if (filter.userId) {
                logs = logs.filter(log => log.userId === filter.userId);
            }
            
            if (filter.action) {
                logs = logs.filter(log => log.action === filter.action);
            }
            
            if (filter.startDate) {
                logs = logs.filter(log => new Date(log.timestamp) >= new Date(filter.startDate));
            }
            
            if (filter.endDate) {
                logs = logs.filter(log => new Date(log.timestamp) <= new Date(filter.endDate));
            }
            
            logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            return logs;
        } catch (error) {
            console.error('Get logs error:', error);
            return [];
        }
    }

    // Statistics
    async getStatistics(userId = null) {
        try {
            const transactions = await this.getTransactions(userId ? { userId } : {});
            const users = await this.getAllUsers();
            
            const stats = {
                totalTransactions: transactions.length,
                totalUsers: users.length,
                totalAdmins: users.filter(u => u.role === 'Admin').length,
                totalAmount: 0,
                totalIncome: 0,
                totalExpense: 0,
                pendingCount: 0,
                approvedCount: 0,
                rejectedCount: 0,
                monthlyData: {},
                userStats: {}
            };
            
            // Calculate transaction statistics
            transactions.forEach(transaction => {
                const amount = parseFloat(transaction.amount) || 0;
                stats.totalAmount += amount;
                
                if (transaction.type === 'Income') {
                    stats.totalIncome += amount;
                } else {
                    stats.totalExpense += amount;
                }
                
                if (transaction.status === 'Pending') stats.pendingCount++;
                if (transaction.status === 'Approved') stats.approvedCount++;
                if (transaction.status === 'Rejected') stats.rejectedCount++;
                
                // Monthly data
                const date = new Date(transaction.date);
                const monthYear = `${date.getFullYear()}-${date.getMonth() + 1}`;
                if (!stats.monthlyData[monthYear]) {
                    stats.monthlyData[monthYear] = { income: 0, expense: 0, count: 0 };
                }
                
                if (transaction.type === 'Income') {
                    stats.monthlyData[monthYear].income += amount;
                } else {
                    stats.monthlyData[monthYear].expense += amount;
                }
                stats.monthlyData[monthYear].count++;
                
                // User stats
                if (!stats.userStats[transaction.userId]) {
                    stats.userStats[transaction.userId] = {
                        username: transaction.userId,
                        total: 0,
                        pending: 0,
                        approved: 0,
                        rejected: 0,
                        totalAmount: 0
                    };
                }
                
                const userStat = stats.userStats[transaction.userId];
                userStat.total++;
                userStat.totalAmount += amount;
                
                if (transaction.status === 'Pending') userStat.pending++;
                if (transaction.status === 'Approved') userStat.approved++;
                if (transaction.status === 'Rejected') userStat.rejected++;
            });
            
            stats.netBalance = stats.totalIncome - stats.totalExpense;
            stats.userStats = Object.values(stats.userStats);
            
            return stats;
        } catch (error) {
            console.error('Get statistics error:', error);
            return null;
        }
    }

    // Export data
    async exportData() {
        try {
            const data = {
                users: await this.getAll('users'),
                transactions: await this.getAll('transactions'),
                settings: await this.getAll('settings'),
                categories: await this.getAll('categories'),
                logs: await this.getAll('logs'),
                files: await this.getAll('files'),
                exportDate: new Date().toISOString(),
                version: this.version
            };
            
            return { success: true, data };
        } catch (error) {
            console.error('Export data error:', error);
            return { success: false, error: 'Failed to export data' };
        }
    }

    // Import data
    async importData(importData) {
        try {
            const transaction = this.db.transaction(
                ['users', 'transactions', 'settings', 'categories', 'logs', 'files'],
                'readwrite'
            );
            
            // Clear existing data
            await Promise.all([
                this.clearStore('users'),
                this.clearStore('transactions'),
                this.clearStore('settings'),
                this.clearStore('categories'),
                this.clearStore('logs'),
                this.clearStore('files')
            ]);
            
            // Import new data
            const promises = [];
            
            if (importData.users) {
                importData.users.forEach(user => {
                    promises.push(this.add('users', user));
                });
            }
            
            if (importData.transactions) {
                importData.transactions.forEach(txn => {
                    promises.push(this.add('transactions', txn));
                });
            }
            
            if (importData.settings) {
                importData.settings.forEach(setting => {
                    promises.push(this.add('settings', setting));
                });
            }
            
            if (importData.categories) {
                importData.categories.forEach(category => {
                    promises.push(this.add('categories', category));
                });
            }
            
            if (importData.logs) {
                importData.logs.forEach(log => {
                    promises.push(this.add('logs', log));
                });
            }
            
            if (importData.files) {
                importData.files.forEach(file => {
                    promises.push(this.add('files', file));
                });
            }
            
            await Promise.all(promises);
            await this.logActivity('system', 'data_import', 'Imported data from backup');
            
            return { success: true };
        } catch (error) {
            console.error('Import data error:', error);
            return { success: false, error: 'Failed to import data' };
        }
    }

    async clearStore(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    }

    // Backup and restore
    async backup() {
        const data = await this.exportData();
        if (data.success) {
            const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `expensepro-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
        return data;
    }

    async restore(backupFile) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    const result = await this.importData(data);
                    resolve(result);
                } catch (error) {
                    resolve({ success: false, error: 'Invalid backup file' });
                }
            };
            reader.readAsText(backupFile);
        });
    }
}

// Create global database instance
const db = new Database();

export default db;