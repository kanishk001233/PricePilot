import { chromium } from 'playwright';

async function captureScreenshots() {
  console.log('Capturing screenshots for Croma and Reliance searches...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });

  // Inject bot bypass scripts
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    (window as any).chrome = { runtime: {} };
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  });

  const page = await context.newPage();

  try {
    // 1. Croma
    console.log('Visiting Croma homepage first...');
    await page.goto('https://www.croma.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);
    
    console.log('Visiting Croma search page...');
    await page.goto('https://www.croma.com/search/?text=Samsung%20Galaxy%20S24%2520Ultra', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(6000);
    await page.screenshot({ path: 'croma-search.png', fullPage: false });
    console.log('Croma screenshot saved as croma-search.png');
    
    // Check what links are on Croma page
    const cromaLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a'))
        .map(a => ({ text: a.innerText, href: a.href }))
        .filter(item => item.href && item.href.includes('/p/'));
    });
    console.log('Croma PDP links found:', cromaLinks.slice(0, 5));

  } catch (e: any) {
    console.error('Croma screenshot failed:', e.message);
  }

  try {
    // 2. Reliance
    console.log('Visiting Reliance homepage first...');
    await page.goto('https://www.reliancedigital.in', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);

    console.log('Visiting Reliance search page...');
    await page.goto('https://www.reliancedigital.in/search?q=Samsung%20Galaxy%20S24%20Ultra', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(6000);
    await page.screenshot({ path: 'reliance-search.png', fullPage: false });
    console.log('Reliance screenshot saved as reliance-search.png');

    // Check what links are on Reliance page
    const relianceLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a'))
        .map(a => ({ text: a.innerText, href: a.href }))
        .filter(item => item.href && item.href.includes('/p/'));
    });
    console.log('Reliance PDP links found:', relianceLinks.slice(0, 5));

  } catch (e: any) {
    console.error('Reliance screenshot failed:', e.message);
  }

  await browser.close();
}

captureScreenshots();
