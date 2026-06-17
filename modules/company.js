import { byId, escapeHtml } from './utils.js';
import { saveCompanyProfile as persistCompany } from './state.js';

export function fillCompanyForm(profile) {
  byId('companyName').value = profile.companyName || '';
  byId('companyAddress1').value = profile.address1 || '';
  byId('companyAddress2').value = profile.address2 || '';
  byId('companyCountry').value = profile.country || '';
  byId('companyRegNo').value = profile.regNo || '';
  byId('logoUrl').value = profile.logoUrl || '';
  byId('paymentTerms').value = profile.paymentTerms || '';
  byId('bankDetails').value = profile.bankDetails || '';
  byId('footerNote').value = profile.footerNote || '';
}

export function readCompanyForm() {
  return {
    companyName: byId('companyName').value.trim() || 'YOUR COMPANY NAME PTE LTD',
    address1: byId('companyAddress1').value.trim() || 'Company address line 1',
    address2: byId('companyAddress2').value.trim(),
    country: byId('companyCountry').value.trim() || 'Singapore',
    regNo: byId('companyRegNo').value.trim() || 'TBD',
    logoUrl: byId('logoUrl').value.trim(),
    paymentTerms: byId('paymentTerms').value.trim() || 'Strictly Due Upon Receipt',
    bankDetails: byId('bankDetails').value.trim(),
    footerNote: byId('footerNote').value.trim() || 'This is a system-generated invoice preview from Freight App MVP.'
  };
}

export function renderCompanyPreview(profile) {
  byId('companyNamePreview').textContent = profile.companyName;
  const headerParts = [profile.address1, profile.address2, profile.country, `UEN / GST Reg No: ${profile.regNo}`].filter(Boolean);
  byId('companyHeaderPreview').textContent = headerParts.join(' · ');
  const logoBox = byId('companyLogoPreview');
  if (profile.logoUrl) logoBox.innerHTML = `<img src="${escapeHtml(profile.logoUrl)}" alt="Company Logo">`;
  else logoBox.textContent = 'LOGO';
}

export function bindCompanyLivePreview(onChange) {
  ['companyName','companyAddress1','companyAddress2','companyCountry','companyRegNo','logoUrl','paymentTerms','bankDetails','footerNote']
    .forEach(id => byId(id).addEventListener('input', onChange));
}

export function saveCompany(profile) {
  persistCompany(profile);
}
