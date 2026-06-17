import { byId } from './utils.js';

export function fillJobForm(job) {
  byId('jobNo').value = job.jobNo || '';
  byId('customer').value = job.customer || '';
  byId('shipper').value = job.shipper || '';
  byId('consignee').value = job.consignee || '';
  byId('mode').value = job.mode || '';
  byId('eta').value = job.eta || '';
  byId('etd').value = job.etd || '';
  byId('incoterm').value = job.incoterm || '';
  byId('pol').value = job.pol || '';
  byId('pod').value = job.pod || '';
  byId('originCountry').value = job.originCountry || '';
  byId('destinationCountry').value = job.destinationCountry || '';
  byId('currency').value = job.currency || 'USD';
  byId('defaultFxRate').value = job.defaultFxRate || 1;
}

export function readJobFormInto(job) {
  job.customer = byId('customer').value.trim();
  job.shipper = byId('shipper').value.trim();
  job.consignee = byId('consignee').value.trim();
  job.mode = byId('mode').value.trim();
  job.eta = byId('eta').value;
  job.etd = byId('etd').value;
  job.incoterm = byId('incoterm').value.trim();
  job.pol = byId('pol').value.trim();
  job.pod = byId('pod').value.trim();
  job.originCountry = byId('originCountry').value.trim();
  job.destinationCountry = byId('destinationCountry').value.trim();
  job.currency = (byId('currency').value.trim() || 'USD').toUpperCase();
  job.defaultFxRate = Number(byId('defaultFxRate').value) || 1;
  job.charges = job.charges.map(c => ({
    ...c,
    currency: (c.currency || job.currency).toUpperCase(),
    fxRate: Number(c.fxRate || job.defaultFxRate || 1) || 1
  }));
}

export function refreshJobList(jobs, currentIndex) {
  const list = byId('jobList');
  list.innerHTML = '';
  jobs.forEach((job, index) => {
    const opt = document.createElement('option');
    opt.value = index;
    opt.textContent = `${job.jobNo}${job.customer ? ' · ' + job.customer : ''}`;
    list.appendChild(opt);
  });
  list.value = String(currentIndex);
}
