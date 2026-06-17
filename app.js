const STORAGE_KEY = "freight_mvp_jobs_v4i";
const SESSION_KEY = "freight_mvp_session_active";

let jobs = [];
let currentIndex = null;

/* =========================
   UTILITIES
========================= */
function byId(id) {
  return document.getElementById(id);
}

function fmtMoney(value) {
  const num = Number(value || 0);
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function nowForInvoice() {
  return new Date().toLocaleString();
}

function formatDateDDMMYYYY(dateValue) {
  if (!dateValue) return "";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

function defaultCharge(jobCurrency = "USD") {
  return {
    code: "",
    description: "",
    qty: 1,
    uom: "EA",
    unitPrice: 0,
    currency: jobCurrency || "USD"
  };
}

function normalizeJob(job, index) {
  const fallbackCurrency = job.currency || "USD";
  return {
    jobNo: job.jobNo || generateJobNo(index + 1),
    customer: job.customer || "",
    shipper: job.shipper || "",
    consignee: job.consignee || "",
    mode: job.mode || "",
    eta: job.eta || "",
    etd: job.etd || "",
    incoterm: job.incoterm || "",
    pol: job.pol || "",
    pod: job.pod || "",
    originCountry: job.originCountry || "",
    destinationCountry: job.destinationCountry || "",
    currency: fallbackCurrency,
    charges: Array.isArray(job.charges)
      ? job.charges.map(c => ({
          code: c.code || "",
          description: c.description || "",
          qty: Number(c.qty ?? 1) || 1,
          uom: c.uom || "EA",
          unitPrice: Number(c.unitPrice ?? 0) || 0,
          currency: c.currency || fallbackCurrency
        }))
      : [],
    invoices: Array.isArray(job.invoices)
      ? job.invoices.map(inv => ({
          invoiceNo: inv.invoiceNo || "",
          status: inv.status || "DRAFT",
          total: Number(inv.total ?? 0) || 0,
          currency: inv.currency || fallbackCurrency,
          date: inv.date || ""
        }))
      : []
  };
}

function loadStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      jobs = Array.isArray(parsed) ? parsed.map(normalizeJob) : [];
    } catch (err) {
      jobs = [];
    }
  }

  if (!raw) {
    // Backward compatibility with your older key
    const oldRaw = localStorage.getItem("jobs");
    if (oldRaw) {
      try {
        const parsedOld = JSON.parse(oldRaw);
        jobs = Array.isArray(parsedOld) ? parsedOld.map(normalizeJob) : [];
        persist();
      } catch (err) {
        jobs = [];
      }
    }
  }

  if (!jobs.length) {
    jobs = [createBlankJob(1)];
    currentIndex = 0;
    persist();
  } else {
    currentIndex = 0;
  }
}

function createBlankJob(seqNo) {
  return {
    jobNo: generateJobNo(seqNo),
    customer: "",
    shipper: "",
    consignee: "",
    mode: "",
    eta: "",
    etd: "",
    incoterm: "",
    pol: "",
    pod: "",
    originCountry: "",
    destinationCountry: "",
    currency: "USD",
    charges: [
      defaultCharge("USD")
    ],
    invoices: []
  };
}

function generateJobNo(seq) {
  const n = String(seq || jobs.length + 1).padStart(6, "0");
  return `SGSIN-${n}`;
}

function generateInvoiceNo() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const serial = String(Date.now()).slice(-5);
  return `INV-${yyyy}${mm}${dd}-${serial}`;
}

/* =========================
   SESSION / LOGOUT
========================= */
function applySessionState() {
  const active = sessionStorage.getItem(SESSION_KEY) === "true";
  byId("sessionOverlay").style.display = active ? "none" : "flex";
}

function resumeApp() {
  sessionStorage.setItem(SESSION_KEY, "true");
  applySessionState();
}

function logoutApp() {
  sessionStorage.setItem(SESSION_KEY, "false");
  applySessionState();
}

/* =========================
   JOB UI
========================= */
function refreshJobList() {
  const list = byId("jobList");
  list.innerHTML = "";

  jobs.forEach((job, index) => {
    const opt = document.createElement("option");
    opt.value = index;
    opt.textContent = `${job.jobNo}${job.customer ? " · " + job.customer : ""}`;
    list.appendChild(opt);
  });

  if (currentIndex === null || currentIndex >= jobs.length) {
    currentIndex = 0;
  }

  list.value = String(currentIndex);
}

