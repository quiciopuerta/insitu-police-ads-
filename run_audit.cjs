const puppeteer = require('puppeteer-core');

async function runAudit() {
  console.log("Connecting to Chrome on port 9222...");
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://localhost:9222' });
  } catch (err) {
    console.error("Failed to connect to Chrome. Make sure it was launched with --remote-debugging-port=9222", err);
    return;
  }

  const page = await browser.newPage();
  console.log("Navigating to production (insitu.company/creative-lab/research)...");
  
  await page.goto('https://insitu.company/creative-lab/research', { waitUntil: 'networkidle2' });
  console.log("Page loaded. Taking screenshot of initial state...");
  await page.screenshot({ path: 'audit_step1_initial.png' });
  
  console.log("Audit script connected successfully! We can now simulate clicks or interactions.");
  await browser.disconnect();
}

runAudit();
