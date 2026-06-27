/**
 * google_injector.js
 * Script de inyección semántica para Google Ads Campaign Manager.
 * Vigila y valida la nomenclatura de campañas y los topes presupuestarios de Google Ads.
 */

(function () {
  console.log("%c[insitu.company] Google Ads Governance Engine Activated 🚀", "color: #E5007D; font-weight: bold; font-size: 13px;");

  // Almacenar el límite de presupuesto actual
  let currentBudgetLimit = 500;
  
  // Elementos rastreados para evitar duplicación de manejadores de eventos
  const activeListeners = new Set();

  // Inicializar cargando el límite de presupuesto
  updateBudgetLimit();

  // Escuchar por si hay cambios en el storage durante la sesión
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.maxBudget) {
        currentBudgetLimit = Number(changes.maxBudget.newValue);
        console.log(`[insitu.company] Límite de presupuesto de Google Ads actualizado a $${currentBudgetLimit}`);
        revalidateAllVisibleFields();
      }
    });
  }

  // Ejecutar el motor de rastreo continuo
  initAdsObserver();

  function updateBudgetLimit() {
    if (window.InsituValidator) {
      window.InsituValidator.getBudgetLimit().then(limit => {
        currentBudgetLimit = limit;
      });
    }
  }

  /**
   * MutationObserver que busca elementos de input continuamente en Google Ads Portal
   */
  function initAdsObserver() {
    scanDOMForGovernance();

    const observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          shouldScan = true;
          break;
        }
      }
      if (shouldScan) {
        scanDOMForGovernance();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Escanea el árbol del DOM de Google Ads para identificar campos correspondientes.
   */
  function scanDOMForGovernance() {
    // 1. RASTREAR INPUTS DE NOMBRE DE CAMPAÑA
    const googleNameSelectors = [
      'input[aria-label*="Nombre de la campaña" i]',
      'input[aria-label*="Nombre de campaña" i]',
      'input[aria-label*="Campaign name" i]',
      'input[placeholder*="Nombre de la campaña" i]',
      'input[placeholder*="Campaign name" i]',
      'input[formcontrolname*="campaignName" i]',
      'input[formcontrolname*="name" i]',
      'input#campaign-name-input',
      'input.campaign-name'
    ];

    googleNameSelectors.forEach(selector => {
      const inputs = document.querySelectorAll(selector);
      inputs.forEach(input => {
        if (!activeListeners.has(input)) {
          activeListeners.add(input);
          attachNameValidator(input);
        }
      });
    });

    // Fallback heurístico inteligente
    const allInputs = document.querySelectorAll('input[type="text"]');
    allInputs.forEach(input => {
      if (activeListeners.has(input)) return;
      
      const labelText = (input.getAttribute('aria-label') || '').toLowerCase();
      const parentText = (input.parentElement?.innerText || '').toLowerCase();
      
      const isGoogleCampaignField = labelText.includes('nombre de campaña') || 
                                    labelText.includes('campaign name') || 
                                    parentText.includes('nombre de la campaña') || 
                                    parentText.includes('campaign name');

      if (isGoogleCampaignField) {
        activeListeners.add(input);
        attachNameValidator(input);
      }
    });

    // 2. RASTREAR INPUTS DE PRESUPUESTO
    const googleBudgetSelectors = [
      'input[aria-label*="Presupuesto diario" i]',
      'input[aria-label*="Presupuesto diario medio" i]',
      'input[aria-label*="Average daily budget" i]',
      'input[aria-label*="presupuesto" i]',
      'input[placeholder*="importe" i]',
      'input[formcontrolname*="budget" i]',
      'input.budget-input',
      'input[name*="budget" i]'
    ];

    googleBudgetSelectors.forEach(selector => {
      const inputs = document.querySelectorAll(selector);
      inputs.forEach(input => {
        if (!activeListeners.has(input)) {
          activeListeners.add(input);
          attachBudgetValidator(input);
        }
      });
    });

    // Heurística de presupuestos
    const numberInputs = document.querySelectorAll('input[type="number"], input[type="text"]');
    numberInputs.forEach(input => {
      if (activeListeners.has(input)) return;
      
      const parentHTML = (input.parentElement?.innerText || '').toLowerCase();
      const belongsToBudgetField = parentHTML.includes('presupuesto diario medio') || 
                                   parentHTML.includes('average daily budget') || 
                                   parentHTML.includes('enter your budget') || 
                                   parentHTML.includes('define presupuesto');

      if (belongsToBudgetField) {
        activeListeners.add(input);
        attachBudgetValidator(input);
      }
    });
  }

  /**
   * Conecta lógica de validación de nomenclatura
   */
  function attachNameValidator(input) {
    console.log("[insitu.company] Vigilando campo de nombre de campaña de Google Ads:", input);
    
    // Crear un elemento de badge flotante
    const infoBadge = document.createElement('div');
    infoBadge.className = 'insitu-governance-google-badge';
    styleBadge(infoBadge);
    
    // Insertar badge en el DOM
    if (input.nextSibling) {
      input.parentNode.insertBefore(infoBadge, input.nextSibling);
    } else {
      input.parentNode.appendChild(infoBadge);
    }

    // Ejecución inicial
    runValidation(input, infoBadge);

    // Adjuntar evento input para real-time
    input.addEventListener('input', () => {
      runValidation(input, infoBadge);
    });
  }

  /**
   * Conecta lógica de límite de presupuesto seguro
   */
  function attachBudgetValidator(input) {
    console.log("[insitu.company] Vigilando campo de presupuesto diario de Google Ads:", input);

    // Create a floating badge for budget errors
    const infoBadge = document.createElement('div');
    infoBadge.className = 'insitu-governance-budget-badge';
    infoBadge.style.padding = '6px 12px';
    infoBadge.style.borderRadius = '0 0 6px 6px';
    infoBadge.style.fontSize = '12px';
    infoBadge.style.fontWeight = '700';
    infoBadge.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    infoBadge.style.marginTop = '-1px';
    infoBadge.style.transition = 'all 0.2s';
    infoBadge.style.zIndex = '99999';
    infoBadge.style.position = 'absolute';
    infoBadge.style.display = 'none';

    if (input.nextSibling) {
      input.parentNode.insertBefore(infoBadge, input.nextSibling);
    } else {
      input.parentNode.appendChild(infoBadge);
    }

    const validateBudget = () => {
      const rawValue = input.value.replace(/[^0-9.]/g, '');
      const numValue = Number(rawValue);

      const isDaily = window.InsituValidator ? window.InsituValidator.detectBudgetIsDaily(input) : true;
      const days = window.InsituValidator ? window.InsituValidator.getCampaignDays() : 1;
      const totalBudgetToCheck = isDaily ? (numValue * days) : numValue;

      // Update campaign days badge
      if (window.InsituValidator) {
        window.InsituValidator.updateCampaignDaysBadge();
      }

      if (numValue && totalBudgetToCheck > currentBudgetLimit) {
        input.style.borderColor = '#dc2626';
        input.style.setProperty('border-width', '3px', 'important');
        input.style.boxShadow = '0 0 12px rgba(220, 38, 38, 0.5), inset 0 0 0 1px rgba(220, 38, 38, 0.2)';

        const rect = input.getBoundingClientRect();
        infoBadge.textContent = isDaily
          ? `❌ ERROR: $${numValue}/dia x ${days}d = $${totalBudgetToCheck} excede límite ($${currentBudgetLimit})`
          : `❌ ERROR: Límite excedido ($${numValue} > $${currentBudgetLimit})`;
        infoBadge.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
        infoBadge.style.color = 'white';
        infoBadge.style.display = 'block';
        infoBadge.style.top = (rect.bottom + 5) + 'px';
        infoBadge.style.left = rect.left + 'px';
      } else {
        input.style.borderColor = '#16a34a';
        input.style.setProperty('border-width', '2px', 'important');
        input.style.boxShadow = '0 0 8px rgba(22, 163, 74, 0.4), inset 0 0 0 1px rgba(22, 163, 74, 0.2)';

        const rect = input.getBoundingClientRect();
        infoBadge.textContent = isDaily
          ? `✅ PRESUPUESTO SEGURO: $${numValue}/dia x ${days}d = $${totalBudgetToCheck}`
          : `✅ PRESUPUESTO SEGURO: $${numValue}`;
        infoBadge.style.background = 'linear-gradient(135deg, #16a34a, #15803d)';
        infoBadge.style.color = 'white';
        infoBadge.style.display = 'block';
        infoBadge.style.top = (rect.bottom + 5) + 'px';
        infoBadge.style.left = rect.left + 'px';
      }
    };

    input.addEventListener('input', validateBudget);

    input.addEventListener('blur', () => {
      validateBudget();
      const rawValue = input.value.replace(/[^0-9.]/g, '');
      const numValue = Number(rawValue);

      const isDaily = window.InsituValidator ? window.InsituValidator.detectBudgetIsDaily(input) : true;
      const days = window.InsituValidator ? window.InsituValidator.getCampaignDays() : 1;
      const totalBudgetToCheck = isDaily ? (numValue * days) : numValue;

      if (numValue && totalBudgetToCheck > currentBudgetLimit) {
        // Alerta severa en pantalla estilo cartel corporativo
        triggerGoogleBudgetAlertOverlay(numValue, currentBudgetLimit, input, isDaily, days, totalBudgetToCheck);
        
        // Alerta nativa
        const alertMsg = isDaily
          ? `🚨 ERROR DE PRESUPUESTO - GOOGLE ADS 🚨\n\nEl presupuesto diario configurado ($${numValue} USD) multiplicado por ${days} días de campaña ($${totalBudgetToCheck} USD) supera el Límite Máximo Seguro de Gobernanza establecido por insitu.company ($${currentBudgetLimit} USD).\n\nPor favor, corrige el valor antes de publicar la campaña.`
          : `🚨 ERROR DE PRESUPUESTO - GOOGLE ADS 🚨\n\nEl presupuesto total configurado ($${numValue} USD) supera el Límite Máximo Seguro de Gobernanza establecido por insitu.company ($${currentBudgetLimit} USD).\n\nPor favor, corrige el valor antes de publicar la campaña.`;
        alert(alertMsg);
      }
    });
  }

  /**
   * Corre la lógica del validador y estiliza el borde y badge
   */
  function runValidation(input, tag) {
    const text = input.value;
    if (!text) {
      input.style.border = '2px solid #cbd5e1';
      input.style.boxShadow = 'none';
      tag.style.display = 'none';
      return;
    }

    if (window.InsituValidator) {
      const res = window.InsituValidator.validateCampaignName(text);
      tag.style.display = 'block';

      if (res.isValid) {
        input.style.border = '3px solid #10b981';
        input.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.3)';
        tag.innerText = "✓ Gobernanza insitu.company aprobada (Google Ads)";
        tag.style.backgroundColor = '#10b981';
        tag.style.color = 'white';
      } else {
        input.style.border = '3px solid #ef4444';
        input.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.3)';
        tag.innerText = `✗ Gobernanza insitu.company: ${res.reason}`;
        tag.style.backgroundColor = '#ef4444';
        tag.style.color = 'white';
      }
    }
  }

  /**
   * Revalida todos los campos cuando el límite cambia
   */
  function revalidateAllVisibleFields() {
    const badges = document.querySelectorAll('.insitu-governance-google-badge');
    badges.forEach(badge => {
      const input = badge.previousSibling;
      if (input && input.tagName === 'INPUT') {
        runValidation(input, badge);
      }
    });
  }

  /**
   * Modela el diseño visual de los carteles de aviso inyectados
   */
  function styleBadge(badge) {
    badge.style.padding = '6px 12px';
    badge.style.borderRadius = '0 0 6px 6px';
    badge.style.fontSize = '12px';
    badge.style.fontWeight = '700';
    badge.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    badge.style.marginTop = '-1px';
    badge.style.transition = 'all 0.2s';
    badge.style.zIndex = '99999';
    badge.style.position = 'relative';
  }

  /**
   * Genera un Overlay de Advertencia
   */
  function triggerGoogleBudgetAlertOverlay(writtenValue, limit, originalInput, isDaily = true, days = 1, totalBudget = 0) {
    const existing = document.getElementById('insitu-google-danger-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'insitu-google-danger-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '20px';
    overlay.style.right = '20px';
    overlay.style.backgroundColor = '#450a0a';
    overlay.style.borderLeft = '6px solid #f87171';
    overlay.style.color = '#fef2f2';
    overlay.style.padding = '18px';
    overlay.style.borderRadius = '8px';
    overlay.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.5)';
    overlay.style.zIndex = '999999';
    overlay.style.maxWidth = '400px';
    overlay.style.fontFamily = 'system-ui, -apple-system, sans-serif';

    const detailText = isDaily
      ? `El presupuesto diario de Google Ads ingresado (<strong>$${writtenValue} USD</strong>) multiplicado por <strong>${days} días</strong> ($${totalBudget} USD) supera el tope de seguridad de esta cuenta (<strong>$${limit} USD</strong>).`
      : `El presupuesto de Google Ads ingresado (<strong>$${writtenValue} USD</strong>) supera el tope de seguridad de esta cuenta (<strong>$${limit} USD</strong>).`;

    overlay.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <span style="font-size: 24px;">⚠️</span>
        <div>
          <h4 style="font-weight: 800; font-size: 14px; margin: 0 0 6px 0; text-transform: uppercase; color: white;">SEGURIDAD PREMIUM GOOGLE ADS</h4>
          <p style="font-size: 12px; margin: 0 0 10px 0; line-height: 1.4;">
            ${detailText}
          </p>
          <div style="display: flex; gap: 8px;">
            <button id="insitu-google-btn-correct" style="background-color: #f87171; border: none; color: #450a0a; padding: 5px 10px; font-size: 11px; font-weight: 800; border-radius: 4px; cursor: pointer;">Ajustar al Límite</button>
            <button id="insitu-google-btn-close-alert" style="background-color: transparent; border: 1px solid rgba(255,255,255,0.3); color: white; padding: 5px 10px; font-size: 11px; border-radius: 4px; cursor: pointer;">Cerrar Alerta</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Acciones de botones
    document.getElementById('insitu-google-btn-correct').addEventListener('click', () => {
      originalInput.value = isDaily ? Math.floor(limit / days) : limit;
      originalInput.dispatchEvent(new Event('input', { bubbles: true }));
      originalInput.dispatchEvent(new Event('change', { bubbles: true }));
      originalInput.focus();
      overlay.remove();
    });

    document.getElementById('insitu-google-btn-close-alert').addEventListener('click', () => {
      overlay.remove();
    });

    setTimeout(() => {
      if (overlay.parentNode) overlay.remove();
    }, 12000);
  }
})();
