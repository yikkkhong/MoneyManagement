let appData = {
    income: 0,
    // Total Balance is now calculated, not stored as a static setting
    buckets: [
        { id: 'savings', name: 'Savings', plan: 0, balance: 0, subs: [] },
        { id: 'uni', name: 'University', plan: 0, balance: 0, subs: [] },
        { id: 'spending', name: 'Spending', plan: 0, balance: 0, subs: [] }
    ],
    expenses: [],
    wishlist: []
};

// --- INIT ---
function init() {
    const saved = localStorage.getItem('financeApp_v9');
    if (saved) {
        appData = JSON.parse(saved);
    }
    document.getElementById('monthlyIncome').value = appData.income || '';
    document.getElementById('expenseDate').valueAsDate = new Date();
    
    updateUI();
}

function saveData() {
    localStorage.setItem('financeApp_v9', JSON.stringify(appData));
    updateUI();
}

function navTo(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + pageId).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    if(pageId === 'expenses' || pageId === 'wishlist') populateDropdowns();
}

// --- LOGIC: AUTOMATIC TOTAL BALANCE ---
function calculateTotalBalance() {
    let total = appData.buckets.reduce((sum, b) => sum + b.balance, 0);
    // Update the visual text only, we don't need to save 'totalBalance' separately anymore
    // but we can if we want to.
    document.getElementById('totalBalanceDisplay').innerText = total.toFixed(2);
}

function saveIncome() {
    appData.income = parseFloat(document.getElementById('monthlyIncome').value) || 0;
    saveData();
}

// --- HOMEPAGE (WALLETS) ---
function addMainSection() {
    const name = prompt("New Wallet Name:");
    if(name) {
        appData.buckets.push({ id: 'cat_' + Date.now(), name, plan: 0, balance: 0, subs: [] });
        saveData();
    }
}

function renderHome() {
    const container = document.getElementById('bucketsContainer');
    container.innerHTML = '';

    appData.buckets.forEach((b, idx) => {
        container.innerHTML += `
            <div class="wallet-card">
                <div class="wallet-info">
                    <div class="wallet-name">${b.name}</div>
                    <div class="wallet-input-wrapper">
                        <span>RM</span>
                        <input type="number" 
                               value="${b.balance}" 
                               onchange="updateSectionBalance('${b.id}', this.value)"
                               placeholder="0.00">
                    </div>
                </div>
                <button class="wallet-del" onclick="deleteSection(${idx})">✕</button>
            </div>
        `;
    });
    
    // Always recalculate total when home renders
    calculateTotalBalance();
}

function updateSectionBalance(id, val) {
    const bucket = appData.buckets.find(b => b.id === id);
    if(bucket) {
        bucket.balance = parseFloat(val) || 0;
        saveData(); // This triggers updateUI -> renderHome -> calculateTotalBalance
    }
}

function deleteSection(idx) {
    if(confirm("Delete this wallet?")) {
        appData.buckets.splice(idx, 1);
        saveData();
    }
}

// --- ALLOCATION PAGE ---
function renderPlan() {
    const container = document.getElementById('planInputs');
    container.innerHTML = '';
    
    let totalPlan = 0;

    appData.buckets.forEach(b => {
        totalPlan += b.plan;
        
        let subTotal = b.subs.reduce((acc, s) => acc + s.amount, 0);
        let subText = b.subs.length > 0 ? `${b.subs.length} sub-categories` : 'No sub-categories';
        
        container.innerHTML += `
            <div class="plan-row">
                <div class="plan-header">
                    <span style="font-weight:600">${b.name}</span>
                    <div class="plan-input-group">
                        <span>Target:</span>
                        <input type="number" value="${b.plan}" onchange="updatePlanAmount('${b.id}', this.value)">
                    </div>
                </div>
                <div class="flex-between">
                    <span>Allocated to Subs: RM ${subTotal}</span>
                    <span>Status: ${subText}</span>
                </div>
                <button class="btn-manage-sub" onclick="openSubModal('${b.id}')">Manage Sub-Allocations</button>
            </div>
        `;
    });

    document.getElementById('planIncome').innerText = appData.income.toFixed(2);
    document.getElementById('planTotal').innerText = totalPlan.toFixed(2);
    
    let pct = appData.income > 0 ? (totalPlan / appData.income) * 100 : 0;
    document.getElementById('incomeProgressBar').style.width = pct + "%";
    document.getElementById('incomeProgressBar').style.background = pct > 100 ? 'var(--danger)' : 'var(--success)';
}

function updatePlanAmount(id, val) {
    const bucket = appData.buckets.find(b => b.id === id);
    if(bucket) {
        bucket.plan = parseFloat(val) || 0;
        saveData();
    }
}

// --- SUB-ALLOCATION MODAL ---
let activeBucketId = null;

function openSubModal(id) {
    activeBucketId = id;
    const bucket = appData.buckets.find(b => b.id === id);
    document.getElementById('modalTitle').innerText = "Manage " + bucket.name;
    document.getElementById('bucketModal').style.display = 'block';
    renderSubList(bucket);
}

function closeModal() {
    document.getElementById('bucketModal').style.display = 'none';
    activeBucketId = null;
}

