import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const resendApiKey = process.env.RESEND_API_KEY || 're_FeM3urNq_67mpvjHqyJSpc5rg8gpzVcpi';
  const toEmail = process.env.EMAIL_TO || 'pricepilot.store@gmail.com';
  if (!resendApiKey) {
    return NextResponse.json({ success: false, error: 'Missing RESEND_API_KEY' }, { status: 500 });
  }

  const from = process.env.EMAIL_FROM || `"PricePilot Store Test" <${toEmail}>`;
  const resend = new Resend(resendApiKey);


  try {
    console.log('[Test Email] Sending test email via Resend...');
    const info = await resend.emails.send({
      from,
      to: [toEmail],

      subject: 'PricePilot Deployed Resend Test',
      text: 'If you receive this, Resend is working perfectly from the deployed version!',
    });

    return NextResponse.json({ success: true, message: 'Resend test email sent!', info });
  } catch (error: any) {
    console.error('[Test Email Error]:', error);
    return NextResponse.json(
      {
        success: false,
        resolvedCredentials: {
          usingEnvEmailTo: !!process.env.EMAIL_TO,
          usingEnvFrom: !!process.env.EMAIL_FROM,
          usingEnvResendKey: !!process.env.RESEND_API_KEY,
        },
        error: error?.message || 'Unknown error',
        code: error?.code,
        stack: error?.stack,
      },
      { status: 500 }
    );
  }
}