function fillJobForm(job) {
  byId("jobNo").value = job.jobNo || "";
  byId("customer").value = job.customer || "";
  byId("shipper").value = job.shipper || "";
  byId("consignee").value = job.consignee || "";
  byId("mode").value = job.mode || "";
  byId("eta").value = job.eta || "";
  byId("etd").value = job.etd || "";
  byId("incoterm").value = job.incoterm || "";
  byId("pol").value = job.pol || "";
  byId("pod").value = job.pod || "";
  byId("originCountry").value = job.originCountry || "";
  byId("destinationCountry").value = job.destinationCountry || "";
  byId("currency").value = job.currency || "USD";
}

function readJobFormIntoCurrent() {
  if (currentIndex === null) return;
  const job = jobs[currentIndex];

  job.customer = byId("customer").value.trim();
  job.shipper = byId("shipper").value.trim();
  job.consignee = byId("consignee").value.trim();
  job.mode = byId("mode").value.trim();
  job.eta = byId("eta").value;
  job.etd = byId("etd").value;
  job.incoterm = byId("incoterm").value.trim();
  job.pol = byId("pol").value.trim();
  job.pod = byId("pod").value.trim();
  job.originCountry = byId("originCountry").value.trim();
  job.destinationCountry = byId("destinationCountry").value.trim();
  job.currency = (byId("currency").value.trim() || "USD").toUpperCase();

  // push currency to blank charge currencies only if empty
  job.charges = job.charges.map(c => ({
    ...c,
    currency: (c.currency || job.currency || "USD").toUpperCase()
  }));
}

function createJob() {
  const newJob = createBlankJob(jobs.length + 1);
  jobs.push(newJob);
  currentIndex = jobs.length - 1;
  persist();
  refreshJobList();
  loadJob();
}

function loadJob() {
  const listValue = byId("jobList").value;
  currentIndex = Number(listValue);
  const job = jobs[currentIndex];
  if (!job) return;

  fillJobForm(job);
  renderCharges();
  renderInvoices();
  renderSummary();
}

function saveJob() {
  if (currentIndex === null) return;
  readJobFormIntoCurrent();
  persist();
  refreshJobList();
  renderCharges();
  renderInvoices();
  renderSummary();
  alert("Job saved.");
}

function resetJobForm() {
  if (currentIndex === null) return;
  fillJobForm(jobs[currentIndex]);
}

/* =========================
   CHARGES
========================= */
function addCharge() {
  if (currentIndex === null) return;
  const job = jobs[currentIndex];
  readJobFormIntoCurrent();
  job.charges.push(defaultCharge(job.currency || "USD"));
  persist();
  renderCharges();
  renderSummary();
}

function removeCharge(idx) {
  if (currentIndex === null) return;
  const job = jobs[currentIndex];
  job.charges.splice(idx, 1);

  if (!job.charges.length) {
    job.charges.push(defaultCharge(job.currency || "USD"));
  }

  persist();
  renderCharges();
  renderSummary();
}

function updateCharge(index, field, value) {
  if (currentIndex === null) return;
  const job = jobs[currentIndex];
  const charge = job.charges[index];
  if (!charge) return;

  if (["qty", "unitPrice"].includes(field)) {
    charge[field] = Number(value || 0);
  } else {
    charge[field] = value;
  }

  persist();
  renderCharges();
  renderSummary();
}

function chargeAmount(charge) {
  return (Number(charge.qty || 0) * Number(charge.unitPrice || 0));
}

function renderCharges() {
  if (currentIndex === null) return;
  const job = jobs[currentIndex];
  const tbody = byId("chargesBody");

  tbody.innerHTML = job.charges.map((c, idx) => {
    const amount = chargeAmount(c);
    return `
      <tr>
        <td>${idx + 1}</td>
        <td class="compact-cell">
          <input value="${escapeHtml(c.code)}" onchange="updateCharge(${idx}, 'code', this.value)" placeholder="Code" />
        </td>
        <td class="description-cell">
          <input value="${escapeHtml(c.description)}" onchange="updateCharge(${idx}, 'description', this.value)" placeholder="Description" />
        </td>
        <td class="compact-cell num">
          <input type="number" min="0" step="1" value="${Number(c.qty || 0)}" onchange="updateCharge(${idx}, 'qty', this.value)" />
        </td>
        <td class="compact-cell">
          <input value="${escapeHtml(c.uom || "EA")}" onchange="updateCharge(${idx}, 'uom', this.value)" placeholder="EA" />
        </td>
        <td class="compact-cell num">
          <input type="number" min="0" step="0.01" value="${Number(c.unitPrice || 0)}" onchange="updateCharge(${idx}, 'unitPrice', this.value)" />
        </td>
        <td class="num"><strong>${fmtMoney(amount)}</strong></td>
        <td class="compact-cell">
          <input value="${escapeHtml((c.currency || job.currency || "USD").toUpperCase())}" onchange="updateCharge(${idx}, 'currency', this.value.toUpperCase())" placeholder="USD" />
        </td>
        <td>
          <button class="btn btn-secondary" style="padding:8px 10px;" onclick="removeCharge(${idx})">Delete</button>
        </td>
      </tr>
    `;
  }).join("");
}

