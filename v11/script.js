let appData = {
    income: 0,
    buckets: [
        { id: 'savings', name: 'Savings', plan: 0, balance: 0, subs: [] },
        { id: 'uni', name: 'University', plan: 0, balance: 0, subs: [] },
        { id: 'spending', name: 'Spending', plan: 0, balance: 0, subs: [] }
    ],
    // transactions: { id, type, amount, name, date, catId }
    transactions: [],
    wishlist: []
};

// --- INIT ---
function init() {
    const saved = localStorage.getItem('financeApp_v11');
    if (saved) {
        appData = JSON.parse(saved);
        if(!appData.transactions) appData.transactions = []; // migration safety
    }
    
    // Set UI defaults
    document.getElementById('monthlyIncome').value = appData.income || '';
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('incDate').value = today;
    document.getElementById('expDate').value = today;
    
    updateUI();
}

function saveData() {
    localStorage.setItem('financeApp_v11', JSON.stringify(appData));
    updateUI();
}

function navTo(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + pageId).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    populateDropdowns();
}

// --- LOGIC: TOTAL BALANCE ---
function calculateTotalBalance() {
    let total = appData.buckets.reduce((sum, b) => sum + b.balance, 0);
    document.getElementById('totalBalanceDisplay').innerText = total.toFixed(2);
}

function saveIncome() {
    appData.income = parseFloat(document.getElementById('monthlyIncome').value) || 0;
    saveData();
}

