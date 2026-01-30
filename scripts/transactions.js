// Transactions Manager
class TransactionsManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.currentFilters = {};
        this.init();
    }

    init() {
        // Set up event listeners
        this.setupEventListeners();
        
        // Load transactions if on transactions page
        if (this.isOnTransactionsPage()) {
            this.loadTransactions();
        }
    }

    setupEventListeners() {
        // Filter form
        const filterForm = document.getElementById('filter-form');
        if (filterForm) {
            filterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.applyFilters();
            });
            
            // Reset filters
            const resetBtn = filterForm.querySelector('[type="reset"]');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    this.resetFilters();
                });
            }
        }
        
        // Export buttons
        document.querySelectorAll('[data-export]').forEach(btn => {
            btn.addEventListener('click', () => {
                const format = btn.dataset.export;
                this.exportTransactions(format);
            });
        });
        
        // Bulk actions
        document.querySelectorAll('[data-bulk-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.bulkAction;
                this.performBulkAction(action);
            });
        });
    }

    isOnTransactionsPage() {
        return document.getElementById('transactions-section')?.style.display === 'block';
    }

    async loadTransactions() {
        try {
            // Show loading
            this.showLoading(true);
            
            // Get current user
            const user = auth.getCurrentUser();
            if (!user) return;
            
            // Build filters
            const filters = { ...this.currentFilters };
            if (!auth.isAdmin()) {
                filters.userId = user.username;
            }
            
            // Get transactions
            const transactions = await db.getTransactions(filters);
            
            // Apply pagination
            const totalPages = Math.ceil(transactions.length / this.itemsPerPage);
            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            const paginatedTransactions = transactions.slice(startIndex, endIndex);
            
            // Update UI
            this.updateTransactionsTable(paginatedTransactions);
            this.updatePagination(totalPages);
            this.updateSummary(transactions);
            
            // Hide loading
            this.showLoading(false);
            
        } catch (error) {
            console.error('Error loading transactions:', error);
            this.showLoading(false);
            Utils.showNotification('Error loading transactions', 'error');
        }
    }

    updateTransactionsTable(transactions) {
        const tableBody = document.querySelector('#transactions-table tbody');
        if (!tableBody) return;
        
        if (transactions.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state">
                        <i class="fas fa-search"></i>
                        <p>No transactions found</p>
                        <button class="btn btn-primary btn-sm" onclick="navigateToPage('add-transaction')">
                            Add New Transaction
                        </button>
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        transactions.forEach(transaction => {
            const date = Utils.formatDate(transaction.date, 'dd/MM/yyyy');
            const amount = Utils.formatCurrency(transaction.amount);
            const badgeClass = `badge-${transaction.status.toLowerCase()}`;
            const typeClass = transaction.type === 'Expense' ? 'text-danger' : 'text-success';
            
            // Get user info for admin view
            let userInfo = '';
            if (auth.isAdmin() && transaction.userId) {
                userInfo = `
                    <small class="text-muted d-block">${transaction.userId}</small>
                `;
            }
            
            html += `
                <tr data-transaction-id="${transaction.id}">
                    <td>
                        <input type="checkbox" class="transaction-select" 
                               value="${transaction.id}" 
                               ${transaction.status !== 'Pending' ? 'disabled' : ''}>
                    </td>
                    <td>${date}</td>
                    <td>
                        <div class="transaction-info">
                            <strong>${transaction.description || 'No description'}</strong>
                            ${userInfo}
                            <small class="text-muted">${transaction.category || 'Uncategorized'}</small>
                        </div>
                    </td>
                    <td><span class="badge ${typeClass.replace('text-', 'badge-')}">${transaction.type}</span></td>
                    <td class="${typeClass}">${transaction.type === 'Expense' ? '-' : '+'} ${amount}</td>
                    <td><span class="badge ${badgeClass}">${transaction.status}</span></td>
                    <td>${transaction.approver || '-'}</td>
                    <td>
                        ${transaction.attachments?.length > 0 ? `
                            <button class="btn btn-sm btn-outline" 
                                    onclick="viewAttachments('${transaction.id}')">
                                <i class="fas fa-paperclip"></i> ${transaction.attachments.length}
                            </button>
                        ` : '-'}
                    </td>
                    <td>
                        <div class="action-buttons">
                            ${transaction.status === 'Pending' ? `
                                <button class="btn btn-sm btn-primary" 
                                        onclick="editTransaction('${transaction.id}')"
                                        ${!auth.isAdmin() && transaction.userId !== auth.getCurrentUser()?.username ? 'disabled' : ''}>
                                    <i class="fas fa-edit"></i>
                                </button>
                            ` : ''}
                            
                            ${auth.isAdmin() && transaction.status === 'Pending' ? `
                                <button class="btn btn-sm btn-success" 
                                        onclick="updateTransactionStatus('${transaction.id}', 'Approved')">
                                    <i class="fas fa-check"></i>
                                </button>
                                <button class="btn btn-sm btn-danger" 
                                        onclick="updateTransactionStatus('${transaction.id}', 'Rejected')">
                                    <i class="fas fa-times"></i>
                                </button>
                            ` : ''}
                            
                            <button class="btn btn-sm btn-info" 
                                    onclick="viewTransaction('${transaction.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            
                            ${(auth.isAdmin() || transaction.userId === auth.getCurrentUser()?.username) ? `
                                <button class="btn btn-sm btn-warning" 
                                        onclick="deleteTransaction('${transaction.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
        
        // Add event listeners to checkboxes
        tableBody.querySelectorAll('.transaction-select').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateBulkActions());
        });
    }

    updatePagination(totalPages) {
        const paginationContainer = document.getElementById('pagination');
        if (!paginationContainer) return;
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        let html = `
            <nav aria-label="Transaction pagination">
                <ul class="pagination">
                    <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                        <button class="page-link" onclick="transactions.goToPage(${this.currentPage - 1})">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                    </li>
        `;
        
        // Calculate page range
        let startPage = Math.max(1, this.currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            html += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <button class="page-link" onclick="transactions.goToPage(${i})">${i}</button>
                </li>
            `;
        }
        
        html += `
                    <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                        <button class="page-link" onclick="transactions.goToPage(${this.currentPage + 1})">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </li>
                </ul>
            </nav>
        `;
        
        paginationContainer.innerHTML = html;
    }

    updateSummary(transactions) {
        const summaryContainer = document.getElementById('transactions-summary');
        if (!summaryContainer) return;
        
        const stats = Utils.calculateStats(transactions);
        const total = transactions.length;
        
        summaryContainer.innerHTML = `
            <div class="summary-item">
                <span class="summary-label">Total:</span>
                <span class="summary-value">${total}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Income:</span>
                <span class="summary-value text-success">${Utils.formatCurrency(stats.totalIncome)}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Expense:</span>
                <span class="summary-value text-danger">${Utils.formatCurrency(stats.totalExpense)}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Balance:</span>
                <span class="summary-value ${stats.netBalance >= 0 ? 'text-success' : 'text-danger'}">
                    ${Utils.formatCurrency(stats.netBalance)}
                </span>
            </div>
        `;
    }

    applyFilters() {
        const form = document.getElementById('filter-form');
        if (!form) return;
        
        const formData = new FormData(form);
        this.currentFilters = {};
        
        // Extract filter values
        formData.forEach((value, key) => {
            if (value) {
                this.currentFilters[key] = value;
            }
        });
        
        // Reset to first page
        this.currentPage = 1;
        
        // Reload transactions
        this.loadTransactions();
    }

    resetFilters() {
        this.currentFilters = {};
        this.currentPage = 1;
        
        const form = document.getElementById('filter-form');
        if (form) form.reset();
        
        this.loadTransactions();
    }

    goToPage(page) {
        if (page < 1 || page > Math.ceil(this.getTotalItems() / this.itemsPerPage)) return;
        
        this.currentPage = page;
        this.loadTransactions();
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    getTotalItems() {
        // This would need to be tracked from the last load
        // For now, we'll reload with filters
        return 0;
    }

    showLoading(show) {
        const tableBody = document.querySelector('#transactions-table tbody');
        if (!tableBody) return;
        
        if (show) {
            // Show skeleton loading
            let html = '';
            for (let i = 0; i < 5; i++) {
                html += `
                    <tr>
                        <td><div class="skeleton-text" style="width: 20px; height: 20px;"></div></td>
                        <td><div class="skeleton-text"></div></td>
                        <td><div class="skeleton-text"></div></td>
                        <td><div class="skeleton-text" style="width: 80px;"></div></td>
                        <td><div class="skeleton-text" style="width: 100px;"></div></td>
                        <td><div class="skeleton-text" style="width: 90px;"></div></td>
                        <td><div class="skeleton-text" style="width: 120px;"></div></td>
                        <td><div class="skeleton-text" style="width: 60px;"></div></td>
                        <td><div class="skeleton-text" style="width: 160px;"></div></td>
                    </tr>
                `;
            }
            tableBody.innerHTML = html;
        }
    }

    updateBulkActions() {
        const selectedCount = document.querySelectorAll('.transaction-select:checked').length;
        const bulkActions = document.querySelector('.bulk-actions');
        
        if (!bulkActions) return;
        
        if (selectedCount > 0) {
            bulkActions.style.display = 'flex';
            bulkActions.querySelector('.selected-count').textContent = selectedCount;
        } else {
            bulkActions.style.display = 'none';
        }
    }

    async performBulkAction(action) {
        const selectedIds = Array.from(document.querySelectorAll('.transaction-select:checked'))
            .map(checkbox => checkbox.value);
        
        if (selectedIds.length === 0) {
            Utils.showNotification('No transactions selected', 'warning');
            return;
        }
        
        const user = auth.getCurrentUser();
        if (!user) return;
        
        switch (action) {
            case 'approve':
            case 'reject':
                const status = action === 'approve' ? 'Approved' : 'Rejected';
                const confirmed = await Utils.confirm(
                    `Are you sure you want to ${action} ${selectedIds.length} transaction(s)?`
                );
                
                if (confirmed) {
                    await this.bulkUpdateStatus(selectedIds, status, user.username);
                }
                break;
                
            case 'delete':
                const deleteConfirmed = await Utils.confirm(
                    `Are you sure you want to delete ${selectedIds.length} transaction(s)? This action cannot be undone.`
                );
                
                if (deleteConfirmed) {
                    await this.bulkDelete(selectedIds, user.username);
                }
                break;
                
            case 'export':
                await this.exportSelected(selectedIds);
                break;
        }
    }

    async bulkUpdateStatus(ids, status, updatedBy) {
        try {
            const promises = ids.map(id => 
                db.updateTransactionStatus(id, status, `Bulk ${status.toLowerCase()}`, updatedBy)
            );
            
            await Promise.all(promises);
            
            Utils.showNotification(`${ids.length} transaction(s) ${status.toLowerCase()}`, 'success');
            this.loadTransactions();
            dashboard.loadDashboardData();
            
        } catch (error) {
            console.error('Bulk update error:', error);
            Utils.showNotification('Error updating transactions', 'error');
        }
    }

    async bulkDelete(ids, deletedBy) {
        try {
            const promises = ids.map(id => db.deleteTransaction(id, deletedBy));
            await Promise.all(promises);
            
            Utils.showNotification(`${ids.length} transaction(s) deleted`, 'success');
            this.loadTransactions();
            dashboard.loadDashboardData();
            
        } catch (error) {
            console.error('Bulk delete error:', error);
            Utils.showNotification('Error deleting transactions', 'error');
        }
    }

    async exportSelected(ids) {
        try {
            const transactions = [];
            for (const id of ids) {
                const transaction = await db.getTransaction(id);
                if (transaction) {
                    transactions.push(transaction);
                }
            }
            
            this.exportToCSV(transactions, `selected-transactions-${new Date().toISOString().split('T')[0]}.csv`);
            
        } catch (error) {
            console.error('Export selected error:', error);
            Utils.showNotification('Error exporting transactions', 'error');
        }
    }

    async exportTransactions(format = 'csv') {
        try {
            const user = auth.getCurrentUser();
            if (!user) return;
            
            // Get all transactions with current filters
            const filters = { ...this.currentFilters };
            if (!auth.isAdmin()) {
                filters.userId = user.username;
            }
            
            const transactions = await db.getTransactions(filters);
            
            if (transactions.length === 0) {
                Utils.showNotification('No transactions to export', 'warning');
                return;
            }
            
            const filename = `transactions-${new Date().toISOString().split('T')[0]}`;
            
            switch (format) {
                case 'csv':
                    this.exportToCSV(transactions, `${filename}.csv`);
                    break;
                    
                case 'excel':
                    this.exportToExcel(transactions, `${filename}.xlsx`);
                    break;
                    
                case 'json':
                    this.exportToJSON(transactions, `${filename}.json`);
                    break;
            }
            
        } catch (error) {
            console.error('Export error:', error);
            Utils.showNotification('Error exporting transactions', 'error');
        }
    }

    exportToCSV(transactions, filename) {
        const csvData = transactions.map(t => ({
            Date: Utils.formatDate(t.date, 'yyyy-MM-dd'),
            Type: t.type,
            Category: t.category || '',
            Description: t.description || '',
            Amount: t.amount,
            Status: t.status,
            Approver: t.approver || '',
            'Created By': t.createdBy || '',
            'Created At': Utils.formatDate(t.createdAt, 'yyyy-MM-dd HH:mm:ss'),
            'Last Modified': Utils.formatDate(t.lastModified, 'yyyy-MM-dd HH:mm:ss')
        }));
        
        Utils.exportToCSV(csvData, filename);
        Utils.showNotification(`Exported ${transactions.length} transactions to CSV`, 'success');
    }

    exportToExcel(transactions, filename) {
        // Using XLSX library
        const wb = XLSX.utils.book_new();
        const wsData = [
            ['Date', 'Type', 'Category', 'Description', 'Amount', 'Status', 'Approver', 'Created By', 'Created At', 'Last Modified']
        ];
        
        transactions.forEach(t => {
            wsData.push([
                Utils.formatDate(t.date, 'yyyy-MM-dd'),
                t.type,
                t.category || '',
                t.description || '',
                t.amount,
                t.status,
                t.approver || '',
                t.createdBy || '',
                Utils.formatDate(t.createdAt, 'yyyy-MM-dd HH:mm:ss'),
                Utils.formatDate(t.lastModified, 'yyyy-MM-dd HH:mm:ss')
            ]);
        });
        
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
        XLSX.writeFile(wb, filename);
        
        Utils.showNotification(`Exported ${transactions.length} transactions to Excel`, 'success');
    }

    exportToJSON(transactions, filename) {
        const jsonData = JSON.stringify(transactions, null, 2);
        Utils.downloadFile(jsonData, filename, 'application/json');
        Utils.showNotification(`Exported ${transactions.length} transactions to JSON`, 'success');
    }

    async addTransaction(transactionData) {
        try {
            const user = auth.getCurrentUser();
            if (!user) {
                return { success: false, error: 'Not authenticated' };
            }
            
            // Validate required fields
            if (!transactionData.type || !transactionData.date || !transactionData.amount || !transactionData.description) {
                return { success: false, error: 'Please fill all required fields' };
            }
            
            // Validate amount
            if (!Utils.validateAmount(transactionData.amount)) {
                return { success: false, error: 'Please enter a valid amount' };
            }
            
            // Add user info
            transactionData.userId = user.username;
            
            // Create transaction
            const result = await db.createTransaction(transactionData, user.username);
            
            if (result.success) {
                Utils.showNotification('Transaction added successfully', 'success');
                
                // Reload data
                this.loadTransactions();
                dashboard.loadDashboardData();
                auth.loadNotifications();
                
                return { success: true, transaction: result.transaction };
            } else {
                return { success: false, error: result.error };
            }
            
        } catch (error) {
            console.error('Add transaction error:', error);
            return { success: false, error: 'Failed to add transaction' };
        }
    }

    async updateTransaction(id, updateData) {
        try {
            const user = auth.getCurrentUser();
            if (!user) {
                return { success: false, error: 'Not authenticated' };
            }
            
            // Get existing transaction
            const existingTransaction = await db.getTransaction(id);
            if (!existingTransaction) {
                return { success: false, error: 'Transaction not found' };
            }
            
            // Check permissions
            if (!auth.isAdmin() && existingTransaction.userId !== user.username) {
                return { success: false, error: 'You can only edit your own transactions' };
            }
            
            if (existingTransaction.status !== 'Pending') {
                return { success: false, error: 'Only pending transactions can be edited' };
            }
            
            // Add update info
            updateData.updatedBy = user.username;
            updateData.lastModified = new Date().toISOString();
            
            // Update transaction
            const result = await db.updateTransaction(id, updateData);
            
            if (result.success) {
                Utils.showNotification('Transaction updated successfully', 'success');
                
                // Reload data
                this.loadTransactions();
                dashboard.loadDashboardData();
                
                return { success: true, transaction: result.transaction };
            } else {
                return { success: false, error: result.error };
            }
            
        } catch (error) {
            console.error('Update transaction error:', error);
            return { success: false, error: 'Failed to update transaction' };
        }
    }

    async deleteTransaction(id) {
        try {
            const user = auth.getCurrentUser();
            if (!user) {
                return { success: false, error: 'Not authenticated' };
            }
            
            // Get existing transaction
            const existingTransaction = await db.getTransaction(id);
            if (!existingTransaction) {
                return { success: false, error: 'Transaction not found' };
            }
            
            // Check permissions
            if (!auth.isAdmin() && existingTransaction.userId !== user.username) {
                return { success: false, error: 'You can only delete your own transactions' };
            }
            
            if (existingTransaction.status !== 'Pending') {
                return { success: false, error: 'Only pending transactions can be deleted' };
            }
            
            // Confirm deletion
            const confirmed = await Utils.confirm(
                'Are you sure you want to delete this transaction? This action cannot be undone.'
            );
            
            if (!confirmed) {
                return { success: false, error: 'Cancelled by user' };
            }
            
            // Delete transaction
            const result = await db.deleteTransaction(id, user.username);
            
            if (result.success) {
                Utils.showNotification('Transaction deleted successfully', 'success');
                
                // Reload data
                this.loadTransactions();
                dashboard.loadDashboardData();
                
                return { success: true };
            } else {
                return { success: false, error: result.error };
            }
            
        } catch (error) {
            console.error('Delete transaction error:', error);
            return { success: false, error: 'Failed to delete transaction' };
        }
    }

    async updateTransactionStatus(id, status) {
        try {
            const user = auth.getCurrentUser();
            if (!user) {
                return { success: false, error: 'Not authenticated' };
            }
            
            if (!auth.isAdmin()) {
                return { success: false, error: 'Admin access required' };
            }
            
            // Get comment
            const comment = await Utils.prompt(`Enter comment for ${status.toLowerCase()}:`, '');
            if (comment === null) {
                return { success: false, error: 'Cancelled by user' };
            }
            
            // Update status
            const result = await db.updateTransactionStatus(id, status, comment, user.username);
            
            if (result.success) {
                Utils.showNotification(`Transaction ${status.toLowerCase()} successfully`, 'success');
                
                // Reload data
                this.loadTransactions();
                dashboard.loadDashboardData();
                auth.loadNotifications();
                
                return { success: true };
            } else {
                return { success: false, error: result.error };
            }
            
        } catch (error) {
            console.error('Update status error:', error);
            return { success: false, error: 'Failed to update status' };
        }
    }
}

// Create global transactions instance
const transactions = new TransactionsManager();

// Global functions
window.updateTransactionStatus = (id, status) => transactions.updateTransactionStatus(id, status);
window.deleteTransaction = async (id) => {
    const result = await transactions.deleteTransaction(id);
    if (!result.success && result.error) {
        Utils.showNotification(result.error, 'error');
    }
};

window.viewAttachments = async (id) => {
    try {
        const transaction = await db.getTransaction(id);
        if (!transaction || !transaction.attachments || transaction.attachments.length === 0) {
            Utils.showNotification('No attachments found', 'info');
            return;
        }
        
        // Create attachments modal
        let html = '<div class="attachments-list">';
        transaction.attachments.forEach((attachment, index) => {
            html += `
                <div class="attachment-item">
                    <div class="attachment-preview">
                        ${attachment.type.startsWith('image/') ? `
                            <img src="${attachment.data}" alt="${attachment.filename}" 
                                 onclick="openImageModal('${attachment.data}')">
                        ` : `
                            <i class="fas fa-file ${getFileIcon(attachment.type)}"></i>
                        `}
                    </div>
                    <div class="attachment-info">
                        <strong>${attachment.filename}</strong>
                        <small>${formatFileSize(attachment.size)} • ${Utils.formatDate(attachment.uploadedAt, 'dd/MM/yyyy')}</small>
                    </div>
                    <div class="attachment-actions">
                        <button class="btn btn-sm btn-outline" 
                                onclick="downloadAttachment('${attachment.data}', '${attachment.filename}')">
                            <i class="fas fa-download"></i>
                        </button>
                        ${attachment.type.startsWith('image/') ? `
                            <button class="btn btn-sm btn-outline" 
                                    onclick="openImageModal('${attachment.data}')">
                                <i class="fas fa-expand"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        Utils.createModal('Attachments', html, [
            { text: 'Close', action: 'close', class: 'btn-outline' }
        ]);
        
    } catch (error) {
        console.error('View attachments error:', error);
        Utils.showNotification('Error loading attachments', 'error');
    }
};

window.downloadAttachment = (dataUrl, filename) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
};

window.openImageModal = (imageUrl) => {
    Utils.createModal('Image Preview', `
        <div style="text-align: center;">
            <img src="${imageUrl}" alt="Preview" style="max-width: 100%; max-height: 70vh;">
        </div>
    `, [
        { text: 'Close', action: 'close', class: 'btn-outline' }
    ]);
};

function getFileIcon(mimeType) {
    if (mimeType.includes('pdf')) return 'fa-file-pdf text-danger';
    if (mimeType.includes('word')) return 'fa-file-word text-primary';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fa-file-excel text-success';
    if (mimeType.includes('image')) return 'fa-file-image text-info';
    return 'fa-file text-secondary';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Export for use in other modules
export default transactions;