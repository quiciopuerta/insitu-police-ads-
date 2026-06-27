/**
 * Generic Ads Platforms Content Script
 * Inyecta validación en tiempo real en TikTok, LinkedIn, Pinterest, X, Amazon, etc.
 */

console.log('%c[insitu.company] Generic Ads Validator loaded 🚀', 'color: #E5007D; font-weight: bold;');

let monitoredInputs = new WeakSet();
const inputValidationStates = new Map();

function updateGlobalErrors() {
  let errors = 0;
  inputValidationStates.forEach((valid) => {
    if (!valid) errors++;
  });
  window.insituErrorsCount = errors;
}

function getGlobalBadge() {
  let badge = document.getElementById('insitu-global-validation-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'insitu-global-validation-badge';
    badge.style.cssText = `
      position: fixed;
      z-index: 999999;
      background: linear-gradient(135deg, #dc2626, #b91c1c);
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: bold;
      pointer-events: none;
      display: none;
      box-shadow: 0 4px 6px -1px rgba(220, 38, 38, 0.3);
      max-width: 300px;
    `;
    document.body.appendChild(badge);

    window.addEventListener('scroll', () => {
      badge.style.display = 'none';
    }, { capture: true, passive: true });
  }
  return badge;
}

function getPlatformName() {
  const host = window.location.hostname.toLowerCase();
  if (host.includes('tiktok')) return 'TikTok Ads';
  if (host.includes('linkedin')) return 'LinkedIn Ads';
  if (host.includes('pinterest')) return 'Pinterest Ads';
  if (host.includes('twitter') || host.includes('x.com')) return 'X Ads';
  if (host.includes('snapchat')) return 'Snapchat Ads';
  if (host.includes('amazon')) return 'Amazon Advertising';
  if (host.includes('microsoft') || host.includes('bing')) return 'Microsoft Ads';
  if (host.includes('yahoo')) return 'Yahoo Advertising';
  if (host.includes('criteo')) return 'Criteo';
  if (host.includes('outbrain')) return 'Outbrain';
  if (host.includes('taboola')) return 'Taboola';
  return 'Paid Ads';
}

function validateAndStyle(input) {
  try {
    const value = input.value;
    const badge = getGlobalBadge();

    if (!value || value.length < 3) {
      input.style.borderColor = '';
      input.style.boxShadow = '';
      badge.style.display = 'none';
      inputValidationStates.delete(input);
      updateGlobalErrors();
      return;
    }

    const level = input.getAttribute('data-insitu-level') || 'campaign';
    let validation;
    if (level === 'adset') validation = window.InsituValidator.validateAdSetName(value);
    else if (level === 'ad') validation = window.InsituValidator.validateAdName(value);
    else validation = window.InsituValidator.validateCampaignName(value);

    // Reset styles
    input.style.borderColor = '';
    input.style.boxShadow = '';

    if (!validation.isValid) {
      input.style.borderColor = '#dc2626';
      input.style.setProperty('border-width', '3px', 'important');
      input.style.boxShadow = '0 0 12px rgba(220, 38, 38, 0.5), inset 0 0 0 1px rgba(220, 38, 38, 0.2)';

      const rect = input.getBoundingClientRect();
      badge.textContent = '❌ INVALID: ' + (validation.reason || 'Formato incorrecto');
      badge.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
      badge.style.display = 'block';
      badge.style.top = (rect.bottom + 5) + 'px';
      badge.style.left = rect.left + 'px';
    } else {
      input.style.borderColor = '#16a34a';
      input.style.setProperty('border-width', '2px', 'important');
      input.style.boxShadow = '0 0 8px rgba(16, 163, 74, 0.4), inset 0 0 0 1px rgba(16, 163, 74, 0.2)';

      const rect = input.getBoundingClientRect();
      badge.textContent = '✅ NOMENCLATURA CORRECTA';
      badge.style.background = 'linear-gradient(135deg, #16a34a, #15803d)';
      badge.style.display = 'block';
      badge.style.top = (rect.bottom + 5) + 'px';
      badge.style.left = rect.left + 'px';
    }
    
    inputValidationStates.set(input, validation.isValid);
    updateGlobalErrors();
    
    // Update global badge with dates and objectives
    if (window.InsituValidator) {
      window.InsituValidator.updateCampaignDaysBadge();
    }
  } catch (e) {
    console.error('[insitu.company] Validation error:', e.message);
  }
}

