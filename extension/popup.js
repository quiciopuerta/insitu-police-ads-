/**
 * popup.js
 * Lógica del panel de control de Gobernanza de insitu.company.
 */

const API_URLS = [
  'https://main--insitu-company-ads.netlify.app',
  'https://insitu.company'
];

async function fetchWithFallback(path, options = {}) {
  let lastError;
  for (const base of API_URLS) {
    try {
      const res = await fetch(base + path, options);
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('text/html') && res.ok) {
        continue;
      }
      if (!res.ok && res.status === 404 && base !== API_URLS[API_URLS.length - 1]) {
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('All API endpoints failed');
}

document.addEventListener('DOMContentLoaded', async () => {
  const manifestData = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest ? chrome.runtime.getManifest() : { version: '1.0.14' };
  const versionLabel = document.getElementById('version-label');
  if (versionLabel) versionLabel.textContent = `v${manifestData.version}`;

  // TABS LOGIC
  const tabBtns = document.querySelectorAll('.tab-btn:not(.external)');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active from all
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Add active to clicked
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-target');
      document.getElementById(targetId).classList.add('active');

      if (targetId === 'tab-historial') {
        renderHistory();
      } else if (targetId === 'tab-politicas') {
        renderPolicies();
      }
    });
  });

  // EXTERNAL LINKS
  const dashboardBase = 'https://insitu.company/police-ads';
  document.getElementById('btn-link-clientes')?.addEventListener('click', () => window.open(`${dashboardBase}?tab=clients`, '_blank'));
  document.getElementById('btn-link-cuentas')?.addEventListener('click', () => window.open(`${dashboardBase}?tab=accounts`, '_blank'));
  document.getElementById('btn-link-alertas')?.addEventListener('click', () => window.open(`${dashboardBase}?tab=alerts`, '_blank'));

  // KEEP OPEN
  const btnKeepOpen = document.getElementById('btn-keep-open');
  if (btnKeepOpen) {
    btnKeepOpen.addEventListener('click', () => {
      chrome.windows.create({
        url: 'popup.html',
        type: 'popup',
        width: 480,
        height: 600,
        focused: true
      });
      window.close();
    });
  }

  // AUTH LOGIC
  const authScreen = document.getElementById('auth-screen');
  const mainApp = document.getElementById('main-app');
  const btnLogin = document.getElementById('btn-login');
  const authEmail = document.getElementById('auth-email');
  const authPassword = document.getElementById('auth-password');
  const authError = document.getElementById('auth-error');
  const authLoading = document.getElementById('auth-loading');

  const checkAuth = async () => {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      showAuthScreen();
      return;
    }
    const data = await chrome.storage.local.get(['insitu_user_token', 'insitu_user_email', 'insitu_session_expiry']);
    if (data.insitu_user_token && data.insitu_user_email) {
      const now = Date.now();
      const expiry = data.insitu_session_expiry || 0;
      if (expiry > now) {
        showMainApp();
        return;
      }
      
      const isValid = await validateToken(data.insitu_user_token, data.insitu_user_email);
      if (isValid) {
        await updatePolicies(data.insitu_user_token);
        await chrome.storage.local.set({ insitu_session_expiry: now + 24 * 60 * 60 * 1000 });
        showMainApp();
      } else {
        await chrome.storage.local.remove(['insitu_user_token', 'insitu_user_email', 'insitu_session_expiry']);
        showAuthScreen();
      }
    } else {
      showAuthScreen();
    }
  };

  const validateToken = async (token, email) => {
    try {
      const response = await fetchWithFallback('/api/auth/user/' + token, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        return data && data.email === email;
      }
      return false;
    } catch (err) {
      return true; // Assume ok if offline
    }
  };

  const showAuthScreen = () => { authScreen.style.display = 'flex'; mainApp.style.display = 'none'; };
  const showMainApp = () => { authScreen.style.display = 'none'; mainApp.style.display = 'block'; initializeMainApp(); };

  const updatePolicies = async (token) => {
    try {
      const orgsRes = await fetchWithFallback('/api-police-organizations', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!orgsRes.ok) return;
      const orgs = await orgsRes.json();
      if (!orgs || orgs.length === 0) return;
      
      const orgId = orgs[0].id;
      const polRes = await fetchWithFallback(`/api-police-policies?organization_id=${orgId}&fetch_all=true`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!polRes.ok) return;
      const policies = await polRes.json();
      await chrome.storage.local.set({ insitu_policies: policies });
    } catch (e) {
      console.warn('Failed to update policies:', e);
    }
  };

  btnLogin.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = authEmail.value.trim();
    const password = authPassword.value.trim();
    if (!email || !password) return;

    authLoading.style.display = 'block';
    authError.style.display = 'none';

    try {
      const response = await fetchWithFallback('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password: password, recaptchaToken: '' })
      });

      const result = await response.json();

      if (response.ok && result.token) {
        const token = result.token; // JWT firmado — nunca usar UUID como token
        await chrome.storage.local.set({
          insitu_user_token: token,
          insitu_user_email: email,
          insitu_session_expiry: Date.now() + 24 * 60 * 60 * 1000
        });
        await updatePolicies(token);
        showMainApp();
      } else {
        if (response.ok && !result.token) {
          authError.textContent = 'Error: Servidor no retornó token. Recibido: ' + JSON.stringify(result).substring(0, 80);
        } else {
          authError.textContent = result.error || ('Credenciales inválidas (HTTP ' + response.status + ')');
        }
        authError.style.display = 'block';
      }
    } catch (err) {
      authError.textContent = 'Error de conexión con el servidor.';
      authError.style.display = 'block';
    } finally {
      authLoading.style.display = 'none';
    }
  });

  let detectedIds = { campaign_id: null, adset_id: null, ad_id: null };

  const loadClients = async (token, activeClient) => {
    try {
      const select = document.getElementById('client-select');
      if (!select) return;
      const res = await fetchWithFallback('/api-police-clients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const clients = await res.json();
      select.innerHTML = '<option value="">Selecciona Cliente</option>' + 
        clients.map(c => `<option value="${c.id}" ${c.id === activeClient ? 'selected' : ''}>${c.name}</option>`).join('');
    } catch (err) {
      console.warn('Failed to load clients:', err);
    }
  };

  const getActiveTabDetails = () => {
    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) return;
      const activeTab = tabs[0];
      const urlStr = activeTab.url || '';
      
      // Setup parser
      const url = new URL(urlStr);
      const params = new URLSearchParams(url.search);

      let platform = 'Unknown';
      if (url.hostname.includes('facebook.com')) {
        platform = 'Meta Ads';
        detectedIds.campaign_id = params.get('campaign_id') || params.get('campaign_ids');
        detectedIds.adset_id = params.get('adset_id') || params.get('adset_ids') || params.get('adgroup_id');
        detectedIds.ad_id = params.get('ad_id') || params.get('ad_ids');
      } else if (url.hostname.includes('google.com')) {
        platform = 'Google Ads';
        detectedIds.campaign_id = params.get('campaignId');
        detectedIds.adset_id = params.get('adGroupId');
        detectedIds.ad_id = params.get('creativeId');
      } else if (url.hostname.includes('tiktok.com')) {
        platform = 'TikTok Ads';
        detectedIds.campaign_id = params.get('campaign_id');
        detectedIds.adset_id = params.get('adgroup_id');
        detectedIds.ad_id = params.get('ad_id');
      } else if (url.hostname.includes('linkedin.com')) {
        platform = 'LinkedIn Ads';
        detectedIds.campaign_id = params.get('campaignId');
        detectedIds.adset_id = params.get('adGroupId');
        detectedIds.ad_id = params.get('creativeId');
      } else if (url.hostname.includes('pinterest.com')) {
        platform = 'Pinterest Ads';
        detectedIds.campaign_id = params.get('campaign');
        detectedIds.adset_id = params.get('adgroup');
        detectedIds.ad_id = params.get('ad');
      } else if (url.hostname.includes('twitter.com') || url.hostname.includes('x.com')) {
        platform = 'X Ads';
        detectedIds.campaign_id = params.get('campaign_id');
        detectedIds.adset_id = params.get('line_item_id');
      } else if (url.hostname.includes('snapchat.com')) {
        platform = 'Snapchat Ads';
        detectedIds.campaign_id = params.get('campaign_id');
        detectedIds.adset_id = params.get('adgroup_id');
      } else if (url.hostname.includes('amazon.com')) {
        platform = 'Amazon Advertising';
        detectedIds.campaign_id = params.get('campaign_id');
      } else if (url.hostname.includes('microsoft.com')) {
        platform = 'Microsoft Ads';
        detectedIds.campaign_id = params.get('campaign_id');
      } else if (url.hostname.includes('yahoo.com')) {
        platform = 'Yahoo Advertising';
      } else if (url.hostname.includes('criteo.com')) {
        platform = 'Criteo';
      } else if (url.hostname.includes('outbrain.com')) {
        platform = 'Outbrain';
      } else if (url.hostname.includes('taboola.com')) {
        platform = 'Taboola';
      }

      if (platform !== 'Unknown') {
        const selectChannel = document.getElementById('channel');
        if (selectChannel) {
          if (platform === 'Meta Ads') selectChannel.value = 'FB';
          else if (platform === 'Google Ads') selectChannel.value = 'GO';
          else if (platform === 'TikTok Ads') selectChannel.value = 'TK';
          else if (platform === 'LinkedIn Ads') selectChannel.value = 'LI';
          else if (platform === 'Pinterest Ads') selectChannel.value = 'PI';
          else if (platform === 'X Ads') selectChannel.value = 'XAds';
          else if (platform === 'Snapchat Ads') selectChannel.value = 'SC';
          else if (platform === 'Amazon Advertising') selectChannel.value = 'AMZ';
          else if (platform === 'Microsoft Ads') selectChannel.value = 'MS';
          else if (platform === 'Yahoo Advertising') selectChannel.value = 'YHO';
          else if (platform === 'Criteo') selectChannel.value = 'CRT';
          else if (platform === 'Outbrain') selectChannel.value = 'OB';
          else if (platform === 'Taboola') selectChannel.value = 'TB';
          
          // Trigger output update
          selectChannel.dispatchEvent(new Event('input'));
        }
      }
    });
  };

  const logExtensionActivity = async (activityType, status) => {
    try {
      const data = await chrome.storage.local.get(['insitu_user_token']);
      const token = data.insitu_user_token || window.insituUserToken;
      if (!token) return;

      const client_id = document.getElementById('client-select')?.value || null;
      const brand = document.getElementById('brand-input')?.value || null;
      const platformVal = document.getElementById('channel')?.value || 'Unknown';
      const campaignName = document.getElementById('campaign-output')?.textContent || '';
      const budget = document.getElementById('campaign-budget')?.value || null;
      const utm_url = document.getElementById('url-output')?.textContent || '';
      
      const objective = document.getElementById('objective')?.value || null;

      const maxBudgetRes = await chrome.storage.local.get({ maxBudget: 500 });
      const max_budget_allowed = maxBudgetRes.maxBudget;

      const payload = {
        client_id,
        brand,
        activity_type: activityType,
        platform: platformVal,
        campaign_name: campaignName,
        budget,
        objective,
        max_budget_allowed,
        status,
        utm_url,
        campaign_id: detectedIds.campaign_id,
        adset_id: detectedIds.adset_id,
        ad_id: detectedIds.ad_id
      };

      await fetchWithFallback('/api-police-extension-activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.warn('Failed to log extension activity:', err);
    }
  };

  // DASHBOARD GENERATOR LOGIC
  const initializeMainApp = () => {
    const inputCountry = document.getElementById('country');
    const inputChannel = document.getElementById('channel');
    const inputObjective = document.getElementById('objective');
    const inputProduct = document.getElementById('product');
    const inputSeason = document.getElementById('season');
    const campaignOutput = document.getElementById('campaign-output');
    const urlOutput = document.getElementById('url-output');
    const baseUrlInput = document.getElementById('base-url');
    const validationStatus = document.getElementById('validation-status');
    const validationReason = document.getElementById('validation-reason');
    const inputCampaignBudget = document.getElementById('campaign-budget');
    const budgetAlert = document.getElementById('budget-alert');

    // Load clients
    chrome.storage.local.get(['insitu_user_token', 'insitu_active_client', 'insitu_active_brand'], (res) => {
      if (res.insitu_user_token) {
        loadClients(res.insitu_user_token, res.insitu_active_client);
      }
      if (document.getElementById('brand-input') && res.insitu_active_brand) {
        document.getElementById('brand-input').value = res.insitu_active_brand;
      }
    });

    // Detect active tab and potential IDs
    getActiveTabDetails();

    const updateOutput = () => {
      const country = inputCountry.value;
      const channel = inputChannel.value;
      const objective = inputObjective.value;
      const product = inputProduct.value || 'Producto';
      const season = inputSeason.value || '2026';
      
      const combined = `${country}_${channel}_${objective}_${product}_${season}`;
      campaignOutput.textContent = combined;
      
      chrome.storage.local.get({ maxBudget: 500 }, (res) => {
        const maxBudget = Number(res.maxBudget);
        const campaignBudget = Number(inputCampaignBudget?.value || 0);

        let finalStatus = 'valid';

        if (campaignBudget > maxBudget) {
          budgetAlert.style.display = 'block';
          validationStatus.className = 'status-badge error';
          validationStatus.textContent = '✕ EXCESO PRESUPUESTO';
          if (validationReason) validationReason.style.display = 'none';
          finalStatus = 'error_budget';
        } else {
          budgetAlert.style.display = 'none';
          if (window.InsituValidator) {
            const result = window.InsituValidator.validateCampaignName(combined);
            if (result.isValid) {
              validationStatus.className = 'status-badge ok';
              validationStatus.textContent = '✓ OK';
              if (validationReason) validationReason.style.display = 'none';
              finalStatus = 'valid';
            } else {
              validationStatus.className = 'status-badge error';
              validationStatus.textContent = '✕ INVÁLIDO';
              if (validationReason) {
                validationReason.textContent = result.reason || 'Formato incorrecto';
                validationReason.style.display = 'block';
              }
              finalStatus = 'invalid';
            }
          }
        }
        
        if (window.InsituValidator) {
          const clientSelect = document.getElementById('client-select');
          const clientName = clientSelect && clientSelect.selectedIndex >= 0 ? clientSelect.options[clientSelect.selectedIndex]?.text : '';
          const brandVal = document.getElementById('brand-input')?.value || '';
          const budgetVal = inputCampaignBudget?.value || '';

          urlOutput.textContent = window.InsituValidator.buildUtmUrl(
            baseUrlInput.value,
            country,
            channel,
            objective,
            product,
            season,
            clientName && clientName !== 'Selecciona Cliente' ? clientName : '',
            brandVal,
            budgetVal
          );
        }
      });
    };

    const selectClient = document.getElementById('client-select');
    const inputBrand = document.getElementById('brand-input');

    const saveClientAndBrand = () => {
      const clientVal = selectClient ? selectClient.value : null;
      const brandVal = inputBrand ? inputBrand.value : null;
      chrome.storage.local.set({ 
        insitu_active_client: clientVal, 
        insitu_active_brand: brandVal 
      });
    };

    [inputCountry, inputChannel, inputObjective, inputProduct, inputSeason, baseUrlInput, inputCampaignBudget, selectClient, inputBrand].forEach(el => {
      if (el) {
        el.addEventListener('input', () => {
          if (el === selectClient || el === inputBrand) saveClientAndBrand();
          updateOutput();
        });
        if (el.tagName === 'SELECT') {
          el.addEventListener('change', () => {
            if (el === selectClient || el === inputBrand) saveClientAndBrand();
            updateOutput();
          });
        }
      }
    });
    
    // Validar por primera vez al abrir
    updateOutput();

    // Budget Limit Logic
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get({ maxBudget: 500 }, (res) => {
        const inputBudget = document.getElementById('input-budget-limit');
        const badge = document.getElementById('indicator-badge');
        if (inputBudget) inputBudget.value = res.maxBudget;
        if (badge) badge.textContent = `$${res.maxBudget} USD`;
      });
    }

    const btnSaveBudget = document.getElementById('btn-save-budget');
    if (btnSaveBudget) {
      btnSaveBudget.addEventListener('click', () => {
        const limit = document.getElementById('input-budget-limit').value;
        if (chrome.storage && chrome.storage.local && limit) {
          chrome.storage.local.set({ maxBudget: Number(limit) }, () => {
            const badge = document.getElementById('indicator-badge');
            if (badge) badge.textContent = `$${limit} USD`;
            btnSaveBudget.textContent = 'Guardado';
            
            // Log budget control change
            logExtensionActivity('budget_control_set', 'valid');

            setTimeout(() => { btnSaveBudget.textContent = 'Guardar'; }, 2000);
            updateOutput();
          });
        }
      });
    }

    // Copiar lógica
    const setupCopy = (btnId, outputId, tooltipId, activityType) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      btn.addEventListener('click', async () => {
        const text = document.getElementById(outputId).textContent;
        await navigator.clipboard.writeText(text);
        const tooltip = document.getElementById(tooltipId);
        tooltip.classList.add('show');
        
        // Log UTM campaign created/copied
        chrome.storage.local.get({ maxBudget: 500 }, (res) => {
          const maxBudget = Number(res.maxBudget);
          const campaignBudget = Number(inputCampaignBudget?.value || 0);
          const finalStatus = campaignBudget > maxBudget ? 'error_budget' : 'valid';
          logExtensionActivity(activityType, finalStatus);
        });

        setTimeout(() => tooltip.classList.remove('show'), 2000);
      });
    };
    setupCopy('btn-copy-campaign', 'campaign-output', 'tooltip-campaign', 'utm_campaign_created');
    setupCopy('btn-copy-url', 'url-output', 'tooltip-url', 'utm_campaign_created');

    updateOutput();
  };

  // HISTORY RENDER LOGIC
  const renderHistory = () => {
    const container = document.getElementById('history-container');
    if (!chrome.storage || !chrome.storage.local) return;

    chrome.storage.local.get({ insitu_compliance_logs: [] }, (result) => {
      const logs = result.insitu_compliance_logs;
      if (!logs || logs.length === 0) {
        container.innerHTML = '<div class="empty-state">No hay validaciones recientes. Abre Facebook o Google Ads y edita una campaña.</div>';
        return;
      }

      container.innerHTML = logs.map(log => {
        const isOk = log.isValid;
        const dateStr = new Date(log.timestamp).toLocaleString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        
        return `
          <div class="history-item">
            <div class="history-item-header">
              <span class="history-platform">${log.platform} • ${log.level || 'Campaña'}</span>
              <span class="history-time">${dateStr}</span>
            </div>
            <div class="history-name" style="border-color: ${isOk ? '#10b981' : '#ef4444'}">
              ${log.campaignName || '(sin nombre)'}
            </div>
            ${!isOk ? `<div class="history-errors">${log.errors.join('<br>')}</div>` : ''}
          </div>
        `;
      }).join('');
    });
  };

  document.getElementById('btn-refresh-history')?.addEventListener('click', renderHistory);

  // POLICIES RENDER LOGIC
  const renderPolicies = () => {
    const container = document.getElementById('policies-container');
    if (!chrome.storage || !chrome.storage.local) return;

    chrome.storage.local.get({ insitu_policies: {} }, (result) => {
      const policies = result.insitu_policies;
      if (!policies || Object.keys(policies).length === 0) {
        container.innerHTML = '<div class="empty-state">No hay políticas cargadas o no estás autenticado.</div>';
        return;
      }

      const buildGroup = (title, rules) => {
        if (typeof rules === 'string') {
          try {
            rules = JSON.parse(rules);
          } catch (e) {
            rules = [];
          }
        }
        if (!rules || !Array.isArray(rules) || rules.length === 0) return '';
        const list = rules.map(r => `<div class="policy-rule"><span>${r.type}</span> ${r.label}</div>`).join('');
        return `
          <div class="policy-group">
            <div class="policy-group-title">${title}</div>
            <div class="policy-rules">${list}</div>
          </div>
        `;
      };

      const html = 
        buildGroup('Reglas de Campaña', policies.campaign_rules) +
        buildGroup('Reglas de Grupos de Anuncios', policies.adset_rules) +
        buildGroup('Reglas de Anuncios', policies.ad_rules);

      container.innerHTML = html || '<div class="empty-state">La organización no tiene reglas configuradas.</div>';
    });
  };

  checkAuth();
});
