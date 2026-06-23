// Bridge between extension and webpage
// Sends message that extension is installed

console.log('[insitu.company] Extension is active and ready');

window.postMessage({
  type: 'INSITU_EXTENSION_READY',
  extensionId: (typeof chrome !== 'undefined' && chrome.runtime) ? chrome.runtime.id : '',
  version: (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) ? chrome.runtime.getManifest().version : '1.0.14',
  platform: detectPlatform()
}, '*');

function detectPlatform() {
  const url = window.location.href;
  if (url.includes('facebook.com')) return 'meta';
  if (url.includes('ads.google.com')) return 'google';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('pinterest.com')) return 'pinterest';
  if (url.includes('linkedin.com')) return 'linkedin';
  if (url.includes('snapchat.com')) return 'snapchat';
  if (url.includes('twitter.com')) return 'x';
  if (url.includes('amazon.com')) return 'amazon';
  if (url.includes('ads.microsoft.com')) return 'bing';
  if (url.includes('yahoo.com')) return 'yahoo';
  return 'unknown';
}

// Listen for validation requests from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'VALIDATE_CAMPAIGN') {
    console.log('[insitu.company] Validating:', request.campaignName);
    
    // Validation logic here
    const isValid = validateCampaignName(request.campaignName);
    
    sendResponse({
      isValid: isValid.isValid,
      errors: isValid.errors,
      campaignName: request.campaignName
    });
  }
});

function validateCampaignName(name) {
  // PAÍS_CANAL_OBJETIVO_PRODUCTO_AÑO format
  const regex = /^[A-Z]{2}_[A-Z]{2,}_[A-Z]{3,}_[A-Za-z0-9\-]{3,}_\d{4}$/;
  
  if (regex.test(name)) {
    return { isValid: true, errors: [] };
  }
  
  const errors = [];
  const parts = name.split('_');
  
  if (parts.length !== 5) {
    errors.push(`Expected 5 parts separated by underscore, got ${parts.length}`);
  }
  if (parts[0] && parts[0].length !== 2) {
    errors.push('Country code should be 2 letters (e.g., EC, CO, PE)');
  }
  if (parts[1] && parts[1].length < 2) {
    errors.push('Channel should be 2+ letters (e.g., FB, GO, TT)');
  }
  if (parts[2] && parts[2].length < 3) {
    errors.push('Objective should be 3+ letters (e.g., CONV, LEAD)');
  }
  
  return { isValid: false, errors };
}
