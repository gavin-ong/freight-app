(function () {
  const SUPABASE_URL = "https://quzputmmabgcfmegarvd.supabase.co";
  const SUPABASE_KEY = "sb_publishable_UG9E0FbUzetadkz8TQN2fg_pIWx3LTO";
  const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

  const BUILD = "BUILD: FREIGHT-STEP4H-UIFIX-FINAL (JS)";

  let client = null;
  let user = null;

  let currentJobId = null;
  let currentJobNo = null;
  let currentJobData = null;

  let currentCharges = [];
  let currentSavedInvoices = [];

  let selectedInvoice = null;
  let selectedInvoiceLines = [];

  let companyProfile = {
    company_name: "Freight App MVP PTE LTD",
    company_address: "128 Guoco Mid Town #14-01",
    company_uen: "UEN No: 20260603WED",
    payment_terms: "14 days from date of invoice",
    bank_details: "Please effect payment to our UEN no.",
    invoice_footer: "This is a system-generated invoice from Freight App MVP."
  };

  const actionLocks = {};

  const $ = (id) => document.getElementById(id);

  function ensureOpsStatus() {
    const appCard = $("appCard");

    if (!appCard) return;

    const body =
      appCard.querySelector(".body") || appCard;

    if (!$("opsStatus")) {
      const s =
        document.createElement("div");

      s.id = "opsStatus";

      s.style.margin = "10px 0";
      s.style.padding = "10px 12px";
      s.style.borderRadius = "12px";
      s.style.border =
        "1px solid rgba(255,255,255,.12)";
      s.style.background =
        "rgba(255,255,255,.06)";
      s.style.fontSize = "12px";
      s.style.wordBreak = "break-word";
      s.style.color = "#9fffb0";

      body.insertBefore(
        s,
        body.firstChild
      );

      s.textContent = "Ready.";
    }
  }

  function status(msg, isErr = false) {
    ensureOpsStatus();

    const ops = $("opsStatus");

    if (ops) {
      ops.textContent = msg;

      ops.style.color =
        isErr
          ? "#ff7b7b"
          : "#9fffb0";
    }

    const loginStatus = $("status");

    if (
      loginStatus &&
      $("loginCard") &&
      !$("loginCard")
        .classList
        .contains("hidden")
    ) {
      loginStatus.textContent = msg;

      loginStatus.style.color =
        isErr
          ? "#ff7b7b"
          : "#e9f1ff";
    }

    console.log(msg);
  }

  function hardError(msg, errObj) {
    const detail =
      errObj?.message ||
      errObj?.details ||
      errObj?.hint ||
      "";

    const full =
      detail
        ? `${msg}: ${detail}`
        : msg;

    status("❌ " + full, true);

    alert("❌ " + full);

    if (errObj) {
      console.error(errObj);
    }
  }

  function showOk(msg) {
    status("✅ " + msg, false);
    alert("✅ " + msg);
  }

  async function runLocked(lockKey, fn) {
    if (actionLocks[lockKey]) {
      console.warn(
        "Blocked duplicate action:",
        lockKey
      );

      return;
    }

    actionLocks[lockKey] = true;

    try {
      await fn();
    } finally {
      setTimeout(() => {
        actionLocks[lockKey] = false;
      }, 500);
    }
  }

  function showApp(loggedIn) {
    $("loginCard")
      ?.classList
      .toggle("hidden", loggedIn);

    $("appCard")
      ?.classList
      .toggle("hidden", !loggedIn);

    $("btnLogin")
      ?.classList
      .toggle("hidden", loggedIn);

    $("btnLogout")
      ?.classList
      .toggle("hidden", !loggedIn);
  }

  function setCurrentJob(jobNo) {
    currentJobNo = jobNo || null;

    const el = $("currentJobNo");

    if (el) {
      el.textContent =
        jobNo || "None";
    }
  }

  function num(v) {
    const x = parseFloat(
      String(v ?? "").trim()
    );

    return Number.isFinite(x)
      ? x
      : null;
  }

  function money(v) {
    const n = Number(v || 0);

    return n.toLocaleString(
      undefined,
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    );
  }

  function safeText(
    v,
    fallback = "-"
  ) {
    const s = String(v ?? "").trim();

    return s || fallback;
  }

  function shortDate(v) {
    if (!v) return "-";

    const d = new Date(v);

    if (
      Number.isNaN(d.getTime())
    ) {
      return "-";
    }

    return d.toLocaleString();
  }

  function escapeHtml(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function htmlLines(v) {
    return escapeHtml(v || "")
      .replace(/\n/g, "<br>");
  }

  function statusPill(statusValue) {
    const s = String(
      statusValue || ""
    ).toUpperCase();

    if (s === "POSTED") {
      return `<span class="status-pill pill-posted">POSTED</span>`;
    }

    if (s === "VOID") {
      return `<span class="status-pill pill-void">VOID</span>`;
    }

    return `<span class="status-pill pill-draft">DRAFT</span>`;
  }

  function getSellLines() {
    return (
      currentCharges || []
    ).filter(
      c =>
        String(c.type || "")
          .trim()
          .toUpperCase() === "SELL"
    );
  }

  function getTotalsByCurrency(lines) {
    const totals = {};

    (lines || []).forEach(c => {
      const currency =
        String(c.currency || "")
          .trim()
          .toUpperCase() || "N/A";

      const amount =
        Number(c.amount || 0);

      totals[currency] =
        (totals[currency] || 0) +
        amount;
    });

    return totals;
  }

  function getGrandTotalSimple(
    totalsByCurrency
  ) {
    return Object.values(
      totalsByCurrency || {}
    ).reduce(
      (a, b) =>
        a + Number(b || 0),
      0
    );
  }

  function updateProfitSummary(
    charges
  ) {
    let sell = 0;
    let buy = 0;

    (charges || []).forEach(c => {
      const amt =
        Number(c.amount || 0);

      const typ =
        String(c.type || "")
          .trim()
          .toUpperCase();

      if (typ === "SELL") {
        sell += amt;
      }

      if (typ === "BUY") {
        buy += amt;
      }
    });

    const gp = sell - buy;

    if ($("sumSell")) {
      $("sumSell").textContent =
        money(sell);
    }

    if ($("sumBuy")) {
      $("sumBuy").textContent =
        money(buy);
    }

    if ($("sumProfit")) {
      $("sumProfit").textContent =
        money(gp);
    }

    if ($("sumCount")) {
      $("sumCount").textContent =
        String(
          (charges || []).length
        );
    }
  }

  function updateInvoicePreview() {
    const job =
      currentJobData || {};

    const sellLines =
      getSellLines();

    if ($("invJobNo")) {
      $("invJobNo").textContent =
        safeText(currentJobNo);
    }

    if ($("invBillTo")) {
      $("invBillTo").textContent =
        safeText(
          job.customer_name ||
            job.consignee_name ||
            job.shipper_name
        );
    }

    if ($("invRoute")) {
      $("invRoute").textContent =
        `${safeText(job.pol)} → ${safeText(job.pod)}`;
    }

    if ($("invIncoterm")) {
      $("invIncoterm").textContent =
        safeText(job.incoterm);
    }

    const tbody =
      $("invoiceLinesBody");

    if (tbody) {
      tbody.innerHTML = "";
    }

    sellLines.forEach(c => {
      if (!tbody) return;

      const amount =
        Number(c.amount || 0);

      const currency =
        String(c.currency || "")
          .trim()
          .toUpperCase() || "N/A";

      const tr =
        document.createElement("tr");

      tr.innerHTML = `
        <td>${escapeHtml(c.charge_code ?? "")}</td>
        <td>${escapeHtml(c.description ?? "")}</td>
        <td>${escapeHtml(c.qty ?? "")}</td>
        <td>${escapeHtml(c.rate ?? "")}</td>
        <td>${money(amount)}</td>
        <td>${escapeHtml(currency)}</td>
      `;

      tbody.appendChild(tr);
    });

    const totalsByCurrency =
      getTotalsByCurrency(
        sellLines
      );

    const totalText =
      Object.keys(
        totalsByCurrency
      ).length
        ? Object.entries(
            totalsByCurrency
          )
            .map(
              ([cur, total]) =>
                `${cur} ${money(total)}`
            )
            .join("\n")
        : "No SELL charges selected.";

    if ($("invoiceTotalBox")) {
      $("invoiceTotalBox").textContent =
        totalText;
    }
  }

  async function saveInvoiceDraft() {
    if (!currentJobId) {
      return hardError(
        "Select a job first."
      );
    }

    const sellLines =
      getSellLines();

    if (!sellLines.length) {
      return hardError(
        "No SELL charges to invoice."
      );
    }

    const totalsByCurrency =
      getTotalsByCurrency(
        sellLines
      );

    const grandTotalSimple =
      getGrandTotalSimple(
        totalsByCurrency
      );

    status(
      "Saving invoice draft..."
    );

    const {
      data: inv,
      error: invErr
    } =
      await client
        .from("invoices")
        .insert([
          {
            job_id:
              currentJobId,
            job_no:
              currentJobNo,
            invoice_status:
              "DRAFT",
            currency_summary:
              totalsByCurrency,
            total_amount:
              grandTotalSimple,
            created_by:
              user?.id || null
          }
        ])
        .select("*")
        .single();

    if (invErr) {
      return hardError(
        "Invoice header save failed",
        invErr
      );
    }

    const linesPayload =
      sellLines.map(c => ({
        invoice_id:
          inv.invoice_id,

        job_id:
          currentJobId,

        charge_code:
          c.charge_code || "",

        description:
          c.description || "",

        qty:
          Number(
            c.qty || 1
          ),

        uom:
          c.uom || "",

        rate:
          Number(
            c.rate || 0
          ),

        amount:
          Number(
            c.amount || 0
          ),

        currency:
          String(
            c.currency || ""
          )
            .trim()
            .toUpperCase(),

        source_type:
          "SELL"
      }));

    const {
      error: lineErr
    } =
      await client
        .from("invoice_lines")
        .insert(linesPayload);

    if (lineErr) {
      return hardError(
        "Invoice lines save failed",
        lineErr
      );
    }

    showOk(
      `Invoice draft saved: ${inv.invoice_no}`
    );

    await loadSavedInvoices();
  }

  async function loadSavedInvoices() {
    if (!currentJobId) {
      return;
    }

    const tbody =
      $("savedInvoicesBody");

    if (tbody) {
      tbody.innerHTML = "";
    }

    status(
      "Loading saved invoices..."
    );

    const { data, error } =
      await client
        .from("invoices")
        .select("*")
        .eq(
          "job_id",
          currentJobId
        )
        .order("created_at", {
          ascending: false
        });

    if (error) {
      return hardError(
        "Saved invoices load failed",
        error
      );
    }

    currentSavedInvoices =
      data || [];

    currentSavedInvoices.forEach(
      inv => {
        const tr =
          document.createElement(
            "tr"
          );

        tr.innerHTML = `
          <td>${escapeHtml(inv.invoice_no ?? "")}</td>
          <td>${statusPill(inv.invoice_status)}</td>
          <td>${money(inv.total_amount || 0)}</td>
          <td>${escapeHtml(shortDate(inv.created_at))}</td>
        `;

        tr.addEventListener(
          "click",
          async () => {
            await loadSavedInvoiceLines(
              inv
            );
          }
        );

        tbody?.appendChild(tr);
      }
    );
  }

  async function loadSavedInvoiceLines(
    inv
  ) {
    selectedInvoice = inv;

    const {
      data,
      error
    } =
      await client
        .from("invoice_lines")
        .select("*")
        .eq(
          "invoice_id",
          inv.invoice_id
        );

    if (error) {
      return hardError(
        "Saved invoice lines load failed",
        error
      );
    }

    selectedInvoiceLines =
      data || [];

    const tbody =
      $("savedInvoiceLinesBody");

    if (tbody) {
      tbody.innerHTML = "";
    }

    selectedInvoiceLines.forEach(
      line => {
        const tr =
          document.createElement(
            "tr"
          );

        tr.innerHTML = `
          <td>${escapeHtml(line.charge_code ?? "")}</td>
          <td>${escapeHtml(line.description ?? "")}</td>
          <td>${escapeHtml(line.qty ?? "")}</td>
          <td>${escapeHtml(line.rate ?? "")}</td>
          <td>${money(line.amount || 0)}</td>
          <td>${escapeHtml(line.currency ?? "")}</td>
        `;

        tbody?.appendChild(tr);
      }
    );

    status(
      `Invoice ${inv.invoice_no} loaded.`
    );
  }

  async function updateSelectedInvoiceStatus(
    nextStatus
  ) {
    if (
      !selectedInvoice?.invoice_id
    ) {
      return hardError(
        "Select a saved invoice first."
      );
    }

    const payload = {
      invoice_status:
        nextStatus,
      updated_at:
        new Date().toISOString()
    };

    if (
      nextStatus === "POSTED"
    ) {
      payload.posted_at =
        new Date().toISOString();
    }

    if (nextStatus === "VOID") {
      payload.voided_at =
        new Date().toISOString();
    }

    const { error } =
      await client
        .from("invoices")
        .update(payload)
        .eq(
          "invoice_id",
          selectedInvoice.invoice_id
        );

    if (error) {
      return hardError(
        "Invoice status update failed",
        error
      );
    }

    showOk(
      `Invoice marked as ${nextStatus}`
    );

    await loadSavedInvoices();
  }

  async function postSelectedInvoice() {
    await updateSelectedInvoiceStatus(
      "POSTED"
    );
  }

  async function voidSelectedInvoice() {
    await updateSelectedInvoiceStatus(
      "VOID"
    );
  }

  function buildInvoiceDocumentPreview() {
    if (
      !selectedInvoice ||
      !selectedInvoiceLines.length
    ) {
      return hardError(
        "Select a saved invoice first."
      );
    }

    const body =
      $("invoiceDocumentBody");

    if (!body) return;

    const rows =
      selectedInvoiceLines
        .map(
          l => `
        <tr>
          <td>${escapeHtml(l.charge_code)}</td>
          <td>${escapeHtml(l.description)}</td>
          <td>${escapeHtml(l.qty)}</td>
          <td>${money(l.amount)}</td>
          <td>${escapeHtml(l.currency)}</td>
        </tr>
      `
        )
        .join("");

    body.innerHTML = `
      <div class="doc-company">
        ${escapeHtml(companyProfile.company_name)}
      </div>

      <div class="doc-muted">
        ${htmlLines(companyProfile.company_address)}
      </div>

      <div class="doc-title">
        TAX INVOICE
      </div>

      <table class="doc-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Description</th>
            <th>Qty</th>
            <th>Amount</th>
            <th>Currency</th>
          </tr>
        </thead>

        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    const printBtn =
      $("btnPrintInvoiceDoc");

    if (printBtn) {
      printBtn.disabled = false;
    }

    status(
      `Invoice document preview built for ${selectedInvoice.invoice_no}.`
    );
  }

  function printInvoiceDocument() {
    const body =
      $("invoiceDocumentBody");

    if (!body) {
      return hardError(
        "No invoice document available."
      );
    }

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=900,height=1100"
      );

    if (!printWindow) {
      return hardError(
        "Print window blocked."
      );
    }

    printWindow.document.write(`
      <html>
      <head>
        <title>Invoice</title>

        <style>
          body{
            font-family:Arial,sans-serif;
            padding:20px;
          }

          table{
            width:100%;
            border-collapse:collapse;
          }

          th,
          td{
            border:1px solid #ccc;
            padding:8px;
          }
        </style>
      </head>

      <body>
        ${body.innerHTML}
      </body>
      </html>
    `);

    printWindow.document.close();

    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  }

  function ensureCompanyProfileEditor() {
    if (
      $("companyProfilePanel")
    ) {
      return;
    }

    const panel =
      document.querySelector(
        "#appCard .panel"
      );

    if (!panel) return;

    const section =
      document.createElement(
        "div"
      );

    section.className =
      "section";

    section.id =
      "companyProfilePanel";

    section.innerHTML = `
      <h2>Company Invoice Profile</h2>

      <div class="note">
        This controls the company header/footer used in the invoice document preview and print window.
      </div>

      <div class="row2">

        <div>
          <label>Company Name</label>

          <input
            id="profile_company_name"
            value="${escapeHtml(companyProfile.company_name)}"
          />
        </div>

        <div>
          <label>UEN / GST Reg No</label>

          <input
            id="profile_company_uen"
            value="${escapeHtml(companyProfile.company_uen)}"
          />
        </div>

      </div>

      <label>Company Address</label>

      <textarea
        id="profile_company_address"
        rows="3"
      >${escapeHtml(companyProfile.company_address)}</textarea>

      <label>Payment Terms</label>

      <textarea
        id="profile_payment_terms"
        rows="3"
      >${escapeHtml(companyProfile.payment_terms)}</textarea>

      <label>Bank Details</label>

      <textarea
        id="profile_bank_details"
        rows="3"
      >${escapeHtml(companyProfile.bank_details)}</textarea>

      <label>Invoice Footer</label>

      <textarea
        id="profile_invoice_footer"
        rows="3"
      >${escapeHtml(companyProfile.invoice_footer)}</textarea>

      <div class="btnbar">

        <button
          id="btnSaveCompanyProfile"
          class="primary"
        >
          Save Company Profile
        </button>

      </div>

      <div class="build">
        BUILD: FREIGHT-STEP4H-UIFIX-FINAL (PROFILE UI)
      </div>
    `;

    panel.appendChild(section);

    bindHard(
      "btnSaveCompanyProfile",
      saveCompanyInvoiceProfile,
      "saveCompanyProfile"
    );
  }

  async function saveCompanyInvoiceProfile() {
    companyProfile = {
      company_name:
        $("profile_company_name")
          ?.value || "",

      company_address:
        $("profile_company_address")
          ?.value || "",

      company_uen:
        $("profile_company_uen")
          ?.value || "",

      payment_terms:
        $("profile_payment_terms")
          ?.value || "",

      bank_details:
        $("profile_bank_details")
          ?.value || "",

      invoice_footer:
        $("profile_invoice_footer")
          ?.value || ""
    };

    showOk(
      "Company invoice profile saved"
    );
  }

  async function loadBranches() {
    const ddl =
      $("branch");

    if (!ddl) {
      return hardError(
        "UI missing branch dropdown."
      );
    }

    const {
      data,
      error
    } =
      await client
        .from("branches")
        .select(
          "country_code, branch_code"
        )
        .order("country_code", {
          ascending: true
        })
        .order("branch_code", {
          ascending: true
        });

    if (error) {
      return hardError(
        "Branches blocked",
        error
      );
    }

    ddl.innerHTML = "";

    (data || []).forEach(b => {
      const country =
        String(
          b.country_code || ""
        )
          .trim()
          .toUpperCase();

      const branch =
        String(
          b.branch_code || ""
        )
          .trim()
          .toUpperCase();

      const opt =
        document.createElement(
          "option"
        );

      opt.value = branch;
      opt.dataset.country =
        country;

      opt.textContent =
        `${country} - ${branch}`;

      ddl.appendChild(opt);
    });
  }

  function getBranchContext() {
    const ddl =
      $("branch");

    const opt =
      ddl?.options?.[
        ddl.selectedIndex
      ];

    return {
      branch_key:
        (ddl?.value || "")
          .trim()
          .toUpperCase(),

      country_code:
        (
          opt?.dataset
            ?.country || "SG"
        )
          .trim()
          .toUpperCase()
    };
  }

  async function loadJobs() {
    const tbody =
      $("jobsTableBody");

    if (!tbody) {
      return hardError(
        "UI missing jobsTableBody."
      );
    }

    status("Loading jobs...");

    const {
      data,
      error
    } =
      await client
        .from("jobs")
        .select("*")
        .order("created_at", {
          ascending: false
        });

    if (error) {
      return hardError(
        "Jobs blocked",
        error
      );
    }

    tbody.innerHTML = "";

    (data || []).forEach(
      job => {
        const jid =
          job.job_id;

        if (!jid) return;

        const tr =
          document.createElement(
            "tr"
          );

        tr.innerHTML = `
          <td>${escapeHtml(job.job_no ?? "")}</td>
          <td>${escapeHtml(job.country_code ?? "")}</td>
          <td>${escapeHtml(job.branch_code ?? "")}</td>
          <td>${escapeHtml(job.transport_mode ?? "")}</td>
          <td>${escapeHtml(job.job_type ?? "")}</td>
          <td>${escapeHtml(job.customer_name ?? "")}</td>
        `;

        tr.addEventListener(
          "click",
          async () => {
            currentJobId = jid;

            setCurrentJob(
              job.job_no ?? ""
            );

            await loadJobDetails(
              jid
            );

            await loadCharges();

            await loadSavedInvoices();
          }
        );

        tbody.appendChild(tr);
      }
    );

    status(
      `Jobs loaded (${(data || []).length}).`
    );
  }

  async function createJob() {
    if (!user) {
      return hardError(
        "Not logged in."
      );
    }

    const ctx =
      getBranchContext();

    const transportMode =
      (
        $("transport_mode")
          ?.value || ""
      ).trim();

    const jobType =
      (
        $("job_type")
          ?.value || ""
      ).trim();

    const customerName =
      (
        $("customer")
          ?.value || ""
      ).trim();

    const originInput =
      (
        $("country")
          ?.value || ""
      )
        .trim()
        .toUpperCase();

    const originCountry =
      originInput
        ? originInput.slice(0, 2)
        : ctx.country_code;

    status(
      "Creating job..."
    );

    const { error } =
      await client.rpc(
        "create_job",
        {
          p_branch_key:
            ctx.branch_key,

          p_transport_mode:
            transportMode,

          p_job_type:
            jobType,

          p_customer_name:
            customerName,

          p_origin_country:
            originCountry,

          p_destination_country:
            "SG",

          p_incoterm:
            "FOB"
        }
      );

    if (error) {
      return hardError(
        "Create job failed",
        error
      );
    }

    await loadJobs();

    showOk(
      "Job created"
    );
  }

  async function loadJobDetails(
    jobId
  ) {
    const {
      data,
      error
    } =
      await client
        .from("jobs")
        .select("*")
        .eq(
          "job_id",
          jobId
        )
        .single();

    if (error) {
      return hardError(
        "Load job details failed",
        error
      );
    }

    currentJobData =
      data || {};

    if ($("pol")) {
      $("pol").value =
        data.pol || "";
    }

    if ($("pod")) {
      $("pod").value =
        data.pod || "";
    }

    if ($("shipper_name")) {
      $("shipper_name").value =
        data.shipper_name ||
        "";
    }

    if ($("consignee_name")) {
      $("consignee_name").value =
        data.consignee_name ||
        "";
    }

    if ($("incoterm")) {
      $("incoterm").value =
        data.incoterm ||
        "";
    }

    if (
      $("origin_country")
    ) {
      $("origin_country").value =
        data.origin_country ||
        "";
    }

    if (
      $("destination_country")
    ) {
      $("destination_country").value =
        data.destination_country ||
        "";
    }

    updateInvoicePreview();
  }

  async function loadCharges() {
    const tbody =
      $("chargesTableBody");

    if (!tbody) return;

    if (!currentJobId) {
      tbody.innerHTML = "";
      currentCharges = [];
      return;
    }

    status(
      "Loading charges..."
    );

    const {
      data,
      error
    } =
      await client
        .from("charges")
        .select("*")
        .eq(
          "job_id",
          currentJobId
        )
        .order("created_at", {
          ascending: false
        });

    if (error) {
      return hardError(
        "Charges load failed",
        error
      );
    }

    currentCharges =
      data || [];

    tbody.innerHTML = "";

    currentCharges.forEach(
      c => {
        const tr =
          document.createElement(
            "tr"
          );

        tr.innerHTML = `
          <td>${escapeHtml(c.charge_code ?? "")}</td>
          <td>${escapeHtml(c.description ?? "")}</td>
          <td>${escapeHtml(c.qty ?? "")}</td>
          <td>${money(c.amount || 0)}</td>
          <td>${escapeHtml(c.currency ?? "")}</td>
          <td>${escapeHtml(c.type ?? "")}</td>
        `;

        tbody.appendChild(
          tr
        );
      }
    );

    updateProfitSummary(
      currentCharges
    );

    updateInvoicePreview();

    status(
      `Charges loaded (${currentCharges.length}).`
    );
  }

  async function addCharge() {
    if (!currentJobId) {
      return hardError(
        "Select a job row first."
      );
    }

    const charge_code =
      (
        $("charge_code")
          ?.value || ""
      )
        .trim()
        .toUpperCase();

    const currency =
      (
        $("currency")
          ?.value || ""
      )
        .trim()
        .toUpperCase();

    const type =
      (
        $("charge_type")
          ?.value || ""
      )
        .trim()
        .toUpperCase();

    const description =
      (
        $("description")
          ?.value || ""
      ).trim();

    const qty =
      num(
        $("qty")?.value
      ) ?? 1;

    const rate =
      num(
        $("rate")?.value
      ) ?? 0;

    const amount =
      num(
        $("amount")?.value
      ) ??
      qty * rate;

    status(
      "Adding charge..."
    );

    const { error } =
      await client
        .from("charges")
        .insert([
          {
            job_id:
              currentJobId,

            charge_code,

            description,

            qty,

            uom:
              $("uom")
                ?.value ||
              "EA",

            rate,

            amount,

            currency,

            type
          }
        ]);

    if (error) {
      return hardError(
        "Add charge failed",
        error
      );
    }

    await loadCharges();

    showOk(
      "Charge added"
    );
  }

  async function saveJobDetails() {
    if (!currentJobId) {
      return hardError(
        "No job selected."
      );
    }

    const payload = {
      pol:
        (
          $("pol")
            ?.value || ""
        ).trim(),

      pod:
        (
          $("pod")
            ?.value || ""
        ).trim(),

      shipper_name:
        (
          $("shipper_name")
            ?.value || ""
        ).trim(),

      consignee_name:
        (
          $("consignee_name")
            ?.value || ""
        ).trim(),

      incoterm:
        (
          $("incoterm")
            ?.value || ""
        )
          .trim()
          .toUpperCase(),

      origin_country:
        (
          $("origin_country")
            ?.value || ""
        )
          .trim()
          .toUpperCase(),

      destination_country:
        (
          $("destination_country")
            ?.value || ""
        )
          .trim()
          .toUpperCase()
    };

    const { error } =
      await client
        .from("jobs")
        .update(payload)
        .eq(
          "job_id",
          currentJobId
        );

    if (error) {
      return hardError(
        "Update failed",
        error
      );
    }

    await loadJobDetails(
      currentJobId
    );

    showOk(
      "Job updated"
    );
  }

  function computeAmountLive() {
    const qty =
      num(
        $("qty")?.value
      ) ?? 1;

    const rate =
      num(
        $("rate")?.value
      );

    if (rate !== null) {
      const amt =
        qty * rate;

      if ($("amount")) {
        $("amount").value =
          amt.toFixed(2);
      }
    }
  }

  function bindHard(
    id,
    fn,
    lockKey
  ) {
    const el = $(id);

    if (
      !el ||
      !el.parentNode
    ) {
      return;
    }

    const clone =
      el.cloneNode(true);

    el.parentNode.replaceChild(
      clone,
      el
    );

    clone.addEventListener(
      "click",
      async e => {
        e.preventDefault();
        e.stopPropagation();

        clone.disabled = true;

        await runLocked(
          lockKey || id,
          async () => {
            await fn();
          }
        );

        clone.disabled = false;
      }
    );
  }

  function wire() {
    bindHard(
      "btnLogin",
      signIn,
      "login"
    );

    bindHard(
      "btnLogout",
      signOut,
      "logout"
    );

    bindHard(
      "btnCreateJob",
      createJob,
      "createJob"
    );

    bindHard(
      "btnRefreshJobs",
      loadJobs,
      "refreshJobs"
    );

    bindHard(
      "btnAddCharge",
      addCharge,
      "addCharge"
    );

    bindHard(
      "btnRefreshCharges",
      loadCharges,
      "refreshCharges"
    );

    bindHard(
      "btnSaveJob",
      saveJobDetails,
      "saveJob"
    );

    bindHard(
      "btnSaveInvoiceDraft",
      saveInvoiceDraft,
      "saveInvoiceDraft"
    );

    bindHard(
      "btnRefreshInvoices",
      loadSavedInvoices,
      "refreshInvoices"
    );

    bindHard(
      "btnPostInvoice",
      postSelectedInvoice,
      "postInvoice"
    );

    bindHard(
      "btnVoidInvoice",
      voidSelectedInvoice,
      "voidInvoice"
    );

    bindHard(
      "btnBuildInvoiceDoc",
      buildInvoiceDocumentPreview,
      "buildInvoiceDoc"
    );

    bindHard(
      "btnPrintInvoiceDoc",
      printInvoiceDocument,
      "printInvoiceDoc"
    );

    ["qty", "rate"]
      .forEach(id => {
        const el =
          $(id);

        if (el) {
          el.addEventListener(
            "input",
            computeAmountLive
          );

          el.addEventListener(
            "change",
            computeAmountLive
          );
        }
      });
  }

  function loadScript(src) {
    return new Promise(
      (
        resolve,
        reject
      ) => {
        const s =
          document.createElement(
            "script"
          );

        s.src = src;
        s.async = true;

        s.onload = resolve;
        s.onerror = reject;

        document.head.appendChild(
          s
        );
      }
    );
  }

  async function initSupabase() {
    try {
      console.log(BUILD);

      status(
        "Loading Supabase JS..."
      );

      if (
        !window.supabase ||
        !window.supabase
          .createClient
      ) {
        await loadScript(
          SUPABASE_CDN
        );
      }

      if (
        !window.supabase ||
        !window.supabase
          .createClient
      ) {
        return hardError(
          "Supabase library failed to load."
        );
      }

      client =
        window.supabase.createClient(
          SUPABASE_URL,
          SUPABASE_KEY
        );

      status("Ready.");
    } catch (e) {
      hardError(
        "Init crashed",
        e
      );
    }
  }

  function creds() {
    return {
      email:
        (
          $("email")
            ?.value || ""
        ).trim(),

      password:
        $("password")
          ?.value || ""
    };
  }

  async function signIn() {
    if (!client) {
      return hardError(
        "Supabase not ready yet."
      );
    }

    const {
      email,
      password
    } = creds();

    if (
      !email ||
      !password
    ) {
      return hardError(
        "Email/password required."
      );
    }

    status(
      "Signing in..."
    );

    const {
      data,
      error
    } =
      await client.auth
        .signInWithPassword({
          email,
          password
        });

    if (error) {
      return hardError(
        "Login failed",
        error
      );
    }

    const s =
      await client.auth.getSession();

    user =
      s?.data?.session
        ?.user ||
      data?.user ||
      null;

    if (!user) {
      return hardError(
        "Signed in but no session created."
      );
    }

    showApp(true);

    await afterLogin();
  }

  async function signOut() {
    if (!client) return;

    status(
      "Signing out..."
    );

    const { error } =
      await client.auth.signOut();

    if (error) {
      return hardError(
        "Logout failed",
        error
      );
    }

    user = null;

    currentJobId = null;
    currentJobNo = null;
    currentJobData = null;

    currentCharges = [];
    currentSavedInvoices = [];

    selectedInvoice = null;
    selectedInvoiceLines = [];

    setCurrentJob(null);

    showApp(false);

    status("Ready.");
  }

  async function afterLogin() {
    ensureOpsStatus();

    ensureCompanyProfileEditor();

    status(
      "Loading data..."
    );

    await loadBranches();
    await loadJobs();

    status(
      "✅ Logged in and data loaded."
    );
  }

  async function restoreSession() {
    if (!client) return;

    status(
      "Checking session..."
    );

    const {
      data,
      error
    } =
      await client.auth.getSession();

    if (error) {
      return hardError(
        "Session error",
        error
      );
    }

    if (
      data?.session?.user
    ) {
      user =
        data.session.user;

      showApp(true);

      await afterLogin();
    } else {
      showApp(false);

      status("Ready.");
    }
  }

  document.addEventListener(
    "DOMContentLoaded",
    async () => {
      ensureOpsStatus();

      await initSupabase();

      if (!client) {
        return;
      }

      wire();

      await restoreSession();
    }
  );
})();
