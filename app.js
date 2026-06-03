(function () {
  const SUPABASE_URL = "https://quzputmmabgcfmegarvd.supabase.co";
  const SUPABASE_KEY = "sb_publishable_UG9E0FbUzetadkz8TQN2fg_pIWx3LTO";
  const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  const BUILD = "BUILD: FREIGHT-STEP4C-INVOICE-LIST2-FIX (JS)";

  let client = null;
  let user = null;
  let currentJobId = null;
  let currentJobNo = null;
  let currentJobData = null;
  let currentCharges = [];
  let currentSavedInvoices = [];

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
      $("invoiceNote").textContent = "Invoice draft includes SELL charges only. Saving creates invoice header and invoice lines.";
    }
  }

  function resetSavedInvoices() {
    currentSavedInvoices = [];

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
        <td>${c.charge_code ?? ""}</td>
        <td>${c.description ?? ""}</td>
        <td>${c.qty ?? ""}</td>
        <td>${c.rate ?? ""}</td>
        <td>${money(amount)}</td>
        <td>${currency}</td>
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
          <td>${inv.invoice_no ?? ""}</td>
          <td>${inv.invoice_status ?? ""}</td>
          <td>${money(inv.total_amount || 0)}</td>
          <td>${shortDate(inv.created_at)}</td>
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
        .select("invoice_id, invoice_no, invoice_status, total_amount, currency_summary, created_at, job_id, job_no")
        .eq("job_id", currentJobId)
        .order("created_at", { ascending: false });

      data = res.data || [];
      error = res.error;
    }

    if (error) return hardError("Saved invoices load failed", error);

    /*
      Fallback:
      If job_id query returns nothing, also try job_no.
      This protects us from earlier test invoices saved during schema-reset/debug phases
      or any mismatch between job_id and displayed job_no.
    */
    if ((!data || !data.length) && currentJobNo) {
      const res2 = await client
        .from("invoices")
        .select("invoice_id, invoice_no, invoice_status, total_amount, currency_summary, created_at, job_id, job_no")
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

    status(`Loading invoice ${inv.invoice_no}...`);

    const { data, error } = await client
      .from("invoice_lines")
      .select("charge_code, description, qty, uom, rate, amount, currency, source_type, created_at")
      .eq("invoice_id", inv.invoice_id)
      .order("created_at", { ascending: true });

    if (error) return hardError("Saved invoice lines load failed", error);

    const tbody = $("savedInvoiceLinesBody");
    if (tbody) tbody.innerHTML = "";

    (data || []).forEach(line => {
      if (!tbody) return;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${line.charge_code ?? ""}</td>
        <td>${line.description ?? ""}</td>
        <td>${line.qty ?? ""}</td>
        <td>${line.rate ?? ""}</td>
        <td>${money(line.amount || 0)}</td>
        <td>${line.currency ?? ""}</td>
      `;
      tbody.appendChild(tr);
    });

    const totalText = inv.currency_summary
      ? Object.entries(inv.currency_summary)
          .map(([cur, total]) => `${cur} ${money(total)}`)
          .join("\n")
      : money(inv.total_amount || 0);

    if ($("loadedInvoiceBox")) {
      $("loadedInvoiceBox").classList.remove("hidden");
      $("loadedInvoiceBox").textContent =
        `Loaded saved invoice\n` +
        `Invoice No: ${inv.invoice_no}\n` +
        `Status: ${inv.invoice_status}\n` +
        `Lines: ${(data || []).length}\n` +
        `Total:\n${totalText}`;
    }

    status(`Invoice ${inv.invoice_no} loaded.`);
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
        <td>${job.job_no ?? ""}</td>
        <td>${job.country_code ?? job.origin_country ?? ""}</td>
        <td>${job.branch_code ?? job.branch_key ?? ""}</td>
        <td>${job.transport_mode ?? ""}</td>
        <td>${job.job_type ?? ""}</td>
        <td>${job.customer_name ?? ""}</td>
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
        <td>${c.charge_code ?? ""}</td>
        <td>${c.description ?? ""}</td>
        <td>${c.qty ?? ""}</td>
        <td>${c.uom ?? ""}</td>
        <td>${c.rate ?? ""}</td>
        <td>${c.amount ?? ""}</td>
        <td>${c.currency ?? ""}</td>
        <td>${c.type ?? ""}</td>
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

  async function saveInvoiceDraft() {
    if (!currentJobId) return hardError("Select a job first.");

    /*
      Always reload before duplicate check.
      This prevents stale UI state from missing an existing draft.
    */
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
      .select("invoice_id, invoice_no, invoice_status, total_amount, currency_summary, created_at, job_id, job_no")
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

    /*
      Immediate local render so user sees the invoice even if network/cache delay happens.
      Then reload from database to confirm.
    */
    renderSavedInvoices([inv, ...(currentSavedInvoices || [])]);
    await loadSavedInvoices();

    showOk(`Invoice draft saved: ${inv.invoice_no}`);
  }

  async function afterLogin() {
    ensureOpsStatus();
    resetProfitSummary();
    resetInvoicePreview();
    resetSavedInvoices();
    status("Loading data...");

    await loadBranches();
    await loadDefaultBranchFromProfile();
    await loadJobs();

    status("✅ Logged in and data loaded.");
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
