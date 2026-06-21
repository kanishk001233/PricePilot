import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { PricingEngine } from '@/services/PricingEngine';

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId, daysAhead, customPrice } = await req.json();

    if (!productId) {
      return NextResponse.json({ error: 'Missing productId parameter' }, { status: 400 });
    }

    const forecast = await PricingEngine.forecastDemand(
      productId, 
      Number(daysAhead || 30), 
      customPrice ? Number(customPrice) : undefined
    );

    return NextResponse.json({
      productId,
      daysAhead: Number(daysAhead || 30),
      customPrice: customPrice ? Number(customPrice) : null,
      ...forecast
    });
  } catch (error: any) {
    console.error('Forecast API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
