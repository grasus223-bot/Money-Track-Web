// ... [getTransactions, formatCurrency functions from previous steps] ...
// ... [updateDashboardMetrics, updateRecentTransactions functions] ...

// Event Listeners on Load
document.addEventListener('DOMContentLoaded', () => {
    updateDashboardMetrics();
    updateRecentTransactions();

    // Linking the 'RECORD NEW' button to the transactions page
    document.getElementById('addTransactionBtn').addEventListener('click', () => {
        window.location.href = 'transactions.html';
    });
});
// (Ensure the full code for script.js is copied from previous replies)