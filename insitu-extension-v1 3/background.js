/**
 * Service Worker para insitu.company Extension
 * Maneja eventos globales y estado de la extensión
 */

console.log('[insitu.company] Service Worker iniciado');

// Listener para instalar la extensión
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[insitu.company] Extensión instalada');
    // Aquí podrías abrir una página de bienvenida
  }
});

// Habilitar que el side panel se abra al hacer clic en el ícono de la extensión
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('[insitu.company] Error configurando sidePanel:', error));
}

// Listener para mensajes desde content scripts o popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[insitu.company] Mensaje recibido:', request);

  if (request.action === 'validate') {
    // Ejemplo: procesar validación desde content script
    sendResponse({ status: 'ok' });
  }
});



// Listener para mensajes externos (desde la web app)
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  console.log('[insitu.company] Mensaje externo recibido:', request);
  if (request.type === 'VALIDATE_CAMPAIGN') {
    // Regex de prueba rápida o usar window.InsituValidator si estuviera inyectado
    const regex = /^[A-Z]{2}_[A-Z]{2,}_[A-Z]{3,}_[A-Za-z0-9\-]{3,}_\d{4}$/;
    const isValid = regex.test(request.campaignName);
    sendResponse({
      isValid: isValid,
      errors: isValid ? [] : ['Formato incorrecto (PAIS_CANAL_OBJETIVO_PRODUCTO_AÑO)'],
      campaignName: request.campaignName
    });
    return true; // Indicar respuesta asíncrona (aunque sea síncrona aquí)
  }
});
