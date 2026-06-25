/**
 * Google Ads Content Script - Simplified & Robust
 * Inyecta validación en tiempo real de nomenclaturas de campañas
 */

// Usa el InsituValidator global provisto por validator.js

console.log('%c[insitu.company] Google Validator loaded', 'color: #E5007D; font-weight: bold;');

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

function validateAndStyle(input) {
  try {
    if (!input || !input.parentElement) return;

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

    // Clean previous styles
    input.style.borderColor = '';
    input.style.boxShadow = '';
    
    if (!validation.isValid) {
      input.style.borderColor = '#ef4444';
      input.style.setProperty('border-width', '3px', 'important');
      input.style.boxShadow = '0 0 12px rgba(220, 38, 38, 0.5), inset 0 0 0 1px rgba(220, 38, 38, 0.2)';

      const rect = input.getBoundingClientRect();
      badge.textContent = '⚠️ INVALID: ' + (validation.reason || 'Nomenclatura inválida');
      badge.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
      badge.style.display = 'block';
      badge.style.top = (rect.bottom + 5) + 'px';
      badge.style.left = rect.left + 'px';

      console.warn('[insitu.company] Invalid name:', value);
    } else {
      input.style.borderColor = '#10b981';
      input.style.setProperty('border-width', '2px', 'important');
      input.style.boxShadow = '0 0 8px rgba(16, 185, 129, 0.4), inset 0 0 0 1px rgba(16, 185, 129, 0.2)';

      const rect = input.getBoundingClientRect();
      badge.textContent = '✅ NOMENCLATURA CORRECTA';
      badge.style.background = 'linear-gradient(135deg, #10b981, #047857)';
      badge.style.display = 'block';
      badge.style.top = (rect.bottom + 5) + 'px';
      badge.style.left = rect.left + 'px';
      
      console.log('[insitu.company] Valid name:', value);
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
      
      window.InsituValidator.logCompliance('Google Ads', value, validation.isValid, validation.reason, level);
    });

    validateAndStyle(input);
  } catch (e) {
    console.error('[insitu.company] Listener error:', e.message);
  }
}

function scanForInputs() {
  try {
    // Google Ads uses aria-label (Spanish & English)
    const inputs = document.querySelectorAll(
      'input[aria-label*="campaign" i]:not([data-insitu-monitored]),' +
      'input[aria-label*="campaña" i]:not([data-insitu-monitored]),' +
      'input[placeholder*="campaign" i]:not([data-insitu-monitored]),' +
      'input[placeholder*="campaña" i]:not([data-insitu-monitored]),' +
      'input[aria-label*="ad group" i]:not([data-insitu-monitored]),' +
      'input[aria-label*="grupo de anuncios" i]:not([data-insitu-monitored]),' +
      'input[placeholder*="ad group" i]:not([data-insitu-monitored]),' +
      'input[placeholder*="grupo de anuncios" i]:not([data-insitu-monitored]),' +
      'input[aria-label*="ad name" i]:not([data-insitu-monitored]),' +
      'input[aria-label*="anuncio" i]:not([data-insitu-monitored]),' +
      'input[placeholder*="ad name" i]:not([data-insitu-monitored]),' +
      'input[placeholder*="anuncio" i]:not([data-insitu-monitored])'
    );

    inputs.forEach((input) => {
      const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();
      const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();

      let level = null;
      if (ariaLabel.includes('campaign') || ariaLabel.includes('campaña') ||
          placeholder.includes('campaign') || placeholder.includes('campaña')) {
        level = 'campaign';
      } else if (ariaLabel.includes('ad group') || ariaLabel.includes('grupo de anuncios') ||
                 placeholder.includes('ad group') || placeholder.includes('grupo de anuncios')) {
        level = 'adset';
      } else if (ariaLabel.includes('ad name') || ariaLabel.includes('anuncio') ||
                 placeholder.includes('ad name') || placeholder.includes('anuncio')) {
        level = 'ad';
      }

      if (level) {
        input.setAttribute('data-insitu-monitored', 'true');
        input.setAttribute('data-insitu-level', level);
        console.log('[insitu.company] Found Google ' + level + ' field:', input.id);
        attachListeners(input);
      }
    });
  } catch (e) {
    console.error('[insitu.company] Scan error:', e.message);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scanForInputs);
} else {
  scanForInputs();
}

setInterval(scanForInputs, 3000);

if (window.InsituValidator) {
  window.InsituValidator.initPublishBlocker();
}

console.log('[insitu.company] ✅ Google validator ready');
