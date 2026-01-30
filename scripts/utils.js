// Utility Functions
const Utils = {
    // Format currency
    formatCurrency: (amount, currency = '₹') => {
        return `${currency}${parseFloat(amount).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    },

    // Format date
    formatDate: (date, format = 'dd/MM/yyyy') => {
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'Invalid Date';
        
        const pad = (n) => n.toString().padStart(2, '0');
        
        const formats = {
            'dd/MM/yyyy': `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
            'yyyy-MM-dd': `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
            'MMM dd, yyyy': d.toLocaleDateString('en-IN', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
            }),
            'full': d.toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        };
        
        return formats[format] || d.toLocaleDateString();
    },

    // Generate unique ID
    generateId: (prefix = 'txn') => {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `${prefix}-${timestamp}-${random}`;
    },

    // Validate email
    validateEmail: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    // Validate amount
    validateAmount: (amount) => {
        return !isNaN(amount) && parseFloat(amount) > 0;
    },

    // Get current month and year
    getCurrentMonthYear: () => {
        const now = new Date();
        return {
            month: now.getMonth(),
            year: now.getFullYear(),
            monthName: now.toLocaleDateString('en-IN', { month: 'long' })
        };
    },

    // Get months array
    getMonths: () => [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ],

    // Get years array
    getYears: (startYear = 2020) => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let year = startYear; year <= currentYear + 1; year++) {
            years.push(year);
        }
        return years;
    },

    // Debounce function
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle function
    throttle: (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Download file
    downloadFile: (content, fileName, contentType) => {
        const a = document.createElement('a');
        const file = new Blob([content], { type: contentType });
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(a.href);
    },

    // Export to CSV
    exportToCSV: (data, filename) => {
        const csv = this.convertToCSV(data);
        this.downloadFile(csv, filename, 'text/csv');
    },

    // Convert data to CSV
    convertToCSV: (data) => {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const rows = data.map(row => 
            headers.map(header => {
                const value = row[header];
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        );
        
        return [headers.join(','), ...rows].join('\n');
    },

    // Import from CSV
    importFromCSV: (csvText) => {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        return lines.slice(1).map(line => {
            const values = this.parseCSVLine(line);
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = values[index] || '';
            });
            return obj;
        }).filter(obj => Object.values(obj).some(v => v));
    },

    // Parse CSV line (handles quotes and commas)
    parseCSVLine: (line) => {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"' && nextChar === '"') {
                current += '"';
                i++;
            } else if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current);
        return values;
    },

    // Sort array by property
    sortBy: (array, property, descending = false) => {
        return array.sort((a, b) => {
            let aValue = a[property];
            let bValue = b[property];
            
            // Handle dates
            if (property.toLowerCase().includes('date')) {
                aValue = new Date(aValue).getTime();
                bValue = new Date(bValue).getTime();
            }
            
            // Handle numbers
            if (!isNaN(aValue) && !isNaN(bValue)) {
                aValue = parseFloat(aValue);
                bValue = parseFloat(bValue);
            }
            
            if (aValue < bValue) return descending ? 1 : -1;
            if (aValue > bValue) return descending ? -1 : 1;
            return 0;
        });
    },

    // Filter array by multiple criteria
    filterArray: (array, filters) => {
        return array.filter(item => {
            for (const [key, value] of Object.entries(filters)) {
                if (value === undefined || value === '') continue;
                
                if (key === 'date') {
                    const itemDate = new Date(item[key]);
                    const filterDate = new Date(value);
                    if (itemDate.toDateString() !== filterDate.toDateString()) {
                        return false;
                    }
                } else if (key === 'amount') {
                    if (parseFloat(item[key]) !== parseFloat(value)) {
                        return false;
                    }
                } else if (key.includes('date')) {
                    // Handle date ranges
                    if (value.start && new Date(item[key]) < new Date(value.start)) {
                        return false;
                    }
                    if (value.end && new Date(item[key]) > new Date(value.end)) {
                        return false;
                    }
                } else if (typeof item[key] === 'string') {
                    if (!item[key].toLowerCase().includes(value.toLowerCase())) {
                        return false;
                    }
                } else if (item[key] !== value) {
                    return false;
                }
            }
            return true;
        });
    },

    // Calculate statistics
    calculateStats: (transactions) => {
        const stats = {
            totalIncome: 0,
            totalExpense: 0,
            pendingCount: 0,
            approvedCount: 0,
            rejectedCount: 0,
            netBalance: 0,
            monthlyData: {}
        };
        
        transactions.forEach(transaction => {
            const amount = parseFloat(transaction.amount) || 0;
            const date = new Date(transaction.date);
            const monthYear = `${date.getFullYear()}-${date.getMonth() + 1}`;
            
            if (!stats.monthlyData[monthYear]) {
                stats.monthlyData[monthYear] = { income: 0, expense: 0 };
            }
            
            if (transaction.type === 'Income') {
                stats.totalIncome += amount;
                stats.monthlyData[monthYear].income += amount;
            } else {
                stats.totalExpense += amount;
                stats.monthlyData[monthYear].expense += amount;
            }
            
            if (transaction.status === 'Pending') stats.pendingCount++;
            if (transaction.status === 'Approved') stats.approvedCount++;
            if (transaction.status === 'Rejected') stats.rejectedCount++;
        });
        
        stats.netBalance = stats.totalIncome - stats.totalExpense;
        return stats;
    },

    // Generate chart data
    generateChartData: (transactions, period = 'monthly') => {
        const data = {
            labels: [],
            income: [],
            expense: []
        };
        
        const now = new Date();
        let labels = [];
        
        if (period === 'monthly') {
            for (let i = 5; i >= 0; i--) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const label = date.toLocaleDateString('en-IN', { 
                    month: 'short', 
                    year: '2-digit' 
                });
                labels.push({ label, month: date.getMonth(), year: date.getFullYear() });
            }
        } else if (period === 'yearly') {
            const currentYear = now.getFullYear();
            for (let year = currentYear - 4; year <= currentYear; year++) {
                labels.push({ label: year.toString(), year });
            }
        }
        
        labels.forEach(({ label, month, year }) => {
            data.labels.push(label);
            
            const filtered = transactions.filter(t => {
                const tDate = new Date(t.date);
                if (period === 'monthly') {
                    return tDate.getMonth() === month && tDate.getFullYear() === year;
                } else {
                    return tDate.getFullYear() === year;
                }
            });
            
            const income = filtered
                .filter(t => t.type === 'Income')
                .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
            
            const expense = filtered
                .filter(t => t.type === 'Expense')
                .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
            
            data.income.push(income);
            data.expense.push(expense);
        });
        
        return data;
    },

    // Create notification
    showNotification: (message, type = 'info', duration = 5000) => {
        // Remove existing notifications
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 
                                type === 'error' ? 'exclamation-circle' : 
                                type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            border-left: 4px solid var(--${type}-color);
            max-width: 400px;
        `;
        
        document.body.appendChild(notification);
        
        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        });
        
        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.animation = 'slideOutRight 0.3s ease';
                    setTimeout(() => notification.remove(), 300);
                }
            }, duration);
        }
    },

    // Create modal
    createModal: (title, content, buttons = []) => {
        return new Promise((resolve) => {
            const modalId = `modal-${Date.now()}`;
            
            const modalHTML = `
                <div class="modal-overlay show" id="${modalId}">
                    <div class="modal">
                        <div class="modal-header">
                            <h3 class="modal-title">${title}</h3>
                            <button class="modal-close" data-action="cancel">×</button>
                        </div>
                        <div class="modal-body">${content}</div>
                        ${buttons.length > 0 ? `
                            <div class="modal-footer">
                                ${buttons.map(btn => `
                                    <button class="btn ${btn.class || 'btn-outline'}" 
                                            data-action="${btn.action}">
                                        ${btn.text}
                                    </button>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
            
            document.getElementById('modal-container').innerHTML = modalHTML;
            
            const modal = document.getElementById(modalId);
            const closeModal = (action = 'cancel') => {
                modal.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => {
                    modal.remove();
                    resolve(action);
                }, 300);
            };
            
            // Event listeners
            modal.querySelector('.modal-close').addEventListener('click', () => closeModal('cancel'));
            modal.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', () => closeModal(btn.dataset.action));
            });
            
            // Close on overlay click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal('cancel');
            });
        });
    },

    // Confirm dialog
    confirm: (message, title = 'Confirm') => {
        return this.createModal(title, `
            <p>${message}</p>
        `, [
            { text: 'Cancel', action: 'cancel', class: 'btn-outline' },
            { text: 'Confirm', action: 'confirm', class: 'btn-primary' }
        ]).then(action => action === 'confirm');
    },

    // Prompt dialog
    prompt: (message, defaultValue = '', title = 'Input') => {
        return new Promise((resolve) => {
            this.createModal(title, `
                <p>${message}</p>
                <div class="form-group" style="margin-top: 20px;">
                    <input type="text" id="prompt-input" class="form-control" 
                           value="${defaultValue}" autofocus>
                </div>
            `, [
                { text: 'Cancel', action: 'cancel', class: 'btn-outline' },
                { text: 'OK', action: 'ok', class: 'btn-primary' }
            ]).then(action => {
                if (action === 'ok') {
                    resolve(document.getElementById('prompt-input')?.value || '');
                } else {
                    resolve(null);
                }
            });
        });
    }
};

// Add CSS for animations
if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

export default Utils;