function getJobTotal(job) {
  return job.charges.reduce((sum, c) => sum + chargeAmount(c), 0);
}

function renderSummary() {
  if (currentIndex === null) return;
  const job = jobs[currentIndex];
  const latestInvoice = job.invoices[0];

  byId("chargeCount").textContent = String(job.charges.length);
  byId("chargeCurrency").textContent = job.currency || "USD";
  byId("chargeSubtotal").textContent = fmtMoney(getJobTotal(job));
  byId("latestStatus").textContent = latestInvoice ? latestInvoice.status : "—";
}

/* =========================
   INVOICES
========================= */
function generateInvoice() {
  if (currentIndex === null) return;
  readJobFormIntoCurrent();

  const job = jobs[currentIndex];
  const total = getJobTotal(job);

  job.invoices = [{
    invoiceNo: generateInvoiceNo(),
    status: "DRAFT",
    total,
    currency: (job.currency || "USD").toUpperCase(),
    date: nowForInvoice()
  }];

  persist();
  renderInvoices();
  renderSummary();
}

function postInvoice() {
  if (currentIndex === null) return;
  const inv = jobs[currentIndex].invoices[0];
  if (!inv) {
    alert("Generate invoice first.");
    return;
  }
  inv.status = "POSTED";
  persist();
  renderInvoices();
  renderSummary();
}

function voidInvoice() {
  if (currentIndex === null) return;
  const inv = jobs[currentIndex].invoices[0];
  if (!inv) {
    alert("Generate invoice first.");
    return;
  }
  inv.status = "VOID";
  persist();
  renderInvoices();
  renderSummary();
}

