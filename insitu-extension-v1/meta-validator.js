/**
 * Meta Ads Manager Content Script - Enhanced Visibility
 * Inyecta validación en tiempo real con alertas visibles
 */

// Usa el InsituValidator global provisto por validator.js

console.log('%c[insitu.company] Meta Validator loaded', 'color: #E5007D; font-weight: bold;');

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

    // Hide on any scroll to prevent floating away
    window.addEventListener('scroll', () => {
      badge.style.display = 'none';
    }, { capture: true, passive: true });
  }
  return badge;
}

function validateAndStyle(input) {
  try {
    const value = input.value;
    const badge = getGlobalBadge();

    if (!value) {
      input.style.borderColor = '';
      input.style.borderWidth = '';
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
    input.style.borderWidth = '';
    input.style.boxShadow = '';

    if (!validation.isValid) {
      // INVALID - Red, very thick border
      input.style.borderColor = '#dc2626';
      input.style.setProperty('border-width', '3px', 'important');
      input.style.boxShadow = '0 0 12px rgba(220, 38, 38, 0.5), inset 0 0 0 1px rgba(220, 38, 38, 0.2)';

      // Show floating badge for invalid
      const rect = input.getBoundingClientRect();
      badge.textContent = '❌ INVALID: ' + (validation.reason || 'Formato incorrecto');
      badge.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
      badge.style.display = 'block';
      badge.style.top = (rect.bottom + 5) + 'px';
      badge.style.left = rect.left + 'px';
    } else {
      // VALID - Green border
      input.style.borderColor = '#16a34a';
      input.style.setProperty('border-width', '2px', 'important');
      input.style.boxShadow = '0 0 8px rgba(22, 163, 74, 0.4), inset 0 0 0 1px rgba(22, 163, 74, 0.2)';

      // Show floating badge for valid
      const rect = input.getBoundingClientRect();
      badge.textContent = '✅ NOMENCLATURA CORRECTA';
      badge.style.background = 'linear-gradient(135deg, #16a34a, #15803d)';
      badge.style.display = 'block';
      badge.style.top = (rect.bottom + 5) + 'px';
      badge.style.left = rect.left + 'px';
      
      console.log('[insitu.company] ✅ VALID:', value);
    }
    
    inputValidationStates.set(input, validation.isValid);
    updateGlobalErrors();
  } catch (e) {
    console.error('[insitu.company] Error:', e.message);
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

      window.InsituValidator.logCompliance('Meta Ads', value, validation.isValid, validation.reason, level);
    });

    validateAndStyle(input);
  } catch (e) {
    console.error('[insitu.company] Listener error:', e.message);
  }
}

function scanForInputs() {
  try {
    const inputs = document.querySelectorAll(
      'input[data-testid*="name"]:not([data-insitu-monitored]),' +
      'input[data-testid*="Name"]:not([data-insitu-monitored]),' +
      'input[aria-label*="nombre" i]:not([data-insitu-monitored]),' +
      'input[aria-label*="name" i]:not([data-insitu-monitored]),' +
      'input[placeholder*="nombre" i]:not([data-insitu-monitored]),' +
      'input[placeholder*="name" i]:not([data-insitu-monitored]),' +
      'textarea[placeholder*="nombre" i]:not([data-insitu-monitored]),' +
      'textarea[placeholder*="name" i]:not([data-insitu-monitored]),' +
      'textarea[aria-label*="nombre" i]:not([data-insitu-monitored]),' +
      'textarea[aria-label*="name" i]:not([data-insitu-monitored]),' +
      'input[role="combobox"]:not([data-insitu-monitored])'
    );

    inputs.forEach((input) => {
      const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
      const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();
      const role = input.getAttribute('role') || '';
      const testId = (input.getAttribute('data-testid') || '').toLowerCase();

      // Detect level
      let level = null;
      if (
        testId.includes('campaign') || ariaLabel.includes('campaña') || ariaLabel.includes('campaign') || placeholder.includes('campaña')
      ) {
        level = 'campaign';
      } else if (
        testId.includes('adset') || testId.includes('ad_set') || ariaLabel.includes('conjunto') || ariaLabel.includes('ad set') || placeholder.includes('conjunto')
      ) {
        level = 'adset';
      } else if (
        testId.includes('ad_name') || testId.includes('adname') || ariaLabel.includes('anuncio') || ariaLabel.includes('ad name') || placeholder.includes('anuncio')
      ) {
        // Caution: "ad set" contains "ad", so we check 'adset' first
        level = 'ad';
      }

      if (level) {
        input.setAttribute('data-insitu-monitored', 'true');
        input.setAttribute('data-insitu-level', level);
        console.log('[insitu.company] 📍 Found ' + level + ' field:', input.id || input.getAttribute('aria-label'));
        attachListeners(input);
      }
    });
  } catch (e) {
    console.error('[insitu.company] Scan error:', e.message);
  }
}

// Removed pulse-red animation due to stacking context issues

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scanForInputs);
} else {
  scanForInputs();
}

setInterval(scanForInputs, 3000);

if (window.InsituValidator) {
  window.InsituValidator.initPublishBlocker();
}

console.log('[insitu.company] ✅ Meta validator ready');
