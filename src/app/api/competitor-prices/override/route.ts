import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Checking roles
    if (session.role === 'Viewer') {
      return NextResponse.json({ error: 'Forbidden: Viewers cannot override prices' }, { status: 403 });
    }

    const { competitorProductId, price } = await req.json();

    if (!competitorProductId || price === undefined || price === null || isNaN(Number(price))) {
      return NextResponse.json({ error: 'Missing or invalid parameters' }, { status: 400 });
    }

    // Insert a new price snapshot which overrides the latest price
    const newSnapshot = await db.addCompetitorPriceSnapshot({
      competitorProductId,
      price: Number(price)
    });

    // Log the override action
    await db.logAction(
      session.email,
      'OVERRIDE_COMPETITOR_PRICE',
      `Manually overrode competitor price feed ID ${competitorProductId} to ₹${Number(price).toFixed(2)}.`
    );

    return NextResponse.json({ success: true, snapshot: newSnapshot });
  } catch (error: any) {
    console.error('POST price override error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