function renderSubList(bucket) {
    const list = document.getElementById('subAllocList');
    list.innerHTML = '';
    let subTotal = 0;
    bucket.subs.forEach((s, idx) => {
        subTotal += s.amount;
        list.innerHTML += `
            <div class="sub-item">
                <span>${s.name}</span>
                <div style="display:flex; gap:10px;">
                    <span class="bold">RM ${s.amount}</span>
                    <span style="color:red; cursor:pointer;" onclick="deleteSub(${idx})">✕</span>
                </div>
            </div>
        `;
    });
    document.getElementById('modalLimit').innerText = "RM " + bucket.plan;
    document.getElementById('modalAllocated').innerText = "RM " + subTotal;
    document.getElementById('modalAllocated').style.color = subTotal > bucket.plan ? 'var(--danger)' : 'var(--success)';
}

function addSubAlloc() {
    if(!activeBucketId) return;
    const name = document.getElementById('newSubName').value;
    const amount = parseFloat(document.getElementById('newSubAmount').value);
    
    if(name && amount) {
        const bucket = appData.buckets.find(b => b.id === activeBucketId);
        bucket.subs.push({ name, amount });
        saveData();
        renderSubList(bucket);
        document.getElementById('newSubName').value = '';
        document.getElementById('newSubAmount').value = '';
    }
}

function deleteSub(idx) {
    const bucket = appData.buckets.find(b => b.id === activeBucketId);
    bucket.subs.splice(idx, 1);
    saveData();
    renderSubList(bucket);
}

// --- EXPENSES ---
function populateDropdowns() {
    const opts = appData.buckets.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    document.getElementById('expenseCategory').innerHTML = opts;
    document.getElementById('wishCategory').innerHTML = opts;
}

function addExpense() {
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const name = document.getElementById('expenseName').value;
    const date = document.getElementById('expenseDate').value;
    const catId = document.getElementById('expenseCategory').value;

    if(amount && name && catId) {
        appData.expenses.unshift({ id: Date.now(), amount, name, date, catId });
        
        // Deduct logic
        const bucket = appData.buckets.find(b => b.id === catId);
        if(bucket) bucket.balance -= amount;
        
        saveData();
        
        document.getElementById('expenseAmount').value = '';
        document.getElementById('expenseName').value = '';
        alert("Transaction successful");
    }
}

function toggleHistory() {
    const h = document.getElementById('historySection');
    h.style.display = h.style.display === 'block' ? 'none' : 'block';
    const list = document.getElementById('expenseList');
    list.innerHTML = '';
    appData.expenses.forEach(e => {
        const b = appData.buckets.find(b => b.id === e.catId);
        list.innerHTML += `
            <div style="padding:10px; border-bottom:1px solid #eee; font-size:0.9rem;">
                <div class="flex-between">
                    <span class="bold">${e.name}</span>
                    <span style="color:var(--danger)">-RM ${e.amount.toFixed(2)}</span>
                </div>
                <div class="flex-between">
                    <span>${e.date}</span>
                    <span>${b ? b.name : '?'}</span>
                </div>
            </div>
        `;
    });
}

// --- WISHLIST ANALYSIS LOGIC ---
function addWish() {
    const name = document.getElementById('wishName').value;
    const price = parseFloat(document.getElementById('wishPrice').value);
    const catId = document.getElementById('wishCategory').value;

    if(name && price && catId) {
        appData.wishlist.push({ name, price, catId });
        saveData();
    }
}

function renderWishlist() {
    const container = document.getElementById('wishContainer');
    container.innerHTML = '';
    
    appData.wishlist.forEach((w, idx) => {
        const bucket = appData.buckets.find(b => b.id === w.catId);
        const bal = bucket ? bucket.balance : 0;
        const plan = bucket ? bucket.plan : 0;
        
        const canAfford = bal >= w.price;
        const width = Math.min(100, (bal / w.price) * 100);
        
        // ANALYSIS LOGIC
        let analysisMsg = "";
        let impactMsg = "";
        
        if (canAfford) {
            analysisMsg = "✅ Ready to buy!";
            // Calculate Impact: Cost / Plan
            if(plan > 0) {
                const impact = ((w.price / plan) * 100).toFixed(0);
                impactMsg = `This item costs ${impact}% of your monthly ${bucket.name} budget.`;
            }
        } else {
            const needed = w.price - bal;
            analysisMsg = `Need RM ${needed.toFixed(2)} more.`;
            
            if (plan > 0) {
                // How many months of full budget saving?
                const months = Math.ceil(needed / plan);
                analysisMsg += ` <br>⏳ Approx. ${months} months to save (based on RM ${plan}/mo).`;
            } else {
                analysisMsg += ` <br>⚠️ No monthly plan set for ${bucket.name}.`;
            }
        }
        
        container.innerHTML += `
            <div class="card">
                <div class="flex-between">
                    <span class="bold">${w.name}</span>
                    <span class="bold">RM ${w.price}</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width:${width}%; background:${canAfford ? 'var(--success)' : '#81C784'}"></div>
                </div>
                <p style="font-size:0.85rem; margin-top:10px; color:var(--text-dark); line-height:1.4;">
                    Wallet: <b>${bucket.name}</b> (Current: RM ${bal}) <br>
                    ${analysisMsg}
                </p>
                ${impactMsg ? `<p style="font-size:0.75rem; color:#888; margin-top:5px;">${impactMsg}</p>` : ''}
                <button class="btn-text" style="color:var(--danger); text-align:right;" onclick="deleteWish(${idx})">Remove</button>
            </div>
        `;
    });
}

function deleteWish(idx) {
    appData.wishlist.splice(idx, 1);
    saveData();
}

function updateUI() {
    renderHome();
    renderPlan();
    renderWishlist();
}

init();