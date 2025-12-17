// Data Structure
let appData = {
    settings: {
        balance: 0,
        income: 0,
        allocations: [{name: "Savings", amount: 0}]
    },
    transactions: [], // Stores every expense: { id, name, amount, date }
    wishlist: []
};

// --- INITIALIZATION ---
function init() {
    const saved = localStorage.getItem('financeApp_v2');
    if (saved) {
        appData = JSON.parse(saved);
        // Fill inputs
        document.getElementById('inpBalance').value = appData.settings.balance;
        document.getElementById('inpIncome').value = appData.settings.income;
    }
    updateUI();
}

function saveData() {
    localStorage.setItem('financeApp_v2', JSON.stringify(appData));
    updateUI();
}

// --- NAVIGATION ---
function navTo(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    // Show target
    document.getElementById('page-' + pageId).classList.add('active');
    
    // Update Bottom Nav
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active'); // Highlight clicked button

    // Update Title
    const titles = { 'home': 'Overview', 'expenses': 'Daily Expenses', 'manage': 'Settings', 'wishlist': 'Wishlist' };
    document.getElementById('pageTitle').innerText = titles[pageId];
}

// --- HOME & AI LOGIC ---
function updateUI() {
    // 1. Calculate Real Balance
    let totalSpent = appData.transactions.reduce((sum, t) => sum + t.amount, 0);
    let currentBal = appData.settings.balance - totalSpent;
    
    document.getElementById('displayBalance').innerText = "RM " + currentBal.toFixed(2);

    // 2. Health Bar (Income vs Spent)
    let percentage = 100;
    if (appData.settings.income > 0) {
        percentage = Math.max(0, 100 - ((totalSpent / appData.settings.income) * 100));
    }
    const bar = document.getElementById('healthBar');
    bar.style.width = percentage + "%";
    bar.style.background = percentage < 20 ? "#ff5252" : "#4CAF50";

    // 3. AI PROJECTION (The Smart Feature)
    generatePrediction(totalSpent, currentBal);
    
    // 4. Render Sub-components
    renderAllocations();
    renderExpenses(currentFilter); // Keep current filter
    renderWishlist();
}

function generatePrediction(totalSpent, currentBal) {
    const today = new Date();
    const dayOfMonth = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    
    // Get spending ONLY for this month
    const thisMonthSpent = appData.transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === today.getMonth();
    }).reduce((sum, t) => sum + t.amount, 0);

    if (thisMonthSpent === 0) {
        document.getElementById('projectionText').innerHTML = "No spending recorded this month yet.";
        return;
    }

    // Math: Average Daily Spend
    const dailyAvg = thisMonthSpent / dayOfMonth;
    const projectedTotal = dailyAvg * daysInMonth;
    const projectedLeft = appData.settings.income - projectedTotal;

    let msg = `You spend avg <b>RM${dailyAvg.toFixed(2)}/day</b>. `;
    
    if (projectedTotal > appData.settings.income) {
        msg += `<br><span style="color:red">⚠️ Warning:</span> At this rate, you will overspend your income by RM${(projectedTotal - appData.settings.income).toFixed(0)}!`;
    } else {
        msg += `<br>✅ Good job! You are on track to save RM${projectedLeft.toFixed(0)} this month.`;
    }
    
    document.getElementById('projectionText').innerHTML = msg;
}

// --- EXPENSES LOGIC ---
let currentFilter = 'week';

function addExpense() {
    const name = document.getElementById('expenseName').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);

    if (name && amount) {
        appData.transactions.unshift({
            id: Date.now(),
            name: name,
            amount: amount,
            date: new Date().toISOString()
        });
        document.getElementById('expenseName').value = '';
        document.getElementById('expenseAmount').value = '';
        saveData();
    }
}

function filterExpenses(type) {
    currentFilter = type;
    // Update button visual
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    renderExpenses(type);
}

function renderExpenses(filterType) {
    const list = document.getElementById('expenseList');
    list.innerHTML = '';

    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);

    const filtered = appData.transactions.filter(t => {
        const tDate = new Date(t.date);
        if (filterType === 'week') return tDate >= oneWeekAgo;
        if (filterType === 'month') return tDate.getMonth() === now.getMonth();
        return true;
    });

    if(filtered.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">No records found.</div>';
        return;
    }

    filtered.forEach(t => {
        const dateStr = new Date(t.date).toLocaleDateString();
        const div = document.createElement('div');
        div.className = 'expense-item';
        div.innerHTML = `
            <div>
                <div style="font-weight:500">${t.name}</div>
                <div class="expense-date">${dateStr}</div>
            </div>
            <div style="font-weight:bold; color:var(--danger)">- RM ${t.amount.toFixed(2)}</div>
        `;
        list.appendChild(div);
    });
}

// --- SETTINGS / MANAGE ---
function updateSettings() {
    appData.settings.balance = parseFloat(document.getElementById('inpBalance').value) || 0;
    appData.settings.income = parseFloat(document.getElementById('inpIncome').value) || 0;
    saveData();
}

function renderAllocations() {
    const list = document.getElementById('allocationList');
    list.innerHTML = '';
    appData.settings.allocations.forEach((alloc, idx) => {
        list.innerHTML += `
            <div style="display:flex; gap:10px; margin-bottom:10px;">
                <input type="text" value="${alloc.name}" onchange="updateAlloc(${idx}, 'name', this.value)" style="flex:2">
                <input type="number" value="${alloc.amount}" onchange="updateAlloc(${idx}, 'amount', this.value)" style="flex:1">
            </div>`;
    });
}

function addAllocation() {
    appData.settings.allocations.push({name: "", amount: 0});
    saveData();
}

function updateAlloc(index, field, value) {
    if(field === 'amount') value = parseFloat(value);
    appData.settings.allocations[index][field] = value;
    saveData();
}

// --- WISHLIST ---
function addWish() {
    const name = document.getElementById('wishName').value;
    const price = parseFloat(document.getElementById('wishPrice').value);
    if(name && price) {
        appData.wishlist.push({name, price});
        document.getElementById('wishName').value = '';
        document.getElementById('wishPrice').value = '';
        saveData();
    }
}

function renderWishlist() {
    const list = document.getElementById('wishContainer');
    list.innerHTML = '';
    
    // Calc savings available
    const totalAllocated = appData.settings.allocations.reduce((sum, a) => sum + a.amount, 0);
    const freeCash = Math.max(0, appData.settings.income - totalAllocated);

    appData.wishlist.forEach((item, idx) => {
        // Math logic
        const months = freeCash > 0 ? Math.ceil(item.price / freeCash) : "Forever";
        const impact = (item.price / appData.settings.balance * 100).toFixed(1);

        const li = document.createElement('div');
        li.className = 'card';
        li.style.borderLeft = impact > 50 ? '4px solid red' : '4px solid green';
        li.innerHTML = `
            <div style="display:flex; justify-content:space-between; font-weight:bold;">
                <span>${item.name}</span>
                <span>RM ${item.price}</span>
            </div>
            <p class="small-text">
                Wait time: <b>${months} months</b> (based on unallocated income).<br>
                Impact: Uses <b>${impact}%</b> of current balance.
            </p>
            <button class="btn-outline" onclick="removeWish(${idx})" style="padding:5px; margin-top:5px; font-size:0.8rem">Remove</button>
        `;
        list.appendChild(li);
    });
}

function removeWish(idx) {
    appData.wishlist.splice(idx, 1);
    saveData();
}

// Start
init();