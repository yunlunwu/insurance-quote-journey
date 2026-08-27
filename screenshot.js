const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  await page.goto('http://localhost:4300/');
  await page.waitForSelector('text=About You');
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/about-you.png' });

  // Fill email/phone so we can see the Lifestyle sub-step highlighted next
  await page.fill('#email', 'a@b.com');
  await page.fill('#phone', '0400000000');
  await page.selectOption('#occupation', 'Teacher');
  await page.click('button:has-text("Next")');
  await page.waitForSelector('text=Lifestyle');
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/lifestyle.png' });

  await browser.close();
})();
