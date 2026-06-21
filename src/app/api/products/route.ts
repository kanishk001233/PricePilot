import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission } from '@/lib/auth';
import { db } from '@/lib/db';

async function getOrCreateCompetitors() {
  let competitors = await db.getCompetitors();

  if (competitors.length === 0) {
    const defaults = [
      { name: 'Amazon', website: 'https://www.amazon.in' },
      { name: 'Flipkart', website: 'https://www.flipkart.com' },
      { name: 'Croma', website: 'https://www.croma.com' },
      { name: 'Reliance Digital', website: 'https://www.reliancedigital.in' },
      { name: 'Vijay Sales', website: 'https://www.vijaysales.com' }
    ];

    for (const competitor of defaults) {
      await db.addCompetitor(competitor.name, competitor.website);
    }

    competitors = await db.getCompetitors();
    return competitors;
  }

  const existingNames = competitors.map(c => c.name.toLowerCase());
  const required = [
    { name: 'Amazon', website: 'https://www.amazon.in' },
    { name: 'Flipkart', website: 'https://www.flipkart.com' },
    { name: 'Croma', website: 'https://www.croma.com' },
    { name: 'Reliance Digital', website: 'https://www.reliancedigital.in' },
    { name: 'Vijay Sales', website: 'https://www.vijaysales.com' }
  ];

  for (const item of required) {
    const hasMatch = existingNames.some(name => name.includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(name));
    if (!hasMatch) {
      await db.addCompetitor(item.name, item.website);
    }
  }

  return db.getCompetitors();
}

