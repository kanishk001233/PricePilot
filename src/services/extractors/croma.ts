import { Browser } from 'playwright';
import { ExtractorResult, setupContext, normalizePrice, normalizeRating } from './utils';

export async function extractCroma(browser: Browser, url: string): Promise<ExtractorResult> {
  console.log(`[Croma Extractor] Scraping URL: ${url}`);
  
  // Create context with specific headers that bypass Akamai 403 block
  // without triggering net::ERR_INVALID_ARGUMENT on sub-resource scripts
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
    timezoneId: 'Asia/Kolkata',
    extraHTTPHeaders: {
      'accept-language': 'en-US,en;q=0.9',
      'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'upgrade-insecure-requests': '1'
    }
  });

  await setupContext(context);
  const page = await context.newPage();
  
  try {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch (e: any) {
      console.log(`[Croma Extractor] page.goto warning: ${e.message}. Continuing.`);
    }
    
    try {
      await page.waitForSelector('#pdp-product-price, .pdp-cp-price, .amount, [type="application/ld+json"]', { timeout: 2000 });
    } catch (e) {
      // Continue anyway
    }
    
    const pageTitle = await page.title();
    if (pageTitle.includes('Access Denied') || pageTitle.includes('Robot') || pageTitle.includes('CAPTCHA')) {
      throw new Error('Blocked by anti-bot verification challenge.');
    }

    // Check if product is discontinued or out of stock
    const isUnavailable = await page.evaluate(() => {
      const buyButton = document.querySelector('.btn-add-to-cart, button[class*="add-to-cart"], .pdp-add-to-cart');
      const buyButtonText = buyButton?.textContent?.toLowerCase() || '';
      const pdpDetailsText = document.querySelector('.pdp-details, .pdp-right-container, #product-detail')?.textContent?.toLowerCase() || '';
      return buyButtonText.includes('out of stock') || buyButtonText.includes('discontinued') || pdpDetailsText.includes('product is discontinued') || pdpDetailsText.includes('product discontinued');
    });

    if (isUnavailable) {
      console.log('[Croma Extractor] Product is discontinued or out of stock. Returning null price.');
      return { price: null, currency: 'INR', rating: null, success: false, unavailable: true, error: 'Discontinued / Out of stock' };
    }

    // Extraction helper
    const getPriceAndRating = async () => {
      return await page.evaluate(() => {
        const priceSelectors = [
          '#pdp-product-price', '.pdp-cp-price', 'span.amount', 
          '.outerPrice', '#pdp-price', '.pdp-price', '.amount'
        ];
        
        let priceText = null;
        for (const sel of priceSelectors) {
          const el = document.querySelector(sel) as HTMLElement | null;
          if (el && el.innerText.trim()) {
            priceText = el.innerText.trim();
            break;
          }
        }
        
        const ratingEl = document.querySelector('#pdp-ratings, span.rating-number, .pdp-rating-num') as HTMLElement | null;
        
        return {
          price: priceText,
          rating: ratingEl ? ratingEl.innerText.trim() : null
        };
      });
    };

    let domData = await getPriceAndRating();
    let normP = domData.price ? normalizePrice(domData.price) : null;

    // If price is not found, attempt to dismiss location/pincode blocker by setting a default pincode
    if (!normP) {
      console.log('[Croma Extractor] Price not found directly. Checking for pincode input to unlock prices...');
      const pincodeInputSelector = 'input[name="pin"]';
      
      const hasPincodeField = await page.evaluate((sel) => {
        return !!document.querySelector(sel);
      }, pincodeInputSelector);

      if (hasPincodeField) {
        console.log('[Croma Extractor] Pincode field detected. Injecting pincode 400001 (Mumbai)...');
        
        // Use React value tracker bypass to trigger state changes programmatically
        await page.evaluate((sel) => {
          const input = document.querySelector(sel) as HTMLInputElement;
          if (input) {
            // Set value natively to bypass React's tracking interceptor
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
            if (nativeInputValueSetter) {
              nativeInputValueSetter.call(input, '400001');
            } else {
              input.value = '400001';
            }
            
            // Dispatch React-compatible events
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, pincodeInputSelector);
        
        await page.waitForTimeout(1000);
        
        // Submit the form
        console.log('[Croma Extractor] Submitting the pincode form...');
        await page.focus(pincodeInputSelector);
        await page.keyboard.press('Enter');
        
        // Wait for page to reload/render price updates
        try {
          await page.waitForSelector('#pdp-product-price, .pdp-cp-price, .amount', { timeout: 2000 });
        } catch (e) {
          await page.waitForTimeout(1000);
        }
        
        // Re-attempt extraction
        domData = await getPriceAndRating();
        normP = domData.price ? normalizePrice(domData.price) : null;
      }
    }

    if (normP) {
      const normR = normalizeRating(domData.rating || '');
      console.log(`[Croma Extractor] Extraction successful: Price=₹${normP.price}, Rating=${normR}`);
      return { price: normP.price, currency: 'INR', rating: normR, success: true, title: pageTitle };
    }

    // Try JSON-LD Schema
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
      const normP2 = normalizePrice(schemaData.price);
      const normR = normalizeRating(schemaData.rating || '');
      if (normP2) {
        console.log(`[Croma Extractor] Schema matched: Price=₹${normP2.price}, Rating=${normR}`);
        return { price: normP2.price, currency: 'INR', rating: normR, success: true, title: schemaData.title || pageTitle };
      }
    }

    throw new Error('Price element could not be found or parsed.');
  } catch (err: any) {
    console.error(`[Croma Extractor] Error: ${err.message}`);
    return { price: null, currency: 'INR', rating: null, success: false, error: err.message };
  } finally {
    await context.close();
  }
}
