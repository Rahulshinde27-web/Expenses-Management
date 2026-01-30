// Main Application Controller
class ExpenseProApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.isMobile = window.innerWidth <= 768;
        this.init();
    }

    init() {
        // Initialize components
        this.setupNavigation();
        this.setupEventListeners();
        this.setupResponsive();
        this.setupServiceWorker();
        
        // Check authentication status
        this.checkAuthStatus();
        
        // Show welcome message
        this.showWelcomeMessage();
    }

    setupNavigation() {
        // Navigation items
        document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                
                const page = item.dataset.page || item.getAttribute('data-page');
                if (page) {
                    this.navigateTo(page);
                }
            });
        });
        
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                document.getElementById('sidebar').classList.toggle('open');
            });
        }
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (this.isMobile) {
                const sidebar = document.getElementById('sidebar');
                const toggleBtn = document.getElementById('sidebar-toggle');
                
                if (sidebar && sidebar.classList.contains('open') &&
                    !sidebar.contains(e.target) &&
                    !toggleBtn.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            }
        });
    }

    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', Utils.debounce(() => {
            this.isMobile = window.innerWidth <= 768;
            this.handleResize();
        }, 250));
        
        // Online/offline status
        window.addEventListener('online', () => {
            Utils.showNotification('You are back online', 'success');
        });
        
        window.addEventListener('offline', () => {
            Utils.showNotification('You are offline. Some features may be limited.', 'warning');
        });
        
        // Before unload
        window.addEventListener('beforeunload', (e) => {
            // Save current state
            this.saveAppState();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K for search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.focusSearch();
            }
            
            // Escape to close modals
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    setupResponsive() {
        // Handle initial responsive setup
        this.handleResize();
        
        // Add responsive class to body
        if (this.isMobile) {
            document.body.classList.add('mobile');
        } else {
            document.body.classList.remove('mobile');
        }
    }

    async setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.worker.register('/sw.js');
                console.log('ServiceWorker registered:', registration);
            } catch (error) {
                console.log('ServiceWorker registration failed:', error);
            }
        }
    }

    checkAuthStatus() {
        // Authentication is handled by AuthManager
        // This method can be used for additional checks
    }

    async navigateTo(page) {
        // Save previous page
        const previousPage = this.currentPage;
        this.currentPage = page;
        
        // Update active navigation
        this.updateActiveNav(page);
        
        // Close sidebar on mobile
        if (this.isMobile) {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.remove('open');
            }
        }
        
        // Load page content
        await this.loadPage(page, previousPage);
        
        // Update page title
        this.updatePageTitle(page);
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Save navigation state
        this.saveNavigationState();
    }

    updateActiveNav(page) {
        // Update sidebar nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === page) {
                item.classList.add('active');
            }
        });
        
        // Update mobile nav
        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === page) {
                item.classList.add('active');
            }
        });
    }

    async loadPage(page, previousPage) {
        const pageContent = document.getElementById('page-content');
        if (!pageContent) return;
        
        // Show loading
        pageContent.innerHTML = this.getLoadingHTML();
        
        try {
            let html = '';
            
            switch (page) {
                case 'dashboard':
                    html = await this.loadDashboardPage();
                    break;
                    
                case 'transactions':
                    html = await this.loadTransactionsPage();
                    break;
                    
                case 'add-transaction':
                    html = await this.loadAddTransactionPage();
                    break;
                    
                case 'reports':
                    html = await this.loadReportsPage();
                    break;
                    
                case 'admin':
                    if (auth.isAdmin()) {
                        html = await this.loadAdminPage();
                    } else {
                        html = this.getAccessDeniedHTML();
                    }
                    break;
                    
                case 'analytics':
                    if (auth.isAdmin()) {
                        html = await this.loadAnalyticsPage();
                    } else {
                        html = this.getAccessDeniedHTML();
                    }
                    break;
                    
                case 'calendar':
                    html = await this.loadCalendarPage();
                    break;
                    
                case 'profile':
                    html = await this.loadProfilePage();
                    break;
                    
                case 'settings':
                    html = await this.loadSettingsPage();
                    break;
                    
                default:
                    html = this.getPageNotFoundHTML();
            }
            
            // Update content
            pageContent.innerHTML = html;
            
            // Initialize page-specific functionality
            this.initializePage(page);
            
        } catch (error) {
            console.error(`Error loading page ${page}:`, error);
            pageContent.innerHTML = this.getErrorHTML(error);
        }
    }

    getLoadingHTML() {
        return `
            <div class="loading-container">
                <div class="spinner"></div>
                <p>Loading...</p>
            </div>
        `;
    }

    getErrorHTML(error) {
        return `
            <div class="error-container">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error Loading Page</h3>
                <p>${error.message || 'An error occurred while loading the page.'}</p>
                <button class="btn btn-primary" onclick="app.navigateTo('dashboard')">
                    Return to Dashboard
                </button>
            </div>
        `;
    }

    getAccessDeniedHTML() {
        return `
            <div class="access-denied">
                <i class="fas fa-lock"></i>
                <h3>Access Denied</h3>
                <p>You don't have permission to access this page.</p>
                <button class="btn btn-primary" onclick="app.navigateTo('dashboard')">
                    Return to Dashboard
                </button>
            </div>
        `;
    }

    getPageNotFoundHTML() {
        return `
            <div class="page-not-found">
                <i class="fas fa-map-signs"></i>
                <h3>Page Not Found</h3>
                <p>The page you're looking for doesn't exist.</p>
                <button class="btn btn-primary" onclick="app.navigateTo('dashboard')">
                    Return to Dashboard
                </button>
            </div>
        `;
    }

    async loadDashboardPage() {
        // Dashboard page HTML
        return `
            <div class="dashboard-page">
                <!-- Stats Grid -->
                <div class="stats-grid" id="dashboard-stats">
                    <!-- Stats will be loaded by dashboard.js -->
                </div>
                
                <!-- Charts -->
                <div class="form-grid">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Monthly Overview</h3>
                        </div>
                        <div class="chart-container">
                            <canvas id="monthlyChart"></canvas>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Category Distribution</h3>
                        </div>
                        <div class="chart-container">
                            <canvas id="categoryChart"></canvas>
                        </div>
                    </div>
                </div>
                
                <!-- Recent Transactions -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Recent Transactions</h3>
                        <button class="btn btn-sm btn-outline" onclick="app.navigateTo('transactions')">
                            View All
                        </button>
                    </div>
                    <div class="table-responsive">
                        <table class="table" id="recent-transactions">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Description</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <!-- Transactions will be loaded by dashboard.js -->
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Quick Stats -->
                <div class="form-grid">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Quick Stats</h3>
                        </div>
                        <div class="quick-stats">
                            <div class="quick-stat">
                                <span class="quick-stat-label">This Month</span>
                                <span class="quick-stat-value" id="monthly-income">₹0</span>
                            </div>
                            <div class="quick-stat">
                                <span class="quick-stat-label">This Week</span>
                                <span class="quick-stat-value" id="weekly-expense">₹0</span>
                            </div>
                            <div class="quick-stat">
                                <span class="quick-stat-label">Today</span>
                                <span class="quick-stat-value" id="daily-transactions">0</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Quick Actions</h3>
                        </div>
                        <div class="quick-actions-grid">
                            <button class="btn btn-success" onclick="quickAdd('income')">
                                <i class="fas fa-plus-circle"></i> Quick Income
                            </button>
                            <button class="btn btn-danger" onclick="quickAdd('expense')">
                                <i class="fas fa-minus-circle"></i> Quick Expense
                            </button>
                            <button class="btn btn-primary" onclick="app.navigateTo('reports')">
                                <i class="fas fa-chart-bar"></i> Generate Report
                            </button>
                            ${auth.isAdmin() ? `
                                <button class="btn btn-warning" onclick="app.navigateTo('admin')">
                                    <i class="fas fa-user-shield"></i> Admin Panel
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadTransactionsPage() {
        // Transactions page HTML
        return `
            <div class="transactions-page">
                <!-- Filters -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Filter Transactions</h3>
                    </div>
                    <form id="filter-form" class="filter-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Date Range</label>
                                <div class="date-range">
                                    <input type="date" id="start-date" class="form-control" 
                                           value="${this.getFirstDayOfMonth()}">
                                    <span>to</span>
                                    <input type="date" id="end-date" class="form-control" 
                                           value="${new Date().toISOString().split('T')[0]}">
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label>Type</label>
                                <select id="type-filter" class="form-control">
                                    <option value="">All Types</option>
                                    <option value="Income">Income</option>
                                    <option value="Expense">Expense</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>Status</label>
                                <select id="status-filter" class="form-control">
                                    <option value="">All Status</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>Category</label>
                                <select id="category-filter" class="form-control">
                                    <option value="">All Categories</option>
                                    <!-- Categories will be loaded dynamically -->
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Amount Range</label>
                                <div class="amount-range">
                                    <input type="number" id="min-amount" class="form-control" 
                                           placeholder="Min" step="0.01" min="0">
                                    <span>to</span>
                                    <input type="number" id="max-amount" class="form-control" 
                                           placeholder="Max" step="0.01" min="0">
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label>Search</label>
                                <input type="text" id="search-filter" class="form-control" 
                                       placeholder="Search in descriptions...">
                            </div>
                            
                            <div class="form-group" style="align-self: flex-end;">
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-filter"></i> Apply Filters
                                </button>
                                <button type="reset" class="btn btn-outline">
                                    <i class="fas fa-undo"></i> Reset
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
                
                <!-- Bulk Actions -->
                <div class="bulk-actions" id="bulk-actions" style="display: none;">
                    <div class="selected-count">
                        <span id="selected-count">0</span> selected
                    </div>
                    <div class="bulk-buttons">
                        <button class="btn btn-sm btn-success" data-bulk-action="approve">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="btn btn-sm btn-danger" data-bulk-action="reject">
                            <i class="fas fa-times"></i> Reject
                        </button>
                        <button class="btn btn-sm btn-warning" data-bulk-action="delete">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                        <button class="btn btn-sm btn-info" data-bulk-action="export">
                            <i class="fas fa-download"></i> Export
                        </button>
                    </div>
                </div>
                
                <!-- Transactions Table -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Transactions</h3>
                        <div class="header-actions">
                            <div class="summary" id="transactions-summary">
                                <!-- Summary will be loaded dynamically -->
                            </div>
                            <div class="export-buttons">
                                <button class="btn btn-sm btn-success" data-export="csv">
                                    <i class="fas fa-file-csv"></i> CSV
                                </button>
                                <button class="btn btn-sm btn-success" data-export="excel">
                                    <i class="fas fa-file-excel"></i> Excel
                                </button>
                                <button class="btn btn-sm btn-info" data-export="json">
                                    <i class="fas fa-file-code"></i> JSON
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table class="table" id="transactions-table">
                            <thead>
                                <tr>
                                    <th width="40">
                                        <input type="checkbox" id="select-all" 
                                               onchange="transactions.toggleSelectAll(this)">
                                    </th>
                                    <th>Date</th>
                                    <th>Description</th>
                                    <th>Type</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Approver</th>
                                    <th>Attachments</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <!-- Transactions will be loaded dynamically -->
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Pagination -->
                    <div class="card-footer">
                        <div class="pagination-container" id="pagination">
                            <!-- Pagination will be loaded dynamically -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadAddTransactionPage() {
        // Get categories and settings
        const categories = await db.getCategories();
        const settings = await db.getAllSettings();
        
        // Add Transaction page HTML
        return `
            <div class="add-transaction-page">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Add New Transaction</h3>
                    </div>
                    <form id="add-transaction-form" class="transaction-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Transaction Type *</label>
                                <select id="transaction-type" class="form-control" required>
                                    <option value="">Select Type</option>
                                    <option value="Income">Income</option>
                                    <option value="Expense">Expense</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>Date *</label>
                                <input type="date" id="transaction-date" class="form-control" 
                                       value="${new Date().toISOString().split('T')[0]}" required>
                            </div>
                            
                            <div class="form-group">
                                <label>Amount (₹) *</label>
                                <input type="number" id="transaction-amount" class="form-control" 
                                       step="0.01" min="0" required placeholder="0.00">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Category</label>
                                <select id="transaction-category" class="form-control">
                                    <option value="">Select Category</option>
                                    ${categories.map(cat => `
                                        <option value="${cat.name}">${cat.name}</option>
                                    `).join('')}
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>Approver</label>
                                <select id="transaction-approver" class="form-control">
                                    <option value="">Select Approver</option>
                                    ${settings.approvers?.map(approver => `
                                        <option value="${approver}">${approver}</option>
                                    `).join('') || ''}
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>Priority</label>
                                <select id="transaction-priority" class="form-control">
                                    <option value="Normal">Normal</option>
                                    <option value="High">High</option>
                                    <option value="Urgent">Urgent</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Description *</label>
                            <textarea id="transaction-description" class="form-control" 
                                      rows="3" required placeholder="Enter transaction description..."></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label>Notes</label>
                            <textarea id="transaction-notes" class="form-control" 
                                      rows="2" placeholder="Additional notes..."></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label>Attachments (Optional)</label>
                            <div class="file-upload">
                                <input type="file" id="transaction-attachments" 
                                       multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx">
                                <label for="transaction-attachments" class="file-upload-label">
                                    <i class="fas fa-cloud-upload-alt"></i>
                                    <span>Click to upload or drag and drop</span>
                                    <small class="text-muted">PDF, Images, Word, Excel (Max 10MB each)</small>
                                </label>
                            </div>
                            <div id="attachment-preview" class="attachment-preview"></div>
                        </div>
                        
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-paper-plane"></i> Submit Transaction
                            </button>
                            <button type="reset" class="btn btn-outline">
                                <i class="fas fa-undo"></i> Reset
                            </button>
                            <button type="button" class="btn btn-outline" onclick="app.navigateTo('transactions')">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                        </div>
                    </form>
                </div>
                
                <!-- Quick Templates -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Quick Templates</h3>
                    </div>
                    <div class="templates-grid">
                        <button class="template-btn" onclick="fillTemplate('travel')">
                            <i class="fas fa-plane"></i>
                            <span>Travel Expense</span>
                        </button>
                        <button class="template-btn" onclick="fillTemplate('food')">
                            <i class="fas fa-utensils"></i>
                            <span>Food & Beverage</span>
                        </button>
                        <button class="template-btn" onclick="fillTemplate('office')">
                            <i class="fas fa-briefcase"></i>
                            <span>Office Supplies</span>
                        </button>
                        <button class="template-btn" onclick="fillTemplate('salary')">
                            <i class="fas fa-money-bill-wave"></i>
                            <span>Salary Payment</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async loadReportsPage() {
        // Reports page HTML
        return `
            <div class="reports-page">
                <!-- Report Generator -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Generate Report</h3>
                    </div>
                    <form id="report-form" class="report-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Report Type</label>
                                <select id="report-type" class="form-control">
                                    <option value="summary">Summary Report</option>
                                    <option value="detailed">Detailed Report</option>
                                    <option value="monthly">Monthly Report</option>
                                    <option value="yearly">Yearly Report</option>
                                    <option value="category">Category-wise Report</option>
                                    <option value="user">User-wise Report</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>Period</label>
                                <select id="report-period" class="form-control">
                                    <option value="this_month">This Month</option>
                                    <option value="last_month">Last Month</option>
                                    <option value="this_quarter">This Quarter</option>
                                    <option value="last_quarter">Last Quarter</option>
                                    <option value="this_year">This Year</option>
                                    <option value="last_year">Last Year</option>
                                    <option value="custom">Custom Range</option>
                                </select>
                            </div>
                            
                            <div class="form-group" id="custom-range" style="display: none;">
                                <label>Custom Range</label>
                                <div class="date-range">
                                    <input type="date" id="custom-start" class="form-control">
                                    <span>to</span>
                                    <input type="date" id="custom-end" class="form-control">
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Format</label>
                                <select id="report-format" class="form-control">
                                    <option value="html">HTML</option>
                                    <option value="pdf">PDF</option>
                                    <option value="excel">Excel</option>
                                    <option value="csv">CSV</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>Include</label>
                                <div class="checkbox-group">
                                    <label><input type="checkbox" name="include[]" value="transactions" checked> Transactions</label>
                                    <label><input type="checkbox" name="include[]" value="summary" checked> Summary</label>
                                    <label><input type="checkbox" name="include[]" value="charts" checked> Charts</label>
                                    <label><input type="checkbox" name="include[]" value="attachments"> Attachments</label>
                                </div>
                            </div>
                            
                            <div class="form-group" style="align-self: flex-end;">
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-chart-bar"></i> Generate Report
                                </button>
                                <button type="button" class="btn btn-success" onclick="exportReport()">
                                    <i class="fas fa-download"></i> Export
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
                
                <!-- Report Preview -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Report Preview</h3>
                        <div class="report-actions">
                            <button class="btn btn-sm btn-outline" onclick="printReport()">
                                <i class="fas fa-print"></i> Print
                            </button>
                            <button class="btn btn-sm btn-outline" onclick="saveReport()">
                                <i class="fas fa-save"></i> Save
                            </button>
                        </div>
                    </div>
                    <div class="report-preview" id="report-preview">
                        <!-- Report will be generated here -->
                        <div class="empty-state">
                            <i class="fas fa-chart-bar"></i>
                            <p>Generate a report to preview it here</p>
                        </div>
                    </div>
                </div>
                
                <!-- Saved Reports -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Saved Reports</h3>
                    </div>
                    <div class="table-responsive">
                        <table class="table" id="saved-reports-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Date</th>
                                    <th>Period</th>
                                    <th>Size</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colspan="6" class="empty-state">
                                        <i class="fas fa-folder-open"></i>
                                        <p>No saved reports</p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    async loadAdminPage() {
        if (!auth.isAdmin()) {
            return this.getAccessDeniedHTML();
        }
        
        // Admin page HTML
        return `
            <div class="admin-page">
                <!-- Admin Stats -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-header">
                            <div class="stat-icon">
                                <i class="fas fa-users"></i>
                            </div>
                        </div>
                        <div class="stat-value" id="admin-total-users">0</div>
                        <div class="stat-label">Total Users</div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-header">
                            <div class="stat-icon pending">
                                <i class="fas fa-clock"></i>
                            </div>
                        </div>
                        <div class="stat-value" id="admin-pending-count">0</div>
                        <div class="stat-label">Pending Approvals</div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-header">
                            <div class="stat-icon income">
                                <i class="fas fa-rupee-sign"></i>
                            </div>
                        </div>
                        <div class="stat-value" id="admin-total-amount">₹0</div>
                        <div class="stat-label">Total Amount</div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-header">
                            <div class="stat-icon">
                                <i class="fas fa-exchange-alt"></i>
                            </div>
                        </div>
                        <div class="stat-value" id="admin-total-transactions">0</div>
                        <div class="stat-label">Total Transactions</div>
                    </div>
                </div>
                
                <!-- Pending Approvals -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Pending Approvals</h3>
                        <button class="btn btn-sm btn-outline" onclick="admin.loadPendingApprovals()">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                    </div>
                    <div class="table-responsive">
                        <table class="table" id="pending-approvals-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Date</th>
                                    <th>Description</th>
                                    <th>Type</th>
                                    <th>Amount</th>
                                    <th>Attachments</th>
                                    <th>Approver</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <!-- Pending approvals will be loaded dynamically -->
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- User Management -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">User Management</h3>
                        <button class="btn btn-sm btn-primary" onclick="openAddUserModal()">
                            <i class="fas fa-user-plus"></i> Add User
                        </button>
                    </div>
                    <div class="table-responsive">
                        <table class="table" id="user-stats-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Role</th>
                                    <th>Department</th>
                                    <th>Transactions</th>
                                    <th>Income</th>
                                    <th>Expense</th>
                                    <th>Balance</th>
                                    <th>Pending</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <!-- User statistics will be loaded dynamically -->
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- System Actions -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">System Administration</h3>
                    </div>
                    <div class="system-actions">
                        <button class="btn btn-outline" data-system-action="backup">
                            <i class="fas fa-database"></i> Backup Data
                        </button>
                        <button class="btn btn-outline" data-system-action="restore">
                            <i class="fas fa-file-import"></i> Restore Backup
                        </button>
                        <button class="btn btn-outline" data-system-action="clear-data">
                            <i class="fas fa-trash"></i> Clear Data
                        </button>
                        <button class="btn btn-outline" data-system-action="export-logs">
                            <i class="fas fa-history"></i> Export Logs
                        </button>
                        <button class="btn btn-outline" data-system-action="system-info">
                            <i class="fas fa-info-circle"></i> System Info
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async loadAnalyticsPage() {
        if (!auth.isAdmin()) {
            return this.getAccessDeniedHTML();
        }
        
        // Analytics page HTML
        return `
            <div class="analytics-page">
                <!-- Analytics Charts -->
                <div class="form-grid">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">User Activity</h3>
                        </div>
                        <div class="chart-container">
                            <canvas id="userActivityChart"></canvas>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Monthly Performance</h3>
                        </div>
                        <div class="chart-container">
                            <canvas id="performanceChart"></canvas>
                        </div>
                    </div>
                </div>
                
                <!-- Detailed Statistics -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">System Statistics</h3>
                        <button class="btn btn-sm btn-outline" onclick="admin.loadSystemStatistics()">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                    </div>
                    <div class="stats-details">
                        <div class="stat-detail">
                            <span class="stat-detail-label">Total Transactions</span>
                            <span class="stat-detail-value" id="system-total-transactions">0</span>
                        </div>
                        <div class="stat-detail">
                            <span class="stat-detail-label">Total Users</span>
                            <span class="stat-detail-value" id="system-total-users">0</span>
                        </div>
                        <div class="stat-detail">
                            <span class="stat-detail-label">Total Admins</span>
                            <span class="stat-detail-value" id="system-total-admins">0</span>
                        </div>
                        <div class="stat-detail">
                            <span class="stat-detail-label">Total Amount</span>
                            <span class="stat-detail-value" id="system-total-amount">₹0</span>
                        </div>
                        <div class="stat-detail">
                            <span class="stat-detail-label">Total Income</span>
                            <span class="stat-detail-value" id="system-total-income">₹0</span>
                        </div>
                        <div class="stat-detail">
                            <span class="stat-detail-label">Total Expense</span>
                            <span class="stat-detail-value" id="system-total-expense">₹0</span>
                        </div>
                        <div class="stat-detail">
                            <span class="stat-detail-label">Net Balance</span>
                            <span class="stat-detail-value" id="system-net-balance">₹0</span>
                        </div>
                        <div class="stat-detail">
                            <span class="stat-detail-label">Pending Count</span>
                            <span class="stat-detail-value" id="system-pending-count">0</span>
                        </div>
                        <div class="stat-detail">
                            <span class="stat-detail-label">Approved Count</span>
                            <span class="stat-detail-value" id="system-approved-count">0</span>
                        </div>
                        <div class="stat-detail">
                            <span class="stat-detail-label">Rejected Count</span>
                            <span class="stat-detail-value" id="system-rejected-count">0</span>
                        </div>
                    </div>
                </div>
                
                <!-- Recent Activities -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Recent Activities</h3>
                        <button class="btn btn-sm btn-outline" onclick="admin.loadRecentActivities()">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                    </div>
                    <div class="recent-activities" id="recent-activities">
                        <!-- Recent activities will be loaded dynamically -->
                    </div>
                </div>
            </div>
        `;
    }

    async loadCalendarPage() {
        // Calendar page HTML
        return `
            <div class="calendar-page">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Transaction Calendar</h3>
                        <div class="calendar-controls">
                            <button class="btn btn-sm btn-outline" onclick="prevMonth()">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            <span id="current-month">${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
                            <button class="btn btn-sm btn-outline" onclick="nextMonth()">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                            <button class="btn btn-sm btn-primary" onclick="today()">
                                Today
                            </button>
                        </div>
                    </div>
                    <div class="calendar-container" id="calendar">
                        <!-- Calendar will be generated here -->
                    </div>
                </div>
                
                <!-- Upcoming Transactions -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Upcoming Transactions</h3>
                    </div>
                    <div class="upcoming-transactions" id="upcoming-transactions">
                        <!-- Upcoming transactions will be loaded dynamically -->
                    </div>
                </div>
            </div>
        `;
    }

    async loadProfilePage() {
        const user = auth.getCurrentUser();
        if (!user) {
            return this.getAccessDeniedHTML();
        }
        
        // Profile page HTML
        return `
            <div class="profile-page">
                <div class="card">
                    <div class="profile-header">
                        <div class="profile-avatar-large">
                            ${user.profilePhoto ? `
                                <img src="${user.profilePhoto}" alt="${user.fullName}">
                            ` : `
                                <span>${user.fullName.charAt(0).toUpperCase()}</span>
                            `}
                            <button class="avatar-edit" onclick="changeProfilePhoto()">
                                <i class="fas fa-camera"></i>
                            </button>
                        </div>
                        <div class="profile-info">
                            <h3>${user.fullName}</h3>
                            <p class="text-muted">${user.username} • ${user.role}</p>
                            <p class="profile-details">
                                <i class="fas fa-envelope"></i> ${user.email || 'No email'}
                                <br>
                                <i class="fas fa-building"></i> ${user.department || 'No department'}
                            </p>
                        </div>
                    </div>
                </div>
                
                <!-- Profile Form -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Edit Profile</h3>
                    </div>
                    <form id="profile-form" class="profile-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Full Name *</label>
                                <input type="text" id="profile-fullname" class="form-control" 
                                       value="${user.fullName}" required>
                            </div>
                            
                            <div class="form-group">
                                <label>Email</label>
                                <input type="email" id="profile-email" class="form-control" 
                                       value="${user.email || ''}">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Department</label>
                                <input type="text" id="profile-department" class="form-control" 
                                       value="${user.department || ''}">
                            </div>
                            
                            <div class="form-group">
                                <label>Phone Number</label>
                                <input type="tel" id="profile-phone" class="form-control">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Bio</label>
                            <textarea id="profile-bio" class="form-control" rows="3" 
                                      placeholder="Tell us about yourself..."></textarea>
                        </div>
                        
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> Save Changes
                            </button>
                        </div>
                    </form>
                </div>
                
                <!-- Change Password -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Change Password</h3>
                    </div>
                    <form id="password-form" class="password-form">
                        <div class="form-group">
                            <label>Current Password *</label>
                            <input type="password" id="current-password" class="form-control" required>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>New Password *</label>
                                <input type="password" id="new-password" class="form-control" required>
                            </div>
                            
                            <div class="form-group">
                                <label>Confirm New Password *</label>
                                <input type="password" id="confirm-password" class="form-control" required>
                            </div>
                        </div>
                        
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-key"></i> Change Password
                            </button>
                        </div>
                    </form>
                </div>
                
                <!-- Account Statistics -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Account Statistics</h3>
                    </div>
                    <div class="account-stats">
                        <div class="account-stat">
                            <span class="stat-label">Total Transactions</span>
                            <span class="stat-value" id="account-total-txn">0</span>
                        </div>
                        <div class="account-stat">
                            <span class="stat-label">Pending</span>
                            <span class="stat-value" id="account-pending">0</span>
                        </div>
                        <div class="account-stat">
                            <span class="stat-label">Approved</span>
                            <span class="stat-value" id="account-approved">0</span>
                        </div>
                        <div class="account-stat">
                            <span class="stat-label">Member Since</span>
                            <span class="stat-value" id="account-created">${Utils.formatDate(user.createdAt || new Date().toISOString(), 'dd/MM/yyyy')}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadSettingsPage() {
        const user = auth.getCurrentUser();
        if (!user) {
            return this.getAccessDeniedHTML();
        }
        
        // Settings page HTML
        return `
            <div class="settings-page">
                <!-- Application Settings -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Application Settings</h3>
                    </div>
                    <form id="app-settings-form" class="settings-form">
                        <div class="form-group">
                            <label>Default Page</label>
                            <select id="default-page" class="form-control">
                                <option value="dashboard">Dashboard</option>
                                <option value="transactions">Transactions</option>
                                <option value="reports">Reports</option>
                                <option value="calendar">Calendar</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Theme</label>
                            <select id="theme" class="form-control">
                                <option value="light">Light</option>
                                <option value="dark">Dark</option>
                                <option value="auto">Auto (System)</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Items Per Page</label>
                            <select id="items-per-page" class="form-control">
                                <option value="10">10</option>
                                <option value="20" selected>20</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Currency</label>
                            <select id="currency" class="form-control">
                                <option value="₹">Indian Rupee (₹)</option>
                                <option value="$">US Dollar ($)</option>
                                <option value="€">Euro (€)</option>
                                <option value="£">British Pound (£)</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Date Format</label>
                            <select id="date-format" class="form-control">
                                <option value="dd/MM/yyyy">DD/MM/YYYY</option>
                                <option value="MM/dd/yyyy">MM/DD/YYYY</option>
                                <option value="yyyy-MM-dd">YYYY-MM-DD</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <div class="checkbox-group">
                                <label>
                                    <input type="checkbox" id="notifications" checked>
                                    Enable Notifications
                                </label>
                                <label>
                                    <input type="checkbox" id="auto-save">
                                    Auto-save Forms
                                </label>
                                <label>
                                    <input type="checkbox" id="confirm-actions" checked>
                                    Confirm Critical Actions
                                </label>
                                <label>
                                    <input type="checkbox" id="show-tutorial">
                                    Show Tutorial on Startup
                                </label>
                            </div>
                        </div>
                        
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> Save Settings
                            </button>
                            <button type="button" class="btn btn-outline" onclick="resetSettings()">
                                <i class="fas fa-undo"></i> Reset to Defaults
                            </button>
                        </div>
                    </form>
                </div>
                
                <!-- Data Management -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Data Management</h3>
                    </div>
                    <div class="data-management">
                        <button class="btn btn-outline" onclick="exportUserData()">
                            <i class="fas fa-download"></i> Export My Data
                        </button>
                        <button class="btn btn-outline" onclick="importUserData()">
                            <i class="fas fa-upload"></i> Import Data
                        </button>
                        <button class="btn btn-outline" onclick="clearUserData()">
                            <i class="fas fa-trash"></i> Clear My Data
                        </button>
                        <button class="btn btn-outline" onclick="deleteAccount()">
                            <i class="fas fa-user-times"></i> Delete Account
                        </button>
                    </div>
                </div>
                
                <!-- About -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">About ExpensePro</h3>
                    </div>
                    <div class="about-content">
                        <p><strong>Version:</strong> 2.0.0</p>
                        <p><strong>Build Date:</strong> ${new Date().toLocaleDateString()}</p>
                        <p><strong>Database:</strong> IndexedDB</p>
                        <p><strong>License:</strong> MIT</p>
                        <p><strong>Developer:</strong> ExpensePro Team</p>
                        <hr>
                        <p class="text-muted">
                            ExpensePro is a web-based expense management system built with modern web technologies.
                            It works offline and stores all data locally in your browser.
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    initializePage(page) {
        switch (page) {
            case 'dashboard':
                // Initialize dashboard
                if (typeof dashboard !== 'undefined') {
                    dashboard.loadDashboardData();
                }
                break;
                
            case 'transactions':
                // Initialize transactions
                if (typeof transactions !== 'undefined') {
                    transactions.loadTransactions();
                }
                break;
                
            case 'add-transaction':
                // Initialize add transaction form
                this.initializeAddTransactionForm();
                break;
                
            case 'reports':
                // Initialize reports
                this.initializeReports();
                break;
                
            case 'admin':
                // Initialize admin
                if (typeof admin !== 'undefined') {
                    admin.loadAdminData();
                }
                break;
                
            case 'analytics':
                // Initialize analytics
                if (typeof admin !== 'undefined') {
                    // Load analytics data
                }
                break;
                
            case 'calendar':
                // Initialize calendar
                this.initializeCalendar();
                break;
                
            case 'profile':
                // Initialize profile
                this.initializeProfile();
                break;
                
            case 'settings':
                // Initialize settings
                this.initializeSettings();
                break;
        }
    }

    initializeAddTransactionForm() {
        const form = document.getElementById('add-transaction-form');
        if (!form) return;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(form);
            const transactionData = {
                type: formData.get('type'),
                date: formData.get('date'),
                amount: parseFloat(formData.get('amount')),
                category: formData.get('category'),
                approver: formData.get('approver'),
                priority: formData.get('priority'),
                description: formData.get('description'),
                notes: formData.get('notes'),
                attachments: []
            };
            
            // Handle file attachments
            const fileInput = document.getElementById('transaction-attachments');
            if (fileInput.files.length > 0) {
                for (const file of fileInput.files) {
                    if (file.size > 10 * 1024 * 1024) {
                        Utils.showNotification(`File ${file.name} exceeds 10MB limit`, 'error');
                        continue;
                    }
                    
                    const base64 = await Utils.fileToBase64(file);
                    transactionData.attachments.push({
                        filename: file.name,
                        type: file.type,
                        size: file.size,
                        data: base64,
                        uploadedAt: new Date().toISOString()
                    });
                }
            }
            
            // Add transaction
            const result = await transactions.addTransaction(transactionData);
            
            if (result.success) {
                // Reset form
                form.reset();
                
                // Clear file preview
                const preview = document.getElementById('attachment-preview');
                if (preview) preview.innerHTML = '';
                
                // Navigate to transactions page
                this.navigateTo('transactions');
            } else {
                Utils.showNotification(result.error, 'error');
            }
        });
        
        // File upload preview
        const fileInput = document.getElementById('transaction-attachments');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const preview = document.getElementById('attachment-preview');
                if (!preview) return;
                
                preview.innerHTML = '';
                
                Array.from(e.target.files).forEach(file => {
                    const fileItem = document.createElement('div');
                    fileItem.className = 'file-item';
                    fileItem.innerHTML = `
                        <i class="fas ${this.getFileIcon(file.type)}"></i>
                        <span>${file.name}</span>
                        <small>${this.formatFileSize(file.size)}</small>
                    `;
                    preview.appendChild(fileItem);
                });
            });
        }
    }

    initializeReports() {
        // Report form
        const reportForm = document.getElementById('report-form');
        if (reportForm) {
            reportForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.generateReport();
            });
            
            // Show/hide custom range
            const periodSelect = document.getElementById('report-period');
            if (periodSelect) {
                periodSelect.addEventListener('change', () => {
                    const customRange = document.getElementById('custom-range');
                    if (periodSelect.value === 'custom') {
                        customRange.style.display = 'block';
                    } else {
                        customRange.style.display = 'none';
                    }
                });
            }
        }
    }

    initializeCalendar() {
        // Calendar initialization
        this.generateCalendar();
    }

    initializeProfile() {
        // Profile form
        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            profileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = new FormData(profileForm);
                const updateData = {
                    fullName: formData.get('fullName'),
                    email: formData.get('email'),
                    department: formData.get('department'),
                    phone: formData.get('phone'),
                    bio: formData.get('bio')
                };
                
                const result = await auth.updateProfile(updateData);
                
                if (result.success) {
                    Utils.showNotification('Profile updated successfully', 'success');
                } else {
                    Utils.showNotification(result.error, 'error');
                }
            });
        }
        
        // Password form
        const passwordForm = document.getElementById('password-form');
        if (passwordForm) {
            passwordForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const currentPassword = document.getElementById('current-password').value;
                const newPassword = document.getElementById('new-password').value;
                const confirmPassword = document.getElementById('confirm-password').value;
                
                if (newPassword !== confirmPassword) {
                    Utils.showNotification('New passwords do not match', 'error');
                    return;
                }
                
                const result = await auth.changePassword(currentPassword, newPassword);
                
                if (result.success) {
                    Utils.showNotification('Password changed successfully', 'success');
                    passwordForm.reset();
                } else {
                    Utils.showNotification(result.error, 'error');
                }
            });
        }
    }

    initializeSettings() {
        // Load saved settings
        this.loadSettings();
        
        // Settings form
        const settingsForm = document.getElementById('app-settings-form');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSettings();
            });
        }
    }

    updatePageTitle(page) {
        const pageTitles = {
            'dashboard': 'Dashboard',
            'transactions': 'Transactions',
            'add-transaction': 'Add Transaction',
            'reports': 'Reports',
            'admin': 'Admin Panel',
            'analytics': 'Analytics',
            'calendar': 'Calendar',
            'profile': 'My Profile',
            'settings': 'Settings'
        };
        
        const title = pageTitles[page] || 'ExpensePro';
        document.getElementById('page-title').textContent = title;
        
        // Update browser tab title
        document.title = `${title} - ExpensePro`;
    }

    handleResize() {
        // Handle responsive behavior
        if (this.isMobile) {
            // Mobile specific adjustments
            document.body.classList.add('mobile');
        } else {
            document.body.classList.remove('mobile');
        }
    }

    focusSearch() {
        const searchInput = document.getElementById('search-filter') || 
                           document.getElementById('search-input');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => modal.remove(), 300);
        });
    }

    saveAppState() {
        const state = {
            currentPage: this.currentPage,
            filters: transactions?.currentFilters || {},
            scrollPosition: window.scrollY
        };
        
        localStorage.setItem('app_state', JSON.stringify(state));
    }

    loadAppState() {
        const savedState = localStorage.getItem('app_state');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                if (state.currentPage && state.currentPage !== 'dashboard') {
                    this.navigateTo(state.currentPage);
                }
                
                // Restore scroll position
                if (state.scrollPosition) {
                    setTimeout(() => {
                        window.scrollTo(0, state.scrollPosition);
                    }, 100);
                }
            } catch (error) {
                console.error('Error loading app state:', error);
            }
        }
    }

    saveNavigationState() {
        localStorage.setItem('last_page', this.currentPage);
    }

    loadNavigationState() {
        const lastPage = localStorage.getItem('last_page');
        if (lastPage && lastPage !== 'dashboard') {
            this.navigateTo(lastPage);
        }
    }

    loadSettings() {
        const user = auth.getCurrentUser();
        if (!user) return;
        
        const settings = localStorage.getItem(`user_settings_${user.username}`);
        if (settings) {
            try {
                const userSettings = JSON.parse(settings);
                
                // Apply settings to form
                Object.keys(userSettings).forEach(key => {
                    const element = document.getElementById(key);
                    if (element) {
                        if (element.type === 'checkbox') {
                            element.checked = userSettings[key];
                        } else {
                            element.value = userSettings[key];
                        }
                    }
                });
            } catch (error) {
                console.error('Error loading settings:', error);
            }
        }
    }

    saveSettings() {
        const user = auth.getCurrentUser();
        if (!user) return;
        
        const form = document.getElementById('app-settings-form');
        if (!form) return;
        
        const formData = new FormData(form);
        const settings = {};
        
        formData.forEach((value, key) => {
            settings[key] = value;
        });
        
        // Checkboxes
        const checkboxes = form.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            settings[checkbox.id] = checkbox.checked;
        });
        
        // Save to localStorage
        localStorage.setItem(`user_settings_${user.username}`, JSON.stringify(settings));
        
        // Apply settings
        this.applySettings(settings);
        
        Utils.showNotification('Settings saved successfully', 'success');
    }

    applySettings(settings) {
        // Apply theme
        if (settings.theme === 'dark' || 
            (settings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        
        // Save to auth manager for user preferences
        auth.saveUserPreferences({
            theme: settings.theme,
            defaultPage: settings['default-page']
        });
    }

    generateCalendar() {
        // Calendar generation logic
        const calendarEl = document.getElementById('calendar');
        if (!calendarEl) return;
        
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        
        // Generate calendar HTML
        let html = '<div class="calendar-header">';
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });
        html += '</div><div class="calendar-body">';
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = firstDay.getDay();
        const daysInMonth = lastDay.getDate();
        
        // Previous month days
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startDay - 1; i >= 0; i--) {
            html += `<div class="calendar-day other-month">${prevMonthLastDay - i}</div>`;
        }
        
        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const isToday = date.toDateString() === now.toDateString();
            
            html += `
                <div class="calendar-day ${isToday ? 'today' : ''}" 
                     data-date="${date.toISOString().split('T')[0]}">
                    <div class="day-number">${day}</div>
                    <div class="day-events"></div>
                </div>
            `;
        }
        
        // Next month days
        const totalCells = 42; // 6 weeks * 7 days
        const remainingCells = totalCells - (startDay + daysInMonth);
        for (let day = 1; day <= remainingCells; day++) {
            html += `<div class="calendar-day other-month">${day}</div>`;
        }
        
        html += '</div>';
        calendarEl.innerHTML = html;
        
        // Load events for the month
        this.loadCalendarEvents(year, month);
    }

    async loadCalendarEvents(year, month) {
        try {
            const user = auth.getCurrentUser();
            if (!user) return;
            
            // Get transactions for the month
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0);
            
            const transactions = await db.getTransactions({
                userId: user.username,
                dateRange: {
                    start: startDate.toISOString(),
                    end: endDate.toISOString()
                }
            });
            
            // Group transactions by date
            const eventsByDate = {};
            transactions.forEach(transaction => {
                const date = transaction.date.split('T')[0];
                if (!eventsByDate[date]) {
                    eventsByDate[date] = [];
                }
                eventsByDate[date].push(transaction);
            });
            
            // Add events to calendar
            Object.entries(eventsByDate).forEach(([date, events]) => {
                const dayElement = document.querySelector(`[data-date="${date}"]`);
                if (dayElement) {
                    const eventsContainer = dayElement.querySelector('.day-events');
                    events.forEach(event => {
                        const eventEl = document.createElement('div');
                        eventEl.className = `calendar-event ${event.type.toLowerCase()}`;
                        eventEl.title = `${event.type}: ${event.description}`;
                        eventsContainer.appendChild(eventEl);
                    });
                }
            });
            
        } catch (error) {
            console.error('Error loading calendar events:', error);
        }
    }

    async generateReport() {
        const reportType = document.getElementById('report-type').value;
        const period = document.getElementById('report-period').value;
        const format = document.getElementById('report-format').value;
        
        // Get date range
        let startDate, endDate;
        const now = new Date();
        
        switch (period) {
            case 'this_month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
                
            case 'last_month':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
                
            case 'this_quarter':
                const quarter = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), quarter * 3, 1);
                endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
                break;
                
            case 'last_quarter':
                const lastQuarter = Math.floor((now.getMonth() - 3) / 3);
                startDate = new Date(now.getFullYear(), lastQuarter * 3, 1);
                endDate = new Date(now.getFullYear(), lastQuarter * 3 + 3, 0);
                break;
                
            case 'this_year':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31);
                break;
                
            case 'last_year':
                startDate = new Date(now.getFullYear() - 1, 0, 1);
                endDate = new Date(now.getFullYear() - 1, 11, 31);
                break;
                
            case 'custom':
                startDate = new Date(document.getElementById('custom-start').value);
                endDate = new Date(document.getElementById('custom-end').value);
                break;
                
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }
        
        try {
            const user = auth.getCurrentUser();
            if (!user) return;
            
            // Get transactions for the period
            const transactions = await db.getTransactions({
                userId: auth.isAdmin() ? undefined : user.username,
                dateRange: {
                    start: startDate.toISOString(),
                    end: endDate.toISOString()
                }
            });
            
            // Generate report HTML
            const reportHTML = this.createReportHTML(transactions, reportType, startDate, endDate);
            
            // Update preview
            const preview = document.getElementById('report-preview');
            if (preview) {
                preview.innerHTML = reportHTML;
            }
            
            Utils.showNotification('Report generated successfully', 'success');
            
        } catch (error) {
            console.error('Error generating report:', error);
            Utils.showNotification('Error generating report', 'error');
        }
    }

    createReportHTML(transactions, reportType, startDate, endDate) {
        const stats = Utils.calculateStats(transactions);
        
        let html = `
            <div class="report-content">
                <div class="report-header">
                    <h2>${this.getReportTitle(reportType)}</h2>
                    <p class="report-period">
                        ${Utils.formatDate(startDate, 'full')} to ${Utils.formatDate(endDate, 'full')}
                    </p>
                    <p class="report-generated">
                        Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
                    </p>
                </div>
                
                <div class="report-summary">
                    <h3>Summary</h3>
                    <div class="summary-stats">
                        <div class="summary-stat">
                            <span class="stat-label">Total Transactions</span>
                            <span class="stat-value">${transactions.length}</span>
                        </div>
                        <div class="summary-stat">
                            <span class="stat-label">Total Income</span>
                            <span class="stat-value text-success">${Utils.formatCurrency(stats.totalIncome)}</span>
                        </div>
                        <div class="summary-stat">
                            <span class="stat-label">Total Expense</span>
                            <span class="stat-value text-danger">${Utils.formatCurrency(stats.totalExpense)}</span>
                        </div>
                        <div class="summary-stat">
                            <span class="stat-label">Net Balance</span>
                            <span class="stat-value ${stats.netBalance >= 0 ? 'text-success' : 'text-danger'}">
                                ${Utils.formatCurrency(stats.netBalance)}
                            </span>
                        </div>
                    </div>
                </div>
        `;
        
        if (reportType === 'detailed' || reportType === 'summary') {
            html += `
                <div class="report-transactions">
                    <h3>Transactions</h3>
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Type</th>
                                <th>Category</th>
                                <th>Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            transactions.forEach(transaction => {
                html += `
                    <tr>
                        <td>${Utils.formatDate(transaction.date, 'dd/MM/yyyy')}</td>
                        <td>${transaction.description || ''}</td>
                        <td>${transaction.type}</td>
                        <td>${transaction.category || '-'}</td>
                        <td class="${transaction.type === 'Expense' ? 'text-danger' : 'text-success'}">
                            ${Utils.formatCurrency(transaction.amount)}
                        </td>
                        <td>${transaction.status}</td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        if (reportType === 'category' || reportType === 'summary') {
            // Group by category
            const categories = {};
            transactions.forEach(transaction => {
                const category = transaction.category || 'Uncategorized';
                if (!categories[category]) {
                    categories[category] = { income: 0, expense: 0, count: 0 };
                }
                
                if (transaction.type === 'Income') {
                    categories[category].income += parseFloat(transaction.amount) || 0;
                } else {
                    categories[category].expense += parseFloat(transaction.amount) || 0;
                }
                categories[category].count++;
            });
            
            html += `
                <div class="report-categories">
                    <h3>Category-wise Summary</h3>
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Count</th>
                                <th>Income</th>
                                <th>Expense</th>
                                <th>Net</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            Object.entries(categories).forEach(([category, data]) => {
                const net = data.income - data.expense;
                html += `
                    <tr>
                        <td>${category}</td>
                        <td>${data.count}</td>
                        <td class="text-success">${Utils.formatCurrency(data.income)}</td>
                        <td class="text-danger">${Utils.formatCurrency(data.expense)}</td>
                        <td class="${net >= 0 ? 'text-success' : 'text-danger'}">
                            ${Utils.formatCurrency(net)}
                        </td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        html += `</div>`;
        return html;
    }

    getReportTitle(reportType) {
        const titles = {
            'summary': 'Summary Report',
            'detailed': 'Detailed Transaction Report',
            'monthly': 'Monthly Report',
            'yearly': 'Yearly Report',
            'category': 'Category-wise Report',
            'user': 'User-wise Report'
        };
        
        return titles[reportType] || 'Report';
    }

    getFileIcon(mimeType) {
        if (mimeType.includes('pdf')) return 'fa-file-pdf';
        if (mimeType.includes('word')) return 'fa-file-word';
        if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fa-file-excel';
        if (mimeType.includes('image')) return 'fa-file-image';
        return 'fa-file';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getFirstDayOfMonth() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    }

    showWelcomeMessage() {
        // Show welcome message on first visit
        const firstVisit = !localStorage.getItem('has_visited');
        if (firstVisit) {
            localStorage.setItem('has_visited', 'true');
            
            setTimeout(() => {
                Utils.showNotification(
                    'Welcome to ExpensePro! Get started by adding your first transaction.',
                    'info',
                    10000
                );
            }, 2000);
        }
    }

    // Utility method for file conversion
    static async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
}

// Create global app instance
const app = new ExpenseProApp();

// Make app available globally
window.app = app;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Hide loading screen
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 300);
        }, 500);
    }
});

// Add global utility to window
window.Utils = Utils;

// Global navigation function
window.navigateToPage = (page) => app.navigateTo(page);