import { Page, BrowserContext } from 'playwright';

export interface ExtractorResult {
  price: number | null;
  currency: string;
  rating: number | null;
  success: boolean;
  unavailable?: boolean;
  error?: string;
  title?: string;
}

/**
 * Normalizes price text to clean price value and currency
 * Handles formats: ₹142,999, Rs. 42,999.00, 42,999 INR, ₹142,999.00
 */
export function normalizePrice(rawText: string): { price: number; currency: 'INR' } | null {
  if (!rawText) return null;
  
  // Clean line breaks and extra spaces
  const text = rawText.replace(/\s+/g, ' ').trim();
  
  // Try matching with currency symbols
  const match = text.match(/(?:₹|Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{2})?)/i) || 
                text.match(/([0-9,]+(?:\.[0-9]{2})?)\s*(?:₹|Rs\.?|INR)/i);
                
  if (match) {
    const numericPart = match[1].replace(/,/g, '');
    const price = Number(numericPart);
    if (!isNaN(price) && price > 0) {
      return { price, currency: 'INR' };
    }
  }
  
  // Try fallback to any valid numeric pattern
  const digitsMatch = text.replace(/,/g, '').match(/\b\d+(?:\.\d{2})?\b/);
  if (digitsMatch) {
    const price = Number(digitsMatch[0]);
    if (!isNaN(price) && price > 100) { // Assume prices in electronics are > 100
      return { price, currency: 'INR' };
    }
  }
  
  return null;
}

/**
 * Normalizes rating string to a number out of 5
 * Handles formats: "4.6 out of 5 stars", "4.6 / 5", "4.5", "4.1"
 */
export function normalizeRating(rawText: string): number | null {
  if (!rawText) return null;
  
  const text = rawText.replace(/\s+/g, ' ').trim();
  
  // Match 1-5 with optional decimal
  const match = text.match(/\b([1-5](?:\.\d)?)\s*(?:out of 5|\/5)?\b/i);
  if (match) {
    const val = Number(match[1]);
    if (!isNaN(val) && val >= 1 && val <= 5) {
      return val;
    }
  }
  return null;
}

/**
 * Applies anti-bot bypass properties to the Playwright context
 */
export async function setupContext(context: BrowserContext) {
  // Intercept requests to block heavy non-essential assets and trackers
  await context.route('**/*', (route) => {
    const req = route.request();
    const type = req.resourceType();
    const url = req.url().toLowerCase();

    // Block images, fonts, and media
    if (['image', 'font', 'media'].includes(type)) {
      return route.abort();
    }

    // List of common telemetry, tracking, and advertising domains/keywords to block
    const trackerKeywords = [
      'google-analytics',
      'googletagmanager',
      'facebook.net',
      'doubleclick',
      'hotjar',
      'segment.io',
      'mixpanel',
      'sentry.io',
      'criteo',
      'omnisend',
      'adsystem',
      'analytics',
      'telemetry',
      'datadoghq',
      'loggly',
      'bugsnag',
      'clarity.ms'
    ];

    if (trackerKeywords.some(keyword => url.includes(keyword))) {
      return route.abort();
    }

    return route.continue();
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    (window as any).chrome = { runtime: {} };
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  });
}

/**
 * Standard headers and viewport configuration for scraping
 */
export const DEFAULT_CONTEXT_OPTIONS = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  viewport: { width: 1280, height: 800 },
  locale: 'en-US',
  timezoneId: 'Asia/Kolkata',
  extraHTTPHeaders: {
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-language': 'en-US,en;q=0.9',
    'cache-control': 'max-age=0',
    'upgrade-insecure-requests': '1'
  }
};
