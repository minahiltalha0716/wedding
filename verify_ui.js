import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const filePath = 'file://' + path.resolve('mehndi-invitation.html');

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(filePath);

  // Wait for images to load
  await page.waitForTimeout(2000);

  // Screenshot Hero
  await page.screenshot({ path: 'hero.png', clip: { x: 0, y: 0, width: 1280, height: 800 } });

  // Screenshot Bride Portrait
  const brideSection = await page.$('#bride-portrait');
  if (brideSection) {
      await brideSection.scrollIntoViewIfNeeded();
      await page.screenshot({ path: 'bride_portrait.png' });
  }

  // Screenshot Event Details
  const eventSection = await page.$('.event-details');
  if (eventSection) {
      await eventSection.scrollIntoViewIfNeeded();
      await page.screenshot({ path: 'event_details.png' });
  }

  // Screenshot Closing
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'closing.png' });

  await browser.close();
})();