async function matchProductCompetitors(product: any, competitors: any[], existingBrowser?: any) {
  try {
    const { ScraperService } = await import('@/services/ScraperService');
    const searchQuery = product.brand && !product.name.toLowerCase().includes(product.brand.toLowerCase())
      ? `${product.brand} ${product.name}`
      : product.name;

    const resolved = await ScraperService.findCompetitorUrls(searchQuery, existingBrowser);

    const amazonComp = competitors.find(c => c.name.toLowerCase().includes('amazon'));
    const flipkartComp = competitors.find(c => c.name.toLowerCase().includes('flipkart'));
    const cromaComp = competitors.find(c => c.name.toLowerCase().includes('croma'));
    const relianceComp = competitors.find(c => c.name.toLowerCase().includes('reliance'));
    const vijayComp = competitors.find(c => c.name.toLowerCase().includes('vijay'));

    const addFeed = async (comp: any, url: string | null) => {
      if (!comp || !url) return;

      try {
        // Fetch the price first before creating the feed in the database
        const { price: scrapedPrice, title: scrapedTitle } = await ScraperService.scrapePriceWithFallback(url, product.name, existingBrowser);
        
        if (scrapedPrice !== null && !isNaN(scrapedPrice)) {
          const skuPrefix = comp.name.split(' ')[0].substring(0, 3).toUpperCase();
          const competitorSku = `${skuPrefix}-${product.sku}`;

          const cp = await db.addCompetitorProduct({
            productId: product.id,
            competitorId: comp.id,
            competitorSku,
            url,
            title: scrapedTitle
          });

          await db.addCompetitorPriceSnapshot({
            competitorProductId: cp.id,
            price: scrapedPrice
          });
          console.log(`[Matching] Linked & seeded initial price ₹${scrapedPrice} for ${comp.name} on ${product.name}`);
        } else {
          console.warn(`[Matching] Scraped price for ${comp.name} on ${product.name} returned null. Skipping feed creation.`);
        }
      } catch (err: any) {
        if (err.message?.includes('duplicate key') || err.message?.includes('unique constraint')) {
          console.warn(`[Matching] Feed already exists for ${comp.name} on product ${product.sku}`);
        } else {
          console.error(`[Matching] Failed to add feed for ${comp.name}:`, err.message);
        }
      }
    };

    await Promise.all([
      addFeed(amazonComp, resolved.amazon),
      addFeed(flipkartComp, resolved.flipkart),
      addFeed(cromaComp, resolved.croma),
      addFeed(relianceComp, resolved.reliance),
      addFeed(vijayComp, resolved.vijaysales)
    ]);
  } catch (err: any) {
    console.error(`[Matching] Product matching error for ${product.name}:`, err.message);
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const products = await db.getProducts();
    const categories = await db.getCategories();

    const productsWithCategory = products.map(p => {
      const cat = categories.find(c => c.id === p.categoryId);
      return {
        ...p,
        categoryName: cat ? cat.name : 'Unknown'
      };
    });

    return NextResponse.json(productsWithCategory);
  } catch (error) {
    console.error('GET products API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, ['Admin', 'Pricing Analyst'])) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();

    const logActionSafely = async (action: string, details: string) => {
      try {
        await db.logAction(session.email, action, details);
      } catch (error) {
        console.error(`[Audit] Failed to log ${action}:`, error);
      }
    };

    if (Array.isArray(body)) {
      const added: any[] = [];
      const categories = await db.getCategories();
      const defaultCategoryId = categories.length > 0 ? categories[0].id : '';
      let competitors: any[] = [];

      try {
        competitors = await getOrCreateCompetitors();
      } catch (error) {
        console.error('[Matching] Failed to prepare competitors for bulk import:', error);
      }

      for (const item of body) {
        if (!item || (!item.sku?.trim() && !item.name?.trim())) {
          console.log('[Bulk Import] Skipping empty or invalid product row:', item);
          continue;
        }

        let categoryId = item.categoryId;
        if (!categoryId || categoryId === 'cat-1') {
          categoryId = defaultCategoryId;
        }

        if (item.categoryName && item.categoryName.trim() !== '') {
          let matchingCat = categories.find(c => c.name.toLowerCase() === item.categoryName.trim().toLowerCase());
          if (!matchingCat) {
            try {
              matchingCat = await db.createCategory(item.categoryName.trim(), 'Dynamically created during CSV import');
              categories.push(matchingCat);
            } catch (err: any) {
              console.error(`Failed to dynamically create category ${item.categoryName}:`, err.message);
            }
          }
          if (matchingCat) {
            categoryId = matchingCat.id;
          }
        }

        const newProd = await db.createProduct({
          sku: item.sku || `PP-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          name: item.name || 'Unnamed Imported Product',
          categoryId,
          brand: item.brand || 'Generic',
          costPrice: Number(item.costPrice) || 0,
          currentPrice: Number(item.currentPrice) || 0,
          minPrice: Number(item.minPrice) || 0,
          maxPrice: Number(item.maxPrice) || 0,
          targetMargin: Number(item.targetMargin) || 30,
          inventory: Number(item.inventory) || 0,
          seasonalRelevance: item.seasonalRelevance || 'All Year',
          status: 'Active'
        });

        added.push(newProd);
      }

      // Background bulk matching task
      const runBulkBackgroundMatching = async (productsToMatch: any[]) => {
        const activeSyncs = (global as any).activeBackgroundSyncs || new Set<string>();
        (global as any).activeBackgroundSyncs = activeSyncs;
        
        for (const p of productsToMatch) {
          activeSyncs.add(p.id);
        }

        let browser: any = null;
        try {
          const { ScraperService } = await import('@/services/ScraperService');
          browser = await ScraperService.launchBrowserInstance();
        } catch (launchErr: any) {
          console.error('[Matching] [Background-Bulk] Failed to launch Playwright browser:', launchErr.message);
        }

        try {
          const batchSize = 3;
          for (let i = 0; i < productsToMatch.length; i += batchSize) {
            const batch = productsToMatch.slice(i, i + batchSize);
            await Promise.all(batch.map(async (newProd) => {
              if (competitors.length > 0) {
                console.log(`[Matching] [Background-Bulk] Running batch competitor matching for imported product ${newProd.sku}...`);
                try {
                  await matchProductCompetitors(newProd, competitors, browser);
                } catch (error) {
                  console.error(`[Matching] [Background-Bulk] Batch matching failed for imported product ${newProd.sku}:`, error);
                }
              }
            }));
          }
        } finally {
          for (const p of productsToMatch) {
            activeSyncs.delete(p.id);
          }
          if (browser) {
            try {
              await browser.close();
            } catch (closeErr: any) {
              console.error('[Matching] [Background-Bulk] Error closing browser:', closeErr.message);
            }
          }
        }
      };

      runBulkBackgroundMatching(added).catch(err => {
        console.error('[Matching] [Background-Bulk] Fatal background matching task error:', err);
      });

      await logActionSafely(
        'BULK_IMPORT_PRODUCTS',
        `Imported ${added.length} products via CSV upload. Background competitor matching started.`
      );

      return NextResponse.json({ success: true, count: added.length, products: added });
    }

    const { sku, name, categoryId, brand, costPrice, currentPrice, minPrice, maxPrice, targetMargin, inventory, seasonalRelevance, categoryName } = body;

    if (!sku || !name || costPrice === undefined || currentPrice === undefined) {
      return NextResponse.json({ error: 'Missing required product fields' }, { status: 400 });
    }

    const categories = await db.getCategories();
    const defaultCategoryId = categories.length > 0 ? categories[0].id : '';
    let targetCategoryId = categoryId;

    if (categoryName && categoryName.trim() !== '') {
      let matchingCat = categories.find(c => c.name.toLowerCase() === categoryName.trim().toLowerCase());
      if (!matchingCat) {
        try {
          matchingCat = await db.createCategory(categoryName.trim(), 'Dynamically created during manual product creation');
        } catch (err: any) {
          console.error(`Failed to dynamically create category ${categoryName}:`, err.message);
        }
      }
      if (matchingCat) {
        targetCategoryId = matchingCat.id;
      }
    } else if (!targetCategoryId || targetCategoryId === 'cat-1') {
      targetCategoryId = defaultCategoryId;
    }

    const newProduct = await db.createProduct({
      sku,
      name,
      categoryId: targetCategoryId,
      brand: brand || 'Generic',
      costPrice: Number(costPrice),
      currentPrice: Number(currentPrice),
      minPrice: Number(minPrice || costPrice),
      maxPrice: Number(maxPrice || currentPrice * 2),
      targetMargin: Number(targetMargin || 30),
      inventory: Number(inventory || 0),
      seasonalRelevance: seasonalRelevance || 'All Year',
      status: 'Active'
    });

    // Run competitor matching in the background
    const runBackgroundMatching = async () => {
      const activeSyncs = (global as any).activeBackgroundSyncs || new Set<string>();
      (global as any).activeBackgroundSyncs = activeSyncs;
      activeSyncs.add(newProduct.id);
      
      let browser: any = null;
      try {
        const competitors = await getOrCreateCompetitors();
        if (competitors.length > 0) {
          console.log(`[Matching] [Background] Running competitor matching for product ${newProduct.sku}...`);
          try {
            const { ScraperService } = await import('@/services/ScraperService');
            browser = await ScraperService.launchBrowserInstance();
          } catch (launchErr: any) {
            console.error('[Matching] [Background] Failed to launch Playwright browser:', launchErr.message);
          }
          await matchProductCompetitors(newProduct, competitors, browser);
        }
      } catch (error) {
        console.error(`[Matching] [Background] Synchronous matching failed for product ${newProduct.sku}:`, error);
      } finally {
        activeSyncs.delete(newProduct.id);
        if (browser) {
          try {
            await browser.close();
          } catch (closeErr: any) {
            console.error('[Matching] [Background] Error closing browser:', closeErr.message);
          }
        }
      }
    };

    runBackgroundMatching().catch(err => {
      console.error('[Matching] [Background] Fatal background matching task error:', err);
    });

    await logActionSafely(
      'CREATE_PRODUCT',
      `Created product SKU: ${sku} - ${name}. Cost: ₹${costPrice}, Price: ₹${currentPrice}. Background competitor matching started.`
    );

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error: any) {
    console.error('POST products API error:', error);
    if (error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
      return NextResponse.json({ error: 'A product with this SKU already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
