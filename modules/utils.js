export function byId(id) { return document.getElementById(id); }

export function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function fmtMoney(value) {
  const num = Number(value || 0);
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function nowForInvoice() { return new Date().toLocaleString(); }

export function invoiceNo() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const serial = String(Date.now()).slice(-5);
  return `INV-${yyyy}${mm}${dd}-${serial}`;
}

export function calculatedChargeAmount(charge) {
  return Number(charge.qty || 0) * Number(charge.unitPrice || 0) * Number(charge.fxRate || 1);
}

export function isARCharge(charge) {
  return String(charge.chargeType || 'AR').toUpperCase() === 'AR';
}

export function isAPCharge(charge) {
  return String(charge.chargeType || 'AR').toUpperCase() === 'AP';
}

export function sellAmount(charge) {
  return Number(charge.qty || 0) * Number(charge.sellRate || 0) * Number(charge.fxRate || 1);
}

export function costAmount(charge) {
  return Number(charge.qty || 0) * Number(charge.costRate || 0) * Number(charge.fxRate || 1);
}

export function lineProfit(charge) {
  return sellAmount(charge) - costAmount(charge);
}

export function hasUnifiedRates(charge) {
  return Number(charge.sellRate || 0) !== 0 || Number(charge.costRate || 0) !== 0;
}

export function calcSummary(job) {
  let revenue = 0, cost = 0;
  for (const c of job.charges) {
    if (hasUnifiedRates(c)) {
      revenue += sellAmount(c);
      cost += costAmount(c);
    } else {
      const val = calculatedChargeAmount(c);
      if (isAPCharge(c)) cost += val;
      else revenue += val;
    }
  }
  const profit = revenue - cost;
  const margin = revenue ? (profit / revenue) * 100 : 0;
  return { revenue, cost, profit, margin };
}

export function getInvoiceCharges(job) {
  return job.charges.filter(c => {
    if (hasUnifiedRates(c)) return Number(c.sellRate || 0) > 0;
    return isARCharge(c);
  });
}
