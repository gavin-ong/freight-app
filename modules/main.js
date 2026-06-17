import { defaultJob, loadJobs, saveJobs, loadCompanyProfile, saveCompanyProfile, SESSION_KEY } from './state.js';
import { byId } from './utils.js';
import { fillCompanyForm, readCompanyForm, renderCompanyPreview, bindCompanyLivePreview } from './company.js';
import { fillJobForm, readJobFormInto, refreshJobList } from './job.js';
import { renderCharges, addChargeToJob, updateJobCharge, removeJobCharge, renderSummary } from './charges.js';
import { generateInvoiceForJob, setInvoiceStatus, renderInvoices } from './invoice.js';
import { printInvoice } from './print.js';

let jobs = loadJobs();
let companyProfile = loadCompanyProfile();
let currentIndex = 0;

function currentJob() { return jobs[currentIndex]; }
function persistJobs() { saveJobs(jobs); }

function applySessionState() {
  const active = sessionStorage.getItem(SESSION_KEY) === 'true';
  byId('sessionOverlay').style.display = active ? 'none' : 'flex';
}
function resumeApp() { sessionStorage.setItem(SESSION_KEY, 'true'); applySessionState(); }
function logoutApp() { sessionStorage.setItem(SESSION_KEY, 'false'); applySessionState(); }

function syncUI() {
  refreshJobList(jobs, currentIndex);
  fillJobForm(currentJob());
  renderCharges(currentJob(), (idx, field, value) => {
    updateJobCharge(currentJob(), idx, field, value);
    persistJobs();
    syncUI();
  }, idx => {
    removeJobCharge(currentJob(), idx);
    persistJobs();
    syncUI();
  });
  renderSummary(currentJob());
  renderInvoices(currentJob());
}

function createJob() {
  jobs.push(defaultJob(jobs.length + 1));
  currentIndex = jobs.length - 1;
  persistJobs();
  syncUI();
}

function loadSelectedJob() {
  currentIndex = Number(byId('jobList').value || 0);
  syncUI();
}

function saveJob() {
  readJobFormInto(currentJob());
  persistJobs();
  syncUI();
  alert('Job saved.');
}

function resetJob() {
  fillJobForm(currentJob());
}

function addCharge() {
  readJobFormInto(currentJob());
  addChargeToJob(currentJob());
  persistJobs();
  syncUI();
}

function saveCompany() {
  companyProfile = readCompanyForm();
  saveCompanyProfile(companyProfile);
  renderCompanyPreview(companyProfile);
  alert('Company profile saved.');
}

function resetCompany() {
  companyProfile = loadCompanyProfile();
  fillCompanyForm(companyProfile);
  renderCompanyPreview(companyProfile);
}

function generateInvoice() {
  readJobFormInto(currentJob());
  generateInvoiceForJob(currentJob());
  persistJobs();
  syncUI();
}

function postInvoice() {
  if (!setInvoiceStatus(currentJob(), 'POSTED')) return alert('Generate invoice first.');
  persistJobs();
  syncUI();
}

function voidInvoice() {
  if (!setInvoiceStatus(currentJob(), 'VOID')) return alert('Generate invoice first.');
  persistJobs();
  syncUI();
}

function bindEvents() {
  byId('btnCreateJob').addEventListener('click', createJob);
  byId('jobList').addEventListener('change', loadSelectedJob);
  byId('btnSaveJob').addEventListener('click', saveJob);
  byId('btnResetJob').addEventListener('click', resetJob);
  byId('btnAddCharge').addEventListener('click', addCharge);
  byId('btnGenerateInvoice').addEventListener('click', generateInvoice);
  byId('btnPostInvoice').addEventListener('click', postInvoice);
  byId('btnVoidInvoice').addEventListener('click', voidInvoice);
  byId('btnPrintInvoice').addEventListener('click', () => printInvoice(currentJob(), companyProfile));
  byId('btnSaveCompany').addEventListener('click', saveCompany);
  byId('btnResetCompany').addEventListener('click', resetCompany);
  byId('btnLogout').addEventListener('click', logoutApp);
  byId('btnResumeApp').addEventListener('click', resumeApp);
  bindCompanyLivePreview(() => renderCompanyPreview(readCompanyForm()));
}

function init() {
  if (!jobs.length) jobs = [defaultJob(1)];
  if (!sessionStorage.getItem(SESSION_KEY)) sessionStorage.setItem(SESSION_KEY, 'true');
  fillCompanyForm(companyProfile);
  renderCompanyPreview(companyProfile);
  bindEvents();
  syncUI();
  applySessionState();
}

window.addEventListener('load', init);
