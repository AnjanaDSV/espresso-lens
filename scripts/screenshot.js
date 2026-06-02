const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.screenshot({
    path: path.join(__dirname, '../docs/screenshots/ui-demo.png'),
    fullPage: true,
  });
  console.log('Screenshot saved to docs/screenshots/ui-demo.png');
  await browser.close();
})();
