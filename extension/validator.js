/**
 * validator.js
 * El Cerebro Unificado de Gobernanza Paid Media de insitu.company.
 * Valida la nomenclatura de campañas y recupera los límites presupuestarios definidos en storage local.
 */

const InsituValidator = {
  // Constantes de gobernanza corporativa
  COUNTRIES: {
    'EC': 'Ecuador',
    'CO': 'Colombia',
    'PE': 'Perú'
  },
  
  CHANNELS: {
    'FB': 'Meta Ads (Facebook)',
    'GO': 'Google Ads',
    'TK': 'TikTok Ads',
    'LI': 'LinkedIn Ads',
    'PI': 'Pinterest Ads',
    'XAds': 'X (Twitter) Ads',
    'DV360': 'Display & Video 360',
    'SC': 'Snapchat Ads',
    'AMZ': 'Amazon Advertising',
    'MS': 'Microsoft Ads',
    'YHO': 'Yahoo Advertising',
    'CRT': 'Criteo',
    'OB': 'Outbrain',
    'TB': 'Taboola'
  },
  
  OBJECTIVES: {
    'CONV': 'Conversiones',
    'LEAD': 'Clientes Potenciales',
    'TRAF': 'Tráfico',
    'AW': 'Reconocimiento (Awareness)',
    'ENG': 'Interacciones (Engagement)',
    'APP': 'Promoción de App',
    'SALES': 'Ventas'
  },

  // Mapeo UTM según canales de insitu.company
  UTM_SOURCE_MAP: {
    'FB': 'facebook',
    'GO': 'google',
    'TK': 'tiktok',
    'LI': 'linkedin',
    'PI': 'pinterest',
    'XAds': 'twitter',
    'DV360': 'dv360',
    'SC': 'snapchat',
    'AMZ': 'amazon',
    'MS': 'bing',
    'YHO': 'yahoo',
    'CRT': 'criteo',
    'OB': 'outbrain',
    'TB': 'taboola'
  },

  // Mapeo UTM según objetivos corporativos
  UTM_MEDIUM_MAP: {
    'CONV': 'cpc',
    'LEAD': 'lead-generation',
    'TRAF': 'paid-social',
    'AW': 'cpm'
  },

  validateName(name, rules, levelName) {
    if (!name || typeof name !== 'string') {
      return { isValid: false, reason: `El nombre de ${levelName} está vacío o no es texto válido.` };
    }

    if (typeof rules === 'string') {
      try {
        rules = JSON.parse(rules);
      } catch (e) {
        console.error('[insitu.company] Error parsing rules:', e);
        rules = [];
      }
    }

    if (!rules || !Array.isArray(rules) || rules.length === 0) {
      return { isValid: true, reason: 'Nomenclatura libre. No hay reglas definidas.' };
    }

    const segments = name.trim().split('_');
    if (segments.length < rules.length) {
      const expected = rules.map(r => `[${r.label}]`).join('_');
      return {
        isValid: false,
        reason: `Estructura incompleta. Se esperaban al menos ${rules.length} segmentos separados por guion bajo (_). Esperado: ${expected}.`
      };
    }

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      const segment = segments[i];

      if (!segment || segment.trim() === '') {
        return { isValid: false, reason: `El segmento "${rule.label}" no puede estar vacío.` };
      }

      // Validaciones específicas si mantuvieran el código estricto anterior, 
      // pero ahora lo hacemos un poco más flexible y dependiente del Dashboard.
      if (rule.type === 'pais' && !this.COUNTRIES[segment]) {
        return { isValid: false, reason: `Código de país inválido: "${segment}". Permitidos: ${Object.keys(this.COUNTRIES).join(', ')}.` };
      }
      if (rule.type === 'canal' && !this.CHANNELS[segment]) {
        return { isValid: false, reason: `Código de canal inválido: "${segment}". Permitidos: ${Object.keys(this.CHANNELS).join(', ')}.` };
      }
      if (rule.type === 'objetivo' && !this.OBJECTIVES[segment]) {
        return { isValid: false, reason: `Código de objetivo inválido: "${segment}". Permitidos: ${Object.keys(this.OBJECTIVES).join(', ')}.` };
      }
      if (rule.type === 'anio') {
        const anioRegex = /^[0-9]{4}(-[a-zA-Z0-9]+)?$/;
        if (!anioRegex.test(segment)) {
          return { isValid: false, reason: `Año/Temporada "${segment}" inválido. Debe comenzar con 4 dígitos (Ej: 2026 o 2026-T1).` };
        }
      }
    }

    return { isValid: true, reason: '¡Nomenclatura OK! Cumple las políticas.' };
  },

  validateCampaignName(name) {
    const policies = window.insituPolicies || {};
    // Fallback a las reglas estáticas si no se han cargado las políticas
    const rules = policies.campaign_rules || [
        { type: 'pais', label: 'País' },
        { type: 'canal', label: 'Canal' },
        { type: 'objetivo', label: 'Objetivo' },
        { type: 'producto', label: 'Producto' },
        { type: 'anio', label: 'Año/Temporada' }
    ];
    return this.validateName(name, rules, 'campaña');
  },

  validateAdSetName(name) {
    const policies = window.insituPolicies || {};
    const rules = policies.adset_rules || [];
    return this.validateName(name, rules, 'grupo de anuncios');
  },

  validateAdName(name) {
    const policies = window.insituPolicies || {};
    const rules = policies.ad_rules || [];
    return this.validateName(name, rules, 'anuncio');
  },

  /**
   * Obtiene de forma asíncrona el presupuesto máximo seguro de la extensión,
   * con un fallback seguro de 500 dólares.
   */
  async getBudgetLimit() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get({ maxBudget: 500 }, (result) => {
          window.insituMaxBudget = Number(result.maxBudget);
          resolve(Number(result.maxBudget));
        });
      } else {
        try {
          const stored = localStorage.getItem('insitu_max_budget');
          if (stored) {
            window.insituMaxBudget = Number(stored);
            resolve(Number(stored));
            return;
          }
        } catch (e) {}
        window.insituMaxBudget = 500;
        resolve(500);
      }
    });
  },

  buildUtmUrl(baseUrl, pais, canal, objetivo, producto, anio, cliente, marca, presupuesto) {
    if (!baseUrl) return '';
    
    // Limpiar URL base
    let url = baseUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    const utmSource = this.UTM_SOURCE_MAP[canal] || 'insitu';
    const utmMedium = this.UTM_MEDIUM_MAP[objetivo] || 'paid-media';
    const campaignName = `${pais}_${canal}_${objetivo}_${producto}_${anio}`;

    const separator = url.includes('?') ? '&' : '?';
    let finalUrl = `${url}${separator}utm_source=${encodeURIComponent(utmSource)}&utm_medium=${encodeURIComponent(utmMedium)}&utm_campaign=${encodeURIComponent(campaignName)}`;

    if (cliente) {
      finalUrl += `&utm_client=${encodeURIComponent(cliente)}`;
    }
    if (marca) {
      finalUrl += `&utm_brand=${encodeURIComponent(marca)}`;
    }
    if (presupuesto) {
      finalUrl += `&utm_budget=${encodeURIComponent(presupuesto)}`;
    }

    return finalUrl;
  },

  /**
   * Registra un evento de cumplimiento (cumple o incumple) enviándolo al backend
   */
  logCompliance(platform, campaignName, isValid, errors, level = 'campaign') {
    let campaign_id = null;
    let adset_id = null;
    let ad_id = null;

    try {
      if (typeof window !== 'undefined' && window.location) {
        const url = new URL(window.location.href);
        const params = new URLSearchParams(url.search);
        if (platform.includes('Meta')) {
          campaign_id = params.get('campaign_id') || params.get('campaign_ids');
          adset_id = params.get('adset_id') || params.get('adset_ids') || params.get('adgroup_id');
          ad_id = params.get('ad_id') || params.get('ad_ids');
        } else if (platform.includes('Google')) {
          campaign_id = params.get('campaignId');
          adset_id = params.get('adGroupId');
          ad_id = params.get('creativeId');
        }
      }
    } catch (e) {}

    const dates = this.getCampaignDates();
    const budgetType = this.getCampaignBudgetType();
    const objective = this.extractObjectiveFromName(campaignName);

    const event = {
      timestamp: new Date().toISOString(),
      platform,
      level,
      campaignName,
      isValid,
      budgetType,
      startDate: dates.startDate,
      endDate: dates.endDate,
      objective,
      errors: Array.isArray(errors) ? errors : [errors]
    };

    console.log('[insitu.company] Compliance Event:', event);

    const syncActivity = (token, clientId, brand) => {
      const apiBase = 'https://main--insitu-company-ads.netlify.app';

      // 1. Log to compliance (ai_technical_logs)
      fetch(`${apiBase}/api-extension-compliance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(event)
      }).catch(err => console.warn('[insitu.company] Failed to sync compliance log:', err));

      // 2. Log to activities (police_extension_activities)
      const activityPayload = {
        activity_type: 'utm_campaign_created',
        platform: platform,
        campaign_name: campaignName,
        status: isValid ? 'valid' : 'invalid',
        budget: this.getCampaignBudgetAmount(),
        budget_type: budgetType,
        start_date: dates.startDate,
        end_date: dates.endDate,
        objective: objective,
        client_id: clientId || null,
        brand: brand || null,
        campaign_id,
        adset_id,
        ad_id
      };

      fetch(`${apiBase}/api-police-extension-activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(activityPayload)
      }).catch(err => console.warn('[insitu.company] Failed to sync extension activity:', err));
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get({ insitu_compliance_logs: [], insitu_user_token: null, insitu_active_client: null, insitu_active_brand: null }, (result) => {
        let logs = result.insitu_compliance_logs || [];
        logs.unshift(event);
        if (logs.length > 50) logs.pop(); // Keep last 50
        chrome.storage.local.set({ insitu_compliance_logs: logs });

        // Sincronizar al backend de INsitu (Supabase)
        const token = result.insitu_user_token || window.insituUserToken;
        if (token) {
          syncActivity(token, result.insitu_active_client, result.insitu_active_brand);
        }
      });
    } else {
      // Sync to backend if no extension API (fallback)
      const token = window.insituUserToken;
      if (token) {
        syncActivity(token, null, null);
      }
    }
  },

  getCampaignDates() {
    let startDate = null;
    let endDate = null;

    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
      const type = (input.getAttribute('type') || '').toLowerCase();
      const name = (input.name || '').toLowerCase();
      const id = (input.id || '').toLowerCase();
      const aria = (input.getAttribute('aria-label') || '').toLowerCase();
      const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
      const testid = (input.getAttribute('data-testid') || '').toLowerCase();
      const textRef = `${name} ${id} ${aria} ${placeholder} ${testid}`.toLowerCase();

      if (textRef.includes('start') || textRef.includes('inicio') || textRef.includes('desde')) {
        const d = this.parseFlexibleDate(input.value);
        if (d) startDate = d;
      }
      if (textRef.includes('end') || textRef.includes('fin') || textRef.includes('hasta') || textRef.includes('finaliza')) {
        const d = this.parseFlexibleDate(input.value);
        if (d) endDate = d;
      }
    });

    if (!startDate || !endDate) {
      const textElements = document.querySelectorAll('span, div, p');
      textElements.forEach(el => {
        if (el.children.length === 0 && el.textContent.length < 50) {
          const parentText = (el.parentElement?.innerText || '').toLowerCase();
          if (parentText.includes('inicio') || parentText.includes('start') || parentText.includes('desde')) {
            const d = this.parseFlexibleDate(el.textContent);
            if (d && !startDate) startDate = d;
          }
          if (parentText.includes('fin') || parentText.includes('end') || parentText.includes('hasta') || parentText.includes('finaliza')) {
            const d = this.parseFlexibleDate(el.textContent);
            if (d && !endDate) endDate = d;
          }
        }
      });
    }

    return {
      startDate: startDate ? startDate.toISOString() : null,
      endDate: endDate ? endDate.toISOString() : null
    };
  },

  getCampaignBudgetAmount() {
    const budgetSelectors = [
      'input[data-testid*="budget"]', 'input[aria-label*="presupuesto" i]', 'input[aria-label*="budget" i]',
      'input[placeholder*="presupuesto" i]', 'input[placeholder*="importe" i]',
      'input[id*="budget" i]', 'input[name*="budget" i]'
    ];
    for (const selector of budgetSelectors) {
      const inputs = document.querySelectorAll(selector);
      if (inputs.length > 0) {
        const val = inputs[0].value;
        if (val) {
          const num = parseFloat(val.replace(/[^\d.-]/g, ''));
          if (!isNaN(num)) return num;
        }
      }
    }
    return 0;
  },

  getCampaignBudgetType() {
    const budgetSelectors = [
      'input[data-testid*="budget"]', 'input[aria-label*="presupuesto" i]', 'input[aria-label*="budget" i]',
      'input[placeholder*="presupuesto" i]', 'input[placeholder*="importe" i]',
      'input[id*="budget" i]', 'input[name*="budget" i]'
    ];
    let isDaily = true; // default
    let found = false;
    for (const selector of budgetSelectors) {
      const inputs = document.querySelectorAll(selector);
      if (inputs.length > 0) {
        isDaily = this.detectBudgetIsDaily(inputs[0]);
        found = true;
        break;
      }
    }
    return isDaily ? 'daily' : 'lifetime';
  },

  extractObjectiveFromName(name) {
    if (!name) return null;
    const policies = window.insituPolicies || {};
    const rules = policies.campaign_rules || [
        { type: 'pais', label: 'País' },
        { type: 'canal', label: 'Canal' },
        { type: 'objetivo', label: 'Objetivo' },
        { type: 'producto', label: 'Producto' },
        { type: 'anio', label: 'Año/Temporada' }
    ];
    
    const objectiveIndex = rules.findIndex(r => r.type === 'objetivo');
    if (objectiveIndex !== -1) {
      const segments = name.trim().split('_');
      if (segments[objectiveIndex]) {
        return this.OBJECTIVES[segments[objectiveIndex]] || segments[objectiveIndex];
      }
    }
    return null;
  },

  parseFlexibleDate(str) {
    if (!str) return null;
    str = String(str).trim();
    let d = new Date(str);
    if (!isNaN(d.getTime())) return d;

    const parts = str.match(/(\d{1,2})[\/\- ](\d{1,2})[\/\- ](\d{4})/);
    if (parts) {
      const num1 = parseInt(parts[1], 10);
      const num2 = parseInt(parts[2], 10);
      const year = parseInt(parts[3], 10);
      if (num1 > 12) {
        d = new Date(year, num2 - 1, num1);
      } else {
        d = new Date(year, num1 - 1, num2);
      }
      if (!isNaN(d.getTime())) return d;
    }
    
    const months = {
      ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
      jan: 0, apr: 3, aug: 7, dec: 11,
      enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5, julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
    };
    const cleanStr = str.toLowerCase().replace(/de /g, '').replace(/,/g, '');
    const words = cleanStr.split(/\s+/);
    if (words.length >= 3) {
      let day = parseInt(words[0], 10);
      let monthStr = words[1];
      let year = parseInt(words[2], 10);
      if (isNaN(day)) {
        monthStr = words[0];
        day = parseInt(words[1], 10);
        year = parseInt(words[2], 10);
      }
      
      let monthIdx = -1;
      for (const key in months) {
        if (monthStr.startsWith(key)) {
          monthIdx = months[key];
          break;
        }
      }
      
      if (monthIdx !== -1 && !isNaN(day) && !isNaN(year)) {
        d = new Date(year, monthIdx, day);
        if (!isNaN(d.getTime())) return d;
      }
    }

    return null;
  },

  getCampaignDays() {
    let { startDate, endDate } = this.getCampaignDates();
    if (startDate) startDate = new Date(startDate);
    if (endDate) endDate = new Date(endDate);

    if (startDate && endDate) {
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 1;
    }

    if (startDate && !endDate) {
      return 30; // Campaña continua (se estiman 30 días de gobernanza estándar)
    }

    return 1;
  },

  detectBudgetIsDaily(budgetInput) {
    if (!budgetInput) return true;
    const container = budgetInput.closest('div');
    if (container) {
      const text = container.textContent.toLowerCase();
      if (text.includes('diario') || text.includes('daily')) return true;
      if (text.includes('total') || text.includes('lifetime') || text.includes('conjunto')) return false;
    }

    const parent = budgetInput.parentElement?.parentElement;
    if (parent) {
      const select = parent.querySelector('select, [role="combobox"], [role="listbox"]');
      if (select) {
        const value = (select.value || select.textContent || '').toLowerCase();
        if (value.includes('diario') || value.includes('daily')) return true;
        if (value.includes('total') || value.includes('lifetime') || value.includes('conjunto')) return false;
      }
    }

    return true; // Default
  },

  detectUIObjective() {
    try {
      let detectedObjectiveText = '';
      
      // 1. Try URL parameters first (most reliable)
      const url = window.location.href.toLowerCase();
      if (url.includes('objective=outcome_sales') || url.includes('objective=sales')) return 'SALES';
      if (url.includes('objective=outcome_leads') || url.includes('objective=lead')) return 'LEAD';
      if (url.includes('objective=outcome_traffic') || url.includes('objective=traffic')) return 'TRAF';
      if (url.includes('objective=outcome_awareness') || url.includes('objective=awareness')) return 'AW';
      if (url.includes('objective=outcome_engagement') || url.includes('objective=engagement')) return 'ENG';
      if (url.includes('objective=outcome_app_promotion') || url.includes('objective=app')) return 'APP';

      // 2. Try DOM elements
      const selectedElements = document.querySelectorAll(
        '[aria-selected="true"], [aria-checked="true"], input[type="radio"]:checked, .selected, .active, [role="tab"][aria-selected="true"]'
      );
      
      let detectedObjectiveText = '';
      for (const el of selectedElements) {
        let text = (el.innerText || el.textContent || '').toLowerCase();
        if (!text && el.id) {
           const label = document.querySelector(`label[for="${el.id}"]`);
           if (label) text = (label.innerText || label.textContent || '').toLowerCase();
        }
        if (!text && el.closest('div')) {
           text = (el.closest('div').innerText || '').toLowerCase();
        }
        if (text.length > 0 && text.length < 150) {
          detectedObjectiveText += ' ' + text;
        }
      }

      if (detectedObjectiveText.includes('ventas') || detectedObjectiveText.includes('sales')) return 'SALES';
      if (detectedObjectiveText.includes('conversiones') || detectedObjectiveText.includes('conversion')) return 'CONV';
      if (detectedObjectiveText.includes('clientes potenciales') || detectedObjectiveText.includes('leads') || detectedObjectiveText.includes('lead generation')) return 'LEAD';
      if (detectedObjectiveText.includes('tráfico') || detectedObjectiveText.includes('trafico') || detectedObjectiveText.includes('traffic') || detectedObjectiveText.includes('clics')) return 'TRAF';
      if (detectedObjectiveText.includes('reconocimiento') || detectedObjectiveText.includes('awareness') || detectedObjectiveText.includes('alcance') || detectedObjectiveText.includes('reach')) return 'AW';
      if (detectedObjectiveText.includes('interacción') || detectedObjectiveText.includes('interacciones') || detectedObjectiveText.includes('engagement') || detectedObjectiveText.includes('mensajes')) return 'ENG';
      if (detectedObjectiveText.includes('aplicación') || detectedObjectiveText.includes('app promotion') || detectedObjectiveText.includes('promoción de la app')) return 'APP';

      return null;
    } catch(e) {
      return null;
    }
  },

  updateCampaignDaysBadge() {
    try {
      const days = this.getCampaignDays();
      let badge = document.getElementById('insitu-campaign-days-badge');
      if (!badge) {
        badge = document.createElement('div');
        badge.id = 'insitu-campaign-days-badge';
        badge.style.cssText = `
          position: fixed;
          bottom: 20px;
          left: 20px;
          z-index: 999999;
          background: linear-gradient(135deg, #1e1b4b, #311042);
          color: white;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: bold;
          font-family: system-ui, -apple-system, sans-serif;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          gap: 4px;
          pointer-events: auto;
          transition: all 0.3s ease;
        `;
        document.body.appendChild(badge);
      }

      let hasEndDate = false;
      const inputs = document.querySelectorAll('input');
      for (const input of inputs) {
        const textRef = `${input.name} ${input.id} ${input.getAttribute('aria-label')} ${input.getAttribute('placeholder')} ${input.getAttribute('data-testid')}`.toLowerCase();
        if (textRef.includes('end') || textRef.includes('fin') || textRef.includes('hasta') || textRef.includes('finaliza')) {
          if (this.parseFlexibleDate(input.value)) {
            hasEndDate = true;
            break;
          }
        }
      }

      const daysText = hasEndDate ? `${days} días` : `${days} días (Campaña Continua - Estimado 30 días)`;
      
      // Objective Validation Logic
      let objectiveHtml = '';
      
      let budgetHtml = '';
      const budgetAmount = this.getCampaignBudgetAmount();
      const budgetType = this.getCampaignBudgetType();
      const maxBudget = window.insituMaxBudget || 500;
      
      const expectedTotal = budgetType === 'daily' ? (budgetAmount * days) : budgetAmount;
      
      if (budgetAmount > 0) {
        if (budgetAmount > maxBudget || expectedTotal > maxBudget) {
          budgetHtml = `
            <div style="display:flex; align-items:center; gap:8px; margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1);">
              <span style="font-size:16px;">💸</span>
              <span style="color:#f87171;">Alerta: El estimado total (${expectedTotal.toFixed(2)}) supera el límite de ${maxBudget.toFixed(2)}.</span>
            </div>
          `;
          if (window.insituErrorsCount !== undefined) window.insituErrorsCount++;
        } else {
          budgetHtml = `
            <div style="display:flex; align-items:center; gap:8px; margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1);">
              <span style="font-size:16px;">💸</span>
              <span style="color:#4ade80;">Presupuesto dentro del límite (Estimado: ${expectedTotal.toFixed(2)} | Límite: ${maxBudget.toFixed(2)})</span>
            </div>
          `;
        }
      }
      const uiObjective = this.detectUIObjective();
      
      // Find the campaign name input to extract the intended objective
      let campaignName = '';
      const nameInputs = document.querySelectorAll('input[data-insitu-level="campaign"], input[name*="campaign"], input[placeholder*="campaña"]');
      if (nameInputs.length > 0) {
        campaignName = nameInputs[0].value || '';
      }
      
      const nameObjectiveCode = this.extractObjectiveFromName(campaignName);
      
      if (nameObjectiveCode && uiObjective && nameObjectiveCode !== this.OBJECTIVES[uiObjective]) {
        // Mismatch!
        const expectedName = this.OBJECTIVES[uiObjective];
        objectiveHtml = `
          <div style="display:flex; align-items:center; gap:8px; margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1);">
            <span style="font-size:16px;">⚠️</span>
            <span style="color:#f87171;">Error de Objetivo: Nombraste la campaña como <strong>${nameObjectiveCode}</strong> pero la plataforma está configurada para <strong>${expectedName}</strong>.</span>
          </div>
        `;
        // Bloquear publicación
        if (window.insituErrorsCount !== undefined) window.insituErrorsCount++;
      } else if (nameObjectiveCode && !uiObjective) {
        objectiveHtml = `
          <div style="display:flex; align-items:center; gap:8px; margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1);">
            <span style="font-size:16px;">⚠️</span>
            <span style="color:#fbbf24;">Aviso: Verifica que el objetivo en la plataforma coincida con <strong>${nameObjectiveCode}</strong>.</span>
          </div>
        `;
      } else if (nameObjectiveCode) {
        objectiveHtml = `
          <div style="display:flex; align-items:center; gap:8px; margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1);">
            <span style="font-size:16px;">🎯</span>
            <span style="color:#4ade80;">Objetivo Detectado y Validado: <strong>${nameObjectiveCode}</strong></span>
          </div>
        `;
      }

      badge.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:16px;">📅</span>
          <span>Duración de Campaña: <strong style="color:#f43f5e;">${daysText}</strong></span>
        </div>
        ${objectiveHtml}
        ${budgetHtml}
      `;
    } catch (e) {
      console.error('[insitu.company] Error updating campaign days badge:', e);
    }
  },

  initPublishBlocker() {
    if (window.insituPublishBlockerInitialized) return;
    this.getBudgetLimit(); // Initialize max budget cache
    window.insituPublishBlockerInitialized = true;
    window.insituErrorsCount = 0; // Global error counter

    // Inject CSS
    const style = document.createElement('style');
    style.textContent = `
      .insitu-blocked-publish {
        filter: blur(2px) grayscale(80%) !important;
        opacity: 0.6 !important;
        cursor: not-allowed !important;
        pointer-events: none !important;
        transition: all 0.3s ease !important;
      }
    `;
    document.head.appendChild(style);

    const isPublishButton = (el) => {
      if (!el || typeof el.getAttribute !== 'function') return false;
      const text = (el.innerText || '').toLowerCase();
      const testId = (el.getAttribute('data-testid') || '').toLowerCase();
      const aria = (el.getAttribute('aria-label') || '').toLowerCase();
      
      const isPublishText = text.includes('publicar') || text.includes('publish') || text.includes('lanzar') || text.includes('confirmar');
      const isPublishAttr = testId.includes('publish') || aria.includes('publish') || aria.includes('publicar');
      
      return (isPublishText || isPublishAttr);
    };

    const updateButtons = () => {
      const isInvalid = window.insituErrorsCount > 0;
      const buttons = document.querySelectorAll('button, [role="button"], [data-testid*="publish"], [data-testid*="confirm"]');
      buttons.forEach(btn => {
        if (isPublishButton(btn)) {
          if (isInvalid) {
            btn.classList.add('insitu-blocked-publish');
          } else {
            btn.classList.remove('insitu-blocked-publish');
          }
        }
      });
    };

    setInterval(updateButtons, 1000);

    document.addEventListener('click', (e) => {
      if (window.insituErrorsCount > 0) {
        const btn = e.target.closest('button, [role="button"], [data-testid*="publish"], [data-testid*="confirm"]');
        if (btn && isPublishButton(btn)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          let badge = document.getElementById('insitu-global-validation-badge');
          if (badge) {
            badge.textContent = '⚠️ Bloqueo de INsitu: Corrige la nomenclatura en rojo para poder publicar.';
            badge.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
            badge.style.display = 'block';
            badge.style.top = (e.clientY + 15) + 'px';
            badge.style.left = e.clientX + 'px';
          }
        }
      }
    }, true);
  }
};

// Exposición global para que los inyectores y popup puedan utilizarla independientemente de la carga de scripts
if (typeof window !== 'undefined') {
  window.InsituValidator = InsituValidator;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InsituValidator;
}
