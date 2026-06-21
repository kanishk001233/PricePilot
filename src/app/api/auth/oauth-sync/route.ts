import { NextRequest, NextResponse } from 'next/server';
import { signToken, UserSession } from '@/lib/auth';
import { db, supabase } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name parameters required' },
        { status: 400 }
      );
    }

    // 1. Verify DB connection
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database Connection Missing. Please define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.' },
        { status: 503 }
      );
    }

    let role = 'Pricing Analyst';
    let finalName = name;

    // 2. Check if user already exists in the 'users' table
    const dbUser = await db.getUserByEmail(email);

    if (dbUser) {
      // User exists, read their assigned database role
      role = dbUser.role;
      finalName = dbUser.name;
      
      await db.logAction(email, 'LOGIN_OAUTH_GOOGLE', `Successfully authenticated via Google OAuth. User role: ${role}.`);
    } else {
      // New signup: Insert user into custom users table with default Analyst role
      await db.createUser(
        email, 
        'OAUTH_EXTERNAL', // dummy password hash indicator
        name, 
        'Pricing Analyst'
      );
      
      await db.logAction(email, 'REGISTER_OAUTH_GOOGLE', `Successfully signed up via Google OAuth. Initial role: Pricing Analyst.`);
    }

    // 3. Generate session JWT
    const userSession: UserSession = {
      email,
      name: finalName,
      role: role as any
    };

    const token = signToken(userSession);
    const response = NextResponse.json({ success: true, user: userSession });
    
    // 4. Set HTTP-only session cookie
    response.cookies.set({
      name: 'pricepilot_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/'
    });

    return response;
  } catch (error: any) {
    console.error('OAuth sync API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
