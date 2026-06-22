import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

const serviceUrl = process.env.WHATSAPP_SERVICE_URL;

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (serviceUrl) {
      console.log(`[WhatsApp API] Fetching status from microservice at ${serviceUrl}/status...`);
      const res = await fetch(`${serviceUrl}/status?t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      return NextResponse.json(data, { headers: noCacheHeaders });
    }

    return NextResponse.json({ status: 'DISCONNECTED', message: 'WhatsApp Service URL not configured' }, { headers: noCacheHeaders });
  } catch (error: any) {
    console.error('WhatsApp GET status error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (serviceUrl) {
      console.log(`[WhatsApp API] Forwarding connection request to microservice at ${serviceUrl}/connect...`);
      const res = await fetch(`${serviceUrl}/connect`, { method: 'POST', cache: 'no-store' });
      const data = await res.json();
      return NextResponse.json(data, { headers: noCacheHeaders });
    }

    return NextResponse.json({ status: 'DISCONNECTED', error: 'WhatsApp Service URL not configured' }, { status: 400, headers: noCacheHeaders });
  } catch (error: any) {
    console.error('WhatsApp POST connect error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (serviceUrl) {
      console.log(`[WhatsApp API] Forwarding disconnect request to microservice at ${serviceUrl}/status...`);
      const res = await fetch(`${serviceUrl}/status`, { method: 'DELETE', cache: 'no-store' });
      const data = await res.json();
      return NextResponse.json(data, { headers: noCacheHeaders });
    }

    return NextResponse.json({ success: false, status: 'DISCONNECTED', error: 'WhatsApp Service URL not configured' }, { status: 400, headers: noCacheHeaders });
  } catch (error: any) {
    console.error('WhatsApp DELETE disconnect error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

