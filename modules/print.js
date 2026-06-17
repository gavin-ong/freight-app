import { escapeHtml, fmtMoney, calculatedChargeAmount, getInvoiceCharges } from './utils.js';

export function buildPrintHtml(job, companyProfile) {
  const inv = job.invoices[0];
  if (!inv) return '';
  const invoiceCharges = getInvoiceCharges(job);
  const addressLines = [companyProfile.address1, companyProfile.address2, companyProfile.country, `UEN / GST Reg No: ${companyProfile.regNo}`].filter(Boolean).join('<br>');
  const lineRows = invoiceCharges.map((c, idx) => `
    <tr>
      <td class="center">${idx + 1}</td>
      <td>${escapeHtml(c.code || '')}</td>
      <td>${escapeHtml(c.description || '')}</td>
      <td class="center">${escapeHtml(c.qty || 0)}</td>
      <td class="center">${escapeHtml(c.uom || 'EA')}</td>
      <td class="right">${fmtMoney(c.unitPrice || 0)}</td>
      <td class="right">${fmtMoney(calculatedChargeAmount(c))}</td>
      <td class="center">${escapeHtml((c.currency || job.currency).toUpperCase())}</td>
    </tr>`).join('');
  const logoHtml = companyProfile.logoUrl ? `<div class="logo"><img src="${escapeHtml(companyProfile.logoUrl)}" alt="Company Logo"></div>` : '';
  const footerExtra = [
    companyProfile.paymentTerms ? `<strong>Payment Terms:</strong> ${escapeHtml(companyProfile.paymentTerms)}` : '',
    companyProfile.bankDetails ? `<strong>Bank Details:</strong><br>${escapeHtml(companyProfile.bankDetails).replace(/\n/g, '<br>')}` : ''
  ].filter(Boolean).join('<br><br>');
  const goodsBlock = [
    job.goodsDescription ? `Goods Description: ${escapeHtml(job.goodsDescription)}` : '',
    job.marksNumbers ? `Marks & Numbers: ${escapeHtml(job.marksNumbers)}` : '',
    job.hsCode ? `HS Code: ${escapeHtml(job.hsCode)}` : '',
    job.containerQty ? `Container Qty: ${escapeHtml(job.containerQty)}` : '',
    job.containerType ? `Container Type: ${escapeHtml(job.containerType)}` : '',
    job.netWeightKgs ? `Net Weight (KGS): ${escapeHtml(job.netWeightKgs)}` : '',
    job.grossWeightKgs ? `Gross Weight (KGS): ${escapeHtml(job.grossWeightKgs)}` : '',
    job.cbmM3 ? `CBM (M3): ${escapeHtml(job.cbmM3)}` : ''
  ].filter(Boolean).join('\n');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${escapeHtml(inv.invoiceNo)}</title><style>
    @page { size: A4 portrait; margin: 16mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 12px; background: #fff; }
    .page { width: 100%; }
    .header { display: grid; grid-template-columns: 1.1fr .9fr; gap: 24px; margin-bottom: 18px; align-items: start; }
    .company-wrap { display: grid; grid-template-columns: 90px 1fr; gap: 14px; align-items: start; }
    .logo { width: 90px; height: 66px; display: flex; align-items: center; justify-content: center; }
    .logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .company h1 { margin: 0 0 8px 0; font-size: 24px; line-height: 1.05; letter-spacing: .02em; }
    .company .meta { color: #374151; line-height: 1.55; font-size: 12px; }
    .invoice-head { text-align: right; }
    .invoice-head .title { font-size: 36px; font-weight: 800; letter-spacing: .03em; margin: 0 0 8px 0; }
    .invoice-head .meta-line { margin: 3px 0; color: #374151; font-size: 12px; }
    .panels { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .panel { border: 1px solid #d0d5dd; border-radius: 6px; min-height: 86px; padding: 10px 12px; }
    .panel-title { font-size: 13px; font-weight: 700; margin-bottom: 8px; }
    .panel-body { line-height: 1.65; color: #111827; white-space: pre-line; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    thead th { background: #f3f4f6; font-size: 11px; text-transform: uppercase; letter-spacing: .03em; border: 1px solid #d0d5dd; padding: 8px 7px; }
    tbody td { border: 1px solid #d0d5dd; padding: 8px 7px; vertical-align: top; }
    .center { text-align: center; } .right { text-align: right; }
    .totals { margin-top: 18px; display: flex; justify-content: flex-end; }
    .total-box { min-width: 300px; text-align: right; }
    .total-label { font-size: 20px; font-weight: 800; margin-bottom: 8px; }
    .total-value { font-size: 28px; font-weight: 800; letter-spacing: .02em; }
    .footer-note { margin-top: 24px; border-top: 1px solid #d0d5dd; padding-top: 10px; color: #475467; font-size: 11px; line-height: 1.55; }
  </style></head><body><div class="page">
    <div class="header"><div class="company-wrap">${logoHtml}<div class="company"><h1>${escapeHtml(companyProfile.companyName)}</h1><div class="meta">${addressLines}</div></div></div>
    <div class="invoice-head"><div class="title">TAX INVOICE</div><div class="meta-line"><strong>Invoice No:</strong> ${escapeHtml(inv.invoiceNo)}</div><div class="meta-line"><strong>Status:</strong> ${escapeHtml(inv.status)}</div><div class="meta-line"><strong>Date:</strong> ${escapeHtml(inv.date)}</div></div></div>
    <div class="panels"><div class="panel"><div class="panel-title">Bill To</div><div class="panel-body">${escapeHtml(job.billToParty || job.customer || '')}</div></div>
    <div class="panel"><div class="panel-title">Job Details</div><div class="panel-body">Job No: ${escapeHtml(job.jobNo || '')}
POL / POD: ${escapeHtml(job.pol || '')} → ${escapeHtml(job.pod || '')}
Incoterm: ${escapeHtml(job.incoterm || '')}
Origin / Destination: ${escapeHtml(job.originCountry || '')} → ${escapeHtml(job.destinationCountry || '')}
${goodsBlock}</div></div></div>
    <table><thead><tr><th style="width:44px;">#</th><th style="width:88px;">Code</th><th>Description</th><th style="width:64px;">Qty</th><th style="width:66px;">UOM</th><th style="width:92px;">Rate</th><th style="width:96px;">Amount</th><th style="width:88px;">Currency</th></tr></thead><tbody>${lineRows}</tbody></table>
    <div class="totals"><div class="total-box"><div class="total-label">Total Payable:</div><div class="total-value">${escapeHtml(inv.currency)} ${fmtMoney(inv.total)}</div></div></div>
    <div class="footer-note">${companyProfile.footerNote ? escapeHtml(companyProfile.footerNote).replace(/\n/g, '<br>') : ''}${footerExtra ? `<br><br>${footerExtra}` : ''}</div>
  </div></body></html>`;
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
  printWindow.onload = function () { setTimeout(() => { printWindow.focus(); printWindow.print(); }, 350); };
  return true;
}
