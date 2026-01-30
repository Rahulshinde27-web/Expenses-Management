// Dashboard Manager
class DashboardManager {
    constructor() {
        this.charts = {};
        this.stats = null;
        this.init();
    }

    init() {
        // Set up event listeners
        this.setupEventListeners();
        
        // Load dashboard data when authenticated
        if (auth.isAuthenticated) {
            this.loadDashboardData();
        }
    }

    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.querySelector('[onclick*="refreshData"]');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadDashboardData());
        }
        
        // Quick action buttons
        document.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (btn.onclick && btn.onclick.toString().includes('quickAdd')) {
                    const type = btn.onclick.toString().match(/quickAdd\('(\w+)'\)/)?.[1];
                    if (type) {
                        this.quickAddTransaction(type);
                    }
                }
            });
        });
    }

    async loadDashboardData() {
        try {
            // Show loading state
            this.showLoading(true);
            
            // Get current user
            const user = auth.getCurrentUser();
            if (!user) return;
            
            // Get transactions
            const transactions = await db.getTransactions({ userId: user.username });
            
            // Get statistics
            this.stats = await db.getStatistics(user.username);
            
            // Update UI
            this.updateStatsCards();
            this.updateRecentTransactions(transactions);
            this.updateCharts(transactions);
            
            // Hide loading
            this.showLoading(false);
            
            // Update notifications
            auth.loadNotifications();
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showLoading(false);
            Utils.showNotification('Error loading dashboard data', 'error');
        }
    }

    updateStatsCards() {
        if (!this.stats) return;
        
        // Update income
        const incomeElement = document.getElementById('stat-income');
        if (incomeElement) {
            incomeElement.textContent = Utils.formatCurrency(this.stats.totalIncome);
        }
        
        // Update expense
        const expenseElement = document.getElementById('stat-expense');
        if (expenseElement) {
            expenseElement.textContent = Utils.formatCurrency(this.stats.totalExpense);
        }
        
        // Update pending
        const pendingElement = document.getElementById('stat-pending');
        if (pendingElement) {
            pendingElement.textContent = this.stats.pendingCount;
        }
        
        // Update balance
        const balanceElement = document.getElementById('stat-balance');
        if (balanceElement) {
            balanceElement.textContent = Utils.formatCurrency(this.stats.netBalance);
            
            // Color code based on balance
            if (this.stats.netBalance < 0) {
                balanceElement.style.color = 'var(--danger-color)';
            } else if (this.stats.netBalance > 0) {
                balanceElement.style.color = 'var(--success-color)';
            } else {
                balanceElement.style.color = 'var(--gray-600)';
            }
        }
    }

    updateRecentTransactions(transactions) {
        const tableBody = document.querySelector('#recent-transactions tbody');
        if (!tableBody) return;
        
        // Get recent 10 transactions
        const recentTransactions = transactions.slice(0, 10);
        
        if (recentTransactions.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <i class="fas fa-receipt"></i>
                        <p>No transactions found</p>
                        <button class="btn btn-primary btn-sm" onclick="navigateToPage('add-transaction')">
                            Add Your First Transaction
                        </button>
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        recentTransactions.forEach(transaction => {
            const date = Utils.formatDate(transaction.date, 'dd/MM/yyyy');
            const amount = Utils.formatCurrency(transaction.amount);
            const badgeClass = `badge-${transaction.status.toLowerCase()}`;
            
            html += `
                <tr>
                    <td>${date}</td>
                    <td>
                        <div class="transaction-desc">
                            <strong>${transaction.description || 'No description'}</strong>
                            <small class="text-muted">${transaction.type} • ${transaction.category || 'Uncategorized'}</small>
                        </div>
                    </td>
                    <td class="${transaction.type === 'Expense' ? 'text-danger' : 'text-success'}">
                        ${transaction.type === 'Expense' ? '-' : '+'} ${amount}
                    </td>
                    <td><span class="badge ${badgeClass}">${transaction.status}</span></td>
                    <td>
                        <div class="action-buttons">
                            ${transaction.status === 'Pending' ? `
                                <button class="btn btn-sm btn-outline" 
                                        onclick="editTransaction('${transaction.id}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                            ` : ''}
                            <button class="btn btn-sm btn-outline" 
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

    updateCharts(transactions) {
        // Monthly chart
        this.updateMonthlyChart(transactions);
        
        // Category chart
        this.updateCategoryChart(transactions);
    }

    updateMonthlyChart(transactions) {
        const ctx = document.getElementById('monthlyChart');
        if (!ctx) return;
        
        // Generate chart data
        const chartData = Utils.generateChartData(transactions, 'monthly');
        
        // Destroy existing chart
        if (this.charts.monthly) {
            this.charts.monthly.destroy();
        }
        
        // Create new chart
        this.charts.monthly = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [
                    {
                        label: 'Income',
                        data: chartData.income,
                        borderColor: 'var(--success-color)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Expenses',
                        data: chartData.expense,
                        borderColor: 'var(--danger-color)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `${context.dataset.label}: ${Utils.formatCurrency(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => Utils.formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    updateCategoryChart(transactions) {
        const ctx = document.getElementById('categoryChart');
        if (!ctx) return;
        
        // Group by category
        const categories = {};
        transactions.forEach(transaction => {
            const category = transaction.category || 'Uncategorized';
            const amount = parseFloat(transaction.amount) || 0;
            
            if (!categories[category]) {
                categories[category] = {
                    income: 0,
                    expense: 0
                };
            }
            
            if (transaction.type === 'Income') {
                categories[category].income += amount;
            } else {
                categories[category].expense += amount;
            }
        });
        
        // Prepare data
        const labels = Object.keys(categories);
        const incomeData = labels.map(label => categories[label].income);
        const expenseData = labels.map(label => categories[label].expense);
        
        // Destroy existing chart
        if (this.charts.category) {
            this.charts.category.destroy();
        }
        
        // Create new chart
        this.charts.category = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Income',
                        data: incomeData,
                        backgroundColor: 'rgba(16, 185, 129, 0.7)',
                        borderColor: 'var(--success-color)',
                        borderWidth: 1
                    },
                    {
                        label: 'Expenses',
                        data: expenseData,
                        backgroundColor: 'rgba(239, 68, 68, 0.7)',
                        borderColor: 'var(--danger-color)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `${context.dataset.label}: ${Utils.formatCurrency(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => Utils.formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    showLoading(show) {
        const dashboardSection = document.getElementById('dashboard-section');
        if (!dashboardSection) return;
        
        if (show) {
            // Show skeleton loading
            const statsGrid = dashboardSection.querySelector('.stats-grid');
            const chartsContainer = dashboardSection.querySelector('.form-grid');
            const tableContainer = dashboardSection.querySelector('.table-responsive');
            
            if (statsGrid) {
                statsGrid.innerHTML = `
                    <div class="skeleton-card"></div>
                    <div class="skeleton-card"></div>
                    <div class="skeleton-card"></div>
                    <div class="skeleton-card"></div>
                `;
            }
            
            if (tableContainer) {
                tableContainer.innerHTML = `
                    <div class="skeleton-text"></div>
                    <div class="skeleton-text"></div>
                    <div class="skeleton-text"></div>
                    <div class="skeleton-text"></div>
                    <div class="skeleton-text" style="width: 60%;"></div>
                `;
            }
        } else {
            // Remove skeleton loading
            const skeletons = dashboardSection.querySelectorAll('.skeleton-card, .skeleton-text');
            skeletons.forEach(skeleton => {
                if (skeleton.parentNode) {
                    skeleton.remove();
                }
            });
        }
    }

    quickAddTransaction(type) {
        // Navigate to add transaction page with pre-filled type
        navigateToPage('add-transaction');
        
        // Set transaction type
        setTimeout(() => {
            const typeSelect = document.getElementById('transaction-type');
            if (typeSelect) {
                typeSelect.value = type;
                typeSelect.dispatchEvent(new Event('change'));
            }
        }, 100);
    }

    async getDashboardStats() {
        try {
            const user = auth.getCurrentUser();
            if (!user) return null;
            
            const stats = await db.getStatistics(user.username);
            return stats;
        } catch (error) {
            console.error('Error getting dashboard stats:', error);
            return null;
        }
    }

    async getMonthlySummary(month, year) {
        try {
            const user = auth.getCurrentUser();
            if (!user) return null;
            
            const transactions = await db.getTransactions({ 
                userId: user.username,
                month: month,
                year: year 
            });
            
            const summary = {
                income: 0,
                expense: 0,
                transactions: transactions.length,
                pending: 0,
                approved: 0,
                rejected: 0
            };
            
            transactions.forEach(transaction => {
                const amount = parseFloat(transaction.amount) || 0;
                
                if (transaction.type === 'Income') {
                    summary.income += amount;
                } else {
                    summary.expense += amount;
                }
                
                if (transaction.status === 'Pending') summary.pending++;
                if (transaction.status === 'Approved') summary.approved++;
                if (transaction.status === 'Rejected') summary.rejected++;
            });
            
            summary.netBalance = summary.income - summary.expense;
            return summary;
        } catch (error) {
            console.error('Error getting monthly summary:', error);
            return null;
        }
    }
}

// Create global dashboard instance
const dashboard = new DashboardManager();

// Global functions
window.refreshData = () => dashboard.loadDashboardData();
window.quickAdd = (type) => dashboard.quickAddTransaction(type);

// Navigation function
window.navigateToPage = (page) => {
    const navItem = document.querySelector(`[data-page="${page}"]`);
    if (navItem) {
        navItem.click();
    }
};

// Transaction functions
window.editTransaction = async (id) => {
    try {
        const transaction = await db.getTransaction(id);
        if (transaction) {
            // Open edit modal
            openEditTransactionModal(transaction);
        }
    } catch (error) {
        console.error('Error editing transaction:', error);
        Utils.showNotification('Error loading transaction', 'error');
    }
};

window.viewTransaction = async (id) => {
    try {
        const transaction = await db.getTransaction(id);
        if (transaction) {
            // Open view modal
            openViewTransactionModal(transaction);
        }
    } catch (error) {
        console.error('Error viewing transaction:', error);
        Utils.showNotification('Error loading transaction', 'error');
    }
};

// Export for use in other modules
export default dashboard;