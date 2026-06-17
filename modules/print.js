import { escapeHtml, fmtMoney, sellAmount, getInvoiceCharges } from './utils.js';

function line(text) {
  return text ? `<div class="meta-line">${text}</div>` : '';
}

export function buildPrintHtml(job, companyProfile) {
  const inv = job.invoices?.[0];
  if (!inv) return '';

  const invoiceCharges = getInvoiceCharges(job);
  const companyAddress = [
    companyProfile.address1,
    companyProfile.address2,
    companyProfile.country,
    companyProfile.regNo ? `UEN / GST Reg No: ${companyProfile.regNo}` : ''
  ].filter(Boolean).join('<br>');

  const billTo = job.billToParty || job.customer || '';

  const jobDetails = [
    job.jobNo ? `Job No: ${escapeHtml(job.jobNo)}` : '',
    (job.pol || job.pod) ? `POL / POD: ${escapeHtml(job.pol || '')}${job.pol || job.pod ? ' → ' : ''}${escapeHtml(job.pod || '')}` : '',
    job.incoterm ? `Incoterm: ${escapeHtml(job.incoterm)}` : '',
    (job.originCountry || job.destinationCountry) ? `Origin / Destination: ${escapeHtml(job.originCountry || '')}${job.originCountry || job.destinationCountry ? ' → ' : ''}${escapeHtml(job.destinationCountry || '')}` : ''
  ].filter(Boolean).join('<br>');

  const rows = invoiceCharges.map((c, idx) => {
    const rate = Number(c.sellRate || 0);
    const amount = sellAmount(c);
    return `
      <tr>
        <td class="center">${idx + 1}</td>
        <td>${escapeHtml(c.code || '')}</td>
        <td>${escapeHtml(c.description || '')}</td>
        <td class="center">${escapeHtml(c.qty || 0)}</td>
        <td class="center">${escapeHtml(c.uom || 'EA')}</td>
        <td class="right">${fmtMoney(rate)}</td>
        <td class="right strong">${fmtMoney(amount)}</td>
        <td class="center">${escapeHtml((c.currency || job.currency || 'USD').toUpperCase())}</td>
      </tr>`;
  }).join('');

  const logoHtml = companyProfile.logoUrl
    ? `<div class="logo"><img src="${escapeHtml(companyProfile.logoUrl)}" alt="Company Logo"></div>`
    : '';

  const paymentTerms = companyProfile.paymentTerms || '';
  const bankDetails = companyProfile.bankDetails || '';
  const footerNote = companyProfile.footerNote || 'This is a system-generated invoice preview from Freight App MVP.';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(inv.invoiceNo)}</title>
  <style>
    @page { size: A4 portrait; margin: 16mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 12px; background: #fff; }
    .page { width: 100%; }
    .doc-top { display:flex; justify-content:space-between; align-items:flex-start; font-size:10px; color:#667085; margin-bottom: 14px; }
    .header { display:grid; grid-template-columns: 1.05fr .95fr; gap: 28px; align-items:start; margin-bottom: 18px; }
    .company-wrap { display:grid; grid-template-columns: 90px 1fr; gap: 14px; align-items:start; }
    .logo { width: 90px; height: 66px; display:flex; align-items:center; justify-content:center; }
    .logo img { max-width:100%; max-height:100%; object-fit:contain; }
    .company-name { font-size: 28px; line-height: 1.02; font-weight: 800; text-transform: uppercase; letter-spacing: .01em; margin: 0 0 10px 0; }
    .company-meta { font-size: 12px; line-height: 1.55; color: #374151; }
    .invoice-head { text-align:right; }
    .invoice-title { font-size: 34px; font-weight: 900; letter-spacing: .02em; margin: 0 0 14px 0; }
    .meta-line { margin: 3px 0; font-size: 13px; color:#374151; }
    .meta-line strong { color:#111827; }
    .panels { display:grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
    .panel { border:1px solid #d0d5dd; border-radius: 8px; padding: 12px 14px; min-height: 94px; }
    .panel-title { font-size: 13px; font-weight: 800; margin-bottom: 10px; text-transform: uppercase; letter-spacing: .03em; }
    .panel-body { font-size: 12px; line-height: 1.65; color:#111827; }
    table { width:100%; border-collapse: collapse; margin-top: 8px; }
    thead th { background:#f8fafc; border:1px solid #d0d5dd; padding: 8px 7px; text-transform: uppercase; letter-spacing: .03em; font-size: 10px; text-align:left; }
    tbody td { border:1px solid #d0d5dd; padding: 9px 7px; font-size: 12px; }
    .center { text-align:center; }
    .right { text-align:right; }
    .strong { font-weight:700; }
    .totals { margin-top: 20px; display:flex; justify-content:flex-end; }
    .total-box { min-width: 280px; text-align:right; }
    .total-label { font-size: 18px; font-weight: 800; margin-bottom: 6px; }
    .total-value { font-size: 42px; font-weight: 900; letter-spacing: .01em; }
    .footer { margin-top: 22px; border-top:1px solid #d0d5dd; padding-top: 12px; }
    .footer-note { font-size: 11px; line-height:1.6; color:#475467; margin-bottom: 16px; }
    .footer-block { margin-top: 12px; }
    .footer-heading { font-size: 12px; font-weight: 800; margin-bottom: 4px; }
    .footer-text { font-size: 11px; color:#374151; white-space: pre-line; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="page">
    <div class="doc-top">
      <div>${escapeHtml(inv.date || '')}</div>
      <div>${escapeHtml(inv.invoiceNo || '')}</div>
    </div>

    <div class="header">
      <div class="company-wrap">
        ${logoHtml}
        <div>
          <div class="company-name">${escapeHtml(companyProfile.companyName || '')}</div>
          <div class="company-meta">${companyAddress}</div>
        </div>
      </div>

      <div class="invoice-head">
        <div class="invoice-title">TAX INVOICE</div>
        ${line(`<strong>Invoice No:</strong> ${escapeHtml(inv.invoiceNo || '')}`)}
        ${line(`<strong>Status:</strong> ${escapeHtml(inv.status || '')}`)}
        ${line(`<strong>Date:</strong> ${escapeHtml(inv.date || '')}`)}
      </div>
    </div>

    <div class="panels">
      <div class="panel">
        <div class="panel-title">Bill To</div>
        <div class="panel-body">${escapeHtml(billTo)}</div>
      </div>
      <div class="panel">
        <div class="panel-title">Job Details</div>
        <div class="panel-body">${jobDetails}</div>
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
        ${rows}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-box">
        <div class="total-label">Total Payable:</div>
        <div class="total-value">${escapeHtml(inv.currency || job.currency || 'USD')} ${fmtMoney(inv.total || 0)}</div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-note">${escapeHtml(footerNote)}</div>
      ${paymentTerms ? `<div class="footer-block"><div class="footer-heading">Payment Terms</div><div class="footer-text">${escapeHtml(paymentTerms)}</div></div>` : ''}
      ${bankDetails ? `<div class="footer-block"><div class="footer-heading">Bank Details</div><div class="footer-text">${escapeHtml(bankDetails)}</div></div>` : ''}
    </div>
  </div>
</body>
</html>`;
}

export function printInvoice(job, companyProfile) {
  const html = buildPrintHtml(job, companyProfile);
  if (!html) return false;
  const printWindow = window.open('', '_blank', 'width=1100,height=900');
  if (!printWindow) {
    alert('Pop-up blocked. Please allow pop-ups for this site and try again.');
    return false;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = function () {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 350);
  };
  return true;
}
