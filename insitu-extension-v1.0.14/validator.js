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
    'AW': 'Reconocimiento (Awareness)'
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
          resolve(Number(result.maxBudget));
        });
      } else {
        // En caso de que se use en la web simulada o en un fallback local
        try {
          const stored = localStorage.getItem('insitu_max_budget');
          if (stored) {
            resolve(Number(stored));
            return;
          }
        } catch (e) {}
        resolve(500);
      }
    });
  },

  /**
   * Construye una dirección de URL unida a los UTMs oficiales correspondientes.
   */
  buildUtmUrl(baseUrl, pais, canal, objetivo, producto, anio) {
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
    return `${url}${separator}utm_source=${encodeURIComponent(utmSource)}&utm_medium=${encodeURIComponent(utmMedium)}&utm_campaign=${encodeURIComponent(campaignName)}`;
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

    const event = {
      timestamp: new Date().toISOString(),
      platform,
      level,
      campaignName,
      isValid,
      errors: Array.isArray(errors) ? errors : [errors]
    };

    console.log('[insitu.company] Compliance Event:', event);

    const syncActivity = (token) => {
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
      chrome.storage.local.get({ insitu_compliance_logs: [], insitu_user_token: null }, (result) => {
        let logs = result.insitu_compliance_logs || [];
        logs.unshift(event);
        if (logs.length > 50) logs.pop(); // Keep last 50
        chrome.storage.local.set({ insitu_compliance_logs: logs });

        // Sincronizar al backend de INsitu (Supabase)
        const token = result.insitu_user_token || window.insituUserToken;
        if (token) {
          syncActivity(token);
        }
      });
    } else {
      // Sync to backend if no extension API (fallback)
      const token = window.insituUserToken;
      if (token) {
        syncActivity(token);
      }
    }
  },

  initPublishBlocker() {
    if (window.insituPublishBlockerInitialized) return;
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
