import { NextRequest, NextResponse } from 'next/server';
import { getSession, signToken } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { role } = await req.json();
  
  // Validate role
  const validRoles = ['Admin', 'Pricing Analyst', 'Manager', 'Viewer'];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const updatedSession = {
    email: session.email,
    name: session.name,
    role: role as any
  };


  const token = signToken(updatedSession);
  const response = NextResponse.json({ success: true, user: updatedSession });
  
  response.cookies.set({
    name: 'pricepilot_session',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/'
  });

  return response;
}
