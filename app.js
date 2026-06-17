let jobs = JSON.parse(localStorage.getItem("jobs")) || [];
let currentIndex = null;

function save() {
  localStorage.setItem("jobs", JSON.stringify(jobs));
}

// JOB
function generateJobNo() {
  return "SGSIN-" + String(jobs.length + 1).padStart(6, '0');
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
  save();
  refreshJobList();
  loadJob();
}

function refreshJobList() {
  let list = document.getElementById("jobList");
  list.innerHTML = "";

  jobs.forEach((j, i) => {
    let opt = document.createElement("option");
    opt.value = i;
    opt.textContent = j.jobNo;
    list.appendChild(opt);
  });

  list.value = currentIndex;
}

function loadJob() {
  currentIndex = document.getElementById("jobList").value;
  let j = jobs[currentIndex];

  document.getElementById("customer").value = j.customer;
  document.getElementById("shipper").value = j.shipper;
  document.getElementById("consignee").value = j.consignee;
  document.getElementById("mode").value = j.mode;
  document.getElementById("eta").value = j.eta;
  document.getElementById("etd").value = j.etd;

  renderCharges();
  renderInvoice();
}

function saveJob() {
  let j = jobs[currentIndex];
  j.customer = customer.value;
  j.shipper = shipper.value;
  j.consignee = consignee.value;
  j.mode = mode.value;
  j.eta = eta.value;
  j.etd = etd.value;

  save();
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
  let html = "";

  jobs[currentIndex].charges.forEach((c, i) => {
    html += `
    <tr>
      <td><input value="${c.description}" onchange="updateCharge(${i},'description',this.value)"></td>
      <td><input type="number" value="${c.qty}" onchange="updateCharge(${i},'qty',this.value)"></td>
      <td><input type="number" value="${c.unitPrice}" onchange="updateCharge(${i},'unitPrice',this.value)"></td>
    </tr>`;
  });

  document.getElementById("chargesTable").innerHTML = html;
}

function updateCharge(i, field, val) {
  jobs[currentIndex].charges[i][field] = Number(val) || val;
  save();
}

// INVOICE
function generateInvoice() {
  let job = jobs[currentIndex];
  let total = job.charges.reduce((s,c)=>s+c.qty*c.unitPrice,0);

  job.invoices = [{
    invoiceNo: "INV-SGSIN-" + Date.now().toString().slice(-6),
    status: "DRAFT",
    total: total
  }];

  save();
  renderInvoice();
}

function postInvoice() {
  let inv = jobs[currentIndex].invoices[0];
  if (!inv) return;
  inv.status = "POSTED";
  save();
  renderInvoice();
}

function voidInvoice() {
  let inv = jobs[currentIndex].invoices[0];
  if (!inv) return;
  inv.status = "VOID";
  save();
  renderInvoice();
}

function renderInvoice() {
  let inv = jobs[currentIndex].invoices[0];
  if (!inv) return document.getElementById("invoiceTable").innerHTML = "";

  document.getElementById("invoiceTable").innerHTML = `
    <tr>
      <td>${inv.invoiceNo}</td>
      <td>${inv.status}</td>
      <td>${inv.total.toFixed(2)}</td>
    </tr>`;
}

// PRINT
function printInvoice() {
  let job = jobs[currentIndex];
  let inv = job.invoices[0];
  if (!inv) return alert("No invoice");

  document.getElementById("pInvNo").innerText = inv.invoiceNo;
  document.getElementById("pCust").innerText = job.customer;

  let rows = "";
  job.charges.forEach(c=>{
    rows += `
    <tr>
      <td>${c.description}</td>
      <td>${c.qty}</td>
      <td>${c.unitPrice}</td>
      <td>${(c.qty*c.unitPrice).toFixed(2)}</td>
    </tr>`;
  });

  document.getElementById("pCharges").innerHTML = rows;
  document.getElementById("pTotal").innerText = inv.total.toFixed(2);

  let printContents = document.getElementById("printArea").innerHTML;
  let win = window.open("", "", "width=800,height=600");
  win.document.write(printContents);
  win.print();
}

// INIT
refreshJobList();
if (jobs.length > 0) {
  currentIndex = 0;
  loadJob();
}
