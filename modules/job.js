import { byId } from './utils.js';

export function fillJobForm(job) {
  byId('jobNo').value = job.jobNo || '';
  byId('billToParty').value = job.billToParty || job.customer || '';
  byId('payToParty').value = job.payToParty || '';
  byId('shipper').value = job.shipper || '';
  byId('consignee').value = job.consignee || '';
  byId('notifyParty').value = job.notifyParty || '';
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
  byId('goodsDescription').value = job.goodsDescription || '';
  byId('marksNumbers').value = job.marksNumbers || '';
  byId('hsCode').value = job.hsCode || '';
  byId('containerQty').value = job.containerQty || 0;
  byId('containerType').value = job.containerType || '';
  byId('netWeightKgs').value = job.netWeightKgs || 0;
  byId('grossWeightKgs').value = job.grossWeightKgs || 0;
  byId('cbmM3').value = job.cbmM3 || 0;
}

export function readJobFormInto(job) {
  job.billToParty = byId('billToParty').value.trim();
  job.customer = job.billToParty;
  job.payToParty = byId('payToParty').value.trim();
  job.shipper = byId('shipper').value.trim();
  job.consignee = byId('consignee').value.trim();
  job.notifyParty = byId('notifyParty').value.trim();
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
  job.goodsDescription = byId('goodsDescription').value.trim();
  job.marksNumbers = byId('marksNumbers').value.trim();
  job.hsCode = byId('hsCode').value.trim();
  job.containerQty = Number(byId('containerQty').value) || 0;
  job.containerType = byId('containerType').value.trim();
  job.netWeightKgs = Number(byId('netWeightKgs').value) || 0;
  job.grossWeightKgs = Number(byId('grossWeightKgs').value) || 0;
  job.cbmM3 = Number(byId('cbmM3').value) || 0;
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
    const billTo = job.billToParty || job.customer || '';
    opt.textContent = `${job.jobNo}${billTo ? ' · ' + billTo : ''}`;
    list.appendChild(opt);
  });
  list.value = String(currentIndex);
}
