import { byId, escapeHtml, fmtMoney, calcSummary, sellAmount, costAmount, lineProfit } from './utils.js';
import { defaultCharge } from './state.js';

export function renderCharges(job, updateCharge, removeCharge) {
  const tbody = byId('chargesBody');
  tbody.innerHTML = job.charges.map((c, idx) => `
    <tr>
      <td class="center">${idx + 1}</td>
      <td class="compact-cell"><input value="${escapeHtml(c.code)}" data-i="${idx}" data-f="code"></td>
      <td class="description-cell"><input value="${escapeHtml(c.description)}" data-i="${idx}" data-f="description"></td>
      <td class="compact-cell"><input value="${escapeHtml(c.currency)}" data-i="${idx}" data-f="currency"></td>
      <td class="compact-cell num"><input type="number" min="0" step="1" value="${Number(c.qty || 0)}" data-i="${idx}" data-f="qty"></td>
      <td class="compact-cell"><input value="${escapeHtml(c.uom || 'EA')}" data-i="${idx}" data-f="uom"></td>
      <td class="compact-cell num"><input type="number" min="0" step="0.01" value="${Number(c.sellRate || 0)}" data-i="${idx}" data-f="sellRate"></td>
      <td class="compact-cell num"><input type="number" min="0" step="0.01" value="${Number(c.costRate || 0)}" data-i="${idx}" data-f="costRate"></td>
      <td class="num"><strong>${fmtMoney(sellAmount(c))}</strong></td>
      <td class="num"><strong>${fmtMoney(costAmount(c))}</strong></td>
      <td class="num"><strong>${fmtMoney(lineProfit(c))}</strong></td>
      <td><button class="btn btn-secondary btnRowDelete" data-i="${idx}" style="padding:8px 10px;">Delete</button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('input').forEach(el => {
    el.addEventListener('change', e => {
      const idx = Number(e.target.dataset.i);
      const field = e.target.dataset.f;
      updateCharge(idx, field, e.target.value);
    });
  });
  tbody.querySelectorAll('.btnRowDelete').forEach(btn => {
    btn.addEventListener('click', e => removeCharge(Number(e.target.dataset.i)));
  });
}

export function addChargeToJob(job) {
  job.charges.push(defaultCharge(job.currency, job.defaultFxRate));
}

export function updateJobCharge(job, index, field, value) {
  const c = job.charges[index];
  if (!c) return;
  if (['qty', 'sellRate', 'costRate'].includes(field)) c[field] = Number(value) || 0;
  else if (field === 'currency') c[field] = String(value || '').toUpperCase();
  else c[field] = value;
}

export function removeJobCharge(job, index) {
  job.charges.splice(index, 1);
  if (!job.charges.length) job.charges.push(defaultCharge(job.currency, job.defaultFxRate));
}

export function renderSummary(job) {
  const s = calcSummary(job);
  byId('sumRevenue').textContent = fmtMoney(s.revenue);
  byId('sumCost').textContent = fmtMoney(s.cost);
  byId('sumProfit').textContent = fmtMoney(s.profit);
  byId('sumMargin').textContent = `${s.margin.toFixed(2)}%`;
}
