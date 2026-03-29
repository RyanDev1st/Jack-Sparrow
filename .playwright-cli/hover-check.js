const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
  const button = page.getByRole('button', { name: 'Start treasure hunt' });
  await button.hover();
  await page.screenshot({ path: 'start-hover-final.png', scale: 'css' });
  await browser.close();
})();
