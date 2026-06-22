import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getWhatsAppStatus, getWhatsAppClient, disconnectWhatsApp } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(getWhatsAppStatus(), { headers: noCacheHeaders });
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

    // Trigger initialization with forceReinit = true
    getWhatsAppClient(true);

    // Instead of returning immediately (which freezes the AWS Lambda/Amplify CPU container),
    // wait until the client transitions to QR_RECEIVED or CONNECTED state.
    let statusObj = getWhatsAppStatus();
    let attempts = 0;
    while ((statusObj.status === 'INITIALIZING' || statusObj.status === 'DISCONNECTED') && attempts < 15) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      statusObj = getWhatsAppStatus();
      attempts++;
    }

    return NextResponse.json(statusObj, { headers: noCacheHeaders });
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

    await disconnectWhatsApp();

    return NextResponse.json({ success: true, status: 'DISCONNECTED' }, { headers: noCacheHeaders });
  } catch (error: any) {
    console.error('WhatsApp DELETE disconnect error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
