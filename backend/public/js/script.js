// ================= TEMPLATE =================
function showTemplates(){
  document.getElementById('templates').style.display = 'grid';
}

function selectTemplate(type){
  document.getElementById('formSection').style.display = 'block';
}

async function generateSite(){
  const name = document.getElementById('name').value;
  const desc = document.getElementById('desc').value;
  const contact = document.getElementById('contact').value;

  const res = await fetch(`/create-site`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json'
     },
    body: JSON.stringify({ name, desc, contact })
  });
  const result = await res.json();
}
// SHOW LINK INSTTEAD OF PREVIEW
document.getElementById('previewBtn').innerHTML
 = `
     <h3>Your site is being generated...</h3>
     <p>Please wait a moment.</p>
     <a href="${result.url}" target="_blank">${result.url}</a>
  `;


// ================= SALES =================
let sales = [];
let editIndex = -1;

// Load from database
async function addSales() {
  const productInput = document.getElementById('product');
  const amountInput = document.getElementById('amount');
  if (productInput && amountInput) {
    productInput.value = '';
    amountInput.value = '';
  }
  const response = await fetch('/add-sales', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: '12345' })
  });
  window.location.reload();
  if (response.ok) {
    sales = await response.json();


// ================= ADD / UPDATE =================
function addSale() {
  const productInput = document.getElementById('product');
  const amountInput = document.getElementById('amount');

  const product = productInput.value.trim();
  const amount = parseFloat(amountInput.value);

  if (!product || isNaN(amount) || amount <= 0) {
    alert('Please enter a valid product and amount');
    return;
  }

  if (editIndex === -1) {
    // ADD
    const date = new Date().toISOString();
    sales.push({ product, amount, date });
  } else {
    // UPDATE
    sales[editIndex].product = product;
    sales[editIndex].amount = amount;
    editIndex = -1;

    document.getElementById("addBtn").innerText = "Add Sale";
  }

  saveAndRender();

  productInput.value = '';
  amountInput.value = '';
}


// ================= EDIT =================
function editSale(index) {
  const sale = sales[index];

  document.getElementById('product').value = sale.product;
  document.getElementById('amount').value = sale.amount;

  editIndex = index;

  document.getElementById("addBtn").innerText = "Update Sale";
}


// ================= DELETE =================
async function deleteSale(id) {
  const response = await fetch(`/delete-sale/${id}`, {
    method: 'DELETE'
  });
  if (response.ok) {
    window.location.reload();
  }
}

// ================= SAVE =================
async function saveAndRender() {
  const response = await fetch('/save-sales', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: '12345', sales })
  });
  if (response.ok) {
    window.location.reload();
  }
}


// ================= RENDER =================
async function renderSales( {
  const tableBody = document.querySelector('#salesTable tbody');
  tableBody.innerHTML = '';
})
  const filter = document.getElementById('filter').value;
  let total = 0;
  const now = new Date();

  sales.forEach((sale, index) => {
    const saleDate = new Date(sale.date);
    let include = false;

    switch (filter) {
      case 'today':
        include = saleDate.toDateString() === now.toDateString();
        break;

      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        include = saleDate >= weekStart && saleDate <= weekEnd;
        break;

      case 'month':
        include =
          saleDate.getMonth() === now.getMonth() &&
          saleDate.getFullYear() === now.getFullYear();
        break;

      default:
        include = true;
    }

    if (include) {
      const row = document.createElement('tr');

      
      // ✅ IMPORTANT
}


// ================= SUMMARY =================
function updateSummary() {
  let today = 0, week = 0, month = 0;
  const now = new Date();

  sales.forEach(sale => {
    const d = new Date(sale.date);

    if (d.toDateString() === now.toDateString()) {
      today += sale.amount;
    }

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());

    if (d >= weekStart) {
      week += sale.amount;
    }

    if (
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    ) {
      month += sale.amount;
    }
  });

  document.getElementById('todayCard').innerText =
    `Today: ₦${today.toLocaleString()}`;

  document.getElementById('weekCard').innerText =
    `Week: ₦${week.toLocaleString()}`;

  document.getElementById('monthCard').innerText =
    `Month: ₦${month.toLocaleString()}`;
})