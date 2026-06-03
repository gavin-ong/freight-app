(function () {
  const SUPABASE_URL = "https://quzputmmabgcfmegarvd.supabase.co";
  const SUPABASE_KEY = "sb_publishable_UG9E0FbUzetadkz8TQN2fg_pIWx3LTO";
  const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

  const BUILD = "BUILD: FREIGHT-STEP4H-UIFIX1 (JS)";

  let client = null;
  let user = null;

  let currentJobId = null;
  let currentJobNo = null;
  let currentJobData = null;

  let currentCharges = [];
  let currentSavedInvoices = [];

  let selectedInvoice = null;
  let selectedInvoiceLines = [];

  const actionLocks = {};

  let companyProfile = {
    company_name: "Freight App MVP PTE LTD",
    company_address: "128 Guoco Mid Town #14-01",
    company_uen: "UEN No: 20260603WED",
    payment_terms: "14 days from date of invoice",
    bank_details: "Please effect payment to our UEN no.",
    invoice_footer: "This is a system-generated invoice from Freight App MVP."
  };

  const $ = (id) => document.getElementById(id);

  function ensureOpsStatus() {
    const appCard = $("appCard");
    if (!appCard) return;

    const body = appCard.querySelector(".body");
    if (!body) return;

    if ($("opsStatus")) return;

    const div = document.createElement("div");

    div.id = "opsStatus";

    div.style.marginBottom = "16px";
    div.style.padding = "10px 14px";
    div.style.borderRadius = "12px";
    div.style.border = "1px solid rgba(255,255,255,.08)";
    div.style.background = "rgba(255,255,255,.05)";
    div.style.fontSize = "12px";
    div.style.fontWeight = "700";
    div.style.color = "#9fffb0";

    div.textContent = "Ready.";

    body.prepend(div);
  }

  function status(msg, isErr = false) {
    ensureOpsStatus();

    const ops = $("opsStatus");

    if (ops) {
      ops.textContent = msg;
      ops.style.color = isErr ? "#ff7b7b" : "#9fffb0";
    }

    const loginStatus = $("status");

    if (loginStatus) {
      loginStatus.textContent = msg;
      loginStatus.style.color = isErr ? "#ff7b7b" : "#e9f1ff";
    }

    console.log(msg);
  }

  function hardError(msg, errObj) {
    const detail =
      errObj?.message ||
      errObj?.details ||
      errObj?.hint ||
      "";

    const full = detail ? `${msg}: ${detail}` : msg;

    status("❌ " + full, true);

    console.error(errObj);

    alert("❌ " + full);
  }

  function showOk(msg) {
    status("✅ " + msg);
    alert("✅ " + msg);
  }

  function money(v) {
    const n = Number(v || 0);

    return n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function num(v) {
    const n = parseFloat(String(v || "").trim());
    return Number.isFinite(n) ? n : null;
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

  function showApp(loggedIn) {
    $("loginCard")?.classList.toggle("hidden", loggedIn);
    $("appCard")?.classList.toggle("hidden", !loggedIn);

    $("btnLogin")?.classList.toggle("hidden", loggedIn);
    $("btnLogout")?.classList.toggle("hidden", !loggedIn);
  }

  function setCurrentJob(jobNo) {
    currentJobNo = jobNo || null;

    const el = $("currentJobNo");

    if (el) {
      el.textContent = jobNo || "None";
    }
  }

  async function runLocked(lockKey, fn) {
    if (actionLocks[lockKey]) return;

    actionLocks[lockKey] = true;

    try {
      await fn();
    } finally {
      setTimeout(() => {
        actionLocks[lockKey] = false;
      }, 500);
    }
  }

  async function loadScript(src) {
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
      status("Loading Supabase JS...");

      if (!window.supabase?.createClient) {
        await loadScript(SUPABASE_CDN);
      }

      if (!window.supabase?.createClient) {
        return hardError("Supabase library failed to load.");
      }

      client = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );

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
    if (!client) {
      return hardError("Supabase not ready.");
    }

    const { email, password } = creds();

    if (!email || !password) {
      return hardError("Email/password required.");
    }

    status("Signing in...");

    const { data, error } =
      await client.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      return hardError("Login failed", error);
    }

    user = data?.user || null;

    if (!user) {
      return hardError("No session returned.");
    }

    showApp(true);

    await afterLogin();
  }

  async function signOut() {
    if (!client) return;

    const { error } = await client.auth.signOut();

    if (error) {
      return hardError("Logout failed", error);
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

    resetProfitSummary();
    resetInvoicePreview();
    resetSavedInvoices();

    showApp(false);

    status("Ready.");
  }

  async function restoreSession() {
    if (!client) return;

    const { data } = await client.auth.getSession();

    if (data?.session?.user) {
      user = data.session.user;

      showApp(true);

      await afterLogin();
    } else {
      showApp(false);
    }
  }

  async function afterLogin() {
    ensureOpsStatus();

    resetProfitSummary();
    resetInvoicePreview();
    resetSavedInvoices();

    ensureCompanyProfileEditor();

    status("Loading data...");

    await loadBranches();
    await loadJobs();

    status("✅ Logged in and data loaded.");
  }

  async function loadBranches() {
    const ddl = $("branch");

    if (!ddl) return;

    const { data, error } = await client
      .from("branches")
      .select("country_code, branch_code")
      .order("country_code")
      .order("branch_code");

    if (error) {
      return hardError("Branches blocked", error);
    }

    ddl.innerHTML = "";

    (data || []).forEach((b) => {
      const opt = document.createElement("option");

      opt.value = b.branch_code;

      opt.dataset.country = b.country_code;

      opt.textContent =
        `${b.country_code} - ${b.branch_code}`;

      ddl.appendChild(opt);
    });
  }

  function getBranchContext() {
    const ddl = $("branch");

    const opt =
      ddl?.options?.[ddl.selectedIndex];

    return {
      branch_key:
        (ddl?.value || "").trim().toUpperCase(),

      country_code:
        (opt?.dataset?.country || "SG")
          .trim()
          .toUpperCase()
    };
  }

  async function createJob() {
    if (!user) {
      return hardError("Not logged in.");
    }

    const ctx = getBranchContext();

    const transportMode =
      ($("transport_mode")?.value || "").trim();

    const jobType =
      ($("job_type")?.value || "").trim();

    const customerName =
      ($("customer")?.value || "").trim();

    const originInput =
      ($("country")?.value || "")
        .trim()
        .toUpperCase();

    const originCountry =
      originInput || ctx.country_code;

    status("Creating job...");

    const { error } = await client.rpc(
      "create_job",
      {
        p_branch_key: ctx.branch_key,
        p_transport_mode: transportMode,
        p_job_type: jobType,
        p_customer_name: customerName,
        p_origin_country: originCountry,
        p_destination_country: "SG",
        p_incoterm: "FOB"
      }
    );

    if (error) {
      return hardError("Create job failed", error);
    }

    await loadJobs();

    showOk("Job created");
  }

  async function loadJobs() {
    const tbody = $("jobsTableBody");

    if (!tbody) return;

    status("Loading jobs...");

    const { data, error } = await client
      .from("jobs")
      .select("*")
      .order("created_at", {
        ascending: false
      });

    if (error) {
      return hardError("Jobs blocked", error);
    }

    tbody.innerHTML = "";

    (data || []).forEach((job) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${escapeHtml(job.job_no || "")}</td>
        <td>${escapeHtml(job.country_code || "")}</td>
        <td>${escapeHtml(job.branch_code || "")}</td>
        <td>${escapeHtml(job.transport_mode || "")}</td>
        <td>${escapeHtml(job.job_type || "")}</td>
        <td>${escapeHtml(job.customer_name || "")}</td>
      `;

      tr.addEventListener("click", async () => {
        currentJobId = job.job_id;

        setCurrentJob(job.job_no);

        selectedInvoice = null;
        selectedInvoiceLines = [];

        await loadJobDetails(job.job_id);
        await loadCharges();
        await loadSavedInvoices();
      });

      tbody.appendChild(tr);
    });

    status(`Jobs loaded (${(data || []).length}).`);
  }

  async function loadJobDetails(jobId) {
    const { data, error } = await client
      .from("jobs")
      .select("*")
      .eq("job_id", jobId)
      .single();

    if (error) {
      return hardError(
        "Load job details failed",
        error
      );
    }

    currentJobData = data || {};

    if ($("pol")) $("pol").value = data.pol || "";
    if ($("pod")) $("pod").value = data.pod || "";

    if ($("shipper_name")) {
      $("shipper_name").value =
        data.shipper_name || "";
    }

    if ($("consignee_name")) {
      $("consignee_name").value =
        data.consignee_name || "";
    }

    if ($("incoterm")) {
      $("incoterm").value =
        data.incoterm || "";
    }

    if ($("origin_country")) {
      $("origin_country").value =
        data.origin_country || "";
    }

    if ($("destination_country")) {
      $("destination_country").value =
        data.destination_country || "";
    }

    updateInvoicePreview();
  }

  async function saveJobDetails() {
    if (!currentJobId) {
      return hardError("No job selected.");
    }

    const payload = {
      pol: ($("pol")?.value || "").trim(),
      pod: ($("pod")?.value || "").trim(),

      shipper_name:
        ($("shipper_name")?.value || "").trim(),

      consignee_name:
        ($("consignee_name")?.value || "").trim(),

      incoterm:
        ($("incoterm")?.value || "")
          .trim()
          .toUpperCase(),

      origin_country:
        ($("origin_country")?.value || "")
          .trim()
          .toUpperCase(),

      destination_country:
        ($("destination_country")?.value || "")
          .trim()
          .toUpperCase()
    };

    const { error } = await client
      .from("jobs")
      .update(payload)
      .eq("job_id", currentJobId);

    if (error) {
      return hardError("Update failed", error);
    }

    await loadJobDetails(currentJobId);

    showOk("Job updated");
  }

  function computeAmountLive() {
    const qty =
      num($("qty")?.value) ?? 1;

    const rate =
      num($("rate")?.value);

    if (rate !== null) {
      const amt = qty * rate;

      if ($("amount")) {
        $("amount").value =
          amt.toFixed(2);
      }
    }
  }

  async function addCharge() {
    if (!currentJobId) {
      return hardError("Select a job first.");
    }

    const charge_code =
      ($("charge_code")?.value || "")
        .trim()
        .toUpperCase();

    const currency =
      ($("currency")?.value || "")
        .trim()
        .toUpperCase();

    const type =
      ($("charge_type")?.value || "")
        .trim()
        .toUpperCase();

    const description =
      ($("description")?.value || "").trim();

    const qty =
      num($("qty")?.value) ?? 1;

    const rate =
      num($("rate")?.value);

    const amountInput =
      num($("amount")?.value);

    if (!charge_code || !currency || !type) {
      return hardError(
        "Charge Code, Currency and Type required."
      );
    }

    let finalRate = rate;
    let finalAmount = amountInput;

    if (finalRate !== null) {
      finalAmount = qty * finalRate;
    }

    if (finalAmount === null) {
      return hardError("Amount required.");
    }

    const { error } = await client
      .from("charges")
      .insert([{
        job_id: currentJobId,
        charge_code,
        description,
        qty,
        uom: ($("uom")?.value || "EA"),
        rate: finalRate,
        amount: finalAmount,
        currency,
        type
      }]);

    if (error) {
      return hardError("Add charge failed", error);
    }

    await loadCharges();

    showOk("Charge added");
  }

  async function loadCharges() {
    const tbody =
      $("chargesTableBody");

    if (!tbody) return;

    if (!currentJobId) {
      tbody.innerHTML = "";
      return;
    }

    const { data, error } = await client
      .from("charges")
      .select("*")
      .eq("job_id", currentJobId)
      .order("created_at", {
        ascending: false
      });

    if (error) {
      return hardError(
        "Charges load failed",
        error
      );
    }

    currentCharges = data || [];

    tbody.innerHTML = "";

    currentCharges.forEach((c) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${escapeHtml(c.charge_code || "")}</td>
        <td>${escapeHtml(c.description || "")}</td>
        <td>${escapeHtml(c.qty || "")}</td>
        <td>${escapeHtml(c.uom || "")}</td>
        <td>${escapeHtml(c.rate || "")}</td>
        <td>${money(c.amount || 0)}</td>
        <td>${escapeHtml(c.currency || "")}</td>
        <td>${escapeHtml(c.type || "")}</td>
      `;

      tbody.appendChild(tr);
    });

    updateProfitSummary(currentCharges);

    updateInvoicePreview();
  }

  function updateProfitSummary(charges) {
    let sell = 0;
    let buy = 0;

    (charges || []).forEach((c) => {
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

      $("sumProfit").className =
        gp > 0
          ? "metric-value profit-good"
          : gp < 0
          ? "metric-value profit-bad"
          : "metric-value profit-flat";
    }

    if ($("sumCount")) {
      $("sumCount").textContent =
        String((charges || []).length);
    }
  }

  function getSellLines() {
    return (currentCharges || []).filter(
      (c) =>
        String(c.type || "")
          .trim()
          .toUpperCase() === "SELL"
    );
  }

  function getTotalsByCurrency(lines) {
    const totals = {};

    (lines || []).forEach((c) => {
      const cur =
        String(c.currency || "")
          .trim()
          .toUpperCase() || "N/A";

      totals[cur] =
        (totals[cur] || 0) +
        Number(c.amount || 0);
    });

    return totals;
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

    sellLines.forEach((c) => {
      const tr =
        document.createElement("tr");

      tr.innerHTML = `
        <td>${escapeHtml(c.charge_code || "")}</td>
        <td>${escapeHtml(c.description || "")}</td>
        <td>${escapeHtml(c.qty || "")}</td>
        <td>${escapeHtml(c.rate || "")}</td>
        <td>${money(c.amount || 0)}</td>
        <td>${escapeHtml(c.currency || "")}</td>
      `;

      tbody?.appendChild(tr);
    });

    const totals =
      getTotalsByCurrency(sellLines);

    const totalText =
      Object.entries(totals)
        .map(([cur, total]) =>
          `${cur} ${money(total)}`
        )
        .join("\n") ||
      "No SELL charges selected.";

    if ($("invoiceTotalBox")) {
      $("invoiceTotalBox").textContent =
        totalText;
    }
  }

  async function loadSavedInvoices() {
    if (!currentJobId) {
      resetSavedInvoices();
      return;
    }

    const tbody =
      $("savedInvoicesBody");

    if (tbody) {
      tbody.innerHTML = "";
    }

    const { data, error } = await client
      .from("invoices")
      .select("*")
      .eq("job_id", currentJobId)
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

    currentSavedInvoices.forEach((inv) => {
      const tr =
        document.createElement("tr");

      tr.innerHTML = `
        <td>${escapeHtml(inv.invoice_no || "")}</td>
        <td>${escapeHtml(inv.invoice_status || "")}</td>
        <td>${money(inv.total_amount || 0)}</td>
        <td>${escapeHtml(shortDate(inv.created_at))}</td>
      `;

      tbody?.appendChild(tr);
    });
  }

  function resetInvoicePreview() {
    if ($("invoiceLinesBody")) {
      $("invoiceLinesBody").innerHTML = "";
    }

    if ($("invoiceTotalBox")) {
      $("invoiceTotalBox").textContent =
        "No SELL charges selected.";
    }
  }

  function resetSavedInvoices() {
    currentSavedInvoices = [];

    if ($("savedInvoicesBody")) {
      $("savedInvoicesBody").innerHTML = "";
    }

    if ($("savedInvoiceLinesBody")) {
      $("savedInvoiceLinesBody").innerHTML = "";
    }
  }

  function resetProfitSummary() {
    if ($("sumSell")) {
      $("sumSell").textContent = "0.00";
    }

    if ($("sumBuy")) {
      $("sumBuy").textContent = "0.00";
    }

    if ($("sumProfit")) {
      $("sumProfit").textContent = "0.00";
    }

    if ($("sumCount")) {
      $("sumCount").textContent = "0";
    }
  }

  function ensureCompanyProfileEditor() {
    if ($("companyProfilePanel")) return;

    const panel =
      document.querySelector("#appCard .panel");

    if (!panel) return;

    const section =
      document.createElement("div");

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
          <input id="profile_company_name"/>
        </div>

        <div>
          <label>UEN / GST Reg No</label>
          <input id="profile_company_uen"/>
        </div>
      </div>

      <label>Company Address</label>
      <textarea id="profile_company_address" rows="3"></textarea>

      <label>Payment Terms</label>
      <textarea id="profile_payment_terms" rows="3"></textarea>

      <label>Bank Details</label>
      <textarea id="profile_bank_details" rows="3"></textarea>

      <label>Invoice Footer</label>
      <textarea id="profile_invoice_footer" rows="3"></textarea>

      <div class="btnbar">
        <button id="btnSaveCompanyProfile" class="primary">
          Save Company Profile
        </button>
      </div>
    `;

    panel.appendChild(section);

    populateCompanyProfileEditor();
  }

  function populateCompanyProfileEditor() {
    if ($("profile_company_name")) {
      $("profile_company_name").value =
        companyProfile.company_name;
    }

    if ($("profile_company_address")) {
      $("profile_company_address").value =
        companyProfile.company_address;
    }

    if ($("profile_company_uen")) {
      $("profile_company_uen").value =
        companyProfile.company_uen;
    }

    if ($("profile_payment_terms")) {
      $("profile_payment_terms").value =
        companyProfile.payment_terms;
    }

    if ($("profile_bank_details")) {
      $("profile_bank_details").value =
        companyProfile.bank_details;
    }

    if ($("profile_invoice_footer")) {
      $("profile_invoice_footer").value =
        companyProfile.invoice_footer;
    }
  }

  function bindHard(id, fn, lockKey) {
    const el = $(id);

    if (!el || !el.parentNode) return;

    const clone =
      el.cloneNode(true);

    el.parentNode.replaceChild(clone, el);

    clone.addEventListener(
      "click",
      async (e) => {
        e.preventDefault();

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
    bindHard("btnLogin", signIn, "login");
    bindHard("btnLogout", signOut, "logout");

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
      "btnSaveJob",
      saveJobDetails,
      "saveJob"
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

    ["qty", "rate"].forEach((id) => {
      const el = $(id);

      if (!el) return;

      el.addEventListener(
        "input",
        computeAmountLive
      );

      el.addEventListener(
        "change",
        computeAmountLive
      );
    });
  }

  document.addEventListener(
    "DOMContentLoaded",
    async () => {
      console.log(BUILD);

      ensureOpsStatus();

      resetProfitSummary();
      resetInvoicePreview();
      resetSavedInvoices();

      await initSupabase();

      if (!client) return;

      wire();

      await restoreSession();
    }
  );
})();
