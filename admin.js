let currentCustomer = null;

function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.className = `notification ${isError ? 'error' : ''}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

async function lookupCustomer() {
    const serialNumber = document.getElementById('serialNumber').value.trim();
    
    if (!serialNumber) {
        showNotification('Please enter a card number', true);
        return;
    }

    try {
        const response = await fetch(`/api/lookup?serial=${encodeURIComponent(serialNumber)}`);
        
        if (!response.ok) {
            throw new Error('Customer not found');
        }

        const customer = await response.json();
        displayCustomer(customer);
        
    } catch (error) {
        console.error('Lookup error:', error);
        showNotification('Customer not found. Please check the card number.', true);
    }
}

function displayCustomer(customer) {
    currentCustomer = customer;
    
    document.getElementById('customerName').textContent = customer.name;
    document.getElementById('customerEmail').textContent = customer.email;
    document.getElementById('customerPoints').textContent = customer.points;
    document.getElementById('memberSince').textContent = new Date(customer.createdAt).toLocaleDateString();
    
    displayTransactions(customer.transactions || []);
    
    document.getElementById('customerInfo').style.display = 'block';
    document.getElementById('serialNumber').value = '';
}

function displayTransactions(transactions) {
    const listEl = document.getElementById('transactionList');
    
    if (!transactions || transactions.length === 0) {
        listEl.innerHTML = '<p style="color: #6c757d; text-align: center;">No transactions yet</p>';
        return;
    }

    // Show most recent first
    const recentTransactions = [...transactions].reverse().slice(0, 10);
    
    listEl.innerHTML = recentTransactions.map(t => {
        const isPositive = t.pointsChange > 0;
        const date = new Date(t.date).toLocaleString();
        const sign = isPositive ? '+' : '';
        
        return `
            <div class="transaction ${isPositive ? 'positive' : 'negative'}">
                <div>
                    <strong>${sign}${t.pointsChange} points</strong>
                    <div style="font-size: 0.85em; color: #6c757d;">${date}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.85em; color: #6c757d;">${t.action}</div>
                    <strong>Balance: ${t.newBalance}</strong>
                </div>
            </div>
        `;
    }).join('');
}

async function addPoints(pointsToAdd) {
    if (!currentCustomer) {
        showNotification('No customer selected', true);
        return;
    }

    try {
        const response = await fetch('/api/update-points', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                serialNumber: currentCustomer.serialNumber,
                pointsToAdd: pointsToAdd,
                action: pointsToAdd > 0 ? 'Purchase' : 'Redemption'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update points');
        }

        const result = await response.json();
        
        // Update display
        currentCustomer.points = result.newPoints;
        document.getElementById('customerPoints').textContent = result.newPoints;
        
        // Add transaction to history
        if (!currentCustomer.transactions) {
            currentCustomer.transactions = [];
        }
        currentCustomer.transactions.push({
            date: new Date().toISOString(),
            pointsChange: pointsToAdd,
            action: pointsToAdd > 0 ? 'Purchase' : 'Redemption',
            newBalance: result.newPoints
        });
        
        displayTransactions(currentCustomer.transactions);
        
        const message = pointsToAdd > 0 
            ? `Added ${pointsToAdd} points! New balance: ${result.newPoints}`
            : `Redeemed ${Math.abs(pointsToAdd)} points! New balance: ${result.newPoints}`;
        
        showNotification(message);
        
    } catch (error) {
        console.error('Update points error:', error);
        showNotification('Failed to update points', true);
    }
}

function clearCustomer() {
    currentCustomer = null;
    document.getElementById('customerInfo').style.display = 'none';
    document.getElementById('serialNumber').value = '';
}

// Listen for Enter key on serial number input
document.getElementById('serialNumber').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        lookupCustomer();
    }
});

// Auto-focus on serial number input
document.getElementById('serialNumber').focus();