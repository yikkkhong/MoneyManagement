// Initialize Data
let data = {
    balance: 0,
    income: 0,
    allocations: [
        { name: "Savings", amount: 0 },
        { name: "Daily Expenses", amount: 0 }
    ],
    wishlist: []
};

// Load data from LocalStorage
function loadData() {
    const saved = localStorage.getItem('financeData');
    if (saved) {
        data = JSON.parse(saved);
        document.getElementById('currentBalance').value = data.balance || '';
        document.getElementById('income').value = data.income || '';
    }
    renderAllocations();
    renderWishlist();
    updateMath();
}

// Save data
function saveData() {
    data.balance = parseFloat(document.getElementById('currentBalance').value) || 0;
    data.income = parseFloat(document.getElementById('income').value) || 0;
    
    // Get allocation inputs
    const rows = document.querySelectorAll('.allocation-item');
    data.allocations = [];
    rows.forEach(row => {
        const name = row.querySelector('.alloc-name').value;
        const amount = parseFloat(row.querySelector('.alloc-amount').value) || 0;
        if(name) data.allocations.push({ name, amount });
    });

    localStorage.setItem('financeData', JSON.stringify(data));
    updateMath();
}

// Render Allocation Inputs
function renderAllocations() {
    const container = document.getElementById('allocationList');
    container.innerHTML = '';
    data.allocations.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'allocation-item';
        div.innerHTML = `
            <input type="text" class="alloc-name" value="${item.name}" placeholder="Category" oninput="saveData()">
            <input type="number" class="alloc-amount" value="${item.amount}" placeholder="RM" oninput="saveData()">
            <button class="btn-delete" onclick="removeAllocation(${index})">×</button>
        `;
        container.appendChild(div);
    });
}

function addAllocationCategory() {
    data.allocations.push({ name: "", amount: 0 });
    renderAllocations();
    saveData();
}

function removeAllocation(index) {
    data.allocations.splice(index, 1);
    renderAllocations();
    saveData();
}

// Update Math Calculations
function updateMath() {
    // 1. Calculate Unallocated Cash
    let totalAllocated = data.allocations.reduce((sum, item) => sum + item.amount, 0);
    let remaining = data.income - totalAllocated;
    
    const unallocatedEl = document.getElementById('unallocatedAmount');
    unallocatedEl.innerText = remaining.toFixed(2);
    unallocatedEl.style.color = remaining < 0 ? 'red' : 'green';

    // 2. Re-analyze Wishlist
    renderWishlist();
}

// Add to Wishlist
function addToWishlist() {
    const name = document.getElementById('wishItem').value;
    const price = parseFloat(document.getElementById('wishPrice').value);

    if (name && price > 0) {
        data.wishlist.push({ name, price, date: new Date().toLocaleDateString() });
        document.getElementById('wishItem').value = '';
        document.getElementById('wishPrice').value = '';
        saveData();
    }
}

// Remove from Wishlist
function removeWishItem(index) {
    data.wishlist.splice(index, 1);
    saveData();
}

// Render Wishlist with Math Logic
function renderWishlist() {
    const list = document.getElementById('wishlistContainer');
    list.innerHTML = '';

    // Find "Savings" allocation (Checks for word 'Savings' or 'Safe')
    let savingsAlloc = data.allocations.find(a => a.name.toLowerCase().includes("savings") || a.name.toLowerCase().includes("save"))?.amount || 0;
    
    // If no specific savings category, use unallocated cash as potential savings
    let totalAllocated = data.allocations.reduce((sum, item) => sum + item.amount, 0);
    let freeCash = Math.max(0, data.income - totalAllocated); 
    let effectiveSavings = savingsAlloc > 0 ? savingsAlloc : freeCash;

    data.wishlist.forEach((item, index) => {
        // --- MATH LOGIC ---
        let impactPercent = data.balance > 0 ? ((item.price / data.balance) * 100).toFixed(1) : "100+";
        let canAffordNow = data.balance >= item.price;
        let monthsToSave = effectiveSavings > 0 ? Math.ceil(item.price / effectiveSavings) : "∞";
        
        let advice = "";
        let riskClass = "risk-low";

        if (canAffordNow) {
            if (impactPercent > 50) {
                advice = `⚠️ <b>High Impact:</b> Costs <b>${impactPercent}%</b> of your total balance.`;
                riskClass = "risk-high";
            } else {
                advice = `✅ <b>Safe:</b> Costs only <b>${impactPercent}%</b> of balance.`;
            }
        } else {
            advice = `❌ <b>Insufficient:</b> You need RM ${(item.price - data.balance).toFixed(2)} more.`;
            riskClass = "risk-high";
        }

        if (effectiveSavings > 0) {
            advice += `<br>⏳ Based on savings (RM${effectiveSavings}/period), it takes <b>${monthsToSave}</b> periods to earn this back.`;
        } else {
            advice += `<br>⚠️ No savings allocated. Cannot calculate time to afford.`;
        }

        const li = document.createElement('li');
        li.className = `wish-item ${riskClass}`;
        li.innerHTML = `
            <div class="wish-header">
                <span>${item.name}</span>
                <span>RM ${item.price.toFixed(2)}</span>
            </div>
            <div class="math-analysis">${advice}</div>
            <div style="text-align:right; margin-top:5px;">
                <button onclick="removeWishItem(${index})" style="padding:5px 10px; width:auto; font-size:0.8rem; background:#ddd; color:#333;">Bought / Remove</button>
            </div>
        `;
        list.appendChild(li);
    });
}

// Start App
loadData();
// Event Listeners for Real-time Calculation
document.getElementById('currentBalance').addEventListener('input', saveData);
document.getElementById('income').addEventListener('input', saveData);