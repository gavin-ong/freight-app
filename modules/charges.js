import { byId, escapeHtml, fmtMoney, calcSummary, calculatedChargeAmount } from './utils.js';
import { defaultCharge } from './state.js';

export function renderCharges(job, updateCharge, removeCharge) {
  const tbody = byId('chargesBody');
  tbody.innerHTML = job.charges.map((c, idx) => `
    <tr>
      <td class="center">${idx + 1}</td>
      <td class="compact-cell"><input value="${escapeHtml(c.code)}" data-index="${idx}" data-field="code"></td>
      <td class="description-cell"><input value="${escapeHtml(c.description)}" data-index="${idx}" data-field="description"></td>
      <td class="compact-cell">
        <select data-index="${idx}" data-field="chargeType">
          <option value="AR" ${c.chargeType === 'AR' ? 'selected' : ''}>AR</option>
          <option value="AP" ${c.chargeType === 'AP' ? 'selected' : ''}>AP</option>
        </select>
      </td>
      <td class="compact-cell"><input value="${escapeHtml(c.currency)}" data-index="${idx}" data-field="currency"></td>
      <td class="compact-cell num"><input type="number" min="0" step="0.0001" value="${Number(c.fxRate || 1)}" data-index="${idx}" data-field="fxRate"></td>
      <td class="compact-cell num"><input type="number" min="0" step="1" value="${Number(c.qty || 0)}" data-index="${idx}" data-field="qty"></td>
      <td class="compact-cell"><input value="${escapeHtml(c.uom || 'EA')}" data-index="${idx}" data-field="uom"></td>
      <td class="compact-cell num"><input type="number" min="0" step="0.01" value="${Number(c.unitPrice || 0)}" data-index="${idx}" data-field="unitPrice"></td>
      <td class="num"><strong>${fmtMoney(calculatedChargeAmount(c))}</strong></td>
      <td><button class="btn btn-secondary btnRowDelete" data-index="${idx}" style="padding:8px 10px;">Delete</button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('input,select').forEach(el => {
    el.addEventListener('change', e => {
      const idx = Number(e.target.dataset.index);
      const field = e.target.dataset.field;
      updateCharge(idx, field, e.target.value);
    });
  });
  tbody.querySelectorAll('.btnRowDelete').forEach(btn => btn.addEventListener('click', e => removeCharge(Number(e.target.dataset.index))));
}

export function addChargeToJob(job) {
  job.charges.push(defaultCharge(job.currency, job.defaultFxRate));
}

export function updateJobCharge(job, index, field, value) {
  const charge = job.charges[index];
  if (!charge) return;
  if (['qty', 'unitPrice', 'fxRate'].includes(field)) charge[field] = Number(value || 0);
  else if (field === 'currency') charge[field] = String(value || '').toUpperCase();
  else if (field === 'chargeType') charge[field] = (String(value || 'AR').toUpperCase() === 'AP') ? 'AP' : 'AR';
  else charge[field] = value;
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
