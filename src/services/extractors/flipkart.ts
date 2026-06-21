import { Browser } from 'playwright';
import { ExtractorResult, DEFAULT_CONTEXT_OPTIONS, setupContext, normalizePrice, normalizeRating } from './utils';

export async function extractFlipkart(browser: Browser, url: string): Promise<ExtractorResult> {
  console.log(`[Flipkart Extractor] Scraping URL: ${url}`);
  const context = await browser.newContext(DEFAULT_CONTEXT_OPTIONS);
  await setupContext(context);
  const page = await context.newPage();
  
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!response || response.status() !== 200) {
      throw new Error(`HTTP error status: ${response ? response.status() : 'No Response'}`);
    }
    try {
      await page.waitForSelector('div._30jeq3, div.Nx9zhl, div._16JkUQ, [type="application/ld+json"]', { timeout: 1500 });
    } catch (e) {
      // Continue anyway
    }
    
    const pageTitle = await page.title();
    if (pageTitle.includes('Access Denied') || pageTitle.includes('Robot') || pageTitle.includes('CAPTCHA')) {
      throw new Error('Blocked by anti-bot verification challenge.');
    }

    // Check if product is out of stock or sold out
    const isOOS = await page.evaluate(() => {
      const alertEl = document.querySelector('._192laR, ._1V3w1t, ._1Nj97e');
      const alertText = alertEl?.textContent?.toLowerCase() || '';
      const buttonText = document.querySelector('button._2KpZ6l, button._3v1KeG')?.textContent?.toLowerCase() || '';
      return alertEl !== null || alertText.includes('sold out') || alertText.includes('out of stock') || buttonText.includes('sold out') || buttonText.includes('out of stock');
    });

    if (isOOS) {
      console.log('[Flipkart Extractor] Product is out of stock. Returning null price.');
      return { price: null, currency: 'INR', rating: null, success: false, unavailable: true, error: 'Out of stock' };
    }

    // 1. Try CSS Selectors
    const domData = await page.evaluate(() => {
      // Flipkart price and rating classes
      const priceEl = document.querySelector('div._30jeq3, div.Nx9zhl, div._16JkUQ, div._25b18c ._30jeq3, div.js-price');
      const ratingEl = document.querySelector('div._3LWZlK, span._2_R_DZ, span.Y1Uk3F');
      
      return {
        price: priceEl ? (priceEl as HTMLElement).innerText : null,
        rating: ratingEl ? (ratingEl as HTMLElement).innerText : null
      };
    });

    if (domData.price) {
      const normP = normalizePrice(domData.price);
      const normR = normalizeRating(domData.rating || '');
      if (normP) {
        console.log(`[Flipkart Extractor] CSS Selector matched: Price=₹${normP.price}, Rating=${normR}`);
        return { price: normP.price, currency: 'INR', rating: normR, success: true, title: pageTitle };
      }
    }

    // 2. Try JSON-LD Schema
    const schemaData = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent || '');
          const objects = Array.isArray(data) ? data : [data];
          for (const obj of objects) {
            if (obj['@type'] === 'Product' || obj['@type']?.includes('Product')) {
              const price = obj.offers?.price || obj.offers?.find?.((o: any) => o.price)?.price;
              const rating = obj.aggregateRating?.ratingValue;
              if (price) {
                return { price: String(price), rating: rating ? String(rating) : null, title: obj.name || null };
              }
            }
          }
        } catch (e) {}
      }
      return null;
    });

    if (schemaData && schemaData.price) {
      const normP = normalizePrice(schemaData.price);
      const normR = normalizeRating(schemaData.rating || '');
      if (normP) {
        console.log(`[Flipkart Extractor] Schema matched: Price=₹${normP.price}, Rating=${normR}`);
        return { price: normP.price, currency: 'INR', rating: normR, success: true, title: schemaData.title || pageTitle };
      }
    }

    // 3. Fallback to scanning body text
    const bodyHeuristics = await page.evaluate(() => {
      const strikeEls = Array.from(document.querySelectorAll('strike, del, .strike, [style*="line-through"]'));
      const elements = Array.from(document.querySelectorAll('span, div, p'));
      const candidates: string[] = [];
      
      for (const el of elements) {
        if (el.closest('strike') || el.closest('del') || el.closest('[style*="line-through"]')) {
          continue;
        }
        const text = el.textContent || '';
        if (text.length > 50) continue;
        if (text.includes('₹') || text.toLowerCase().includes('rs')) {
          candidates.push(text);
        }
      }
      return candidates;
    });

    for (const text of bodyHeuristics) {
      const normP = normalizePrice(text);
      if (normP) {
        console.log(`[Flipkart Extractor] Heuristic matched: Price=₹${normP.price}`);
        return { price: normP.price, currency: 'INR', rating: null, success: true, title: pageTitle };
      }
    }

    throw new Error('Price element could not be found or parsed.');
  } catch (err: any) {
    console.error(`[Flipkart Extractor] Error: ${err.message}`);
    return { price: null, currency: 'INR', rating: null, success: false, error: err.message };
  } finally {
    await context.close();
  }
}
