import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { ScraperService } from '@/services/ScraperService';

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const competitors = await db.getCompetitors();
    const competitorProducts = await db.getCompetitorProducts();
    const snapshots = await db.getCompetitorPriceSnapshots();
    const products = await db.getProducts();

    // Map snapshots back to product context
    const competitorData = competitorProducts.map(cp => {
      const comp = competitors.find(c => c.id === cp.competitorId);
      const prod = products.find(p => p.id === cp.productId);
      
      // Get all historical snapshots for this product-competitor link
      const productSnapshots = snapshots
        .filter(s => s.competitorProductId === cp.id)
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

      const latestSnapshot = productSnapshots[0];

      return {
        id: cp.id,
        productId: cp.productId,
        productName: prod ? prod.name : 'Unknown Product',
        productSku: prod ? prod.sku : 'N/A',
        ourCurrentPrice: prod ? prod.currentPrice : 0,
        competitorId: cp.competitorId,
        competitorName: comp ? comp.name : 'Unknown Competitor',
        competitorSku: cp.competitorSku,
        competitorUrl: cp.url,
        competitorTitle: cp.title || '',
        latestPrice: latestSnapshot ? latestSnapshot.price : null,
        lastUpdated: latestSnapshot ? latestSnapshot.recordedAt : null,
        history: productSnapshots.map(s => ({ price: s.price, date: s.recordedAt }))
      };
    });

    const activeSyncs = (global as any).activeBackgroundSyncs || new Set<string>();

    return NextResponse.json({
      competitors,
      competitorProducts: competitorData,
      activeSyncs: Array.from(activeSyncs)
    });
  } catch (error) {
    console.error('GET competitors error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId, competitorId, competitorSku, url } = await req.json();

    if (!productId || !competitorId || !competitorSku || !url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Attempt to scrape starting price snapshot immediately
    const products = await db.getProducts();
    const product = products.find(p => p.id === productId);
    const productName = product ? product.name : '';

    const { price: startPrice, title: scrapedTitle } = await ScraperService.scrapePriceWithFallback(url, productName);

    const newFeed = await db.addCompetitorProduct({
      productId,
      competitorId,
      competitorSku,
      url,
      title: scrapedTitle
    });

    if (startPrice !== null && !isNaN(startPrice)) {
      await db.addCompetitorPriceSnapshot({
        competitorProductId: newFeed.id,
        price: startPrice
      });
      console.log(`[Manual Feed] Successfully seeded initial scraped price ₹${startPrice} for ${url}`);
    } else {
      console.warn(`[Manual Feed] Added feed but could not scrape initial price for ${url}. Snapshot skipped.`);
    }

    await db.logAction(
      session.email,
      'ADD_COMPETITOR_FEED',
      `Manually linked competitor ID ${competitorId} (SKU: ${competitorSku}) to product ID ${productId}.`
    );

    return NextResponse.json({ success: true, feed: newFeed });
  } catch (error: any) {
    console.error('POST competitors error:', error);
    if (error.message?.includes('duplicate key value') || error.message?.includes('unique constraint')) {
      return NextResponse.json({ error: 'This competitor is already being tracked for this product.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, ['Admin', 'Pricing Analyst'])) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing feed ID' }, { status: 400 });
    }

    const success = await db.deleteCompetitorProduct(id);
    if (success) {
      await db.logAction(
        session.email,
        'DELETE_COMPETITOR_FEED',
        `Deleted competitor product feed ID: ${id}.`
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Failed to delete competitor feed' }, { status: 500 });
  } catch (error: any) {
    console.error('DELETE competitor feed error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
