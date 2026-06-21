import type { Browser } from 'playwright';
import { ExtractorResult, DEFAULT_CONTEXT_OPTIONS, setupContext, normalizePrice, normalizeRating } from './utils';

export async function extractAmazon(browser: Browser, url: string): Promise<ExtractorResult> {
  console.log(`[Amazon Extractor] Scraping URL: ${url}`);
  const context = await browser.newContext(DEFAULT_CONTEXT_OPTIONS);
  await setupContext(context);
  const page = await context.newPage();
  
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!response || response.status() !== 200) {
      throw new Error(`HTTP error status: ${response ? response.status() : 'No Response'}`);
    }
    // Wait for the body or price selectors to be present, or short timeout
    try {
      await page.waitForSelector('.a-price-whole, #price_inside_buybox, [type="application/ld+json"]', { timeout: 1500 });
    } catch (e) {
      // Continue anyway
    }
    
    const pageTitle = await page.title();
    if (pageTitle.includes('Access Denied') || pageTitle.includes('Robot') || pageTitle.includes('CAPTCHA')) {
      throw new Error('Blocked by anti-bot verification challenge.');
    }

    // Check if product is currently unavailable or out of stock
    const isUnavailable = await page.evaluate(() => {
      const oosEl = document.querySelector('#outOfStock, #availability');
      const oosText = oosEl?.textContent?.toLowerCase() || '';
      return oosText.includes('currently unavailable') || oosText.includes('temporarily out of stock') || oosText.includes('out of stock');
    });

    if (isUnavailable) {
      console.log('[Amazon Extractor] Product is currently unavailable. Returning null price.');
      return { price: null, currency: 'INR', rating: null, success: false, unavailable: true, error: 'Currently unavailable / Out of stock' };
    }

    // 1. Try JSON-LD Schema
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
        console.log(`[Amazon Extractor] Schema matched: Price=₹${normP.price}, Rating=${normR}`);
        return { price: normP.price, currency: 'INR', rating: normR, success: true, title: schemaData.title || pageTitle };
      }
    }

    // 2. Try CSS Selectors
    const domData = await page.evaluate(() => {
      // Amazon India selectors
      const priceEl = document.querySelector('.a-price-whole, #priceblock_ourprice, #priceblock_dealprice, #price_inside_buybox');
      // Look for rating text
      const ratingEl = document.querySelector('.a-icon-alt, #acrPopover a[title], span[data-hook="rating-out-of-five"]');
      
      return {
        price: priceEl ? (priceEl as HTMLElement).innerText : null,
        rating: ratingEl ? (ratingEl as HTMLElement).innerText : null
      };
    });

    if (domData.price) {
      const normP = normalizePrice(domData.price);
      const normR = normalizeRating(domData.rating || '');
      if (normP) {
        console.log(`[Amazon Extractor] CSS Selector matched: Price=₹${normP.price}, Rating=${normR}`);
        return { price: normP.price, currency: 'INR', rating: normR, success: true, title: pageTitle };
      }
    }

    // 3. Fallback to scanning body text for non-strike prices
    const bodyHeuristics = await page.evaluate(() => {
      const strikeEls = Array.from(document.querySelectorAll('strike, del, .strike, .a-text-strike, [style*="line-through"]'));
      const elements = Array.from(document.querySelectorAll('span, div, p'));
      const candidates: string[] = [];
      
      for (const el of elements) {
        if (el.closest('strike') || el.closest('del') || el.closest('.a-text-strike') || el.closest('[style*="line-through"]')) {
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
        console.log(`[Amazon Extractor] Heuristic matched: Price=₹${normP.price}`);
        return { price: normP.price, currency: 'INR', rating: null, success: true, title: pageTitle };
      }
    }

    throw new Error('Price element could not be found or parsed.');
  } catch (err: any) {
    console.error(`[Amazon Extractor] Error: ${err.message}`);
    return { price: null, currency: 'INR', rating: null, success: false, error: err.message };
  } finally {
    await context.close();
  }
}
