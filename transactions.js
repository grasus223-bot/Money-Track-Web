// =======================================================
// PART 1: HELPER FUNCTIONS & DATA STORAGE
// =======================================================

const TRANSACTION_KEY = 'PaisaTrackTransactions'; // Unified Key for Transactions
const BUDGET_KEY = 'PaisaTrackBudgets'; // Unified Key for Budgets

function formatCurrency(amount) {
    return `₹ ${Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

// Data Load/Save Helpers
function getTransactions() {
    const transactionsJSON = localStorage.getItem(TRANSACTION_KEY);
    return transactionsJSON ? JSON.parse(transactionsJSON) : [];
}
function saveTransactions(transactions) {
    localStorage.setItem(TRANSACTION_KEY, JSON.stringify(transactions));
}
function getBudgets() {
    const budgetsJSON = localStorage.getItem(BUDGET_KEY);
    return budgetsJSON ? JSON.parse(budgetsJSON) : [];
}
function saveBudgets(budgets) {
    localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets));
}

// Custom Notification Logic (Toast Message)
function showNotification(message, isError = false) {
    const notificationArea = document.getElementById('notification-area');
    if (!notificationArea) return;

    notificationArea.textContent = message;
    notificationArea.classList.remove('success-notification', 'error-notification', 'notification-show');
    
    if (isError) {
        notificationArea.classList.add('error-notification'); 
    } else {
        notificationArea.classList.add('success-notification');
    }

    notificationArea.classList.add('notification-show');

    setTimeout(() => {
        notificationArea.classList.remove('notification-show');
    }, 3000);
}


// =======================================================
// PART 2: DASHBOARD (index.html) LOGIC & CHARTS
// =======================================================

function updateDashboardMetrics() {
    if (!document.getElementById('totalBalance')) return; 

    const allTransactions = getTransactions();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let monthlyIncome = 0;
    let monthlyExpense = 0;
    
    allTransactions.forEach(t => {
        const parts = t.date.split('/').map(Number);
        
        if ((parts[1] - 1) === currentMonth && parts[2] === currentYear) {
            if (t.type === 'income') {
                monthlyIncome += t.amount;
            } else if (t.type === 'expense') {
                monthlyExpense += t.amount;
            }
        }
    });

    const netSavings = monthlyIncome - monthlyExpense;
    const totalBalance = allTransactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);

    document.getElementById('totalBalance').textContent = formatCurrency(totalBalance);
    document.getElementById('monthlyExpense').textContent = formatCurrency(monthlyExpense);
    document.getElementById('monthlyIncome').textContent = formatCurrency(monthlyIncome);
    document.getElementById('netSavings').textContent = formatCurrency(netSavings);

    renderCharts(allTransactions); 
    updateRecentTransactions(allTransactions);
    // Call renderBudgets here if you add its logic back
}

function updateRecentTransactions(transactions) {
    const list = document.getElementById('transactionList');
    if (!list) return;

    list.innerHTML = '';
    const recent = transactions.sort((a, b) => b.id - a.id).slice(0, 5); 

    if (recent.length === 0) {
        list.innerHTML = `<li style="text-align: center; color: #777;">No recent transactions recorded.</li>`;
        return;
    }

    recent.forEach(t => {
        const item = document.createElement('li');
        const iconClass = t.type === 'income' ? 'fa-arrow-circle-up text-primary' : 'fa-arrow-circle-down text-secondary';
        const amountClass = t.type === 'income' ? 'font-weight: 700; color: var(--primary-color);' : 'font-weight: 700; color: var(--secondary-color);';
        const sign = t.type === 'income' ? '+' : '-';

        item.innerHTML = `
            <div style="display: flex; align-items: center;">
                <i class="fas ${iconClass}" style="margin-right: 10px; font-size: 1.2em;"></i>
                ${t.description} 
            </div>
            <span class="amount" style="${amountClass}">${sign} ${formatCurrency(t.amount)}</span>
        `;
        list.appendChild(item);
    });
}

function renderCharts(transactions) {
    renderCategoryPieChart(transactions);
    renderCashFlowBarChart(transactions);
}

function renderCategoryPieChart(transactions) {
    const ctx = document.getElementById('categoryPieChart');
    if (!ctx || typeof Chart === 'undefined') return;

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const categoryTotals = transactions
        .filter(t => {
            const transactionDate = new Date(t.date.split('/').reverse().join('-'));
            return t.type === 'expense' && transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear;
        })
        .reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {});

    const labels = Object.keys(categoryTotals);
    const dataValues = Object.values(categoryTotals);
    
    if (dataValues.length === 0) {
        ctx.parentElement.innerHTML = `<div class="placeholder" style="height: 300px;">No Expense Data this Month.</div>`;
        return;
    }
    
    if (window.pieChartInstance) { window.pieChartInstance.destroy(); }

    window.pieChartInstance = new Chart(ctx, {
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
                legend: { position: 'top' },
                tooltip: { callbacks: { label: (context) => {
                    let label = context.label || ''; if (label) { label += ': '; }
                    label += formatCurrency(context.parsed); return label;
                }}}
            }
        }
    });
}

function renderCashFlowBarChart(transactions) {
    const ctx = document.getElementById('cashFlowBarChart');
    if (!ctx || typeof Chart === 'undefined') return;

    const monthlyData = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const today = new Date();
    const currentMonthIndex = today.getMonth();
    const currentYear = today.getFullYear();

    for (let i = 0; i < 6; i++) {
        let month = (currentMonthIndex - i + 12) % 12;
        let year = currentYear;
        if (currentMonthIndex - i < 0) { year = currentYear - 1; }
        monthlyData[`${monthNames[month]} ${year}`] = { income: 0, expense: 0 };
    }

    transactions.forEach(t => {
        const transactionDate = new Date(t.date.split('/').reverse().join('-'));
        const monthYearKey = `${monthNames[transactionDate.getMonth()]} ${transactionDate.getFullYear()}`;
        
        if (monthlyData.hasOwnProperty(monthYearKey)) {
            if (t.type === 'income') { monthlyData[monthYearKey].income += t.amount; } 
            else { monthlyData[monthYearKey].expense += t.amount; }
        }
    });

    const labels = Object.keys(monthlyData).reverse(); 
    const incomeData = Object.values(monthlyData).map(d => d.income).reverse();
    const expenseData = Object.values(monthlyData).map(d => d.expense).reverse();
    
    if (incomeData.every(v => v === 0) && expenseData.every(v => v === 0)) {
        ctx.parentElement.innerHTML = `<div class="placeholder" style="height: 300px;">No Cash Flow Data in the last 6 months.</div>`;
        return;
    }
    
    if (window.barChartInstance) { window.barChartInstance.destroy(); }

    window.barChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Income', data: incomeData, backgroundColor: '#00bfa5', borderColor: '#00bfa5', borderWidth: 1 },
                { label: 'Expense', data: expenseData, backgroundColor: '#ff5252', borderColor: '#ff5252', borderWidth: 1 }
            ]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true, ticks: { callback: (value) => formatCurrency(value) } } },
            plugins: { tooltip: { callbacks: { label: (context) => {
                let label = context.dataset.label || ''; if (label) { label += ': '; }
                label += formatCurrency(context.parsed.y); return label;
            }}}}
        }
    });
}


// =======================================================
// PART 3: TRANSACTIONS PAGE (transactions.html) LOGIC
// =======================================================

function renderTransactions() {
    const transactionTableBody = document.getElementById('transactionTableBody');
    if (!transactionTableBody) return; 

    const transactions = getTransactions();
    const sortedTransactions = transactions.sort((a, b) => b.id - a.id); 

    transactionTableBody.innerHTML = ''; 

    if (sortedTransactions.length === 0) {
        transactionTableBody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">No transactions recorded yet.</td></tr>';
        return;
    }

    sortedTransactions.forEach(transaction => {
        const isExpense = transaction.type === 'expense';
        const sign = isExpense ? '-' : '+';
        const amountDisplay = formatCurrency(transaction.amount);
        const colorClass = isExpense ? 'text-secondary' : 'text-primary'; 

        const row = transactionTableBody.insertRow();
        row.className = 'hover:bg-gray-50';

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${transaction.date}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${transaction.description}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">${transaction.category}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold ${colorClass}">${sign} ${amountDisplay}</td>
        `;
    });
}

