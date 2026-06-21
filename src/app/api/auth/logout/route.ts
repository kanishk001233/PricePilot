import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (session) {
    await db.logAction(session.email, 'LOGOUT', 'User logged out of session.');
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete('pricepilot_session');
  return response;
}