// --- HOMEPAGE (WALLETS - READ ONLY) ---
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
                    <div class="wallet-val">RM ${b.balance.toFixed(2)}</div>
                </div>
                <button class="wallet-del" onclick="deleteSection(${idx})">✕</button>
            </div>
        `;
    });
    
    calculateTotalBalance();
}

function deleteSection(idx) {
    if(confirm("Delete this wallet? Money inside will be lost.")) {
        appData.buckets.splice(idx, 1);
        saveData();
    }
}

// --- TRANSACTION LOGIC (ADD INCOME / EXPENSE) ---
function populateDropdowns() {
    const opts = appData.buckets.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    document.getElementById('incCategory').innerHTML = opts;
    document.getElementById('expCategory').innerHTML = opts;
    document.getElementById('wishCategory').innerHTML = opts;
}

function addTransaction(type) {
    let amount, name, date, catId;
    
    if(type === 'income') {
        amount = parseFloat(document.getElementById('incAmount').value);
        name = document.getElementById('incName').value;
        date = document.getElementById('incDate').value;
        catId = document.getElementById('incCategory').value;
    } else {
        amount = parseFloat(document.getElementById('expAmount').value);
        name = document.getElementById('expName').value;
        date = document.getElementById('expDate').value;
        catId = document.getElementById('expCategory').value;
    }

    if(amount && name && catId && date) {
        // Record Transaction
        appData.transactions.unshift({ 
            id: Date.now(), 
            type: type, 
            amount: amount, 
            name: name, 
            date: date, 
            catId: catId 
        });
        
        // Update Wallet Balance
        const bucket = appData.buckets.find(b => b.id === catId);
        if(bucket) {
            if(type === 'income') {
                bucket.balance += amount;
            } else {
                bucket.balance -= amount;
            }
        }
        
        saveData();
        
        // Reset Fields
        if(type === 'income') {
            document.getElementById('incAmount').value = '';
            document.getElementById('incName').value = '';
            alert("Money Added Successfully!");
        } else {
            document.getElementById('expAmount').value = '';
            document.getElementById('expName').value = '';
            alert("Payment Recorded!");
        }
    } else {
        alert("Please fill in all fields.");
    }
}

// --- TRANSACTION HISTORY VIEW ---
function openTransactionModal() {
    document.getElementById('transModal').style.display = 'block';
    renderTransactions();
}

function closeTransModal() {
    document.getElementById('transModal').style.display = 'none';
}

function renderTransactions() {
    const list = document.getElementById('transList');
    const filter = document.getElementById('timeFilter').value;
    list.innerHTML = '';

    const now = new Date();
    let totalIn = 0;
    let totalOut = 0;

    // Filter Logic
    const filtered = appData.transactions.filter(t => {
        const tDate = new Date(t.date);
        if (filter === 'week') {
            const oneWeekAgo = new Date(); 
            oneWeekAgo.setDate(now.getDate() - 7);
            return tDate >= oneWeekAgo;
        }
        if (filter === 'month') {
            return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
        }
        if (filter === 'year') {
            return tDate.getFullYear() === now.getFullYear();
        }
        return true;
    });

    // Render & Calculate
    filtered.forEach(t => {
        const bucket = appData.buckets.find(b => b.id === t.catId);
        const bName = bucket ? bucket.name : 'Unknown';
        
        if(t.type === 'income') totalIn += t.amount;
        else totalOut += t.amount;

        const color = t.type === 'income' ? 'var(--success)' : 'var(--danger)';
        const sign = t.type === 'income' ? '+' : '-';

        list.innerHTML += `
            <div class="trans-item">
                <div>
                    <div class="bold">${t.name}</div>
                    <div style="font-size:0.8rem; color:#888">${t.date} • ${bName}</div>
                </div>
                <div style="font-weight:bold; color:${color}">${sign}RM ${t.amount.toFixed(2)}</div>
            </div>
        `;
    });

    // Update Summary
    document.getElementById('sumIn').innerText = "+RM " + totalIn.toFixed(2);
    document.getElementById('sumOut').innerText = "-RM " + totalOut.toFixed(2);

    if(filtered.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:20px; color:#999">No transactions found for this period.</div>';
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
    if(bucket) { bucket.plan = parseFloat(val) || 0; saveData(); }
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
function closeModal() { document.getElementById('bucketModal').style.display = 'none'; activeBucketId = null; }
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
        saveData(); renderSubList(bucket);
        document.getElementById('newSubName').value = ''; document.getElementById('newSubAmount').value = '';
    }
}
function deleteSub(idx) {
    const bucket = appData.buckets.find(b => b.id === activeBucketId);
    bucket.subs.splice(idx, 1);
    saveData(); renderSubList(bucket);
}

// --- WISHLIST ---
function addWish() {
    const name = document.getElementById('wishName').value;
    const price = parseFloat(document.getElementById('wishPrice').value);
    const catId = document.getElementById('wishCategory').value;
    if(name && price && catId) { appData.wishlist.push({ name, price, catId }); saveData(); }
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
        
        let analysisMsg = "";
        let impactMsg = "";
        
        if (canAfford) {
            analysisMsg = "✅ Ready to buy!";
            if(plan > 0) {
                const impact = ((w.price / plan) * 100).toFixed(0);
                impactMsg = `Cost impact: ${impact}% of monthly ${bucket.name} budget.`;
            }
        } else {
            const needed = w.price - bal;
            analysisMsg = `Need RM ${needed.toFixed(2)} more.`;
            if (plan > 0) {
                const months = Math.ceil(needed / plan);
                analysisMsg += ` <br>⏳ Approx. ${months} months to save.`;
            } else {
                analysisMsg += ` <br>⚠️ No monthly plan set.`;
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
                    Wallet: <b>${bucket.name}</b> (RM ${bal}) <br>
                    ${analysisMsg}
                </p>
                ${impactMsg ? `<p style="font-size:0.75rem; color:#888; margin-top:5px;">${impactMsg}</p>` : ''}
                <button class="btn-text" style="color:var(--danger); text-align:right;" onclick="deleteWish(${idx})">Remove</button>
            </div>
        `;
    });
}
function deleteWish(idx) { appData.wishlist.splice(idx, 1); saveData(); }

function updateUI() {
    renderHome();
    renderPlan();
    renderWishlist();
}

init();