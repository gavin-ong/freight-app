let jobs = JSON.parse(localStorage.getItem("jobs")) || [];
let currentIndex = null;

function saveToStorage() {
  localStorage.setItem("jobs", JSON.stringify(jobs));
}

function generateJobNo() {
  let num = String(jobs.length + 1).padStart(6, '0');
  return "SGSIN-" + num;
}

function generateInvoiceNo() {
  let num = String(Date.now()).slice(-6);
  return "INV-SGSIN-" + num;
}

function createJob() {
  let job = {
    jobNo: generateJobNo(),
    customer: "",
    shipper: "",
    consignee: "",
    mode: "",
    eta: "",
    etd: "",
    charges: [],
    invoices: []
  };

  jobs.push(job);
  currentIndex = jobs.length - 1;

  saveToStorage();
  refreshJobList();
  loadJob();
}

function refreshJobList() {
  let select = document.getElementById("jobList");
  select.innerHTML = "";

  jobs.forEach((j, i) => {
    let opt = document.createElement("option");
    opt.value = i;
    opt.textContent = j.jobNo;
    select.appendChild(opt);
  });

  if (currentIndex !== null) {
    select.value = currentIndex;
  }
}

function loadJob() {
  currentIndex = document.getElementById("jobList").value;
  let job = jobs[currentIndex];

  document.getElementById("customer").value = job.customer;
  document.getElementById("shipper").value = job.shipper;
  document.getElementById("consignee").value = job.consignee;
  document.getElementById("mode").value = job.mode;
  document.getElementById("eta").value = job.eta;
  document.getElementById("etd").value = job.etd;

  renderCharges();
  renderInvoices();
}

function saveJob() {
  let job = jobs[currentIndex];

  job.customer = document.getElementById("customer").value;
  job.shipper = document.getElementById("shipper").value;
  job.consignee = document.getElementById("consignee").value;
  job.mode = document.getElementById("mode").value;
  job.eta = document.getElementById("eta").value;
  job.etd = document.getElementById("etd").value;

  saveToStorage();
  alert("Saved");
}

// CHARGES
function addCharge() {
  jobs[currentIndex].charges.push({
    description: "",
    qty: 1,
    unitPrice: 0
  });

  renderCharges();
}

function renderCharges() {
  let tbody = document.querySelector("#chargesTable tbody");
  tbody.innerHTML = "";

  jobs[currentIndex].charges.forEach((c, i) => {
    let row = `
      <tr>
        <td><input value="${c.description}" onchange="updateCharge(${i}, 'description', this.value)"></td>
        <td><input type="number" value="${c.qty}" onchange="updateCharge(${i}, 'qty', this.value)"></td>
        <td><input type="number" value="${c.unitPrice}" onchange="updateCharge(${i}, 'unitPrice', this.value)"></td>
      </tr>
    `;
    tbody.innerHTML += row;
  });
}

function updateCharge(i, field, value) {
  jobs[currentIndex].charges[i][field] = Number(value) || value;
  saveToStorage();
}

// INVOICE ENGINE
function generateInvoice() {
  let job = jobs[currentIndex];

  let total = job.charges.reduce((sum, c) => {
    return sum + (c.qty * c.unitPrice);
  }, 0);

  let invoice = {
    invoiceNo: generateInvoiceNo(),
    status: "DRAFT",
    total: total
  };

  job.invoices = [invoice];

  saveToStorage();
  renderInvoices();
}

function postInvoice() {
  let inv = jobs[currentIndex].invoices[0];
  if (!inv) return;
  inv.status = "POSTED";
  saveToStorage();
  renderInvoices();
}

function voidInvoice() {
  let inv = jobs[currentIndex].invoices[0];
  if (!inv) return;
  inv.status = "VOID";
  saveToStorage();
  renderInvoices();
}

function renderInvoices() {
  let tbody = document.querySelector("#invoiceTable tbody");
  tbody.innerHTML = "";

  let inv = jobs[currentIndex].invoices[0];

  if (!inv) return;

  let row = `
    <tr>
      <td>${inv.invoiceNo}</td>
      <td>${inv.status}</td>
      <td>${inv.total.toFixed(2)}</td>
    </tr>
  `;

  tbody.innerHTML = row;
}

// INIT
refreshJobList();
if (jobs.length > 0) {
  currentIndex = 0;
  loadJob();
}