function attachListeners(input) {
  try {
    if (monitoredInputs.has(input)) return;
    monitoredInputs.add(input);

    input.addEventListener('input', (e) => validateAndStyle(e.target), { passive: true });
    input.addEventListener('blur', (e) => {
      const value = e.target.value;
      if (!value) return;
      
      const level = input.getAttribute('data-insitu-level') || 'campaign';
      let validation;
      if (level === 'adset') validation = window.InsituValidator.validateAdSetName(value);
      else if (level === 'ad') validation = window.InsituValidator.validateAdName(value);
      else validation = window.InsituValidator.validateCampaignName(value);

      const platform = getPlatformName();
      window.InsituValidator.logCompliance(platform, value, validation.isValid, validation.reason, level);
    });

    validateAndStyle(input);
  } catch (e) {
    console.error('[insitu.company] Listener error:', e.message);
  }
}

function validateBudgetAndStyle(input) {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;

    chrome.storage.local.get({ maxBudget: 500 }, (result) => {
      const maxBudget = Number(result.maxBudget);
      // Clean clean value from formatted strings like "60,000.00"
      const rawVal = input.value.replace(/[^0-9.]/g, '');
      const budgetVal = Number(rawVal);
      const badge = getGlobalBadge();

      if (!input.value || isNaN(budgetVal) || budgetVal <= 0) {
        input.style.borderColor = '';
        input.style.boxShadow = '';
        badge.style.display = 'none';
        return;
      }

      const isDaily = window.InsituValidator ? window.InsituValidator.detectBudgetIsDaily(input) : true;
      const days = window.InsituValidator ? window.InsituValidator.getCampaignDays() : 1;
      const totalBudgetToCheck = isDaily ? (budgetVal * days) : budgetVal;

      if (window.InsituValidator) {
        window.InsituValidator.updateCampaignDaysBadge();
      }

      if (totalBudgetToCheck > maxBudget) {
        // Exceeded
        input.style.borderColor = '#dc2626';
        input.style.setProperty('border-width', '3px', 'important');
        input.style.boxShadow = '0 0 12px rgba(220, 38, 38, 0.5), inset 0 0 0 1px rgba(220, 38, 38, 0.2)';

        const rect = input.getBoundingClientRect();
        badge.textContent = isDaily 
          ? `❌ ALERTA: $${budgetVal}/dia x ${days}d = $${totalBudgetToCheck} excede límite de $${maxBudget}`
          : `❌ ALERTA PRESUPUESTO: $${budgetVal} excede límite safe de $${maxBudget}`;
        badge.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
        badge.style.display = 'block';
        badge.style.top = (rect.bottom + 5) + 'px';
        badge.style.left = rect.left + 'px';

        // Log budget violation event
        const platform = getPlatformName();
        window.InsituValidator.logCompliance(platform, `Presupuesto: $${budgetVal}`, false, `Excede el presupuesto safe de $${maxBudget}`, 'budget');
      } else {
        input.style.borderColor = '#16a34a';
        input.style.setProperty('border-width', '2px', 'important');
        input.style.boxShadow = '0 0 8px rgba(16, 163, 74, 0.4), inset 0 0 0 1px rgba(16, 163, 74, 0.2)';
        badge.style.display = 'none';
      }
    });
  } catch (e) {
    console.error('[insitu.company] Budget validation error:', e.message);
  }
}

function attachBudgetListeners(input) {
  try {
    if (monitoredInputs.has(input)) return;
    monitoredInputs.add(input);

    input.addEventListener('input', (e) => validateBudgetAndStyle(e.target), { passive: true });
    input.addEventListener('blur', (e) => validateBudgetAndStyle(e.target), { passive: true });

    validateBudgetAndStyle(input);
  } catch (e) {
    console.error('[insitu.company] Budget listener error:', e.message);
  }
}

