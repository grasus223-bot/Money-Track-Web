// NOTE: This file assumes transactions.js (with getTransactions, showNotification, etc.) is loaded FIRST.

// Global Budget Utilities (Consistency check)
function getBudgets() {
    const budgetsJSON = localStorage.getItem('PaisaTrackBudgets'); 
    return budgetsJSON ? JSON.parse(budgetsJSON) : [];
}

function saveBudgets(budgets) {
    localStorage.setItem('PaisaTrackBudgets', JSON.stringify(budgets));
}

// Helper to calculate how much has been spent in a specific category this month
function calculateSpent(category) {
    // getTransactions() is assumed to be available from transactions.js
    const transactions = getTransactions();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return transactions
        .filter(t => {
            // Transaction date format is DD/MM/YYYY
            const parts = t.date.split('/').map(Number);
            const transactionDate = new Date(parts[2], parts[1] - 1, parts[0]);
            
            return t.type === 'expense' && 
                   t.category.toLowerCase() === category.toLowerCase() && 
                   transactionDate.getMonth() === currentMonth && 
                   transactionDate.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + t.amount, 0);
}

// 1. Rendering Function (Displays the active budget cards)
function renderBudgets() {
    // Note: We use budgetList because this is the dedicated budget page logic
    const budgetList = document.getElementById('budgetList'); 
    if (!budgetList) return;

    const budgets = getBudgets();
    budgetList.innerHTML = ''; // Clear previous content

    if (budgets.length === 0) {
        budgetList.innerHTML = `<li style="text-align: center; color: #777; padding: 15px;">No active budgets. Add one above.</li>`;
        return;
    }

    // Adjust list style for better visibility
    budgetList.style.display = 'grid';
    budgetList.style.gridTemplateColumns = 'repeat(auto-fit, minmax(300px, 1fr))';
    budgetList.style.gap = '20px';


    budgets.forEach(b => {
        // formatCurrency() is assumed to be available
        const spent = calculateSpent(b.category);
        const remaining = b.limit - spent;
        const percentage = Math.min(100, (spent / b.limit) * 100);
        
        let barColor = 'var(--primary-color)';
        if (percentage > 90) {
            barColor = 'var(--secondary-color)'; 
        } else if (percentage > 70) {
            barColor = 'var(--accent-color)';
        }
        
        const item = document.createElement('li');
        item.className = 'quick-panel'; // Reusing quick-panel style
        item.style.borderLeft = '8px solid ' + barColor; 

        item.innerHTML = `
            <div>
                <span class="category-title" style="font-weight: 700; font-size: 1.1em; text-transform: capitalize;">${b.category}</span>
                <button onclick="deleteBudget(${b.id})" class="delete-btn" style="float: right; color: #999; background: none; border: none; cursor: pointer;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <p style="font-size: 0.9em; margin-top: 10px;">Limit: ${formatCurrency(b.limit)}</p>
            <p style="font-size: 0.9em;">Spent: <span class="spent-amount">${formatCurrency(spent)}</span></p>
            
            <div class="progress-bar-container" style="margin-top: 10px;">
                <div class="progress-bar" style="width: ${percentage}%; background-color: ${barColor};"></div>
            </div>
            <p style="font-weight: 600; margin-top: 5px;">Remaining: <span style="color: ${remaining < 0 ? 'var(--secondary-color)' : 'var(--primary-color)'}">${formatCurrency(Math.abs(remaining))}</span></p>
        `;
        budgetList.appendChild(item);
    });
}

// 2. Form Submission Handler (Fix: Calls renderBudgets after save)
function handleBudgetFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    
    // IMPORTANT: Assuming form elements use 'id' or 'name' attributes matching input fields in budget.html
    const category = document.getElementById('category').value;
    const limit = parseFloat(document.getElementById('limit').value);
    
    // Check if the current month field exists (assuming month input id is 'month')
    const monthInput = document.getElementById('month');
    const month = monthInput ? monthInput.value : new Date().toISOString().substring(0, 7); // YYYY-MM format
    
    if (limit <= 0 || isNaN(limit) || !category) {
        showNotification("❌ Please select a category and enter a valid limit.", true);
        return;
    }

    let budgets = getBudgets();
    
    // Check for duplicates (same category for the same month)
    if (budgets.some(b => b.category === category && b.month === month)) {
        showNotification(`❌ Budget for '${category}' for this month already exists.`, true);
        return;
    }

    const newBudget = {
        id: Date.now(), // Unique ID
        category: category,
        limit: limit,
        month: month
    };

    budgets.push(newBudget);
    saveBudgets(budgets);
    
    form.reset();
    showNotification(`✅ Budget for ${category} added successfully!`);
    
    // *** THE KEY FIX: Re-render list immediately ***
    renderBudgets(); 
    
    // Reset month input value if it exists
    if (monthInput) monthInput.value = month; 
}

// 3. Delete Function
function deleteBudget(id) {
    let budgets = getBudgets();
    const initialLength = budgets.length;
    
    budgets = budgets.filter(b => b.id != id);

    if (budgets.length < initialLength) {
        saveBudgets(budgets);
        showNotification("Budget deleted successfully.");
    } else {
         showNotification("Budget not found.", true);
    }
    
    renderBudgets(); // Re-render the list after deletion
}

// 4. Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Only run this logic on the dedicated budget page (budget.html)
    const budgetForm = document.getElementById('budgetForm');
    
    if (budgetForm) {
        budgetForm.addEventListener('submit', handleBudgetFormSubmit);
        
        // Ensure initial month value is set for the form
        const monthInput = document.getElementById('month');
        if (monthInput) {
            const now = new Date();
            monthInput.value = now.toISOString().substring(0, 7);
        }
    }
    
    // Load budgets immediately when the page loads (on budget.html)
    if (document.getElementById('budgetList')) {
        renderBudgets();
    }
});

// Expose deleteBudget globally so it can be called from the onclick attribute in HTML
window.deleteBudget = deleteBudget;