import { NextRequest, NextResponse } from 'next/server';
import { signToken, UserSession } from '@/lib/auth';
import { db, supabase } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, role } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Please supply your name, email, and password.' },
        { status: 400 }
      );
    }

    // 1. Verify DB connection
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database Connection Missing. Please define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment variables to sign up.' },
        { status: 503 }
      );
    }

    // 2. Check if user already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email address already exists.' },
        { status: 400 }
      );
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Create user in database
    const newUser = await db.createUser(
      email, 
      passwordHash, 
      name, 
      role || 'Pricing Analyst'
    );

    // 5. Audit log
    await db.logAction(email, 'REGISTER_USER', `Created custom user account with role: ${role || 'Pricing Analyst'}.`);

    // 6. Generate and set JWT cookie (Auto Sign-In)
    const userSession: UserSession = {
      email: newUser.email,
      name: newUser.name,
      role: newUser.role
    };

    const token = signToken(userSession);
    const response = NextResponse.json({ success: true, user: userSession });
    
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
    console.error('Registration API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
