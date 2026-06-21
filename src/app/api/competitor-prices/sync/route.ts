import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission } from '@/lib/auth';
import { db } from '@/lib/db';

// Session-scoped in-memory cache to prevent duplicate search engine spamming during the server session
const attemptedAutoDiscoveries = (global as any).attemptedAutoDiscoveries || new Set<string>();
(global as any).attemptedAutoDiscoveries = attemptedAutoDiscoveries;

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, ['Admin', 'Pricing Analyst'])) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    let productId: string | undefined = undefined;
    try {
      const body = await req.json();
      productId = body?.productId;
    } catch (e) {
      // Body may be empty
    }

    let competitors = await db.getCompetitors();

    // Auto-seed default Indian market channels if the database is clean
    if (competitors.length === 0) {
      const defaults = [
        { name: 'Amazon', website: 'https://www.amazon.in' },
        { name: 'Flipkart', website: 'https://www.flipkart.com' },
        { name: 'Croma', website: 'https://www.croma.com' },
        { name: 'Reliance Digital', website: 'https://www.reliancedigital.in' },
        { name: 'Vijay Sales', website: 'https://www.vijaysales.com' }
      ];
      for (const d of defaults) {
        await db.addCompetitor(d.name, d.website);
      }
      competitors = await db.getCompetitors();
    } else {
      // Ensure all five competitors exist in the database
      const names = competitors.map(c => c.name.toLowerCase());
      const required = [
        { name: 'Amazon', website: 'https://www.amazon.in' },
        { name: 'Flipkart', website: 'https://www.flipkart.com' },
        { name: 'Croma', website: 'https://www.croma.com' },
        { name: 'Reliance Digital', website: 'https://www.reliancedigital.in' },
        { name: 'Vijay Sales', website: 'https://www.vijaysales.com' }
      ];
      for (const r of required) {
        const hasMatch = names.some(n => n.includes(r.name.toLowerCase()) || r.name.toLowerCase().includes(n));
        if (!hasMatch) {
          await db.addCompetitor(r.name, r.website);
        }
      }
      competitors = await db.getCompetitors();
    }

    const products = await db.getProducts();
    const competitorProducts = await db.getCompetitorProducts();
    let newlyDiscoveredCount = 0;
    
    let activeCompetitorProducts = [...competitorProducts];
    if (productId) {
      activeCompetitorProducts = activeCompetitorProducts.filter(cp => cp.productId === productId);
    }
    
    const now = Date.now();

    // Process price scraping in parallel batches to optimize speed (batch size = 5)
    const updatedSnapshots: any[] = [];
    let alertsTriggered = 0;
    const feedSummary: Record<string, string> = {};

    console.log(`[Sync] Processing price sync for ${activeCompetitorProducts.length} feeds...`);

    const BATCH_SIZE = 5;
    const activeFeeds = activeCompetitorProducts.filter(cp => cp.url);

    const activeSyncs = (global as any).activeBackgroundSyncs || new Set<string>();
    (global as any).activeBackgroundSyncs = activeSyncs;
    const targetProductIds = productId ? [productId] : products.map(p => p.id);
    for (const id of targetProductIds) {
      activeSyncs.add(id);
    }

    let browser: any = null;
    const { ScraperService } = await import('@/services/ScraperService');
    try {
      browser = await ScraperService.launchBrowserInstance();
    } catch (launchErr: any) {
      console.error('[Sync] Failed to launch Playwright browser:', launchErr.message);
    }

    try {
      // Clear cache and auto-discover competitor listings from scratch for a single product sync
      if (productId) {
        console.log(`[Sync] Single product ${productId} sync triggered. Clearing cache and running matching/discovery from scratch...`);
        const product = products.find(p => p.id === productId);
        if (product) {
          try {
            ScraperService.clearProductCache(product.name);
          } catch (e) {
            console.error('[Sync] Failed to clear scraper cache:', e);
          }

          const searchQuery = product.brand && !product.name.toLowerCase().includes(product.brand.toLowerCase())
            ? `${product.brand} ${product.name}`
            : product.name;
          const resolved = await ScraperService.findCompetitorUrls(searchQuery, browser);
          
          const amazonComp = competitors.find(c => c.name.toLowerCase().includes('amazon'));
          const flipkartComp = competitors.find(c => c.name.toLowerCase().includes('flipkart'));
          const cromaComp = competitors.find(c => c.name.toLowerCase().includes('croma'));
          const relianceComp = competitors.find(c => c.name.toLowerCase().includes('reliance'));
          const vijayComp = competitors.find(c => c.name.toLowerCase().includes('vijay'));

          const updateOrAddFeed = async (comp: any, url: string | null) => {
            if (!comp || !url) return;
            try {
              const { price, title } = await ScraperService.scrapePriceWithFallback(url, product.name, browser);
              if (price !== null && !isNaN(price)) {
                const existing = competitorProducts.find(cp => cp.productId === productId && cp.competitorId === comp.id);
                if (existing) {
                  await db.updateCompetitorProduct(existing.id, { url, title });
                  existing.url = url;
                  existing.title = title;
                  const snap = await db.addCompetitorPriceSnapshot({
                    competitorProductId: existing.id,
                    price
                  });
                  updatedSnapshots.push(snap);
                } else {
                  const skuPrefix = comp.name.split(' ')[0].substring(0, 3).toUpperCase();
                  const competitorSku = `${skuPrefix}-${product.sku}`;
                  const cp = await db.addCompetitorProduct({
                    productId: product.id,
                    competitorId: comp.id,
                    competitorSku,
                    url,
                    title
                  });
                  const snap = await db.addCompetitorPriceSnapshot({
                    competitorProductId: cp.id,
                    price
                  });
                  updatedSnapshots.push(snap);
                }
                newlyDiscoveredCount++;
                console.log(`[Sync] Discovered & seeded single product feed for ${comp.name}: ₹${price}`);
              }
            } catch (err: any) {
              console.error(`[Sync] Failed to discover/seed feed for ${comp.name}:`, err.message);
            }
          };

          await Promise.all([
            updateOrAddFeed(amazonComp, resolved.amazon),
            updateOrAddFeed(flipkartComp, resolved.flipkart),
            updateOrAddFeed(cromaComp, resolved.croma),
            updateOrAddFeed(relianceComp, resolved.reliance),
            updateOrAddFeed(vijayComp, resolved.vijaysales)
          ]);

          // Clear activeFeeds list so we don't double scrape them in the batch loop below
          activeFeeds.length = 0;
        }
      }

      for (let i = 0; i < activeFeeds.length; i += BATCH_SIZE) {
        const batch = activeFeeds.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (cp) => {
          const comp = competitors.find(c => c.id === cp.competitorId);
          const competitorName = comp ? comp.name : 'Competitor';
          const product = products.find(p => p.id === cp.productId);

          if (!product || !cp.url) {
            feedSummary[`${product?.sku || 'Unknown'}-${competitorName}`] = 'invalid url/product';
            return;
          }

          const feedKey = `[${product.sku}] ${competitorName}`;

          try {
            console.log(`[Sync] Scraping feed in parallel: "${product.name}" on ${competitorName}`);
            const { price, title } = await ScraperService.scrapePriceWithFallback(cp.url, product.name, browser);
            
            // Save/update title in db on hourly syncs too if we scraped a title
            if (title && cp.title !== title) {
              await db.updateCompetitorProduct(cp.id, { url: cp.url, title });
              cp.title = title;
            }

            if (price !== null && !isNaN(price)) {
              // Check if price changed from the latest snapshot before saving new one
              const latestSnapshot = await db.getLatestCompetitorPriceSnapshot(cp.id);
              const priceChanged = !latestSnapshot || latestSnapshot.price !== price;

              const snapshot = await db.addCompetitorPriceSnapshot({
                competitorProductId: cp.id,
                price
              });
              updatedSnapshots.push(snapshot);
              feedSummary[feedKey] = 'success';
              console.log(`[Sync] Success! Recorded price ₹${price} for "${product.name}" on ${competitorName}`);

              if (price < product.currentPrice && priceChanged) {
                const diff = product.currentPrice - price;
                await db.addNotification(
                  'Competitor Price Under-cutting',
                  `Competitor "${competitorName}" is now pricing "${product.name}" at ₹${price.toFixed(2)}, which is ₹${diff.toFixed(2)} cheaper than our price of ₹${product.currentPrice.toFixed(2)}.`,
                  'competitor'
                );
                alertsTriggered++;
              }
            } else {
              feedSummary[feedKey] = 'retry later';
              console.warn(`[Sync] Failed to scrape price for "${product.name}" on ${competitorName} (price null).`);
            }
          } catch (err: any) {
            feedSummary[feedKey] = 'failed';
            console.error(`[Sync] Partial failure for feed: "${product.name}" on ${competitorName}. Error: ${err.message}`);
          }
        }));
      }
    } finally {
      for (const id of targetProductIds) {
        activeSyncs.delete(id);
      }
      if (browser) {
        try {
          await browser.close();
        } catch (closeErr: any) {
          console.error('[Sync] Error closing browser:', closeErr.message);
        }
      }
    }

    await db.logAction(
      session.email, 
      'SYNC_COMPETITOR_PRICES', 
      `Triggered competitor intelligence sync. Auto-discovered ${newlyDiscoveredCount} feeds, scanned ${activeCompetitorProducts.length} URLs, captured ${updatedSnapshots.length} price points, triggered ${alertsTriggered} under-pricing alerts.`
    );

    return NextResponse.json({
      success: true,
      scannedCount: activeCompetitorProducts.length,
      snapshotsCreated: updatedSnapshots.length,
      alertsTriggered,
      newlyDiscoveredCount,
      summary: feedSummary
    });
  } catch (error) {
    console.error('Competitor price sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
