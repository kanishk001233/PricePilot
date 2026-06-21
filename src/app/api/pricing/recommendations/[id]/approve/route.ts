import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, ['Admin', 'Manager'])) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions. Manager approval required.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { notes } = body;

    const recommendations = await db.getRecommendations();
    const recommendation = recommendations.find(r => r.id === id);

    if (!recommendation) {
      return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 });
    }

    if (recommendation.status !== 'Pending') {
      return NextResponse.json({ error: 'Recommendation already processed' }, { status: 400 });
    }

    // Process approval
    // 1. Update the product current price
    await db.updateProduct(recommendation.productId, { currentPrice: recommendation.suggestedPrice });
    
    // 2. Log the action
    const product = await db.getProductById(recommendation.productId);
    await db.logAction(
      session.email,
      'APPROVE_RECOMMENDATION',
      `Approved price change for ${product?.sku} (${product?.name}). Price updated to ₹${recommendation.suggestedPrice.toFixed(2)} (was ₹${product?.currentPrice.toFixed(2)}). Notes: ${notes || 'None'}`
    );

    // 3. Delete from database
    await db.deleteRecommendation(id);
 
    return NextResponse.json({ success: true, approved: true });
  } catch (error: any) {
    console.error('Approve recommendation API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
