import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER || 'pricepilot.store@gmail.com';
  const pass = process.env.SMTP_PASS || 'psoe hzcy huzx oiti';

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false
      }
    });

    console.log('[Test Email] Verifying connection...');
    await transporter.verify();

    console.log('[Test Email] Sending test email...');
    const info = await transporter.sendMail({
      from: `"PricePilot Store Test" <${user}>`,
      to: user,
      subject: 'PricePilot Deployed SMTP Test',
      text: 'If you receive this, SMTP is working perfectly from the deployed version!'
    });

    return NextResponse.json({ success: true, message: 'SMTP verified and test email sent!', info });
  } catch (error: any) {
    console.error('[Test Email Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      code: error.code,
      command: error.command,
      stack: error.stack
    }, { status: 500 });
  }
}
