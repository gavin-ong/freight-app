(function () {
  const SUPABASE_URL = "https://quzputmmabgcfmegarvd.supabase.co";
  const SUPABASE_KEY = "sb_publishable_UG9E0FbUzetadkz8TQN2fg_pIWx3LTO";
  const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  const BUILD = "BUILD: FREIGHT-STEP4G-COMPANY-PROFILE-EDITOR1 (JS)";

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
    company_name: "YOUR COMPANY NAME PTE LTD",
    company_address: "Company address line 1, Singapore",
    company_uen: "UEN / GST Reg No: TBD",
    payment_terms: "Payment due as per agreed credit terms.",
    bank_details: "Bank details to be configured.",
    invoice_footer: "This is a system-generated invoice from Freight App MVP."
  };

  const actionLocks = {};
  const $ = (id) => document.getElementById(id);

  function ensureOpsStatus() {
    const appCard = $("appCard");
    if (!appCard) return;

    const body = appCard.querySelector(".body") || appCard;

    if (!$("opsStatus")) {
      const s = document.createElement("div");
      s.id = "opsStatus";
      s.style.margin = "10px 0";
      s.style.padding = "10px 12px";
      s.style.borderRadius = "12px";
      s.style.border = "1px solid rgba(255,255,255,.12)";
      s.style.background = "rgba(255,255,255,.06)";
      s.style.fontSize = "12px";
      s.style.wordBreak = "break-word";
      s.style.color = "#9fffb0";
      body.insertBefore(s, body.firstChild);
      s.textContent = "Ready.";
    }
  }

  function status(msg, isErr = false) {
    ensureOpsStatus();

    const ops = $("opsStatus");
    if (ops) {
      ops.textContent = msg;
      ops.style.color = isErr ? "#ff7b7b" : "#9fffb0";
    }

    const loginStatus = $("status");
    if (loginStatus && $("loginCard") && !$("loginCard").classList.contains("hidden")) {
      loginStatus.textContent = msg;
      loginStatus.style.color = isErr ? "#ff7b7b" : "#e9f1ff";
    }

    console.log(msg);
  }

  function hardError(msg, errObj) {
    const detail = errObj?.message || errObj?.details || errObj?.hint || "";
    const full = detail ? `${msg}: ${detail}` : msg;
    status("❌ " + full, true);
    alert("❌ " + full);
    if (errObj) console.error(errObj);
  }

  function showOk(msg) {
    status("✅ " + msg, false);
    alert("✅ " + msg);
  }

  async function runLocked(lockKey, fn) {
    if (actionLocks[lockKey]) {
      console.warn("Blocked duplicate action:", lockKey);
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
    $("loginCard")?.classList.toggle("hidden", loggedIn);
    $("appCard")?.classList.toggle("hidden", !loggedIn);
    $("btnLogin")?.classList.toggle("hidden", loggedIn);
    $("btnLogout")?.classList.toggle("hidden", !loggedIn);
  }

  function setCurrentJob(jobNo) {
    currentJobNo = jobNo || null;
    const el = $("currentJobNo");
    if (el) el.textContent = jobNo || "None";
  }

  function num(v) {
    const x = parseFloat(String(v ?? "").trim());
    return Number.isFinite(x) ? x : null;
  }

  function money(v) {
    const n = Number(v || 0);
    return n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function safeText(v, fallback = "-") {
    const s = String(v ?? "").trim();
    return s || fallback;
  }

  function shortDate(v) {
    if (!v) return "-";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "-";
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
    return escapeHtml(v || "").replace(/\n/g, "<br>");
  }

  function statusPill(statusValue) {
    const s = String(statusValue || "").toUpperCase();

    if (s === "POSTED") return `<span class="status-pill pill-posted">POSTED</span>`;
    if (s === "VOID") return `<span class="status-pill pill-void">VOID</span>`;
    return `<span class="status-pill pill-draft">DRAFT</span>`;
  }

  function getSellLines() {
    return (currentCharges || []).filter(c => {
      return String(c.type || "").trim().toUpperCase() === "SELL";
    });
  }

  function getTotalsByCurrency(lines) {
    const totals = {};

    (lines || []).forEach(c => {
      const currency = String(c.currency || "").trim().toUpperCase() || "N/A";
      const amount = Number(c.amount || 0);
      totals[currency] = (totals[currency] || 0) + amount;
    });

    return totals;
  }

  function getGrandTotalSimple(totalsByCurrency) {
    return Object.values(totalsByCurrency || {}).reduce((a, b) => a + Number(b || 0), 0);
  }

  function ensureCompanyProfileEditor() {
    if ($("companyProfilePanel")) return;

    const panel = document.querySelector("#appCard .panel");
    if (!panel) return;

    const section = document.createElement("div");
    section.className = "section";
    section.id = "companyProfilePanel";

    section.innerHTML = `
      <h2>Company Invoice Profile</h2>

      <div class="note">
        This controls the company header/footer used in the invoice document preview and print window.
      </div>

      <div class="row2">
        <div>
          <label>Company Name</label>
          <input id="profile_company_name" placeholder="YOUR COMPANY NAME PTE LTD"/>
        </div>
        <div>
          <label>UEN / GST Reg No</label>
          <input id="profile_company_uen" placeholder="UEN / GST Reg No"/>
        </div>
      </div>

      <label>Company Address</label>
      <textarea id="profile_company_address" rows="3" style="width:100%;border-radius:10px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.07);color:#e9f1ff;padding:10px;outline:none;font-family:inherit"></textarea>

      <label>Payment Terms</label>
      <textarea id="profile_payment_terms" rows="3" style="width:100%;border-radius:10px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.07);color:#e9f1ff;padding:10px;outline:none;font-family:inherit"></textarea>

      <label>Bank Details</label>
      <textarea id="profile_bank_details" rows="3" style="width:100%;border-radius:10px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.07);color:#e9f1ff;padding:10px;outline:none;font-family:inherit"></textarea>

      <label>Invoice Footer</label>
      <textarea id="profile_invoice_footer" rows="3" style="width:100%;border-radius:10px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.07);color:#e9f1ff;padding:10px;outline:none;font-family:inherit"></textarea>

      <div class="btnbar">
        <button id="btnSaveCompanyProfile" class="primary">Save Company Profile</button>
        <button id="btnReloadCompanyProfile">Reload Profile</button>
      </div>

      <div class="build">BUILD: FREIGHT-STEP4G-COMPANY-PROFILE-EDITOR1 (UI)</div>
    `;

    /*
      Put it near the bottom so it does not disturb main job/charges workflow.
      Insert before the existing final build marker if available.
    */
    const buildMarker = panel.querySelector(".build");
    if (buildMarker) {
      panel.insertBefore(section, buildMarker);
    } else {
      panel.appendChild(section);
    }

    bindHard("btnSaveCompanyProfile", saveCompanyInvoiceProfile, "saveCompanyProfile");
    bindHard("btnReloadCompanyProfile", loadCompanyInvoiceProfileAndPopulate, "reloadCompanyProfile");

    populateCompanyProfileEditor();
  }

  function populateCompanyProfileEditor() {
    if ($("profile_company_name")) $("profile_company_name").value = companyProfile.company_name || "";
    if ($("profile_company_address")) $("profile_company_address").value = companyProfile.company_address || "";
    if ($("profile_company_uen")) $("profile_company_uen").value = companyProfile.company_uen || "";
    if ($("profile_payment_terms")) $("profile_payment_terms").value = companyProfile.payment_terms || "";
    if ($("profile_bank_details")) $("profile_bank_details").value = companyProfile.bank_details || "";
    if ($("profile_invoice_footer")) $("profile_invoice_footer").value = companyProfile.invoice_footer || "";
  }

  function readCompanyProfileEditor() {
    return {
      profile_key: "DEFAULT",
      company_name: ($("profile_company_name")?.value || "").trim() || "YOUR COMPANY NAME PTE LTD",
      company_address: ($("profile_company_address")?.value || "").trim() || "Company address line 1, Singapore",
      company_uen: ($("profile_company_uen")?.value || "").trim() || "UEN / GST Reg No: TBD",
      payment_terms: ($("profile_payment_terms")?.value || "").trim() || "Payment due as per agreed credit terms.",
      bank_details: ($("profile_bank_details")?.value || "").trim() || "Bank details to be configured.",
      invoice_footer: ($("profile_invoice_footer")?.value || "").trim() || "This is a system-generated invoice from Freight App MVP.",
      updated_at: new Date().toISOString()
    };
  }

  async function loadCompanyInvoiceProfile() {
    if (!client) return;

    const { data, error } = await client
      .from("company_invoice_profile")
      .select("company_name, company_address, company_uen, payment_terms, bank_details, invoice_footer")
      .eq("profile_key", "DEFAULT")
      .single();

    if (error) {
      console.warn("Company invoice profile not loaded. Using defaults.", error);
      return;
    }

    if (data) {
      companyProfile = {
        company_name: data.company_name || companyProfile.company_name,
        company_address: data.company_address || companyProfile.company_address,
        company_uen: data.company_uen || companyProfile.company_uen,
        payment_terms: data.payment_terms || companyProfile.payment_terms,
        bank_details: data.bank_details || companyProfile.bank_details,
        invoice_footer: data.invoice_footer || companyProfile.invoice_footer
      };
    }
  }

  async function loadCompanyInvoiceProfileAndPopulate() {
    status("Reloading company invoice profile...");
    await loadCompanyInvoiceProfile();
    populateCompanyProfileEditor();
    status("✅ Company invoice profile reloaded.");
  }

  async function saveCompanyInvoiceProfile() {
    if (!client) return hardError("Supabase not ready yet.");

    const payload = readCompanyProfileEditor();

    status("Saving company invoice profile...");

    const { error } = await client
      .from("company_invoice_profile")
      .upsert([payload], { onConflict: "profile_key" });

    if (error) return hardError("Company profile save failed", error);

    companyProfile = {
      company_name: payload.company_name,
      company_address: payload.company_address,
      company_uen: payload.company_uen,
      payment_terms: payload.payment_terms,
      bank_details: payload.bank_details,
      invoice_footer: payload.invoice_footer
    };

    /*
      Rebuild preview immediately if an invoice is already selected.
    */
    if (selectedInvoice && selectedInvoiceLines.length) {
      buildInvoiceDocumentPreview();
    }

    showOk("Company invoice profile saved");
  }

  function resetProfitSummary() {
    if ($("sumSell")) $("sumSell").textContent = "0.00";
    if ($("sumBuy")) $("sumBuy").textContent = "0.00";

    if ($("sumProfit")) {
      $("sumProfit").textContent = "0.00";
      $("sumProfit").className = "metric-value profit-flat";
    }

    if ($("sumCount")) $("sumCount").textContent = "0";

    if ($("profitNote")) {
      $("profitNote").textContent = "Select a job to calculate SELL, BUY and gross profit.";
    }
  }

  function resetInvoicePreview() {
    if ($("invJobNo")) $("invJobNo").textContent = "-";
    if ($("invBillTo")) $("invBillTo").textContent = "-";
    if ($("invRoute")) $("invRoute").textContent = "-";
    if ($("invIncoterm")) $("invIncoterm").textContent = "-";
    if ($("invoiceLinesBody")) $("invoiceLinesBody").innerHTML = "";
    if ($("invoiceTotalBox")) $("invoiceTotalBox").textContent = "No SELL charges selected.";

    if ($("existingDraftWarning")) {
      $("existingDraftWarning").classList.add("hidden");
      $("existingDraftWarning").textContent = "";
    }

    if ($("savedInvoiceBox")) {
      $("savedInvoiceBox").classList.add("hidden");
      $("savedInvoiceBox").textContent = "";
    }

    if ($("invoiceNote")) {
      $("invoiceNote").textContent = "Invoice draft includes SELL charges only.";
    }
  }

  function resetInvoiceDocument() {
    if ($("invoiceDocumentBody")) {
      $("invoiceDocumentBody").innerHTML = "No invoice document built yet.";
    }

    const printBtn = $("btnPrintInvoiceDoc");
    if (printBtn) printBtn.disabled = true;
  }

  function setWorkflowButtons() {
    const postBtn = $("btnPostInvoice");
    const voidBtn = $("btnVoidInvoice");
    const docBtn = $("btnBuildInvoiceDoc");
    const printBtn = $("btnPrintInvoiceDoc");

    if (!postBtn || !voidBtn || !docBtn || !printBtn) return;

    if (!selectedInvoice) {
      postBtn.disabled = true;
      voidBtn.disabled = true;
      docBtn.disabled = true;
      printBtn.disabled = true;
      return;
    }

    const st = String(selectedInvoice.invoice_status || "").toUpperCase();

    postBtn.disabled = st !== "DRAFT";
    voidBtn.disabled = st === "VOID";
    docBtn.disabled = !selectedInvoiceLines.length;
    printBtn.disabled = true;
  }

  function resetSavedInvoices() {
    currentSavedInvoices = [];
    selectedInvoice = null;
    selectedInvoiceLines = [];

    if ($("savedInvoicesBody")) $("savedInvoicesBody").innerHTML = "";
    if ($("savedInvoiceLinesBody")) $("savedInvoiceLinesBody").innerHTML = "";

    if ($("savedInvoicesNote")) {
      $("savedInvoicesNote").textContent = "Select a job to view saved invoices.";
    }

    if ($("loadedInvoiceBox")) {
      $("loadedInvoiceBox").classList.add("hidden");
      $("loadedInvoiceBox").textContent = "";
    }

    if ($("existingDraftWarning")) {
      $("existingDraftWarning").classList.add("hidden");
      $("existingDraftWarning").textContent = "";
    }

    resetInvoiceDocument();
    setWorkflowButtons();
  }

  function updateProfitSummary(charges) {
    let sell = 0;
    let buy = 0;
    const currencySet = new Set();

    (charges || []).forEach(c => {
      const amt = Number(c.amount || 0);
      const typ = String(c.type || "").trim().toUpperCase();
      const cur = String(c.currency || "").trim().toUpperCase();

      if (cur) currencySet.add(cur);
      if (typ === "SELL") sell += amt;
      if (typ === "BUY") buy += amt;
    });

    const gp = sell - buy;
    const currencies = Array.from(currencySet);

    if ($("sumSell")) $("sumSell").textContent = money(sell);
    if ($("sumBuy")) $("sumBuy").textContent = money(buy);

    if ($("sumProfit")) {
      $("sumProfit").textContent = money(gp);
      $("sumProfit").className =
        gp > 0 ? "metric-value profit-good" :
        gp < 0 ? "metric-value profit-bad" :
        "metric-value profit-flat";
    }

    if ($("sumCount")) $("sumCount").textContent = String((charges || []).length);

    if ($("profitNote")) {
      const currencyText = currencies.length ? currencies.join(", ") : "No currency yet";
      $("profitNote").textContent =
        `Job ${currentJobNo || ""}: ${(charges || []).length} charge(s). Currency seen: ${currencyText}. ` +
        `Totals are simple same-currency sums for now. FX conversion comes later.`;
    }
  }

  function updateInvoicePreview() {
    const job = currentJobData || {};
    const sellLines = getSellLines();

    if ($("invJobNo")) $("invJobNo").textContent = safeText(currentJobNo);
    if ($("invBillTo")) $("invBillTo").textContent = safeText(job.customer_name || job.consignee_name || job.shipper_name);
    if ($("invRoute")) $("invRoute").textContent = `${safeText(job.pol)} → ${safeText(job.pod)}`;
    if ($("invIncoterm")) $("invIncoterm").textContent = safeText(job.incoterm);

    const tbody = $("invoiceLinesBody");
    if (tbody) tbody.innerHTML = "";

    sellLines.forEach(c => {
      if (!tbody) return;

      const amount = Number(c.amount || 0);
      const currency = String(c.currency || "").trim().toUpperCase() || "N/A";

      const tr = document.createElement("tr");
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

    const totalsByCurrency = getTotalsByCurrency(sellLines);

    const totalText = Object.keys(totalsByCurrency).length
      ? Object.entries(totalsByCurrency).map(([cur, total]) => `${cur} ${money(total)}`).join("\n")
      : "No SELL charges selected.";

    if ($("invoiceTotalBox")) $("invoiceTotalBox").textContent = totalText;

    if ($("invoiceNote")) {
      if (!currentJobId) {
        $("invoiceNote").textContent = "Select a job first to build invoice draft.";
      } else if (!sellLines.length) {
        $("invoiceNote").textContent = "This job has no SELL charges yet, so invoice draft is empty.";
      } else {
        $("invoiceNote").textContent =
          `Draft ready: ${sellLines.length} SELL line(s). BUY charges are excluded from invoice draft.`;
      }
    }
  }

  function updateExistingDraftWarning() {
    const existingDraft = (currentSavedInvoices || []).find(inv => {
      return String(inv.invoice_status || "").toUpperCase() === "DRAFT";
    });

    const box = $("existingDraftWarning");
    const btn = $("btnSaveInvoiceDraft");

    if (!box || !btn) return;

    if (existingDraft) {
      box.classList.remove("hidden");
      box.textContent =
        `Existing draft found for this job: ${existingDraft.invoice_no}. ` +
        `To avoid duplicate draft invoices, Save Invoice Draft is disabled for this selected job.`;
      btn.disabled = true;
    } else {
      box.classList.add("hidden");
      box.textContent = "";
      btn.disabled = false;
    }
  }

  function renderSavedInvoices(invoices) {
    const tbody = $("savedInvoicesBody");
    if (tbody) tbody.innerHTML = "";

    currentSavedInvoices = invoices || [];

    if (tbody) {
      currentSavedInvoices.forEach(inv => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
          <td>${escapeHtml(inv.invoice_no ?? "")}</td>
          <td>${statusPill(inv.invoice_status)}</td>
          <td>${money(inv.total_amount || 0)}</td>
          <td>${escapeHtml(shortDate(inv.created_at))}</td>
        `;

        tr.addEventListener("click", async () => {
          await runLocked("loadInvoiceLines", async () => {
            await loadSavedInvoiceLines(inv);
          });
        });

        tbody.appendChild(tr);
      });
    }

    if ($("savedInvoicesNote")) {
      $("savedInvoicesNote").textContent =
        currentSavedInvoices.length
          ? `${currentSavedInvoices.length} saved invoice(s) found for this job. Click one to load lines.`
          : "No saved invoices found for this job.";
    }

    updateExistingDraftWarning();
  }

  async function loadSavedInvoices() {
    if (!currentJobId && !currentJobNo) {
      resetSavedInvoices();
      return;
    }

    selectedInvoice = null;
    selectedInvoiceLines = [];
    setWorkflowButtons();
    resetInvoiceDocument();

    if ($("savedInvoiceLinesBody")) $("savedInvoiceLinesBody").innerHTML = "";
    if ($("loadedInvoiceBox")) {
      $("loadedInvoiceBox").classList.add("hidden");
      $("loadedInvoiceBox").textContent = "";
    }

    status("Loading saved invoices...");

    let data = [];
    let error = null;

    if (currentJobId) {
      const res = await client
        .from("invoices")
        .select("invoice_id, invoice_no, invoice_status, total_amount, currency_summary, created_at, job_id, job_no, posted_at, voided_at, bill_to")
        .eq("job_id", currentJobId)
        .order("created_at", { ascending: false });

      data = res.data || [];
      error = res.error;
    }

    if (error) return hardError("Saved invoices load failed", error);

    if ((!data || !data.length) && currentJobNo) {
      const res2 = await client
        .from("invoices")
        .select("invoice_id, invoice_no, invoice_status, total_amount, currency_summary, created_at, job_id, job_no, posted_at, voided_at, bill_to")
        .eq("job_no", currentJobNo)
        .order("created_at", { ascending: false });

      if (res2.error) return hardError("Saved invoices load by job_no failed", res2.error);
      data = res2.data || [];
    }

    renderSavedInvoices(data || []);
    status(`Saved invoices loaded (${(data || []).length}).`);
  }

  async function loadSavedInvoiceLines(inv) {
    if (!inv?.invoice_id) return hardError("No invoice selected.");

    selectedInvoice = inv;
    selectedInvoiceLines = [];
    resetInvoiceDocument();
    setWorkflowButtons();

    status(`Loading invoice ${inv.invoice_no}...`);

    const { data, error } = await client
      .from("invoice_lines")
      .select("charge_code, description, qty, uom, rate, amount, currency, source_type, created_at")
      .eq("invoice_id", inv.invoice_id)
      .order("created_at", { ascending: true });

    if (error) return hardError("Saved invoice lines load failed", error);

    selectedInvoiceLines = data || [];

    const tbody = $("savedInvoiceLinesBody");
    if (tbody) tbody.innerHTML = "";

    selectedInvoiceLines.forEach(line => {
      if (!tbody) return;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(line.charge_code ?? "")}</td>
        <td>${escapeHtml(line.description ?? "")}</td>
        <td>${escapeHtml(line.qty ?? "")}</td>
        <td>${escapeHtml(line.rate ?? "")}</td>
        <td>${money(line.amount || 0)}</td>
        <td>${escapeHtml(line.currency ?? "")}</td>
      `;
      tbody.appendChild(tr);
    });

    const totalText = inv.currency_summary
      ? Object.entries(inv.currency_summary)
          .map(([cur, total]) => `${cur} ${money(total)}`)
          .join("\n")
      : money(inv.total_amount || 0);

    const postedText = inv.posted_at ? `\nPosted At: ${shortDate(inv.posted_at)}` : "";
    const voidedText = inv.voided_at ? `\nVoided At: ${shortDate(inv.voided_at)}` : "";

    if ($("loadedInvoiceBox")) {
      $("loadedInvoiceBox").classList.remove("hidden");
      $("loadedInvoiceBox").textContent =
        `Loaded saved invoice\n` +
        `Invoice No: ${inv.invoice_no}\n` +
        `Status: ${inv.invoice_status}\n` +
        `Lines: ${selectedInvoiceLines.length}\n` +
        `Total:\n${totalText}` +
        postedText +
        voidedText;
    }

    setWorkflowButtons();
    status(`Invoice ${inv.invoice_no} loaded.`);
  }

  async function updateSelectedInvoiceStatus(nextStatus) {
    if (!selectedInvoice?.invoice_id) {
      return hardError("Select a saved invoice first.");
    }

    const currentStatus = String(selectedInvoice.invoice_status || "").toUpperCase();
    const targetStatus = String(nextStatus || "").toUpperCase();

    if (currentStatus === "VOID") {
      return hardError("VOID invoice cannot be changed.");
    }

    if (targetStatus === "POSTED" && currentStatus !== "DRAFT") {
      return hardError("Only DRAFT invoices can be POSTED.");
    }

    const payload = {
      invoice_status: targetStatus,
      updated_at: new Date().toISOString()
    };

    if (targetStatus === "POSTED") {
      payload.posted_at = new Date().toISOString();
    }

    if (targetStatus === "VOID") {
      payload.voided_at = new Date().toISOString();
    }

    status(`Updating invoice ${selectedInvoice.invoice_no} to ${targetStatus}...`);

    const { error } = await client
      .from("invoices")
      .update(payload)
      .eq("invoice_id", selectedInvoice.invoice_id);

    if (error) return hardError("Invoice status update failed", error);

    showOk(`Invoice ${selectedInvoice.invoice_no} marked as ${targetStatus}.`);

    await loadSavedInvoices();
  }

  async function postSelectedInvoice() {
    await updateSelectedInvoiceStatus("POSTED");
  }

  async function voidSelectedInvoice() {
    await updateSelectedInvoiceStatus("VOID");
  }

  function buildInvoiceDocumentPreview() {
    if (!selectedInvoice) {
      return hardError("Select a saved invoice first.");
    }

    if (!selectedInvoiceLines.length) {
      return hardError("Selected invoice has no loaded lines.");
    }

    const job = currentJobData || {};
    const inv = selectedInvoice;
    const lines = selectedInvoiceLines || [];

    const totals = inv.currency_summary || getTotalsByCurrency(lines);
    const totalText = Object.entries(totals)
      .map(([cur, total]) => `${escapeHtml(cur)} ${money(total)}`)
      .join("<br>");

    const lineRows = lines.map((l, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(l.charge_code || "")}</td>
        <td>${escapeHtml(l.description || "")}</td>
        <td style="text-align:right">${escapeHtml(l.qty ?? "")}</td>
        <td style="text-align:right">${escapeHtml(l.uom ?? "")}</td>
        <td style="text-align:right">${money(l.rate || 0)}</td>
        <td style="text-align:right">${money(l.amount || 0)}</td>
        <td>${escapeHtml(l.currency || "")}</td>
      </tr>
    `).join("");

    const statusValue = String(inv.invoice_status || "").toUpperCase();

    const docHtml = `
      <div>
        <div style="display:flex;justify-content:space-between;gap:20px;align-items:flex-start;">
          <div>
            <div class="doc-company">${escapeHtml(companyProfile.company_name)}</div>
            <div class="doc-muted">
              ${htmlLines(companyProfile.company_address)}<br>
              ${escapeHtml(companyProfile.company_uen)}
            </div>
          </div>
          <div>
            <div class="doc-title">TAX INVOICE</div>
            <div class="doc-muted" style="text-align:right;">
              Invoice No: <b>${escapeHtml(inv.invoice_no || "")}</b><br>
              Status: <b>${escapeHtml(statusValue)}</b><br>
              Date: ${escapeHtml(shortDate(inv.created_at))}
            </div>
          </div>
        </div>

        <div class="doc-grid">
          <div class="doc-box">
            <b>Bill To</b><br>
            ${escapeHtml(inv.bill_to || job.customer_name || job.consignee_name || job.shipper_name || "-")}
          </div>
          <div class="doc-box">
            <b>Job Details</b><br>
            Job No: ${escapeHtml(inv.job_no || currentJobNo || "-")}<br>
            POL / POD: ${escapeHtml(job.pol || "-")} → ${escapeHtml(job.pod || "-")}<br>
            Incoterm: ${escapeHtml(job.incoterm || "-")}<br>
            Origin / Destination: ${escapeHtml(job.origin_country || "-")} → ${escapeHtml(job.destination_country || "-")}
          </div>
        </div>

        <table class="doc-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Code</th>
              <th>Description</th>
              <th>Qty</th>
              <th>UOM</th>
              <th>Rate</th>
              <th>Amount</th>
              <th>Currency</th>
            </tr>
          </thead>
          <tbody>
            ${lineRows}
          </tbody>
        </table>

        <div class="doc-total">
          Total Payable:<br>
          ${totalText || "0.00"}
        </div>

        <div class="doc-footer">
          <b>Payment Terms</b><br>
          ${htmlLines(companyProfile.payment_terms)}<br><br>
          <b>Bank Details</b><br>
          ${htmlLines(companyProfile.bank_details)}<br><br>
          ${htmlLines(companyProfile.invoice_footer)}
        </div>
      </div>
    `;

    if ($("invoiceDocumentBody")) {
      $("invoiceDocumentBody").innerHTML = docHtml;
    }

    const printBtn = $("btnPrintInvoiceDoc");
    if (printBtn) printBtn.disabled = false;

    status(`Invoice document preview built for ${inv.invoice_no}.`);
  }

  function printInvoiceDocument() {
    const body = $("invoiceDocumentBody");

    if (!body || body.textContent.includes("No invoice document")) {
      return hardError("Build invoice document preview first.");
    }

    const invoiceHtml = body.innerHTML;
    const invoiceNo = selectedInvoice?.invoice_no || "invoice";

    const printWindow = window.open("", "_blank", "width=900,height=1100");

    if (!printWindow) {
      return hardError("Print window was blocked by browser. Allow pop-ups for this site, then try again.");
    }

    const printHtml = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(invoiceNo)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #111;
      font-family: Arial, sans-serif;
      font-size: 11px;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .print-wrap {
      width: 194mm;
      margin: 0 auto;
      padding: 0;
      background: #fff;
      color: #111;
    }

    .doc-title {
      font-size: 18px;
      font-weight: 900;
      text-align: right;
      letter-spacing: 1px;
    }

    .doc-company {
      font-size: 13px;
      font-weight: 900;
    }

    .doc-muted {
      color: #555;
      font-size: 9.5px;
    }

    .doc-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 10px;
      page-break-inside: avoid;
    }

    .doc-box {
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 7px;
      min-height: 48px;
      page-break-inside: avoid;
    }

    .doc-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 9.5px;
      page-break-inside: auto;
    }

    .doc-table th {
      background: #f2f4f7;
      color: #111;
      border: 1px solid #ccc;
      padding: 4px 5px;
      text-align: left;
    }

    .doc-table td {
      color: #111;
      border: 1px solid #ccc;
      padding: 4px 5px;
    }

    .doc-table tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }

    .doc-total {
      margin-top: 10px;
      text-align: right;
      font-size: 12px;
      font-weight: 900;
      white-space: pre-wrap;
      page-break-inside: avoid;
    }

    .doc-footer {
      margin-top: 12px;
      border-top: 1px solid #ddd;
      padding-top: 6px;
      color: #555;
      font-size: 9px;
      page-break-inside: avoid;
    }

    @media print {
      html,
      body {
        width: 210mm;
        min-height: 0;
        height: auto;
        overflow: visible;
      }

      .print-wrap {
        width: 194mm;
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <div class="print-wrap">
    ${invoiceHtml}
  </div>
  <script>
    window.onload = function () {
      window.focus();
      window.print();
    };
  </script>
</body>
</html>
`;

    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
  }

  async function saveInvoiceDraft() {
    if (!currentJobId) return hardError("Select a job first.");

    await loadSavedInvoices();

    const existingDraft = (currentSavedInvoices || []).find(inv => {
      return String(inv.invoice_status || "").toUpperCase() === "DRAFT";
    });

    if (existingDraft) {
      return hardError(`Existing draft already exists for this job: ${existingDraft.invoice_no}. Load it from Saved Invoices instead.`);
    }

    const sellLines = getSellLines();

    if (!sellLines.length) {
      return hardError("No SELL charges to invoice.");
    }

    const job = currentJobData || {};
    const billTo = safeText(job.customer_name || job.consignee_name || job.shipper_name, "");

    const totalsByCurrency = getTotalsByCurrency(sellLines);
    const grandTotalSimple = getGrandTotalSimple(totalsByCurrency);

    status("Saving invoice draft...");

    const { data: inv, error: invErr } = await client
      .from("invoices")
      .insert([{
        job_id: currentJobId,
        job_no: currentJobNo,
        bill_to: billTo,
        invoice_status: "DRAFT",
        currency_summary: totalsByCurrency,
        total_amount: grandTotalSimple,
        created_by: user?.id || null
      }])
      .select("invoice_id, invoice_no, invoice_status, total_amount, currency_summary, created_at, job_id, job_no, posted_at, voided_at, bill_to")
      .single();

    if (invErr) return hardError("Invoice header save failed", invErr);
    if (!inv?.invoice_id) return hardError("Invoice saved but invoice_id was not returned.");

    const linesPayload = sellLines.map(c => ({
      invoice_id: inv.invoice_id,
      job_id: currentJobId,
      charge_code: c.charge_code || "",
      description: c.description || "",
      qty: Number(c.qty || 1),
      uom: c.uom || "",
      rate: Number(c.rate || 0),
      amount: Number(c.amount || 0),
      currency: String(c.currency || "").trim().toUpperCase(),
      source_type: "SELL"
    }));

    const { error: lineErr } = await client
      .from("invoice_lines")
      .insert(linesPayload);

    if (lineErr) return hardError("Invoice lines save failed", lineErr);

    const totalText = Object.entries(totalsByCurrency)
      .map(([cur, total]) => `${cur} ${money(total)}`)
      .join("\n");

    if ($("savedInvoiceBox")) {
      $("savedInvoiceBox").classList.remove("hidden");
      $("savedInvoiceBox").textContent =
        `Saved invoice draft\n` +
        `Invoice No: ${inv.invoice_no}\n` +
        `Lines: ${linesPayload.length}\n` +
        `Total:\n${totalText}`;
    }

    renderSavedInvoices([inv, ...(currentSavedInvoices || [])]);
    await loadSavedInvoices();

    showOk(`Invoice draft saved: ${inv.invoice_no}`);
  }

  async function afterLogin() {
    ensureOpsStatus();
    resetProfitSummary();
    resetInvoicePreview();
    resetSavedInvoices();
    ensureCompanyProfileEditor();
    status("Loading data...");

    await loadCompanyInvoiceProfile();
    populateCompanyProfileEditor();
    await loadBranches();
    await loadDefaultBranchFromProfile();
    await loadJobs();

    status("✅ Logged in and data loaded.");
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function initSupabase() {
    try {
      console.log(BUILD);
      status("Loading Supabase JS...");

      if (!window.supabase || !window.supabase.createClient) {
        await loadScript(SUPABASE_CDN);
      }

      if (!window.supabase || !window.supabase.createClient) {
        return hardError("Supabase library failed to load.");
      }

      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      status("Ready.");
    } catch (e) {
      hardError("Init crashed", e);
    }
  }

  function creds() {
    return {
      email: ($("email")?.value || "").trim(),
      password: $("password")?.value || ""
    };
  }

  async function signIn() {
    if (!client) return hardError("Supabase not ready yet.");

    const { email, password } = creds();
    if (!email || !password) return hardError("Email/password required.");

    status("Signing in...");

    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) return hardError("Login failed", error);

    const s = await client.auth.getSession();
    user = s?.data?.session?.user || data?.user || null;

    if (!user) return hardError("Signed in but no session created.");

    showApp(true);
    await afterLogin();
  }

  async function signOut() {
    if (!client) return;

    status("Signing out...");

    const { error } = await client.auth.signOut();
    if (error) return hardError("Logout failed", error);

    user = null;
    currentJobId = null;
    currentJobNo = null;
    currentJobData = null;
    currentCharges = [];
    currentSavedInvoices = [];
    selectedInvoice = null;
    selectedInvoiceLines = [];

    setCurrentJob(null);
    resetProfitSummary();
    resetInvoicePreview();
    resetSavedInvoices();
    showApp(false);
    status("Ready.");
  }

  async function restoreSession() {
    if (!client) return;

    status("Checking session...");

    const { data, error } = await client.auth.getSession();
    if (error) return hardError("Session error", error);

    if (data?.session?.user) {
      user = data.session.user;
      showApp(true);
      await afterLogin();
    } else {
      showApp(false);
      status("Ready.");
    }
  }

  async function loadBranches() {
    const ddl = $("branch");
    if (!ddl) return hardError("UI missing branch dropdown.");

    const { data, error } = await client
      .from("branches")
      .select("country_code, branch_code")
      .order("country_code", { ascending: true })
      .order("branch_code", { ascending: true });

    if (error) return hardError("Branches blocked", error);

    ddl.innerHTML = "";

    (data || []).forEach(b => {
      const country = String(b.country_code || "").trim().toUpperCase();
      const branch = String(b.branch_code || "").trim().toUpperCase();

      const opt = document.createElement("option");
      opt.value = branch;
      opt.dataset.country = country;
      opt.textContent = `${country} - ${branch}`;
      ddl.appendChild(opt);
    });
  }

  async function loadDefaultBranchFromProfile() {
    if (!user) return;

    const { data, error } = await client
      .from("users")
      .select("branch_code")
      .eq("id", user.id)
      .single();

    if (error) {
      console.warn("Default branch profile not loaded:", error);
      return;
    }

    const ddl = $("branch");
    if (!ddl || !data?.branch_code) return;

    const saved = String(data.branch_code).toUpperCase().trim();
    ddl.value = saved.length > 3 ? saved.slice(-3) : saved;
  }

  function getBranchContext() {
    const ddl = $("branch");
    const opt = ddl?.options?.[ddl.selectedIndex];

    return {
      branch_key: (ddl?.value || "").trim().toUpperCase(),
      country_code: (opt?.dataset?.country || "SG").trim().toUpperCase()
    };
  }

  async function loadJobs() {
    const tbody = $("jobsTableBody");
    if (!tbody) return hardError("UI missing jobsTableBody.");

    status("Loading jobs...");

    const { data, error } = await client
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return hardError("Jobs blocked", error);

    tbody.innerHTML = "";

    (data || []).forEach(job => {
      const jid = job.job_id;
      if (!jid) return;

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${escapeHtml(job.job_no ?? "")}</td>
        <td>${escapeHtml(job.country_code ?? job.origin_country ?? "")}</td>
        <td>${escapeHtml(job.branch_code ?? job.branch_key ?? "")}</td>
        <td>${escapeHtml(job.transport_mode ?? "")}</td>
        <td>${escapeHtml(job.job_type ?? "")}</td>
        <td>${escapeHtml(job.customer_name ?? "")}</td>
      `;

      tr.addEventListener("click", async (e) => {
        e.preventDefault();

        await runLocked("selectJob", async () => {
          currentJobId = jid;
          setCurrentJob(job.job_no ?? "");

          if ($("savedInvoiceBox")) {
            $("savedInvoiceBox").classList.add("hidden");
            $("savedInvoiceBox").textContent = "";
          }

          if ($("loadedInvoiceBox")) {
            $("loadedInvoiceBox").classList.add("hidden");
            $("loadedInvoiceBox").textContent = "";
          }

          if ($("savedInvoiceLinesBody")) {
            $("savedInvoiceLinesBody").innerHTML = "";
          }

          selectedInvoice = null;
          selectedInvoiceLines = [];
          resetInvoiceDocument();
          setWorkflowButtons();

          await loadJobDetails(jid);
          await loadCharges();
          await loadSavedInvoices();
        });
      });

      tbody.appendChild(tr);
    });

    status(`Jobs loaded (${(data || []).length}).`);
  }

  async function createJob() {
    if (!user) return hardError("Not logged in.");

    const ctx = getBranchContext();

    const transportMode = ($("transport_mode")?.value || "").trim();
    const jobType = ($("job_type")?.value || "").trim();
    const customerName = ($("customer")?.value || "").trim();

    const originInput = ($("country")?.value || "").trim().toUpperCase();
    const originCountry = originInput ? originInput.slice(0, 2) : ctx.country_code;

    const destinationCountry = "SG";
    const incoterm = "FOB";

    status(`Creating job... branch=${ctx.branch_key}, origin=${originCountry}`);

    const { error } = await client.rpc("create_job", {
      p_branch_key: ctx.branch_key,
      p_transport_mode: transportMode,
      p_job_type: jobType,
      p_customer_name: customerName,
      p_origin_country: originCountry,
      p_destination_country: destinationCountry,
      p_incoterm: incoterm
    });

    if (error) return hardError("Create job failed", error);

    status("✅ Job created. Refreshing jobs...");
    await loadJobs();
  }

  async function loadJobDetails(jobId) {
    const { data, error } = await client
      .from("jobs")
      .select("*")
      .eq("job_id", jobId)
      .single();

    if (error) return hardError("Load job details failed", error);

    currentJobData = data || {};

    if ($("pol")) $("pol").value = data.pol || "";
    if ($("pod")) $("pod").value = data.pod || "";
    if ($("shipper_name")) $("shipper_name").value = data.shipper_name || "";
    if ($("consignee_name")) $("consignee_name").value = data.consignee_name || "";
    if ($("incoterm")) $("incoterm").value = data.incoterm || "";
    if ($("origin_country")) $("origin_country").value = data.origin_country || "";
    if ($("destination_country")) $("destination_country").value = data.destination_country || "";

    updateInvoicePreview();
  }

  async function saveJobDetails() {
    if (!currentJobId) return hardError("No job selected.");

    const payload = {
      pol: ($("pol")?.value || "").trim(),
      pod: ($("pod")?.value || "").trim(),
      shipper_name: ($("shipper_name")?.value || "").trim(),
      consignee_name: ($("consignee_name")?.value || "").trim(),
      incoterm: ($("incoterm")?.value || "").trim().toUpperCase(),
      origin_country: ($("origin_country")?.value || "").trim().toUpperCase(),
      destination_country: ($("destination_country")?.value || "").trim().toUpperCase()
    };

    status("Saving job details...");

    const { error } = await client
      .from("jobs")
      .update(payload)
      .eq("job_id", currentJobId);

    if (error) return hardError("Update failed", error);

    showOk("Job updated");
    await loadJobDetails(currentJobId);
    updateInvoicePreview();
  }

  function computeAmountLive() {
    const qty = num($("qty")?.value) ?? 1;
    const rate = num($("rate")?.value);

    if (rate !== null) {
      const amt = qty * rate;
      if ($("amount")) $("amount").value = amt.toFixed(2);
    }
  }

  async function loadCharges() {
    const tbody = $("chargesTableBody");
    if (!tbody) return;

    if (!currentJobId) {
      tbody.innerHTML = "";
      currentCharges = [];
      resetProfitSummary();
      resetInvoicePreview();
      return;
    }

    status("Loading charges...");

    const { data, error } = await client
      .from("charges")
      .select("charge_code, description, qty, uom, rate, amount, currency, type, created_at")
      .eq("job_id", currentJobId)
      .order("created_at", { ascending: false });

    if (error) return hardError("Charges load failed", error);

    currentCharges = data || [];
    tbody.innerHTML = "";

    currentCharges.forEach(c => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${escapeHtml(c.charge_code ?? "")}</td>
        <td>${escapeHtml(c.description ?? "")}</td>
        <td>${escapeHtml(c.qty ?? "")}</td>
        <td>${escapeHtml(c.uom ?? "")}</td>
        <td>${escapeHtml(c.rate ?? "")}</td>
        <td>${money(c.amount || 0)}</td>
        <td>${escapeHtml(c.currency ?? "")}</td>
        <td>${escapeHtml(c.type ?? "")}</td>
      `;

      tbody.appendChild(tr);
    });

    updateProfitSummary(currentCharges);
    updateInvoicePreview();
    status(`Charges loaded (${currentCharges.length}).`);
  }

  function clearChargeInputsAfterAdd() {
    if ($("charge_code")) $("charge_code").value = "";
    if ($("description")) $("description").value = "";
    if ($("rate")) $("rate").value = "";
    if ($("amount")) $("amount").value = "";
    if ($("qty")) $("qty").value = "1";
    if ($("uom")) $("uom").value = "EA";
  }

  async function addCharge() {
    if (!currentJobId) return hardError("Select a job row first.");

    const charge_code = ($("charge_code")?.value || "").trim().toUpperCase();
    const currency = ($("currency")?.value || "").trim().toUpperCase();
    const type = ($("charge_type")?.value || "").trim().toUpperCase();
    const description = ($("description")?.value || "").trim();

    const qtyRaw = num($("qty")?.value);
    const qty = qtyRaw !== null && qtyRaw > 0 ? qtyRaw : 1;

    const rate = num($("rate")?.value);
    const amountInput = num($("amount")?.value);

    if (!charge_code || !currency || !type) {
      return hardError("Charge fields missing. Charge Code, Currency and Type are required.");
    }

    let finalRate = rate;
    let finalAmount = amountInput;

    if (finalRate !== null) {
      finalAmount = qty * finalRate;
    } else {
      if (finalAmount === null) return hardError("Amount required when Rate is blank.");
      finalRate = finalAmount / qty;
    }

    const uom = (($("uom")?.value || "EA").trim().toUpperCase()) || "EA";

    status("Adding charge...");

    const { error } = await client.from("charges").insert([{
      job_id: currentJobId,
      charge_code,
      description,
      qty,
      uom,
      rate: finalRate,
      amount: finalAmount,
      currency,
      type
    }]);

    if (error) return hardError("Add charge failed", error);

    clearChargeInputsAfterAdd();

    status("✅ Charge added. Refreshing charges...");
    await loadCharges();
  }

  function bindHard(id, fn, lockKey) {
    const el = $(id);
    if (!el || !el.parentNode) return;

    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);

    clone.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      clone.disabled = true;

      await runLocked(lockKey || id, async () => {
        await fn();
      });

      clone.disabled = false;
    });
  }

  function wire() {
    bindHard("btnLogin", signIn, "login");
    bindHard("btnLogout", signOut, "logout");
    bindHard("btnCreateJob", createJob, "createJob");
    bindHard("btnRefreshJobs", loadJobs, "refreshJobs");
    bindHard("btnAddCharge", addCharge, "addCharge");
    bindHard("btnRefreshCharges", loadCharges, "refreshCharges");
    bindHard("btnSaveJob", saveJobDetails, "saveJob");
    bindHard("btnSaveInvoiceDraft", saveInvoiceDraft, "saveInvoiceDraft");
    bindHard("btnRefreshInvoices", loadSavedInvoices, "refreshInvoices");
    bindHard("btnPostInvoice", postSelectedInvoice, "postInvoice");
    bindHard("btnVoidInvoice", voidSelectedInvoice, "voidInvoice");
    bindHard("btnBuildInvoiceDoc", buildInvoiceDocumentPreview, "buildInvoiceDoc");
    bindHard("btnPrintInvoiceDoc", printInvoiceDocument, "printInvoiceDoc");

    ["qty", "rate"].forEach(id => {
      const el = $(id);
      if (el) {
        el.addEventListener("input", computeAmountLive);
        el.addEventListener("change", computeAmountLive);
      }
    });

    ["pol", "pod", "shipper_name", "consignee_name", "incoterm", "origin_country", "destination_country"].forEach(id => {
      const el = $(id);
      if (el) {
        el.addEventListener("input", () => {
          if (!currentJobData) currentJobData = {};
          currentJobData[id] = el.value;
          updateInvoicePreview();
        });
      }
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    ensureOpsStatus();
    resetProfitSummary();
    resetInvoicePreview();
    resetSavedInvoices();

    await initSupabase();

    if (!client) return;

    wire();
    await restoreSession();
  });
})();
