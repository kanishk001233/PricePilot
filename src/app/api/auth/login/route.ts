import { NextRequest, NextResponse } from 'next/server';
import { signToken, UserSession } from '@/lib/auth';
import { db, supabase } from '@/lib/db';

import bcrypt from 'bcryptjs';

const MOCK_ACCOUNTS = [
  { email: 'admin@pricepilot.com', password: 'admin123', name: 'Alice Admin', role: 'Admin' as const },
  { email: 'analyst@pricepilot.com', password: 'analyst123', name: 'Bob Analyst', role: 'Pricing Analyst' as const },
  { email: 'manager@pricepilot.com', password: 'manager123', name: 'Charlie Manager', role: 'Manager' as const },
  { email: 'viewer@pricepilot.com', password: 'viewer123', name: 'David Viewer', role: 'Viewer' as const }
];

export async function POST(req: NextRequest) {
  try {
    const { email, password, isGoogleOAuth, selectedRole } = await req.json();

    let user: UserSession | null = null;

    if (isGoogleOAuth) {
      // Google OAuth simulation
      // For demo, user can choose their role or default to Pricing Analyst
      const role = selectedRole || 'Pricing Analyst';
      user = {
        email: `google.${role.toLowerCase().replace(' ', '')}@pricepilot.com`,
        name: `Google User (${role})`,
        role: role as any
      };
      
      if (supabase) {
        await db.logAction(user.email, 'LOGIN_OAUTH_GOOGLE', `Successfully authenticated via Google OAuth as ${role}.`);
      }
    } else {
      // Email/Password login
      let dbUser = null;
      try {
        dbUser = await db.getUserByEmail(email);
      } catch (err) {
        console.warn('Database connection unavailable, checking mock credentials:', err);
      }

      if (dbUser) {
        const isMatch = await bcrypt.compare(password, dbUser.password_hash);
        if (!isMatch) {
          return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }
        user = {
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role
        };
        await db.logAction(user.email, 'LOGIN_PASSWORD', `Successfully logged in via registered database credentials.`);
      } else {
        const account = MOCK_ACCOUNTS.find(a => a.email === email && a.password === password);
        if (!account) {
          return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }
        user = {
          email: account.email,
          name: account.name,
          role: account.role
        };
        
        if (supabase) {
          await db.logAction(user.email, 'LOGIN_PASSWORD', `Successfully logged in via fallback credentials.`);
        }
      }
    }

    const token = signToken(user);
    
    const response = NextResponse.json({ success: true, user });
    
    // Set HTTP-only cookie
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
    console.error('Login API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
