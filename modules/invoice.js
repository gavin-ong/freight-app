import { byId, escapeHtml, fmtMoney, nowForInvoice, invoiceNo, calcSummary } from './utils.js';

export function generateInvoiceForJob(job) {
  const s = calcSummary(job);
  job.invoices = [{
    id: `inv-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    invoiceNo: invoiceNo(),
    status: 'DRAFT',
    total: s.revenue,
    currency: job.currency,
    date: nowForInvoice()
  }];
}

export function setInvoiceStatus(job, status) {
  if (!job.invoices[0]) return false;
  job.invoices[0].status = status;
  return true;
}

export function renderInvoices(job) {
  const tbody = byId('invoiceBody');
  if (!job.invoices.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:#667085;">No invoice generated yet.</td></tr>';
    return;
  }
  tbody.innerHTML = job.invoices.map(inv => `
    <tr>
      <td><strong>${escapeHtml(inv.invoiceNo)}</strong></td>
      <td><span class="status-pill status-${escapeHtml(inv.status)}">${escapeHtml(inv.status)}</span></td>
      <td>${escapeHtml(inv.date)}</td>
      <td>${escapeHtml(inv.currency)}</td>
      <td class="num"><strong>${fmtMoney(inv.total)}</strong></td>
    </tr>
  `).join('');
}
