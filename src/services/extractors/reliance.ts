import type { Browser } from 'playwright';
import { ExtractorResult, DEFAULT_CONTEXT_OPTIONS, setupContext, normalizePrice, normalizeRating } from './utils';

export async function extractReliance(browser: Browser, url: string): Promise<ExtractorResult> {
  console.log(`[Reliance Extractor] Scraping URL: ${url}`);
  const context = await browser.newContext(DEFAULT_CONTEXT_OPTIONS);
  await setupContext(context);
  const page = await context.newPage();
  
  try {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
    } catch (e: any) {
      console.log(`[Reliance Extractor] page.goto warning: ${e.message}. Continuing.`);
    }
    try {
      await page.waitForSelector('#pdp-price, .pdp__price, .price, span.amount, .pdp-price-amount, [type="application/ld+json"]', { timeout: 2000 });
    } catch (e) {
      // Continue anyway
    }
    
    const pageTitle = await page.title();
    if (pageTitle.includes('Access Denied') || pageTitle.includes('Robot') || pageTitle.includes('CAPTCHA')) {
      throw new Error('Blocked by anti-bot verification challenge.');
    }

    // Check if product is out of stock or sold out
    const isOOS = await page.evaluate(() => {
      const buyButton = document.querySelector('#add-to-cart, button[class*="add-to-cart"], button[class*="buy-now"]');
      const buyButtonText = buyButton?.textContent?.toLowerCase() || '';
      const pdpText = document.querySelector('.pdp__right, .pdp-details, .product-details')?.textContent?.toLowerCase() || '';
      return buyButtonText.includes('out of stock') || buyButtonText.includes('sold out') || pdpText.includes('temporarily out of stock') || pdpText.includes('currently unavailable');
    });

    if (isOOS) {
      console.log('[Reliance Extractor] Product is out of stock. Returning null price.');
      return { price: null, currency: 'INR', rating: null, success: false, unavailable: true, error: 'Out of stock' };
    }

    // 1. Try Specific Selectors
    const domData = await page.evaluate(() => {
      const priceEl = document.querySelector('#pdp-price, .pdp__price, .price, span.amount, .pdp-price-amount');
      const ratingEl = document.querySelector('.pdp__rating, span.rating__value, .pdp-rating-num');
      
      return {
        price: priceEl ? (priceEl as HTMLElement).innerText : null,
        rating: ratingEl ? (ratingEl as HTMLElement).innerText : null
      };
    });

    if (domData.price) {
      const normP = normalizePrice(domData.price);
      const normR = normalizeRating(domData.rating || '');
      if (normP) {
        console.log(`[Reliance Extractor] CSS Selector matched: Price=₹${normP.price}, Rating=${normR}`);
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
        console.log(`[Reliance Extractor] Schema matched: Price=₹${normP.price}, Rating=${normR}`);
        return { price: normP.price, currency: 'INR', rating: normR, success: true, title: schemaData.title || pageTitle };
      }
    }

    // 3. Fallback Heuristics
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
        console.log(`[Reliance Extractor] Heuristic matched: Price=₹${normP.price}`);
        return { price: normP.price, currency: 'INR', rating: null, success: true, title: pageTitle };
      }
    }

    throw new Error('Price element could not be found or parsed.');
  } catch (err: any) {
    console.error(`[Reliance Extractor] Error: ${err.message}`);
    return { price: null, currency: 'INR', rating: null, success: false, error: err.message };
  } finally {
    await context.close();
  }
}
