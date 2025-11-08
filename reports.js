// NOTE: This file assumes transactions.js (with getTransactions, formatCurrency, showNotification) is loaded first.

// Helper function to convert DD/MM/YYYY to JS Date object for easy comparison
function convertToStandardDate(dateString) {
    if (!dateString) return null;
    // Assuming transaction date format is stored as DD/MM/YYYY
    const [day, month, year] = dateString.split('/').map(Number); 
    // Note: JS Date constructor uses 0-indexed month (MM - 1)
    return new Date(year, month - 1, day);
}

// 1. Core Filtering and Calculation Function
function runReport(startDate, endDate, category) {
    // getTransactions() is assumed to be loaded from transactions.js
    const allTransactions = getTransactions(); 
    let totalIncome = 0;
    let totalExpense = 0;

    const filterStartDate = startDate ? new Date(startDate) : null;
    const filterEndDate = endDate ? new Date(endDate) : null;
    
    // Ensure end date includes the entire day
    if (filterEndDate) {
        filterEndDate.setHours(23, 59, 59, 999);
    }

    // --- Validation ---
    // showNotification() is assumed to be loaded from transactions.js
    if (filterStartDate && filterEndDate && filterStartDate > filterEndDate) {
        showNotification("❌ Start Date cannot be after End Date.", true);
        return { totalIncome: 0, totalExpense: 0, filteredTransactions: [] };
    }
    // --- End Validation ---


    const filteredTransactions = allTransactions.filter(t => {
        const transactionDate = convertToStandardDate(t.date);

        // Filter 1: Category Match
        const categoryMatch = category === 'all' || t.category.toLowerCase() === category.toLowerCase();

        // Filter 2: Date Range Match
        let dateMatch = true;
        if (filterStartDate && transactionDate < filterStartDate) {
            dateMatch = false;
        }
        if (filterEndDate && transactionDate > filterEndDate) {
            dateMatch = false;
        }

        return categoryMatch && dateMatch;
    });

    // Calculate totals from filtered transactions
    filteredTransactions.forEach(t => {
        if (t.type === 'income') {
            totalIncome += t.amount;
        } else if (t.type === 'expense') {
            totalExpense += t.amount;
        }
    });

    return { totalIncome, totalExpense, filteredTransactions };
}

// 2. Update Report Metrics on HTML
function updateReportMetrics(reportData) {
    // formatCurrency() is assumed to be loaded from transactions.js
    const netFlow = reportData.totalIncome - reportData.totalExpense;

    document.getElementById('reportIncome').textContent = formatCurrency(reportData.totalIncome);
    document.getElementById('reportExpense').textContent = formatCurrency(reportData.totalExpense);
    
    const netFlowElement = document.getElementById('reportNetFlow');
    netFlowElement.textContent = formatCurrency(netFlow);
    
    // Color coding for Net Flow Card
    const netFlowCard = netFlowElement.parentElement;
    netFlowCard.classList.remove('balance-card', 'expense-card', 'savings-card');
    
    if (netFlow >= 0) {
        netFlowCard.classList.add('balance-card'); 
    } else {
        netFlowCard.classList.add('expense-card');
    }
    
    // NEW: Render Chart based on filtered data
    renderReportChart(reportData.filteredTransactions);
}


// 3. NEW CHART RENDERING FUNCTION
function renderReportChart(transactions) {
    const ctx = document.getElementById('reportCategoryChart');
    const placeholder = document.getElementById('chartPlaceholderMessage');

    // Destroy existing chart instance if it exists globally
    if (window.reportChartInstance) {
        window.reportChartInstance.destroy();
    }
    
    if (!ctx) return; 

    // Calculate Expense Totals from filtered transactions
    const categoryTotals = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {});

    const labels = Object.keys(categoryTotals);
    const dataValues = Object.values(categoryTotals);
    
    // Handle case where no expense data is found
    if (dataValues.length === 0 || dataValues.every(v => v === 0)) {
        ctx.style.display = 'none';
        placeholder.style.display = 'flex';
        placeholder.innerHTML = 'No expense data found in the selected filter range.';
        return;
    }
    
    // Hide placeholder and show canvas
    placeholder.style.display = 'none';
    ctx.style.display = 'block';

    // Chart.js Configuration (Pie Chart)
    window.reportChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                label: 'Expense by Category',
                data: dataValues,
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#E7E9ED'],
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'right' },
                tooltip: { callbacks: { label: (context) => {
                    let label = context.label || ''; if (label) { label += ': '; }
                    // formatCurrency() assumed loaded from transactions.js
                    label += formatCurrency(context.parsed); return label;
                }}}
            }
        }
    });
}


// 4. Initialization and Form Handler
document.addEventListener('DOMContentLoaded', () => {
    const reportFilterForm = document.getElementById('reportFilterForm');

    if (reportFilterForm) {
        reportFilterForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            const category = document.getElementById('categoryFilter').value;

            const reportData = runReport(startDate, endDate, category);
            updateReportMetrics(reportData);
            
            // Show notification if report ran successfully
            if (reportData.filteredTransactions.length > 0) {
                 showNotification(`Report generated successfully! Showing ${reportData.filteredTransactions.length} transactions.`);
            } else if (!document.querySelector('.error-notification.notification-show')) {
                 // Only show 'No transactions found' if a date validation error didn't already pop up
                 showNotification(`No transactions found matching your criteria.`, true);
            }
        });
    }

    // Load initial report (no filters applied) on page load
    const initialReport = runReport(null, null, 'all');
    updateReportMetrics(initialReport);
});