function renderInvoices() {
  if (currentIndex === null) return;
  const job = jobs[currentIndex];
  const tbody = byId("invoiceBody");

  if (!job.invoices.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="color:#667085;">No invoice generated yet.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = job.invoices.map(inv => `
    <tr>
      <td><strong>${escapeHtml(inv.invoiceNo)}</strong></td>
      <td><span class="status-pill status-${escapeHtml(inv.status)}">${escapeHtml(inv.status)}</span></td>
      <td>${escapeHtml(inv.date || "")}</td>
      <td>${escapeHtml(inv.currency || job.currency || "USD")}</td>
      <td class="num"><strong>${fmtMoney(inv.total)}</strong></td>
    </tr>
  `).join("");
}

/* =========================
   PRINT TEMPLATE
========================= */
function buildPrintHtml() {
  if (currentIndex === null) return "";
  readJobFormIntoCurrent();

  const job = jobs[currentIndex];
  const inv = job.invoices[0];

  if (!inv) {
    alert("Generate invoice first.");
    return "";
  }

  const currency = inv.currency || job.currency || "USD";
  const total = fmtMoney(inv.total);

  const lineRows = job.charges.map((c, idx) => {
    const amount = chargeAmount(c);
    return `
      <tr>
        <td class="center">${idx + 1}</td>
        <td>${escapeHtml(c.code || "")}</td>
        <td>${escapeHtml(c.description || "")}</td>
        <td class="center">${escapeHtml(c.qty || 0)}</td>
        <td class="center">${escapeHtml(c.uom || "EA")}</td>
        <td class="right">${fmtMoney(c.unitPrice || 0)}</td>
        <td class="right">${fmtMoney(amount)}</td>
        <td class="center">${escapeHtml((c.currency || currency).toUpperCase())}</td>
      </tr>
    `;
  }).join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(inv.invoiceNo)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #111827;
      font-size: 12px;
      background: #fff;
    }

    .page {
      width: 100%;
      min-height: 100%;
    }

    .header {
      display: grid;
      grid-template-columns: 1.1fr .9fr;
      gap: 24px;
      margin-bottom: 18px;
      align-items: start;
    }

    .company h1 {
      margin: 0 0 8px 0;
      font-size: 24px;
      line-height: 1.05;
      letter-spacing: .02em;
    }

    .company .meta {
      color: #374151;
      line-height: 1.55;
      font-size: 12px;
    }

    .invoice-head {
      text-align: right;
    }

    .invoice-head .title {
      font-size: 36px;
      font-weight: 800;
      letter-spacing: .03em;
      margin: 0 0 8px 0;
    }

    .invoice-head .meta-line {
      margin: 3px 0;
      color: #374151;
      font-size: 12px;
    }

    .panels {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }

    .panel {
      border: 1px solid #d0d5dd;
      border-radius: 6px;
      min-height: 86px;
      padding: 10px 12px;
    }

    .panel-title {
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .panel-body {
      line-height: 1.65;
      color: #111827;
      white-space: pre-line;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }

    thead th {
      background: #f3f4f6;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: .03em;
      border: 1px solid #d0d5dd;
      padding: 8px 7px;
    }

    tbody td {
      border: 1px solid #d0d5dd;
      padding: 8px 7px;
      vertical-align: top;
    }

    .center { text-align: center; }
    .right { text-align: right; }

    .totals {
      margin-top: 18px;
      display: flex;
      justify-content: flex-end;
    }

    .total-box {
      min-width: 280px;
      text-align: right;
    }

    .total-label {
      font-size: 20px;
      font-weight: 800;
      margin-bottom: 8px;
    }

    .total-value {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: .02em;
    }

    .footer-note {
      margin-top: 28px;
      border-top: 1px solid #d0d5dd;
      padding-top: 10px;
      color: #475467;
      font-size: 11px;
      line-height: 1.45;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="company">
        <h1>YOUR COMPANY NAME PTE LTD</h1>
        <div class="meta">
          Company address line 1<br>
          Singapore<br>
          UEN / GST Reg No: TBD
        </div>
      </div>

      <div class="invoice-head">
        <div class="title">TAX INVOICE</div>
        <div class="meta-line"><strong>Invoice No:</strong> ${escapeHtml(inv.invoiceNo)}</div>
        <div class="meta-line"><strong>Status:</strong> ${escapeHtml(inv.status)}</div>
        <div class="meta-line"><strong>Date:</strong> ${escapeHtml(inv.date || "")}</div>
      </div>
    </div>

    <div class="panels">
      <div class="panel">
        <div class="panel-title">Bill To</div>
        <div class="panel-body">${escapeHtml(job.customer || "")}</div>
      </div>

      <div class="panel">
        <div class="panel-title">Job Details</div>
        <div class="panel-body">Job No: ${escapeHtml(job.jobNo || "")}
POL / POD: ${escapeHtml(job.pol || "")} → ${escapeHtml(job.pod || "")}
Incoterm: ${escapeHtml(job.incoterm || "")}
Origin / Destination: ${escapeHtml(job.originCountry || "")} → ${escapeHtml(job.destinationCountry || "")}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:44px;">#</th>
          <th style="width:88px;">Code</th>
          <th>Description</th>
          <th style="width:64px;">Qty</th>
          <th style="width:66px;">UOM</th>
          <th style="width:92px;">Rate</th>
          <th style="width:96px;">Amount</th>
          <th style="width:88px;">Currency</th>
        </tr>
      </thead>
      <tbody>
        ${lineRows}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-box">
        <div class="total-label">Total Payable:</div>
        <div class="total-value">${escapeHtml(currency)} ${total}</div>
      </div>
    </div>

    <div class="footer-note">
      This is a system-generated invoice preview from Freight App MVP.<br>
      Payment terms, bank details, GST rules, and final company template will be configured in later steps.
    </div>
  </div>
</body>
</html>
  `.trim();
}

function printInvoice() {
  const html = buildPrintHtml();
  if (!html) return;

  const printWindow = window.open("", "_blank", "width=1100,height=900");
  if (!printWindow) {
    alert("Pop-up blocked. Please allow pop-ups for this site and try again.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = function () {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);
  };
}

/* =========================
   INIT
========================= */
function init() {
  loadStorage();
  refreshJobList();
  loadJob();

  if (!sessionStorage.getItem(SESSION_KEY)) {
    sessionStorage.setItem(SESSION_KEY, "true");
  }

  applySessionState();
}

window.addEventListener("load", init);