function handleTransactionForm() {
    const transactionForm = document.getElementById('transactionForm');
    if (!transactionForm) return;

    transactionForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const type = document.getElementById('type').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const category = document.getElementById('category').value;
        const description = document.getElementById('description').value;

        if (isNaN(amount) || amount <= 0 || !description) {
            showNotification("❌ Please enter a valid amount and description.", true);
            return;
        }

        const newTransaction = {
            id: Date.now(), 
            date: new Date().toLocaleDateString('en-IN'), 
            type,
            amount,
            category,
            description
        };

        const transactions = getTransactions();
        transactions.push(newTransaction);
        saveTransactions(transactions); 

        renderTransactions(); // CRITICAL: Refreshes the history list immediately
        transactionForm.reset(); 
        
        showNotification(`✅ Transaction Recorded: ${description}`);
        
        // After adding transaction, dashboard should refresh (handled by saveTransactions calling updateDashboardMetrics implicitly)
    });
}


// =======================================================
// PART 4: BUDGET LOGIC (budget.html) - Omitted for brevity, assumed correct
// =======================================================
// (You must include handleBudgetForm and renderBudgets logic here)


// =======================================================
// PART 5: INITIALIZATION
// =======================================================

document.addEventListener('DOMContentLoaded', () => {
    // If we are on index.html (Dashboard), run the metric and chart updates
    if (document.getElementById('totalBalance')) {
        updateDashboardMetrics();
    }
    
    // If we are on transactions.html, run the transaction list/form setup
    if (document.getElementById('transactionTableBody')) {
        renderTransactions();
        handleTransactionForm();
    }
    
    // If we are on budget.html, run the budget list/form setup
    // if (document.getElementById('budgetList')) { 
    //    renderBudgets(); 
    //    handleBudgetForm(); 
    // }
});