import { chromium } from 'playwright';

async function testDirectSearch() {
  const productName = 'Samsung Galaxy S24 Ultra';
  console.log(`Starting direct search for "${productName}"...`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled']
  });

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

  const searchAmazon = async () => {
    const page = await context.newPage();
    try {
      const url = `https://www.amazon.in/s?k=${encodeURIComponent(productName)}`;
      console.log(`Searching Amazon: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(3000);
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .map(a => a.href)
          .filter(href => href && (href.includes('/dp/') || href.includes('/gp/product/')));
      });
      console.log('Amazon links found:', links.slice(0, 3));
    } catch (e: any) {
      console.error('Amazon search failed:', e.message);
    } finally {
      await page.close();
    }
  };

  const searchFlipkart = async () => {
    const page = await context.newPage();
    try {
      const url = `https://www.flipkart.com/search?q=${encodeURIComponent(productName)}`;
      console.log(`Searching Flipkart: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(3000);
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .map(a => a.href)
          .filter(href => href && href.includes('/p/') && href.includes('flipkart.com'));
      });
      console.log('Flipkart links found:', links.slice(0, 3));
    } catch (e: any) {
      console.error('Flipkart search failed:', e.message);
    } finally {
      await page.close();
    }
  };

  const searchCroma = async () => {
    const page = await context.newPage();
    try {
      console.log('Establishing Croma session by visiting homepage first...');
      await page.goto('https://www.croma.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(3000);
      
      const url = `https://www.croma.com/search/?text=${encodeURIComponent(productName)}`;
      console.log(`Searching Croma: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(4000);
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .map(a => a.href)
          .filter(href => href && href.includes('/p/') && !href.includes('/unboxed') && href.includes('croma.com'));
      });
      console.log('Croma links found:', links.slice(0, 3));
    } catch (e: any) {
      console.error('Croma search failed:', e.message);
    } finally {
      await page.close();
    }
  };

  const searchReliance = async () => {
    const page = await context.newPage();
    try {
      console.log('Establishing Reliance session by visiting homepage first...');
      await page.goto('https://www.reliancedigital.in', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(3000);

      const url = `https://www.reliancedigital.in/search?q=${encodeURIComponent(productName)}`;
      console.log(`Searching Reliance: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(4000);
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .map(a => a.href)
          .filter(href => href && href.includes('/p/') && href.includes('reliancedigital.in'));
      });
      console.log('Reliance links found:', links.slice(0, 3));
    } catch (e: any) {
      console.error('Reliance search failed:', e.message);
    } finally {
      await page.close();
    }
  };

  const searchVijaySales = async () => {
    const page = await context.newPage();
    try {
      // Try search?q= first
      const url = `https://www.vijaysales.com/search?q=${encodeURIComponent(productName)}`;
      console.log(`Searching Vijay Sales: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(4000);
      let links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .map(a => a.href)
          .filter(href => href && (href.includes('/p/') || href.includes('/product/') || href.includes('/d/')) && href.includes('vijaysales.com'));
      });

      if (links.length === 0) {
        // Fallback to path style
        const fallbackUrl = `https://www.vijaysales.com/search/${encodeURIComponent(productName.replace(/\s+/g, '-'))}`;
        console.log(`Trying Vijay Sales fallback path: ${fallbackUrl}`);
        await page.goto(fallbackUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(4000);
        links = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('a'))
            .map(a => a.href)
            .filter(href => href && (href.includes('/p/') || href.includes('/product/') || href.includes('/d/')) && href.includes('vijaysales.com'));
        });
      }

      console.log('Vijay Sales links found:', links.slice(0, 3));
    } catch (e: any) {
      console.error('Vijay Sales search failed:', e.message);
    } finally {
      await page.close();
    }
  };

  await searchAmazon();
  await searchFlipkart();
  await searchCroma();
  await searchReliance();
  await searchVijaySales();

  await browser.close();
}

testDirectSearch();
