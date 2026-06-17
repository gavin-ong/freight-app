import { byId, escapeHtml, fmtMoney, calcSummary, sellAmount, costAmount, lineProfit } from './utils.js';
import { defaultCharge } from './state.js';

export function renderCharges(job, updateCharge, removeCharge) {
  const tbody = byId('chargesBody');

  tbody.innerHTML = job.charges.map((c, idx) => `
    <tr>
      <td class="center">${idx + 1}</td>

      <td><input value="${escapeHtml(c.code)}" data-i="${idx}" data-f="code"></td>

      <td style="min-width:200px;">
        <input value="${escapeHtml(c.description)}" data-i="${idx}" data-f="description">
      </td>

      <td><input value="${escapeHtml(c.currency)}" data-i="${idx}" data-f="currency"></td>

      <td><input type="number" value="${c.qty || 0}" data-i="${idx}" data-f="qty"></td>

      <td><input value="${escapeHtml(c.uom || '')}" data-i="${idx}" data-f="uom"></td>

      <td>
        <input type="number" step="0.01" value="${c.sellRate || 0}" 
        data-i="${idx}" data-f="sellRate">
      </td>

      <td>
        <input type="number" step="0.01" value="${c.costRate || 0}" 
        data-i="${idx}" data-f="costRate">
      </td>

      <td class="num">${fmtMoney(sellAmount(c))}</td>
      <td class="num">${fmtMoney(costAmount(c))}</td>
      <td class="num"><b>${fmtMoney(lineProfit(c))}</b></td>

      <td>
        <button data-i="${idx}" class="btnRowDelete">X</button>
      </td>
    </tr>
  `).join('');

  // update
  tbody.querySelectorAll('input').forEach(el => {
    el.addEventListener('change', e => {
      const idx = e.target.dataset.i;
      const field = e.target.dataset.f;
      updateCharge(idx, field, e.target.value);
    });
  });

  // delete
  tbody.querySelectorAll('.btnRowDelete').forEach(btn => {
    btn.addEventListener('click', e => {
      const idx = e.target.dataset.i;
      removeCharge(idx);
    });
  });
}

export function addChargeToJob(job) {
  job.charges.push(defaultCharge(job.currency, job.defaultFxRate));
}

export function updateJobCharge(job, index, field, value) {
  const c = job.charges[index];
  if (!c) return;

  if (field === 'qty' || field === 'sellRate' || field === 'costRate') {
    c[field] = Number(value) || 0;
  } else {
    c[field] = field === 'currency' ? value.toUpperCase() : value;
  }
}

export function removeJobCharge(job, index) {
  job.charges.splice(index, 1);
}

export function renderSummary(job) {
  const s = calcSummary(job);

  byId('sumRevenue').textContent = fmtMoney(s.revenue);
  byId('sumCost').textContent = fmtMoney(s.cost);
  byId('sumProfit').textContent = fmtMoney(s.profit);
  byId('sumMargin').textContent = s.margin.toFixed(2) + '%';
}
