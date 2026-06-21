import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission } from '@/lib/auth';
import { db, supabase } from '@/lib/db';
import { PricingEngine } from '@/services/PricingEngine';

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recs = await db.getRecommendations();
    const products = await db.getProducts();

    // Map product names, SKUs, cost prices and current prices
    const enrichedRecs = recs.map(r => {
      const prod = products.find(p => p.id === r.productId);
      return {
        ...r,
        productName: prod ? prod.name : 'Unknown Product',
        productSku: prod ? prod.sku : 'N/A',
        productBrand: prod ? prod.brand : 'N/A',
        costPrice: prod ? prod.costPrice : 0,
        currentPrice: prod ? prod.currentPrice : 0
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // newest first

    return NextResponse.json(enrichedRecs);
  } catch (error) {
    console.error('GET recommendations API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, ['Admin', 'Pricing Analyst', 'Manager'])) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { productId } = body;

    const generatedRecs = [];

    if (productId) {
      // 1. Delete existing Pending recommendations for this product first to avoid duplicate pending items
      if (supabase) {
        await supabase.from('price_recommendations').delete().eq('product_id', productId).eq('status', 'Pending');
      }

      const prod = await db.getProductById(productId);
      if (!prod) throw new Error(`Product not found: ${productId}`);

      // 2. Generate recommendation
      const recData = await PricingEngine.generateRecommendation(productId);
      
      // 3. Only save if suggestedPrice is different from currentPrice (at least 0.01 change)
      if (Math.abs(recData.suggestedPrice - prod.currentPrice) >= 0.01) {
        const newRec = await db.createRecommendation(recData);
        generatedRecs.push(newRec);

        await db.logAction(
          session.email, 
          'GENERATE_RECOMMENDATION', 
          `Generated pricing recommendation for SKU ${prod.sku} (₹${newRec.suggestedPrice.toFixed(2)} vs current ₹${prod.currentPrice.toFixed(2)}).`
        );
      }
    } else {
      // 1. Delete all existing Pending recommendations to start fresh and avoid duplicates
      if (supabase) {
        await supabase.from('price_recommendations').delete().eq('status', 'Pending');
      }

      // 2. Bulk generation for all active products
      const products = await db.getProducts();
      const activeProducts = products.filter(p => p.status === 'Active');

      for (const prod of activeProducts) {
        const recData = await PricingEngine.generateRecommendation(prod.id);
        
        // 3. Only save if suggestedPrice is different from currentPrice (at least 0.01 change)
        if (Math.abs(recData.suggestedPrice - prod.currentPrice) >= 0.01) {
          const newRec = await db.createRecommendation(recData);
          generatedRecs.push(newRec);
        }
      }

      await db.logAction(
        session.email, 
        'GENERATE_BULK_RECOMMENDATIONS', 
        `Triggered bulk price optimization. Generated ${generatedRecs.length} suggestions.`
      );
    }

    return NextResponse.json({
      success: true,
      count: generatedRecs.length,
      recommendations: generatedRecs
    });
  } catch (error: any) {
    console.error('POST recommendations API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
