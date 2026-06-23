const puppeteer = require('puppeteer-core');

async function runUITest() {
  console.log("Connecting to Chrome on port 9222...");
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  } catch (err) {
    console.error("Failed to connect", err);
    return;
  }

  const page = await browser.newPage();
  console.log("Navigating to Research Hub...");
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

  console.log("Waiting for UI to load...");
  // Simulate clicking on the Research module tab if there is one
  // I don't know the exact DOM elements, so I will just take a screenshot and look.
  await page.screenshot({ path: 'ui_test_1.png' });

  console.log("Done.");
  await browser.disconnect();
}

runUITest();
