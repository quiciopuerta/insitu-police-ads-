/**
 * meta_injector.js
 * Script de inyección semántica para Meta Ads Manager.
 * Vigila y valida la nomenclatura de campañas y los topes presupuestarios.
 */

(function () {
  console.log("%c[insitu.company] Meta Ads Governance Engine Activated 🚀", "color: #E5007D; font-weight: bold; font-size: 13px;");

  // Almacenar el límite de presupuesto actual
  let currentBudgetLimit = 500;
  let isExtensionPaused = false;
  
  // Elementos rastreados para evitar duplicación de manejadores de eventos
  const activeListeners = new Set();

  // Inicializar cargando el límite de presupuesto
  updateBudgetLimit();

  // Escuchar por si hay cambios en el storage durante la sesión
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['insitu_policies', 'insitu_user_token'], (result) => {
      if (result.insitu_policies) {
        window.insituPolicies = result.insitu_policies;
      }
      if (result.insitu_user_token) {
        window.insituUserToken = result.insitu_user_token;
      }
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        if (changes.maxBudget) {
          currentBudgetLimit = Number(changes.maxBudget.newValue);
          console.log(`[insitu.company] Límite de presupuesto actualizado a $${currentBudgetLimit}`);
        }
        if (changes.insitu_policies) {
          window.insituPolicies = changes.insitu_policies.newValue;
          console.log(`[insitu.company] Políticas actualizadas`);
        }
        if (changes.insitu_user_token) {
          window.insituUserToken = changes.insitu_user_token.newValue;
        }
        if (changes.insitu_extension_paused) {
          isExtensionPaused = changes.insitu_extension_paused.newValue;
          if (isExtensionPaused) {
            // Remove budget alert styling when paused
            const existing = document.getElementById('insitu-danger-overlay');
            if (existing) existing.remove();
            
            document.querySelectorAll('.insitu-governance-budget-badge').forEach(b => b.style.display = 'none');
            document.querySelectorAll('input[type="number"], input[type="text"]').forEach(input => {
              if (activeListeners.has(input)) {
                input.style.borderColor = '';
                input.style.borderWidth = '';
                input.style.boxShadow = '';
              }
            });
          }
        }
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
   * MutationObserver que busca elementos continuamente en Meta Ads Manager
   */
  function initAdsObserver() {
    // Buscar inicialmente lo que ya esté en el DOM
    if (!isExtensionPaused) scanDOMForGovernance();

    const observer = new MutationObserver((mutations) => {
      if (isExtensionPaused) return;
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
   * Escanea el árbol del DOM de Meta Ads Manager para identificar campos de texto de campañas y presupuestos.
   * Utiliza selectores puramente semánticos basados en atributos robustos y proximidad de etiquetas.
   */
  function scanDOMForGovernance() {
    // 1. RASTREAR INPUTS DE NOMBRE DE CAMPAÑA
    // Selectores semánticos potentes para Meta
    const nameSelectors = [
      'input[data-testid*="campaign_name"]',
      'input[data-testid*="campaignName"]',
      'input[aria-label*="nombre de la campaña" i]',
      'input[aria-label*="nombre de campaña" i]',
      'input[aria-label*="campaign name" i]',
      'input[placeholder*="nombre de tu campaña" i]',
      'input[placeholder*="campaign name" i]',
      // Respaldos basados en atributos genéricos
      'input[name="campaign_name"]',
      'input[id*="campaign_name" i]',
      'input[id*="campaignName" i]'
    ];

    nameSelectors.forEach(selector => {
      const inputs = document.querySelectorAll(selector);
      inputs.forEach(input => {
        // La validación de nombre ahora es exclusiva de meta-validator.js
      });
    });

    // Búsqueda heurística por proximidad en etiquetas adyacentes si colapsan selectores
    const allInputs = document.querySelectorAll('input[type="text"]');
    allInputs.forEach(input => {
      if (activeListeners.has(input)) return;

      // Buscar si el placeholder o un label cercano tiene palabras de marketing
      const textRef = (input.placeholder || '').toLowerCase();
      const parentHTML = (input.parentElement?.innerText || '').toLowerCase();
      
      const representsCampaign = textRef.includes('nombre de campaña') || 
                                 textRef.includes('campaign name') || 
                                 (parentHTML.includes('nombre de la campaña') && parentHTML.length < 200);

      if (representsCampaign) {
        // La validación de nombre ahora es exclusiva de meta-validator.js
      }
    });

    // 2. RASTREAR INPUTS DE PRESUPUESTO
    const budgetSelectors = [
      'input[data-testid*="budget"]',
      'input[aria-label*="presupuesto" i]',
      'input[aria-label*="budget" i]',
      'input[placeholder*="presupuesto" i]',
      'input[placeholder*="importe" i]',
      'input[id*="budget" i]',
      'input[name*="budget" i]'
    ];

    budgetSelectors.forEach(selector => {
      const inputs = document.querySelectorAll(selector);
      inputs.forEach(input => {
        if (!activeListeners.has(input)) {
          activeListeners.add(input);
          attachBudgetValidator(input);
        }
      });
    });

    // Heurística de presupuesto
    const numberInputs = document.querySelectorAll('input[type="number"], input[type="text"]');
    numberInputs.forEach(input => {
      if (activeListeners.has(input)) return;
      
      const parentHTML = (input.parentElement?.innerText || '').toLowerCase();
      const parentHTMLClean = parentHTML.substring(0, 150); // Muestra del DOM local
      
      const representsBudget = parentHTMLClean.includes('presupuesto diario') || 
                               parentHTMLClean.includes('presupuesto total') || 
                               parentHTMLClean.includes('daily budget') || 
                               parentHTMLClean.includes('lifetime budget');

      if (representsBudget) {
        activeListeners.add(input);
        attachBudgetValidator(input);
      }
    });
  }


  /**
   * Conecta lógica de límite de presupuesto seguro a un input
   */
  function attachBudgetValidator(input) {
    console.log("[insitu.company] Vigilando campo de presupuesto de Meta:", input);

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
      if (isExtensionPaused) {
        input.style.borderColor = '';
        input.style.borderWidth = '';
        input.style.boxShadow = '';
        infoBadge.style.display = 'none';
        return;
      }
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
      if (isExtensionPaused) return;
      validateBudget();
      const rawValue = input.value.replace(/[^0-9.]/g, '');
      const numValue = Number(rawValue);

      const isDaily = window.InsituValidator ? window.InsituValidator.detectBudgetIsDaily(input) : true;
      const days = window.InsituValidator ? window.InsituValidator.getCampaignDays() : 1;
      const totalBudgetToCheck = isDaily ? (numValue * days) : numValue;

      if (numValue && totalBudgetToCheck > currentBudgetLimit) {
        // Alerta severa en pantalla estilo cartel corporativo
        triggerBudgetAlertOverlay(numValue, currentBudgetLimit, input, isDaily, days, totalBudgetToCheck);
        
        // Alerta nativa para bloquear la interacción insegura temporalmente
        const alertMsg = isDaily
          ? `🚨 ERROR DE PRESUPUESTO - insitu.company 🚨\n\nEl presupuesto diario configurado ($${numValue} USD) multiplicado por ${days} días de campaña ($${totalBudgetToCheck} USD) supera el Límite Máximo Seguro de Gobernanza establecido en esta cuenta ($${currentBudgetLimit} USD).\n\nPor favor, corrige el valor antes de continuar.`
          : `🚨 ERROR DE PRESUPUESTO - insitu.company 🚨\n\nEl presupuesto total configurado ($${numValue} USD) supera el Límite Máximo Seguro de Gobernanza establecido en esta cuenta ($${currentBudgetLimit} USD).\n\nPor favor, corrige el valor antes de continuar.`;
        alert(alertMsg);
      }
    });
  }


  /**
   * Genera un Overlay temible en rojo en la pantalla indicando el desvío presupuestario
   */
  function triggerBudgetAlertOverlay(writtenValue, limit, originalInput, isDaily = true, days = 1, totalBudget = 0) {
    const existing = document.getElementById('insitu-danger-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'insitu-danger-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '20px';
    overlay.style.right = '20px';
    overlay.style.backgroundColor = '#7f1d1d';
    overlay.style.borderLeft = '6px solid #ef4444';
    overlay.style.color = '#fee2e2';
    overlay.style.padding = '18px';
    overlay.style.borderRadius = '8px';
    overlay.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '999999';
    overlay.style.maxWidth = '400px';
    overlay.style.fontFamily = 'system-ui, -apple-system, sans-serif';

    const detailText = isDaily
      ? `El presupuesto diario ingresado <strong>$${writtenValue} USD</strong> multiplicado por <strong>${days} días</strong> ($${totalBudget} USD) excede el Límite de Seguridad Máximo Seguro de <strong>$${limit} USD</strong>.`
      : `El presupuesto ingresado <strong>$${writtenValue} USD</strong> excede el Límite de Seguridad Máximo Seguro configurado de <strong>$${limit} USD</strong>.`;

    overlay.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <span style="font-size: 24px;">🚨</span>
        <div>
          <h4 style="font-weight: 800; font-size: 14px; margin: 0 0 6px 0; text-transform: uppercase; color: white;">ALERTA DE SEGURIDAD DE GOBERNANZA</h4>
          <p style="font-size: 12px; margin: 0 0 10px 0; line-height: 1.4;">
            ${detailText}
          </p>
          <div style="display: flex; gap: 8px;">
            <button id="insitu-btn-correct" style="background-color: #ef4444; border: none; color: white; padding: 5px 10px; font-size: 11px; font-weight: 700; border-radius: 4px; cursor: pointer;">Corregir Presupuesto</button>
            <button id="insitu-btn-close-alert" style="background-color: transparent; border: 1px solid rgba(255,255,255,0.3); color: white; padding: 5px 10px; font-size: 11px; border-radius: 4px; cursor: pointer;">Ignorar Advertencia</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Acciones de botones
    document.getElementById('insitu-btn-correct').addEventListener('click', () => {
      originalInput.value = isDaily ? Math.floor(limit / days) : limit;
      // Disparar input event para refrescar
      originalInput.dispatchEvent(new Event('input', { bubbles: true }));
      originalInput.focus();
      overlay.remove();
    });

    document.getElementById('insitu-btn-close-alert').addEventListener('click', () => {
      overlay.remove();
    });

    // Desvanecer después de 12 segundos si no hay acción
    setTimeout(() => {
      if (overlay.parentNode) overlay.remove();
    }, 12000);
  }
})();
