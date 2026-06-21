import fs from 'fs';
import { setupContext, DEFAULT_CONTEXT_OPTIONS, normalizePrice, ExtractorResult } from './extractors/utils';
import { extractAmazon } from './extractors/amazon';
import { extractFlipkart } from './extractors/flipkart';
import { extractCroma } from './extractors/croma';
import { extractReliance } from './extractors/reliance';
import { extractVijaySales } from './extractors/vijaysales';

export interface CompetitorUrls {
  amazon: string | null;
  flipkart: string | null;
  croma: string | null;
  reliance: string | null;
  vijaysales: string | null;
}

export const ScraperService = {
  /**
   * Generate a simplified, generalized search query (e.g. brand + model)
   * by stripping out specific storage sizes, RAM details, and generic clutter.
   */
  getBroadSearchQuery: function (productName: string): string {
    let query = productName;
    
    // Remove common storage terms case-insensitively
    const storageTerms = [
      /\b\d+\s*gb\b/gi,
      /\b\d+\s*tb\b/gi,
      /\b\d+\s*rom\b/gi,
      /\b\d+\s*ram\b/gi
    ];
    for (const term of storageTerms) {
      query = query.replace(term, ' ');
    }

    // Remove common generic suffix words case-insensitively
    const genericWords = [
      /\b5g\b/gi, /\b4g\b/gi, /\bdual\b/gi, /\bsim\b/gi, 
      /\bwith\b/gi, /\bactive\b/gi, /\blatest\b/gi, /\bnew\b/gi,
      /\bcellphone\b/gi, /\bsmartphone\b/gi, /\bmobile\b/gi
    ];
    for (const w of genericWords) {
      query = query.replace(w, ' ');
    }

    // Clean extra spaces and preserve original casing
    return query.replace(/\s+/g, ' ').trim();
  },

  /**
   * Search Google and DuckDuckGo to find competitor product detail URLs.
   */
  findCompetitorUrls: async function (productName: string, existingBrowser?: any): Promise<CompetitorUrls> {
    console.log(`[Dispatcher] Searching competitor URLs for: "${productName}"`);
    const resolved: CompetitorUrls = { amazon: null, flipkart: null, croma: null, reliance: null, vijaysales: null };

    const broadQuery = this.getBroadSearchQuery(productName);
    console.log(`[Dispatcher] Broadened search query for engines: "${broadQuery}"`);

    const cacheKey = broadQuery.toLowerCase().trim();
    const cacheFilePath = 'c:/Users/Lenovo/Desktop/PricePilot/competitor_urls_cache.json';

    if (fs.existsSync(cacheFilePath)) {
      try {
        const cache = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));
        if (cache[cacheKey]) {
          const cachedEntry = cache[cacheKey];
          const hasCachedUrls = Object.values(cachedEntry).some(v => v !== null);
          if (hasCachedUrls) {
            console.log(`[Dispatcher] Cache HIT for: "${cacheKey}". Returning cached URLs:`, cachedEntry);
            return cachedEntry;
          }
        }
      } catch (err) {
        console.error('[Dispatcher] Error reading competitor URLs cache:', err);
      }
    }

    const domains = [
      { key: 'amazon' as const, domain: 'amazon.in' },
      { key: 'flipkart' as const, domain: 'flipkart.com' },
      { key: 'croma' as const, domain: 'croma.com' },
      { key: 'reliance' as const, domain: 'reliancedigital.in' },
      { key: 'vijaysales' as const, domain: 'vijaysales.com' }
    ];

    // Helper for lightweight DDG + Bing search per domain
    const searchDomain = async (domainInfo: typeof domains[0]) => {
      const query = `${broadQuery} site:${domainInfo.domain}`;
      const uniqueLinks = new Set<string>();

      // 1. DuckDuckGo HTML Search
      try {
        const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const res = await fetch(ddgUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          signal: AbortSignal.timeout(6000)
        });
        if (res.status === 200) {
          const html = await res.text();
          const hrefRegex = /href="([^"]+)"/g;
          let match;
          while ((match = hrefRegex.exec(html)) !== null) {
            let href = match[1];
            if (href.includes('uddg=')) {
              const uddgMatch = href.match(/uddg=([^&]+)/);
              if (uddgMatch) {
                href = decodeURIComponent(uddgMatch[1]);
                if (href.toLowerCase().includes(domainInfo.domain)) {
                  uniqueLinks.add(href);
                }
              }
            } else if (href.startsWith('http') && href.toLowerCase().includes(domainInfo.domain)) {
              uniqueLinks.add(href);
            }
          }
        }
      } catch (err: any) {
        console.warn(`[Dispatcher] DDG search failed for ${domainInfo.domain}:`, err.message);
      }

      // 2. Bing HTML Search (Fallback if DDG returned nothing)
      if (uniqueLinks.size === 0) {
        try {
          const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
          const res = await fetch(bingUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            signal: AbortSignal.timeout(6000)
          });
          if (res.status === 200) {
            const html = await res.text();
            const hrefRegex = /href="(https?:\/\/[^"]+)"/g;
            let match;
            while ((match = hrefRegex.exec(html)) !== null) {
              const href = match[1];
              if (href.toLowerCase().includes(domainInfo.domain)) {
                uniqueLinks.add(href);
              }
            }
          }
        } catch (err: any) {
          console.warn(`[Dispatcher] Bing search failed for ${domainInfo.domain}:`, err.message);
        }
      }

      if (uniqueLinks.size > 0) {
        this.parseAndAssignUrls(Array.from(uniqueLinks), resolved, productName);
        console.log(`[Dispatcher] Lightweight search resolved link for ${domainInfo.key.toUpperCase()}: ${resolved[domainInfo.key]}`);
      }
    };

    // Run lightweight searches in parallel to optimize speed
    console.log(`[Dispatcher] Initiating parallel domain queries...`);
    await Promise.all(domains.map(async (d) => {
      if (resolved[d.key]) return; // Skip if already resolved
      await searchDomain(d);
    }));

    let browser = existingBrowser;
    let shouldCloseBrowser = false;

    const getOrLaunchBrowser = async () => {
      if (!browser) {
        const { chromium } = await import('playwright');
        browser = await chromium.launch({
          headless: true,
          args: ['--disable-blink-features=AutomationControlled']
        });
        shouldCloseBrowser = true;
      }
      return browser;
    };

    try {
      // Check if any domains are still missing
      let missingDomains = domains.filter(d => !resolved[d.key]);
      
      if (missingDomains.length > 0) {
        console.log(`[Dispatcher] ${missingDomains.length} domains missing. Triggering Google Playwright search for fallback...`);
        
        const missingQueries = missingDomains.map(d => `site:${d.domain}`).join(' OR ');
        const query = `${broadQuery} (${missingQueries})`;
        
        try {
          const activeBrowser = await getOrLaunchBrowser();
          const context = await activeBrowser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 800 }
          });
          
          await context.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            (window as any).chrome = { runtime: {} };
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
          });
          
          // Speed up the Google fallback scan by blocking resources
          await setupContext(context);
          
          const page = await context.newPage();
          const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
          
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await page.waitForTimeout(3000);

          const bodyText = await page.innerText('body');
          if (bodyText.includes('unusual traffic') || bodyText.includes('robot') || bodyText.includes('CAPTCHA')) {
            console.warn('[Dispatcher] Google blocked URL matching with CAPTCHA check.');
          } else {
            const links = await page.evaluate(() => {
              return Array.from(document.querySelectorAll('a'))
                .map(a => a.href)
                .filter(href => href && href.startsWith('http'));
            });

            this.parseAndAssignUrls(Array.from(new Set(links)), resolved, productName);
            console.log(`[Dispatcher] Google URL matching results for missing domains:`, resolved);
          }
        } catch (err: any) {
          console.error('[Dispatcher] Google URL matching failed:', err.message);
        }
      }

      // Direct Search Fallback for any missing domains
      const missingForDirect = [];
      if (!resolved.amazon) missingForDirect.push('amazon');
      if (!resolved.flipkart) missingForDirect.push('flipkart');
      if (!resolved.croma) missingForDirect.push('croma');
      if (!resolved.reliance) missingForDirect.push('reliance');
      if (!resolved.vijaysales) missingForDirect.push('vijaysales');

      if (missingForDirect.length > 0) {
        console.log(`[Dispatcher] Direct site search fallback triggered for missing: ${missingForDirect.join(', ')}`);
        try {
          const activeBrowser = await getOrLaunchBrowser();
          const context = await activeBrowser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 800 }
          });
          
          await context.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            (window as any).chrome = { runtime: {} };
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
          });

          // Set up resource blocker for direct searches
          await setupContext(context);

          const searchPromises = [];

          // 1. Direct Amazon Search
          if (!resolved.amazon) {
            searchPromises.push((async () => {
              const page = await context.newPage();
              try {
                const url = `https://www.amazon.in/s?k=${encodeURIComponent(broadQuery)}`;
                console.log(`[Dispatcher] Direct searching Amazon: ${url}`);
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
                await page.waitForTimeout(3000);
                const links = await page.evaluate(() => {
                  return Array.from(document.querySelectorAll('a'))
                    .map(a => a.href)
                    .filter(href => href && (href.includes('/dp/') || href.includes('/gp/product/')));
                });
                this.parseAndAssignUrls(links, resolved, productName);
              } catch (e: any) {
                console.error('[Dispatcher] Direct Amazon search failed:', e.message);
              } finally {
                await page.close();
              }
            })());
          }

          // 2. Direct Flipkart Search
          if (!resolved.flipkart) {
            searchPromises.push((async () => {
              const page = await context.newPage();
              try {
                const url = `https://www.flipkart.com/search?q=${encodeURIComponent(broadQuery)}`;
                console.log(`[Dispatcher] Direct searching Flipkart: ${url}`);
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
                await page.waitForTimeout(3000);
                const links = await page.evaluate(() => {
                  return Array.from(document.querySelectorAll('a'))
                    .map(a => a.href)
                    .filter(href => href && href.includes('/p/') && href.includes('flipkart.com'));
                });
                this.parseAndAssignUrls(links, resolved, productName);
              } catch (e: any) {
                console.error('[Dispatcher] Direct Flipkart search failed:', e.message);
              } finally {
                await page.close();
              }
            })());
          }

          // 3. Direct Croma Search
          if (!resolved.croma) {
            searchPromises.push((async () => {
              const page = await context.newPage();
              try {
                console.log('[Dispatcher] Direct searching Croma: Navigating to homepage first...');
                await page.goto('https://www.croma.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
                await page.waitForTimeout(3000);
                const searchUrl = `https://www.croma.com/search/?text=${encodeURIComponent(broadQuery)}`;
                console.log(`[Dispatcher] Direct searching Croma: ${searchUrl}`);
                await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
                await page.waitForTimeout(3000);
                const links = await page.evaluate(() => {
                  return Array.from(document.querySelectorAll('a'))
                    .map(a => a.href)
                    .filter(href => href && href.includes('/p/') && !href.includes('/unboxed') && !href.includes('/help'));
                });
                this.parseAndAssignUrls(links, resolved, productName);
              } catch (e: any) {
                console.error('[Dispatcher] Direct Croma search failed:', e.message);
              } finally {
                await page.close();
              }
            })());
          }

          // 4. Direct Reliance Digital Search
          if (!resolved.reliance) {
            searchPromises.push((async () => {
              const page = await context.newPage();
              try {
                console.log('[Dispatcher] Direct searching Reliance: Navigating to homepage first...');
                await page.goto('https://www.reliancedigital.in', { waitUntil: 'domcontentloaded', timeout: 20000 });
                await page.waitForTimeout(3000);
                const searchInputSelector = 'input[placeholder*="Search"], input[id*="search"], #search';
                await page.waitForSelector(searchInputSelector);
                await page.fill(searchInputSelector, broadQuery);
                await page.waitForTimeout(1000);
                await page.keyboard.press('Enter');
                await page.waitForTimeout(6000);
                const links = await page.evaluate(() => {
                  return Array.from(document.querySelectorAll('a'))
                    .map(a => a.href)
                    .filter(href => href && (href.includes('/p/') || href.includes('/product/')));
                });
                this.parseAndAssignUrls(links, resolved, productName);
              } catch (e: any) {
                console.error('[Dispatcher] Direct Reliance search failed:', e.message);
              } finally {
                await page.close();
              }
            })());
          }

          // 5. Direct Vijay Sales Search
          if (!resolved.vijaysales) {
            searchPromises.push((async () => {
              const page = await context.newPage();
              try {
                const url = `https://www.vijaysales.com/search?q=${encodeURIComponent(broadQuery)}`;
                console.log(`[Dispatcher] Direct searching Vijay Sales: ${url}`);
                try {
                  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
                } catch (e: any) {
                  console.log(`[Dispatcher] Vijay Sales page.goto warning: ${e.message}. Continuing.`);
                }
                await page.waitForTimeout(4000);
                const links = await page.evaluate(() => {
                  return Array.from(document.querySelectorAll('a'))
                    .map(a => a.href)
                    .filter(href => href && href.includes('/p/'));
                });
                this.parseAndAssignUrls(links, resolved, productName);
              } catch (e: any) {
                console.error('[Dispatcher] Direct Vijay Sales search failed:', e.message);
              } finally {
                await page.close();
              }
            })());
          }

          await Promise.all(searchPromises);
        } catch (err: any) {
          console.error('[Dispatcher] Direct search fallback browser error:', err.message);
        }
      }
    } finally {
      if (shouldCloseBrowser && browser) {
        try {
          await browser.close();
        } catch (closeErr: any) {
          console.error('[Dispatcher] Error closing browser:', closeErr.message);
        }
      }
    }

    // Write resolved URLs to cache if we found any valid URL
    const hasAnyUrl = Object.values(resolved).some(v => v !== null);
    if (hasAnyUrl) {
      try {
        let cache: Record<string, any> = {};
        if (fs.existsSync(cacheFilePath)) {
          cache = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));
        }
        
        // Merge or set cache entry
        cache[cacheKey] = {
          ...cache[cacheKey],
          ...resolved
        };
        
        fs.writeFileSync(cacheFilePath, JSON.stringify(cache, null, 2), 'utf8');
        console.log(`[Dispatcher] Cache updated for key: "${cacheKey}"`);
      } catch (err) {
        console.error('[Dispatcher] Failed to write competitor URLs cache:', err);
      }
    }

    return resolved;
  },

  /**
   * Robust matching algorithm to verify that a scraped search result URL matches the product.
   */
  // Helper: Normalize name and collapse unit spaces
  normalizeUnits: function (text: string): string {
    let norm = text.toLowerCase();
    // Replace quotes indicating inches (e.g. 55" -> 55inch, 55' -> 55inch)
    norm = norm.replace(/(\d+(?:\.\d+)?)\s*(?:"|'')/g, '$1inch ');

    // Normalize volume units to standard short forms
    norm = norm.replace(/\b(milliliters|millilitres)\b/g, 'ml')
               .replace(/\b(liters|liter|litres|litre)\b/g, 'l');

    return norm
      .replace(/[^a-z0-9. ]/g, ' ') // keep dots for decimal sizes
      .replace(/(\d+(?:\.\d+)?)\s*(kg|g|gm|gb|tb|mb|mah|v|w|in|inch|inches|cm|mm|m|ft|pcs|pack|pk|sz|size|l|ml|oz|lbs|s|m|xl|xxl)\b/gi, '$1$2')
      .replace(/\s+/g, ' ')
      .trim();
  },

  // Helper: Levenshtein distance
  getLevenshteinDistance: function (a: string, b: string): number {
    const matrix = Array.from({ length: a.length + 1 }, () => 
      Array(b.length + 1).fill(0)
    );
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,       // deletion
          matrix[i][j - 1] + 1,       // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }
    return matrix[a.length][b.length];
  },

  // Helper: Similarity ratio (0 to 100)
  getSimilarityRatio: function (a: string, b: string): number {
    const lenMax = Math.max(a.length, b.length);
    if (lenMax === 0) return 100;
    const distance = this.getLevenshteinDistance(a, b);
    return Math.round(((lenMax - distance) / lenMax) * 100);
  },

  // Helper: Token sort ratio
  getTokenSortRatio: function (str1: string, str2: string): number {
    const clean1 = this.normalizeUnits(str1);
    const clean2 = this.normalizeUnits(str2);
    
    const sorted1 = clean1.split(' ').sort().join(' ');
    const sorted2 = clean2.split(' ').sort().join(' ');
    
    return this.getSimilarityRatio(sorted1, sorted2);
  },

  // Helper: Extract RAM and Storage separately
  extractRamAndStorage: function (text: string): { ram: string | null; storage: string | null } {
    const norm = this.normalizeUnits(text);
    const matches = norm.match(/\b\d+(?:gb|tb)\b/gi) || [];
    
    let ram: string | null = null;
    let storage: string | null = null;

    if (matches.length === 1) {
      const val = matches[0].toLowerCase();
      const ramRegex = new RegExp(`\\b${val}\\s*ram\\b`, 'i');
      if (ramRegex.test(norm)) {
        ram = val;
      } else {
        storage = val;
      }
    } else if (matches.length >= 2) {
      const parsed = matches.map(m => {
        const num = parseInt(m.match(/\d+/)![0], 10);
        const unit = m.toLowerCase().includes('tb') ? 'tb' : 'gb';
        const bytes = unit === 'tb' ? num * 1024 : num;
        return { original: m.toLowerCase(), bytes };
      });
      parsed.sort((a, b) => a.bytes - b.bytes);
      ram = parsed[0].original;
      storage = parsed[1].original;
    }

    return { ram, storage };
  },

  // Helper: Extract specs dynamically
  extractDynamicAttributes: function (text: string): Record<string, string> {
    const norm = this.normalizeUnits(text);
    const attrs: Record<string, string> = {};

    // 1. Storage & RAM
    const { ram, storage } = this.extractRamAndStorage(text);
    if (ram) attrs['ram'] = ram;
    if (storage) attrs['storage'] = storage;

    // 2. Weight/Mass (e.g. 500g, 7kg, 1.5lbs)
    const weightMatch = norm.match(/\b\d+(?:\.\d+)?(?:g|gm|kg|lbs|lb)\b/gi);
    if (weightMatch) {
      const val = weightMatch[0].toLowerCase();
      if (!/^[2-5]g$/.test(val)) {
        attrs['weight'] = val;
      }
    }

    // 3. Screen Size / Dimensions (e.g. 55inch, 44mm)
    const sizeMatch = norm.match(/\b\d+(?:\.\d+)?(?:inch|inches|in|mm|cm)\b/gi);
    if (sizeMatch) {
      attrs['size'] = sizeMatch[0].toLowerCase();
    }

    // 4. Pack Quantity (e.g. pack of 2, 2pcs, 2pack)
    const packMatch = norm.match(/\b(?:pack\s*of|pk\s*of|pack)\s*(\d+)\b/i) || norm.match(/\b(\d+)\s*(?:pack|pk|pcs|pieces)\b/i);
    if (packMatch) {
      attrs['quantity'] = packMatch[1].toLowerCase();
    }

    // 5. Shoe Size (e.g. size 9, sz 10)
    const szMatch = norm.match(/\b(?:size|sz)\s*(\d+(?:\.\d+)?)\b/i);
    if (szMatch) {
      attrs['shoesize'] = szMatch[1].toLowerCase();
    }

    // 6. Apparel Size (S/M/L/XL/XXL)
    let apparelSize = '';
    const apparelSizeMatch = text.match(/\b(?:size|sz|sz\.)\s*\b(s|m|l|xl|xxl|xxxl)\b/i);
    if (apparelSizeMatch) {
      apparelSize = apparelSizeMatch[1].toLowerCase();
    } else {
      const standaloneMatch = text.match(/(?:-|,|\/)\s*\b(s|m|l|xl|xxl|xxxl)\b/i) || text.match(/\b(m|l|xl|xxl|xxxl)\s*$/i);
      if (standaloneMatch) {
        apparelSize = standaloneMatch[1].toLowerCase();
      } else {
        if (/\bmedium\b/i.test(norm)) apparelSize = 'm';
        else if (/\bsmall\b/i.test(norm)) apparelSize = 's';
        else if (/\blarge\b/i.test(norm)) apparelSize = 'l';
        else if (/\bextra\s*large\b/i.test(norm)) apparelSize = 'xl';
        else if (/\bdouble\s*xl\b/i.test(norm) || /\bxxl\b/i.test(norm)) apparelSize = 'xxl';
      }
    }
    if (apparelSize) {
      attrs['apparelsize'] = apparelSize;
    }

    // 7. Volume (e.g. 750ml, 1l, 1.5l, 10oz)
    const volumeMatch = norm.match(/\b\d+(?:\.\d+)?(?:ml|l|oz|liters|liter|litre|litres)\b/gi);
    if (volumeMatch) {
      attrs['volume'] = volumeMatch[0].toLowerCase();
    }

    // 8. Resolution (e.g. 4k, 1080p, uhd, fhd)
    const resMatch = norm.match(/\b(\d+p|4k|8k|uhd|fhd|hd)\b/gi);
    if (resMatch) {
      attrs['resolution'] = resMatch[0].toLowerCase();
    }

    // 9. Power/Voltage/Battery (e.g. 20w, 65w, 12v, 5000mah)
    const powerMatch = norm.match(/\b\d+(?:\.\d+)?(?:w|v|mah|amp|amperes)\b/gi);
    if (powerMatch) {
      attrs['power'] = powerMatch[0].toLowerCase();
    }

    // 10. Brand
    const KNOWN_BRANDS = ['apple', 'samsung', 'oneplus', 'nothing', 'boat', 'sony', 'lg', 'hp', 'lenovo', 'dell', 'asus', 'acer', 'xiaomi', 'realme', 'oppo', 'vivo', 'nike', 'adidas', 'puma', 'philips', 'whirlpool', 'dyson'];
    let brand = '';
    const words = norm.split(' ');
    for (const b of KNOWN_BRANDS) {
      if (words.includes(b)) {
        brand = b;
        break;
      }
    }
    if (!brand && words.length > 0) {
      brand = words[0]; // fallback to first word
    }
    attrs['brand'] = brand;

    // 11. Model Numbers / Codes (e.g. wh-1000xm5, s23, 141, fhb1207z4m)
    const modelNums: string[] = [];
    for (const w of words) {
      const hasDigit = /\d/.test(w);
      if (hasDigit) {
        // Exclude units
        const isUnit = w.endsWith('gb') || w.endsWith('tb') || w.endsWith('kg') || w.endsWith('g') || w.endsWith('gm') || w.endsWith('mm') || w.endsWith('cm') || w.endsWith('in') || w.endsWith('inch') || w.endsWith('inches') || w.startsWith('size') || w.startsWith('sz') || w.endsWith('ml') || w.endsWith('l') || w.endsWith('oz') || w.endsWith('lbs') || w.endsWith('w') || w.endsWith('v') || w.endsWith('mah');
        if (isUnit) continue;
        modelNums.push(w);
      }
    }
    if (modelNums.length > 0) {
      attrs['model_numbers'] = modelNums.join(' ');
    }

    return attrs;
  },

  isBrandMatch: function (brandA?: string, brandB?: string): boolean {
    if (!brandA || !brandB) return false;
    if (brandA === brandB) return true;
    
    const BRAND_SYNONYMS: Record<string, string[]> = {
      'coca-cola': ['coke', 'coca cola', 'coca', 'cola'],
      'pepsi': ['pepsico'],
      'xiaomi': ['mi', 'redmi'],
      'apple': ['iphone', 'ipad', 'macbook'],
      'samsung': ['galaxy'],
      'oneplus': ['1plus']
    };
    
    for (const [canonical, syns] of Object.entries(BRAND_SYNONYMS)) {
      const isAMatch = brandA === canonical || syns.includes(brandA);
      const isBMatch = brandB === canonical || syns.includes(brandB);
      if (isAMatch && isBMatch) {
        return true;
      }
    }
    return false;
  },

  isResolutionMatch: function (resA?: string, resB?: string): boolean {
    if (!resA || !resB) return false;
    if (resA === resB) return true;
    
    const RES_SYNONYMS = [
      ['4k', 'uhd', 'ultrahd'],
      ['1080p', 'fhd', 'fullhd', '1080'],
      ['720p', 'hd', '720']
    ];
    for (const group of RES_SYNONYMS) {
      if (group.includes(resA) && group.includes(resB)) {
        return true;
      }
    }
    return false;
  },

  // Helper: Remove extracted specs and clean model string
  extractModelName: function (productName: string, attrs: Record<string, string>): string {
    let model = this.normalizeUnits(productName);
    
    // Remove brand and all its synonyms
    if (attrs['brand']) {
      model = model.replace(new RegExp(`\\b${attrs['brand']}\\b`, 'g'), '');
      
      const BRAND_SYNONYMS: Record<string, string[]> = {
        'coca-cola': ['coke', 'coca cola', 'coca', 'cola'],
        'pepsi': ['pepsico'],
        'xiaomi': ['mi', 'redmi'],
        'apple': ['iphone', 'ipad', 'macbook'],
        'samsung': ['galaxy'],
        'oneplus': ['1plus']
      };
      
      let canonical = '';
      for (const [k, v] of Object.entries(BRAND_SYNONYMS)) {
        if (attrs['brand'] === k || v.includes(attrs['brand'])) {
          canonical = k;
          break;
        }
      }
      
      if (canonical) {
        model = model.replace(new RegExp(`\\b${canonical}\\b`, 'g'), '');
        const syns = BRAND_SYNONYMS[canonical];
        for (const s of syns) {
          model = model.replace(new RegExp(`\\b${s}\\b`, 'g'), '');
        }
      }
    }
    // Remove storage
    if (attrs['storage']) {
      const storageVal = attrs['storage'].replace(/(gb|tb)/, '');
      model = model.replace(new RegExp(`\\b${storageVal}\\s*(gb|tb)\\b`, 'g'), '');
    }
    // Remove RAM
    if (attrs['ram']) {
      const ramVal = attrs['ram'].replace(/(gb|tb)/, '');
      model = model.replace(new RegExp(`\\b${ramVal}\\s*(gb|tb)(?:\\s*ram)?\\b`, 'g'), '');
    }
    // Remove weight
    if (attrs['weight']) {
      const weightVal = attrs['weight'].replace(/(g|gm|kg)/, '');
      model = model.replace(new RegExp(`\\b${weightVal}\\s*(g|gm|kg)\\b`, 'g'), '');
    }
    // Remove size
    if (attrs['size']) {
      const sizeVal = attrs['size'].replace(/(inch|inches|in|mm|cm)/, '');
      model = model.replace(new RegExp(`\\b${sizeVal}\\s*(inch|inches|in|mm|cm)\\b`, 'g'), '');
    }
    // Remove shoe size
    if (attrs['shoesize']) {
      model = model.replace(new RegExp(`\\b(?:size|sz)\\s*${attrs['shoesize']}\\b`, 'g'), '');
    }
    // Remove quantity
    if (attrs['quantity']) {
      model = model.replace(new RegExp(`\\b(?:pack\\s*of|pk\\s*of|pack)\\s*${attrs['quantity']}\\b`, 'g'), '');
      model = model.replace(new RegExp(`\\b${attrs['quantity']}\\s*(?:pack|pk|pcs|pieces)\\b`, 'g'), '');
    }
    // Remove volume
    if (attrs['volume']) {
      const volVal = attrs['volume'].replace(/(ml|l|oz|liters|liter|litre|litres)/, '');
      model = model.replace(new RegExp(`\\b${volVal}\\s*(ml|l|oz|liters|liter|litre|litres)\\b`, 'g'), '');
    }
    // Remove resolution
    if (attrs['resolution']) {
      model = model.replace(new RegExp(`\\b${attrs['resolution']}\\b`, 'g'), '');
    }
    // Remove power
    if (attrs['power']) {
      const powerVal = attrs['power'].replace(/(w|v|mah|amp|amperes)/, '');
      model = model.replace(new RegExp(`\\b${powerVal}\\s*(w|v|mah|amp|amperes)\\b`, 'g'), '');
    }
    // Remove apparel size words
    const sizeWords = ['size', 'sz', 'small', 'medium', 'large', 'extra large', 'double xl'];
    for (const sw of sizeWords) {
      model = model.replace(new RegExp(`\\b${sw}\\b`, 'g'), '');
    }

    // Remove minor wording differences
    const minorWords = [
      // General adjectives
      'new', 'latest', 'premium', 'original', 'genuine', 'bestseller', 'sale', 'official', 
      'with', 'for', 'and', 'the', 'of', 'dual', 'sim', 'smartphone', 'phone', 'mobile',
      
      // Technical / Network generations
      '5g', '4g', '3g', '2g', 'lte', 'rom', 'ram', 'gb', 'tb',
      
      // Resolutions
      '4k', 'uhd', 'ultrahd', '1080p', 'fhd', 'fullhd', '720p', 'hd',
      
      // Categories / Appliances
      'tv', 'television', 'refrigerator', 'fridge', 'washer', 'dryer', 'ac', 'airconditioner', 
      'air-conditioner', 'microwave', 'oven', 'dishwasher',
      
      // Accessories
      'case', 'cover', 'glass', 'screenguard', 'screenprotector', 'screen-guard', 'screen-protector',
      'charger', 'adapter', 'power', 'cable', 'cord', 'wire', 'strap', 'band', 'stand', 'mount', 
      'holder', 'bracket', 'sleeve', 'pouch', 'bag', 'backpack'
    ];
    for (const mw of minorWords) {
      model = model.replace(new RegExp(`\\b${mw}\\b`, 'g'), '');
    }

    return model.replace(/\s+/g, ' ').trim();
  },

  // Helper: Model overlap similarity
  getModelOverlapScore: function (prodModel: string, candModel: string): number {
    const prodTokens = prodModel.split(' ').filter(t => t.length > 0);
    const candTokens = candModel.split(' ').filter(t => t.length > 0);
    if (prodTokens.length === 0) return 100;
    
    let matches = 0;
    for (const pt of prodTokens) {
      // Check if candidate contains this token as a whole word, prefix, suffix or close similarity
      const matched = candTokens.some(ct => 
        ct.includes(pt) || 
        pt.includes(ct) || 
        (pt.length >= 2 && ct.startsWith(pt)) || 
        this.getSimilarityRatio(pt, ct) >= 70
      );
      if (matched) {
        matches++;
      }
    }
    return Math.round((matches / prodTokens.length) * 100);
  },

  // Helper: Weighted attribute matching
  calculateWeightedScore: function (productName: string, candidateText: string): number {
    const prod = this.extractDynamicAttributes(productName);
    const cand = this.extractDynamicAttributes(candidateText);
    const candLower = candidateText.toLowerCase();
    
    let score = 0;
    let totalWeight = 0;
    
    // 1. Brand Match (Weight: 30)
    const brandWeight = 30;
    totalWeight += brandWeight;
    
    const KNOWN_BRANDS = ['apple', 'samsung', 'oneplus', 'nothing', 'boat', 'sony', 'lg', 'hp', 'lenovo', 'dell', 'asus', 'acer', 'xiaomi', 'realme', 'oppo', 'vivo', 'nike', 'adidas', 'puma', 'philips', 'whirlpool', 'dyson', 'coca-cola', 'coke', 'pepsi'];
    const hasDifferentKnownBrand = cand.brand && KNOWN_BRANDS.includes(cand.brand) && !this.isBrandMatch(cand.brand, prod.brand);
    
    if (this.isBrandMatch(prod.brand, cand.brand) || (prod.brand && candLower.includes(prod.brand)) || !hasDifferentKnownBrand) {
      score += brandWeight;
    }
    
    // 2. Model Match (Weight: 40)
    const modelWeight = 40;
    totalWeight += modelWeight;
    const prodModel = this.extractModelName(productName, prod);
    const candModel = this.extractModelName(candidateText, cand);
    const modelRatio = this.getModelOverlapScore(prodModel, candModel);
    score += (modelRatio / 100) * modelWeight;
    
    // 3. Attributes weight (30 points distributed across present attributes)
    let attrWeight = 0;
    let attrScore = 0;

    if (prod.storage) {
      attrWeight += 10;
      if (cand.storage === prod.storage) attrScore += 10;
    }
    if (prod.ram) {
      attrWeight += 10;
      if (cand.ram === prod.ram) attrScore += 10;
    }
    if (prod.weight) {
      attrWeight += 10;
      if (cand.weight === prod.weight) attrScore += 10;
    }
    if (prod.size) {
      attrWeight += 10;
      if (cand.size === prod.size) attrScore += 10;
    }
    if (prod.quantity) {
      attrWeight += 10;
      if (cand.quantity === prod.quantity) attrScore += 10;
    }
    if (prod.shoesize) {
      attrWeight += 10;
      if (cand.shoesize === prod.shoesize) attrScore += 10;
    }
    if (prod.apparelsize) {
      attrWeight += 10;
      if (cand.apparelsize === prod.apparelsize) attrScore += 10;
    }
    if (prod.volume) {
      attrWeight += 10;
      if (cand.volume === prod.volume) attrScore += 10;
    }
    if (prod.resolution) {
      attrWeight += 10;
      if (cand.resolution === prod.resolution) attrScore += 10;
    }
    if (prod.power) {
      attrWeight += 10;
      if (cand.power === prod.power) attrScore += 10;
    }

    if (attrWeight > 0) {
      totalWeight += attrWeight;
      score += attrScore;
    }
    
    const finalScore = Math.round((score / totalWeight) * 100);
    return finalScore;
  },

  // Helper: Unified Match Method
  isMatch: function (productName: string, candidateText: string): boolean {
    const nameLower = productName.toLowerCase();
    const candLower = candidateText.toLowerCase();

    // 1. Explicit Category Mismatch Veto (with synonym grouping)
    const categoryGroups = [
      ['tv', 'television', 'smart tv', 'led tv'],
      ['ac', 'air-conditioner', 'air conditioner'],
      ['refrigerator', 'fridge'],
      ['washing-machine', 'washer', 'washing machine'],
      ['dryer'],
      ['microwave', 'oven'],
      ['dishwasher']
    ];

    for (const group of categoryGroups) {
      const candHasCat = group.some(cat => {
        if (cat === 'ac' || cat === 'tv') {
          return new RegExp(`\\b${cat}\\b`, 'i').test(candLower);
        }
        return candLower.includes(cat);
      });
      const prodHasCat = group.some(cat => {
        if (cat === 'ac' || cat === 'tv') {
          return new RegExp(`\\b${cat}\\b`, 'i').test(nameLower);
        }
        return nameLower.includes(cat);
      });

      if (candHasCat && !prodHasCat) {
        return false;
      }
    }

    // 2. Explicit Accessory Mismatch Veto (with synonym grouping)
    const accessoryGroups = [
      ['case', 'cover'],
      ['glass', 'screen-guard', 'screen protector'],
      ['charger', 'adapter', 'power adapter', 'wall charger'],
      ['cable', 'cord', 'wire'],
      ['strap', 'band'],
      ['stand', 'mount', 'holder', 'bracket'],
      ['sleeve', 'pouch', 'bag', 'backpack']
    ];
    for (const group of accessoryGroups) {
      const candHasAcc = group.some(acc => candLower.includes(acc));
      const prodHasAcc = group.some(acc => nameLower.includes(acc));
      
      if (candHasAcc && !prodHasAcc) {
        if (group.includes('case') && (nameLower.includes('airpods') || nameLower.includes('buds') || nameLower.includes('earbuds') || nameLower.includes('airdopes') || nameLower.includes('headphone') || nameLower.includes('earphone') || nameLower.includes('soundbar'))) {
          continue;
        }
        if ((group.includes('band') || group.includes('strap')) && nameLower.includes('watch')) {
          continue;
        }
        return false;
      }
    }

    const prodAttrs = this.extractDynamicAttributes(productName);
    const candAttrs = this.extractDynamicAttributes(candidateText);

    // 3. STORAGE MISMATCH VETO
    if (prodAttrs.storage && candAttrs.storage && prodAttrs.storage !== candAttrs.storage) {
      return false; 
    }

    // RAM MISMATCH VETO
    if (prodAttrs.ram && candAttrs.ram && prodAttrs.ram !== candAttrs.ram) {
      return false;
    }

    // 4. WEIGHT MISMATCH VETO
    if (prodAttrs.weight && candAttrs.weight && prodAttrs.weight !== candAttrs.weight) {
      return false;
    }

    // 5. SIZE MISMATCH VETO
    if (prodAttrs.size && candAttrs.size && prodAttrs.size !== candAttrs.size) {
      return false;
    }

    // 6. VOLUME MISMATCH VETO
    if (prodAttrs.volume && candAttrs.volume && prodAttrs.volume !== candAttrs.volume) {
      return false;
    }

    // 7. APPAREL SIZE MISMATCH VETO
    if (prodAttrs.apparelsize && candAttrs.apparelsize && prodAttrs.apparelsize !== candAttrs.apparelsize) {
      return false;
    }

    // 8. RESOLUTION MISMATCH VETO
    if (prodAttrs.resolution && candAttrs.resolution && !this.isResolutionMatch(prodAttrs.resolution, candAttrs.resolution)) {
      return false;
    }

    // 9. POWER MISMATCH VETO
    if (prodAttrs.power && candAttrs.power && prodAttrs.power !== candAttrs.power) {
      return false;
    }

    // 10. QUANTITY MISMATCH VETO
    const prodQty = prodAttrs.quantity || '1';
    const candQty = candAttrs.quantity || '1';
    if (prodQty !== candQty) {
      return false; 
    }

    // 11. SHOE SIZE MISMATCH VETO
    if (prodAttrs.shoesize && candAttrs.shoesize && prodAttrs.shoesize !== candAttrs.shoesize) {
      return false;
    }

    // 8. MODEL NUMBER MISMATCH VETO
    if (prodAttrs.model_numbers && candAttrs.model_numbers) {
      const prodNums = prodAttrs.model_numbers.split(' ');
      
      // If product has a model number (like "15", "141", "wh-1000xm5"), the candidate must contain its digit sequence
      for (const mn of prodNums) {
        if (['64', '128', '256', '512', '5g', '4g', 'lte'].includes(mn)) continue;
        
        const digitOnly = mn.replace(/[a-z]/gi, '');
        if (digitOnly && !candLower.includes(digitOnly)) {
          return false; // Model digit missing
        }
        
        // Exact variant mismatch check (e.g. 13 vs 13r)
        if (mn.match(/^\d+$/)) {
          const variantRegex = new RegExp(`\\b${mn}[a-z]\\b`, 'i');
          if (variantRegex.test(candLower) && !variantRegex.test(nameLower)) {
            return false;
          }
        }
      }
    }

    // 9. BRAND MISMATCH VETO
    const KNOWN_BRANDS = ['apple', 'samsung', 'oneplus', 'nothing', 'boat', 'sony', 'lg', 'hp', 'lenovo', 'dell', 'asus', 'acer', 'xiaomi', 'realme', 'oppo', 'vivo', 'nike', 'adidas', 'puma', 'philips', 'whirlpool', 'dyson', 'coca-cola', 'coke', 'pepsi'];
    const prodBrand = prodAttrs.brand;
    const candBrand = candAttrs.brand;
    if (prodBrand && candBrand && KNOWN_BRANDS.includes(prodBrand) && KNOWN_BRANDS.includes(candBrand) && !this.isBrandMatch(prodBrand, candBrand)) {
      return false; 
    }

    // 10. Variant modifier mismatch veto (pro, max, ultra, etc.)
    const modifiers = ['pro', 'max', 'ultra', 'lite', 'plus', 'neo', 'active', 'fold', 'flip'];
    for (const mod of modifiers) {
      const regex = new RegExp(`\\b${mod}\\b`, 'i');
      const prodHas = regex.test(nameLower);
      const candHas = regex.test(candLower);
      if (prodHas !== candHas) {
        return false;
      }
    }

    // 11. Calculate Confidence Score
    const confidenceScore = this.calculateWeightedScore(productName, candidateText);
    
    // Threshold score >= 80 means Same Product
    return confidenceScore >= 80;
  },

  isValidProductMatch: function (productName: string, url: string): boolean {
    let urlLower = url.toLowerCase();

    // Strip hash fragments and query params
    const hashIndex = urlLower.indexOf('#');
    if (hashIndex !== -1) {
      urlLower = urlLower.substring(0, hashIndex);
    }
    const qIndex = urlLower.indexOf('?');
    if (qIndex !== -1) {
      urlLower = urlLower.substring(0, qIndex);
    }

    // Extract descriptive text from path/slug
    const pathPart = urlLower.replace(/https?:\/\/(www\.)?[a-z0-9.-]+\//, '');
    const hasDescriptionInPath = /[a-z]{3,}/.test(pathPart);
    
    if (!hasDescriptionInPath) {
      // Short or obscure URLs (like Amazon /dp/B0BY8GK8XN) are allowed at URL matching stage.
      // They will be fully verified when their page title is scraped and checked in isValidTitleMatch.
      return true;
    }

    const cleanPath = pathPart.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    return this.isMatch(productName, cleanPath);
  },

  isValidTitleMatch: function (productName: string, pageTitle: string): boolean {
    if (!pageTitle) return true;
    return this.isMatch(productName, pageTitle);
  },

  /**
   * Helper to parse and assign competitor URLs from a list of links
   */
  parseAndAssignUrls: function (links: string[], resolved: CompetitorUrls, productName?: string) {
    for (const href of links) {
      const lowerHref = href.toLowerCase();

      // Validate keywords if productName is provided to prevent false matches (e.g. recommended items)
      if (productName) {
        if (!this.isValidProductMatch(productName, href)) {
          continue; // Skip unrelated product links
        }
      }

      // 1. Match Amazon India
      if (!resolved.amazon && lowerHref.includes('amazon.in')) {
        const match = href.match(/\/dp\/([A-Z0-9]{10})/i) || href.match(/\/gp\/product\/([A-Z0-9]{10})/i);
        if (match) {
          resolved.amazon = `https://www.amazon.in/dp/${match[1]}`;
        }
      }

      // 2. Match Flipkart
      if (!resolved.flipkart && lowerHref.includes('flipkart.com')) {
        if (lowerHref.includes('/p/') || lowerHref.includes('/itm')) {
          let cleanUrl = href;
          const qIndex = cleanUrl.indexOf('?');
          if (qIndex !== -1) {
            cleanUrl = cleanUrl.substring(0, qIndex);
          }
          resolved.flipkart = cleanUrl;
        }
      }

      // 3. Match Croma
      if (!resolved.croma && lowerHref.includes('croma.com')) {
        if (lowerHref.includes('/p/') && !lowerHref.includes('/unboxed') && !lowerHref.includes('/help')) {
          let cleanUrl = href;
          const qIndex = cleanUrl.indexOf('?');
          if (qIndex !== -1) {
            cleanUrl = cleanUrl.substring(0, qIndex);
          }
          resolved.croma = cleanUrl;
        }
      }

      // 4. Match Reliance Digital
      if (!resolved.reliance && lowerHref.includes('reliancedigital.in')) {
        if (lowerHref.includes('/p/') || lowerHref.includes('/product/')) {
          let cleanUrl = href;
          const qIndex = cleanUrl.indexOf('?');
          if (qIndex !== -1) {
            cleanUrl = cleanUrl.substring(0, qIndex);
          }
          resolved.reliance = cleanUrl;
        }
      }

      // 5. Match Vijay Sales
      if (!resolved.vijaysales && lowerHref.includes('vijaysales.com')) {
        if (lowerHref.includes('/p/') || lowerHref.includes('/product/') || lowerHref.includes('/d/')) {
          let cleanUrl = href;
          const qIndex = cleanUrl.indexOf('?');
          if (qIndex !== -1) {
            cleanUrl = cleanUrl.substring(0, qIndex);
          }
          resolved.vijaysales = cleanUrl;
        }
      }
    }
  },

  /**
   * Scrapes price from Google Cache snippets as a fallback if direct scraping gets blocked.
   */
  scrapePriceFromGoogleFallback: async function (url: string, name: string, existingBrowser?: any): Promise<number | null> {
    console.log(`[Dispatcher] Direct scraping failed. Triggering Google Snippet fallback for: ${name}`);
    let browser = existingBrowser;
    let shouldCloseBrowser = false;
    try {
      if (!browser) {
        const { chromium } = await import('playwright');
        browser = await chromium.launch({
          headless: true,
          args: ['--disable-blink-features=AutomationControlled']
        });
        shouldCloseBrowser = true;
      }
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

      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      const snippets = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('div, span'))
          .filter(el => {
            const text = el.textContent || '';
            return text.includes('₹') && text.length < 300;
          })
          .map(el => el.textContent?.trim() || '');
      });

      const prices: number[] = [];
      for (const snippet of snippets) {
        const matches = snippet.match(/(?:₹|Rs\.?)\s*([0-9,]+(?:\.[0-9]{2})?)/gi);
        if (matches) {
          for (const m of matches) {
            const clean = m.replace(/[^0-9]/g, '');
            const val = Number(clean);
            if (val > 100 && val < 500000) {
              prices.push(val);
            }
          }
        }
      }

      if (prices.length > 0) {
        console.log(`[Dispatcher] Extracted prices from Google cache:`, prices);
        return prices[0];
      }
    } catch (err: any) {
      console.error('[Dispatcher] Google Snippet fallback failed:', err.message);
    } finally {
      if (shouldCloseBrowser && browser) {
        await browser.close();
      }
    }
    return null;
  },

  /**
   * Dispatches the URL to the correct platform-specific extractor, with Google search fallback.
   */
  scrapePriceWithFallback: async function (url: string, name: string, existingBrowser?: any): Promise<{ price: number | null; title: string | null }> {
    console.log(`[Dispatcher] Routing scraping task for: ${name} (${url})`);
    
    let browser = existingBrowser;
    let shouldCloseBrowser = false;
    let result: ExtractorResult = { price: null, currency: 'INR', rating: null, success: false };
    
    try {
      if (!browser) {
        const { chromium } = await import('playwright');
        browser = await chromium.launch({
          headless: true,
          args: ['--disable-blink-features=AutomationControlled']
        });
        shouldCloseBrowser = true;
      }

      const lowerUrl = url.toLowerCase();

      // Route to correct platform extractor
      if (lowerUrl.includes('amazon.in')) {
        result = await extractAmazon(browser, url);
      } else if (lowerUrl.includes('flipkart.com')) {
        result = await extractFlipkart(browser, url);
      } else if (lowerUrl.includes('croma.com')) {
        result = await extractCroma(browser, url);
      } else if (lowerUrl.includes('reliancedigital.in')) {
        result = await extractReliance(browser, url);
      } else if (lowerUrl.includes('vijaysales.com')) {
        result = await extractVijaySales(browser, url);
      } else {
        throw new Error(`Unsupported domain provider: ${url}`);
      }

      // Run post-scraping title verification check to reject mismatching products/accessories
      if (result.success && result.title) {
        if (!this.isValidTitleMatch(name, result.title)) {
          console.warn(`[Dispatcher] Rejecting scraper result for ${url} due to page title mismatch: "${result.title}"`);
          return { price: null, title: result.title };
        }
      }

    } catch (err: any) {
      console.error(`[Dispatcher] Scraper execution failed: ${err.message}`);
      result.error = err.message;
    } finally {
      if (shouldCloseBrowser && browser) {
        await browser.close();
      }
    }

    // If product is explicitly unavailable/discontinued/out-of-stock, do NOT fallback to Google
    // Google may return stale cached prices for products that are no longer sold
    if (result.unavailable) {
      console.warn(`[Dispatcher] Product explicitly unavailable: ${result.error}. Skipping Google fallback.`);
      return { price: null, title: result.title || null };
    }

    // Fallback if platform extractor failed or returned null price (scraping error, not unavailability)
    if (!result.success || result.price === null) {
      console.warn(`[Dispatcher] Platform scraping failed. Invoking Google Snippet fallback...`);
      const fallbackPrice = await this.scrapePriceFromGoogleFallback(url, name, browser);
      if (fallbackPrice !== null) {
        console.log(`[Dispatcher] Fallback succeeded! Extracted: ₹${fallbackPrice}`);
        return { price: fallbackPrice, title: result.title || null };
      }
    } else {
      console.log(`[Dispatcher] Scraping succeeded! Price: ₹${result.price}`);
      return { price: result.price, title: result.title || null };
    }

    console.error(`[Dispatcher] Scraping failed completely for URL: ${url}`);
    return { price: null, title: result.title || null };
  },

  /**
   * Clears the cached competitor URLs for a product name when it is deleted.
   */
  clearProductCache: function (productName: string): void {
    const broadQuery = this.getBroadSearchQuery(productName);
    const cacheKey = broadQuery.toLowerCase().trim();
    const cacheFilePath = 'c:/Users/Lenovo/Desktop/PricePilot/competitor_urls_cache.json';
    
    if (fs.existsSync(cacheFilePath)) {
      try {
        const cache = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));
        if (cache[cacheKey]) {
          delete cache[cacheKey];
          fs.writeFileSync(cacheFilePath, JSON.stringify(cache, null, 2), 'utf8');
          console.log(`[Dispatcher] Cache cleared for key: "${cacheKey}"`);
        }
      } catch (err) {
        console.error('[Dispatcher] Failed to clear competitor URLs cache:', err);
      }
    }
  }
};
