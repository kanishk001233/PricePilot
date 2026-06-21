import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission } from '@/lib/auth';
import { db } from '@/lib/db';

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
    const activeCompetitorProducts = [...competitorProducts];

    let targetProducts = products;
    if (productId) {
      targetProducts = products.filter(p => p.id === productId);
    }

    // Search for competitor URLs from scratch for ALL target products
    const amazonComp = competitors.find(c => c.name.toLowerCase().includes('amazon'));
    const flipkartComp = competitors.find(c => c.name.toLowerCase().includes('flipkart'));
    const cromaComp = competitors.find(c => c.name.toLowerCase().includes('croma'));
    const relianceComp = competitors.find(c => c.name.toLowerCase().includes('reliance'));
    const vijayComp = competitors.find(c => c.name.toLowerCase().includes('vijay'));

    const activeSyncs = (global as any).activeBackgroundSyncs || new Set<string>();
    (global as any).activeBackgroundSyncs = activeSyncs;
    const targetProductIds = targetProducts.map(p => p.id);
    for (const id of targetProductIds) {
      activeSyncs.add(id);
    }

    let browser: any = null;
    const { ScraperService } = await import('@/services/ScraperService');
    try {
      browser = await ScraperService.launchBrowserInstance();
    } catch (launchErr: any) {
      console.error('[Discover] Failed to launch Playwright browser:', launchErr.message);
    }

    try {
      for (const product of targetProducts) {
        const productFeeds = activeCompetitorProducts.filter(cp => cp.productId === product.id);

        // Helper: find existing feed for a competitor
        const findExistingFeed = (compName: string) => {
          return productFeeds.find(cp => {
            const c = competitors.find(comp => comp.id === cp.competitorId);
            return c && c.name.toLowerCase().includes(compName);
          });
        };

        const existingFeeds = {
          amazon: findExistingFeed('amazon'),
          flipkart: findExistingFeed('flipkart'),
          croma: findExistingFeed('croma'),
          reliance: findExistingFeed('reliance'),
          vijaysales: findExistingFeed('vijay')
        };

        console.log(`[Discover] Searching competitor URLs for "${product.name}"...`);
        const searchQuery = product.brand && !product.name.toLowerCase().includes(product.brand.toLowerCase())
          ? `${product.brand} ${product.name}`
          : product.name;
        const resolved = await ScraperService.findCompetitorUrls(searchQuery, browser);

        const upsertFeed = async (comp: any, url: string | null, existing: any) => {
          if (!comp) return;
          try {
            if (existing) {
              if (url) {
                const { price, title } = await ScraperService.scrapePriceWithFallback(url, product.name, browser);
                if (price !== null && !isNaN(price)) {
                  // Keep feed, update URL or title if changed, and save the price snapshot
                  if (existing.url !== url || existing.title !== title) {
                    await db.updateCompetitorProduct(existing.id, { url, title });
                    existing.url = url;
                    existing.title = title;
                    console.log(`[Discover] Updated stale URL/title for ${comp.name} on product ${product.sku}: ${url}`);
                  }
                  await db.addCompetitorPriceSnapshot({
                    competitorProductId: existing.id,
                    price
                  });
                  console.log(`[Discover] Found & added price snapshot ₹${price} for existing feed of ${comp.name} on ${product.name}`);
                } else {
                  // Price not available, delete feed from DB
                  await db.deleteCompetitorProduct(existing.id);
                  console.warn(`[Discover] Deleted existing feed ${comp.name} for ${product.sku} because price is no longer available.`);
                }
              } else {
                // URL not found, delete feed from DB
                await db.deleteCompetitorProduct(existing.id);
                console.warn(`[Discover] Deleted existing feed ${comp.name} for ${product.sku} because URL is missing.`);
              }
            } else {
              if (url) {
                const { price, title } = await ScraperService.scrapePriceWithFallback(url, product.name, browser);
                if (price !== null && !isNaN(price)) {
                  const skuPrefix = comp.name.split(' ')[0].substring(0, 3).toUpperCase();
                  const competitorSku = `${skuPrefix}-${product.sku}`;
                  const cp = await db.addCompetitorProduct({
                    productId: product.id,
                    competitorId: comp.id,
                    competitorSku,
                    url,
                    title
                  });
                  await db.addCompetitorPriceSnapshot({
                    competitorProductId: cp.id,
                    price
                  });
                  activeCompetitorProducts.push(cp);
                  newlyDiscoveredCount++;
                  console.log(`[Discover] Found & linked competitor ${comp.name} to product ${product.sku} with price ₹${price}`);
                } else {
                  console.warn(`[Discover] Competitor link found for ${comp.name} but price is null. Skipping feed creation.`);
                }
              }
            }
          } catch (e: any) {
            if (e.message?.includes('duplicate key') || e.message?.includes('unique constraint')) {
              console.warn(`[Discover] Feed already exists for ${comp.name} on product ${product.sku}`);
            } else {
              console.error(`[Discover] Failed to link ${comp.name}:`, e.message);
            }
          }
        };

        await Promise.all([
          upsertFeed(amazonComp, resolved.amazon, existingFeeds.amazon),
          upsertFeed(flipkartComp, resolved.flipkart, existingFeeds.flipkart),
          upsertFeed(cromaComp, resolved.croma, existingFeeds.croma),
          upsertFeed(relianceComp, resolved.reliance, existingFeeds.reliance),
          upsertFeed(vijayComp, resolved.vijaysales, existingFeeds.vijaysales)
        ]);
      }
    } finally {
      for (const id of targetProductIds) {
        activeSyncs.delete(id);
      }
      if (browser) {
        try {
          await browser.close();
        } catch (closeErr: any) {
          console.error('[Discover] Error closing browser:', closeErr.message);
        }
      }
    }

    await db.logAction(
      session.email,
      'DISCOVER_COMPETITORS',
      `Ran full competitor discovery. Searched ${targetProducts.length} products, discovered ${newlyDiscoveredCount} new competitor feeds.`
    );

    return NextResponse.json({
      success: true,
      productsSearched: targetProducts.length,
      newlyDiscoveredCount,
    });
  } catch (error) {
    console.error('Competitor discovery error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
