const puppeteer = require('puppeteer');
const http = require('http');

async function checkServer() {
  return new Promise((resolve) => {
    http.get('http://localhost:3001/', (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => {
      resolve(false);
    });
  });
}

async function runQA() {
  console.log('🔍 [QA Agent] Iniciando pruebas en Producción...');
  
  // 1. Check if server is running
  const isServerRunning = await checkServer();
  if (!isServerRunning) {
    console.error('❌ [QA Agent] El servidor no está respondiendo en el puerto 3001. Asegúrate de ejecutar "npm run server".');
    process.exit(1);
  }
  console.log('✅ [QA Agent] Servidor de producción (Express) respondiendo correctamente.');

  // 2. Start browser
  console.log('🔍 [QA Agent] Lanzando navegador headless para auditoría visual...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Set viewport
  await page.setViewport({ width: 1440, height: 900 });

  try {
    // 3. Navigate to app
    console.log('🔍 [QA Agent] Navegando a la Landing Page...');
    const response = await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
    
    if (response.status() === 200) {
      console.log('✅ [QA Agent] Página cargada exitosamente (Status: 200).');
    } else {
      console.log(`⚠️ [QA Agent] Advertencia: Código de estado HTTP ${response.status()}`);
    }

    // 4. Verify basic DOM elements (e.g., Title, Navbar, etc.)
    const title = await page.title();
    console.log(`✅ [QA Agent] Título de la página: "${title}"`);
    
    if (title.includes('INsitu AI')) {
      console.log('✅ [QA Agent] Branding correcto en el título.');
    } else {
      console.log('❌ [QA Agent] Error de Branding: Título no coincide con INsitu AI.');
    }

    // Capture screenshot for evidence
    await page.screenshot({ path: 'screenshot_landing.png' });
    console.log('📸 [QA Agent] Captura de pantalla guardada como "screenshot_landing.png"');

    // 5. Test Expert Agent route or component presence if possible
    // Wait for the UI to be fully hydrated
    await page.waitForTimeout(2000); 

    // Find links or buttons (checking interactivity)
    const linksCount = await page.$$eval('a, button', elements => elements.length);
    console.log(`✅ [QA Agent] Detectados ${linksCount} elementos interactivos (enlaces/botones).`);

    console.log('🎉 [QA Agent] Prueba de humo finalizada exitosamente.');

  } catch (error) {
    console.error('❌ [QA Agent] Error durante la navegación:', error.message);
  } finally {
    await browser.close();
  }
}

runQA();
