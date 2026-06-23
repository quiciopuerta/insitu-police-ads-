const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  
  try {
    console.log("Navigating to production...");
    await page.goto('https://policeads.insitu.company/');
    
    console.log("Waiting for Auth Gate...");
    await page.waitForSelector('input[placeholder="Usuario o Email"]', { timeout: 10000 });
    
    console.log("Filling credentials...");
    await page.fill('input[placeholder="Usuario o Email"]', 'sociopuerta@gmail.com');
    await page.fill('input[type="password"]', 'Maxi2018@');
    
    await page.waitForTimeout(2000);
    
    console.log("Submitting form...");
    await page.click('button[type="submit"]');
    
    console.log("Waiting for result...");
    await page.waitForTimeout(4000);
    
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.includes("Falla en validación") || bodyText.includes("Could not find widget")) {
      console.error("FAILED: Turnstile validation error still present!");
    } else if (bodyText.includes("¡Bienvenido")) {
      console.log("SUCCESS: Login successful!");
    } else {
      console.log("Unknown result. Page text:", bodyText.substring(0, 500));
    }
  } catch (err) {
    console.error("Script error:", err);
  } finally {
    await browser.close();
  }
})();