function scanForInputs() {
  try {
    // Escanear TODOS los inputs de la página para no depender de nombres de atributos específicos
    const allInputs = document.querySelectorAll('input:not([data-insitu-monitored])');

    allInputs.forEach((input) => {
      const name = (input.name || '').toLowerCase();
      const id = (input.id || '').toLowerCase();
      const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
      const className = (input.className || '').toLowerCase();
      const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();
      const value = (input.value || '').trim();

      // Proximidad de texto (para etiquetas de formulario de TikTok/LinkedIn/etc.)
      let parentText = '';
      try {
        parentText = (input.closest('div') || input.parentElement?.parentElement)?.textContent?.toLowerCase() || '';
      } catch (e) {}

      // Heurística 1: ¿Es un campo de nombre de campaña, grupo o anuncio?
      let nameLevel = null;
      if (
        name.includes('campaign') || name.includes('campaña') ||
        id.includes('campaign') || id.includes('campaña') ||
        placeholder.includes('campaign') || placeholder.includes('campaña') ||
        ariaLabel.includes('campaign') || ariaLabel.includes('campaña') ||
        parentText.includes('campaign name') || parentText.includes('nombre de la campaña') ||
        // Si el valor ya tiene el formato de nomenclatura corporativa
        /^[A-Z0-9]{2,}_[A-Z0-9]{2,}_[A-Z0-9]{2,}_/.test(value)
      ) {
        nameLevel = 'campaign';
      } else if (
        name.includes('adset') || name.includes('ad_set') || name.includes('group') || name.includes('grupo') ||
        id.includes('adset') || id.includes('ad_set') || id.includes('group') || id.includes('grupo') ||
        placeholder.includes('adset') || placeholder.includes('group') || placeholder.includes('grupo') ||
        ariaLabel.includes('adset') || ariaLabel.includes('group') || ariaLabel.includes('grupo') ||
        parentText.includes('ad set name') || parentText.includes('nombre del conjunto')
      ) {
        nameLevel = 'adset';
      } else if (
        name.includes('creative') || name.includes('ad_') || name.includes('anuncio') || name.includes('adname') ||
        id.includes('creative') || id.includes('ad_') || id.includes('anuncio') || id.includes('adname') ||
        placeholder.includes('creative') || placeholder.includes('anuncio') ||
        ariaLabel.includes('creative') || ariaLabel.includes('anuncio') ||
        parentText.includes('ad name') || parentText.includes('nombre del anuncio')
      ) {
        nameLevel = 'ad';
      }

      if (nameLevel) {
        input.setAttribute('data-insitu-monitored', 'true');
        input.setAttribute('data-insitu-level', nameLevel);
        console.log('[insitu.company] Monitoreando campo de nombre:', input);
        attachListeners(input);
        return;
      }

      // Heurística 2: ¿Es un campo de presupuesto (Budget)?
      const isBudgetField = 
        name.includes('budget') || name.includes('presupuesto') || name.includes('amount') || name.includes('importe') ||
        id.includes('budget') || id.includes('presupuesto') || id.includes('amount') || id.includes('importe') ||
        placeholder.includes('budget') || placeholder.includes('presupuesto') || placeholder.includes('amount') || placeholder.includes('importe') ||
        ariaLabel.includes('budget') || ariaLabel.includes('presupuesto') ||
        className.includes('budget') || className.includes('amount') ||
        parentText.includes('budget') || parentText.includes('presupuesto') || parentText.includes('daily') || parentText.includes('lifetime') || parentText.includes('diario');

      if (isBudgetField) {
        input.setAttribute('data-insitu-monitored', 'true');
        console.log('[insitu.company] Monitoreando campo de presupuesto:', input);
        attachBudgetListeners(input);
      }
    });
  } catch (e) {
    console.error('[insitu.company] Scan error:', e.message);
  }
}

// Escaneo periódico
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scanForInputs);
} else {
  scanForInputs();
}

setInterval(scanForInputs, 3000);

if (window.InsituValidator) {
  window.InsituValidator.initPublishBlocker();
}

console.log(`[insitu.company] ✅ ${getPlatformName()} validator ready`);
