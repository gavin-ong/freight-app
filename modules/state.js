export const JOB_STORAGE_KEY = 'freight_modular_jobs_v1';
export const COMPANY_STORAGE_KEY = 'freight_modular_company_v1';
export const SESSION_KEY = 'freight_modular_session_active';

export function defaultCompanyProfile() {
  return {
    companyName: 'YOUR COMPANY NAME PTE LTD',
    address1: 'Company address line 1',
    address2: '',
    country: 'Singapore',
    regNo: 'TBD',
    logoUrl: '',
    paymentTerms: 'Strictly Due Upon Receipt',
    bankDetails: '',
    footerNote: 'This is a system-generated invoice preview from Freight App MVP. Payment terms, bank details, GST rules, and final company template will be configured in later steps.'
  };
}

export function defaultCharge(jobCurrency = 'USD', defaultFxRate = 1) {
  return {
    code: '',
    description: '',
    chargeType: 'revenue',
    currency: (jobCurrency || 'USD').toUpperCase(),
    fxRate: Number(defaultFxRate || 1) || 1,
    qty: 1,
    uom: 'EA',
    unitPrice: 0
  };
}

export function generateJobNo(seq) {
  return `SGSIN-${String(seq).padStart(6, '0')}`;
}

export function defaultJob(seqNo = 1) {
  return {
    id: `job-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    jobNo: generateJobNo(seqNo),
    customer: '',
    shipper: '',
    consignee: '',
    mode: '',
    eta: '',
    etd: '',
    incoterm: '',
    pol: '',
    pod: '',
    originCountry: '',
    destinationCountry: '',
    currency: 'USD',
    defaultFxRate: 1,
    charges: [defaultCharge('USD', 1)],
    invoices: []
  };
}

export function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function normaliseJob(job, index = 0) {
  const currency = (job.currency || 'USD').toUpperCase();
  const defaultFxRate = safeNumber(job.defaultFxRate, 1) || 1;
  return {
    ...defaultJob(index + 1),
    ...job,
    id: job.id || `job-${Date.now()}-${index}`,
    jobNo: job.jobNo || generateJobNo(index + 1),
    currency,
    defaultFxRate,
    charges: Array.isArray(job.charges) && job.charges.length
      ? job.charges.map(c => ({
          ...defaultCharge(currency, defaultFxRate),
          ...c,
          currency: (c.currency || currency).toUpperCase(),
          fxRate: safeNumber(c.fxRate, defaultFxRate) || 1,
          qty: safeNumber(c.qty, 1),
          unitPrice: safeNumber(c.unitPrice, 0)
        }))
      : [defaultCharge(currency, defaultFxRate)],
    invoices: Array.isArray(job.invoices)
      ? job.invoices.map(inv => ({
          id: inv.id || `inv-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
          invoiceNo: inv.invoiceNo || '',
          status: inv.status || 'DRAFT',
          total: safeNumber(inv.total, 0),
          currency: (inv.currency || currency).toUpperCase(),
          date: inv.date || ''
        }))
      : []
  };
}

export function loadJobs() {
  const raw = localStorage.getItem(JOB_STORAGE_KEY) || localStorage.getItem('freight_mvp_jobs_v4j') || localStorage.getItem('jobs');
  if (!raw) return [defaultJob(1)];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed.map(normaliseJob) : [defaultJob(1)];
  } catch {
    return [defaultJob(1)];
  }
}

export function saveJobs(jobs) {
  localStorage.setItem(JOB_STORAGE_KEY, JSON.stringify(jobs));
}

export function loadCompanyProfile() {
  const raw = localStorage.getItem(COMPANY_STORAGE_KEY) || localStorage.getItem('freight_mvp_company_profile_v4j');
  if (!raw) return defaultCompanyProfile();
  try {
    return { ...defaultCompanyProfile(), ...JSON.parse(raw) };
  } catch {
    return defaultCompanyProfile();
  }
}

export function saveCompanyProfile(profile) {
  localStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify(profile));
}
