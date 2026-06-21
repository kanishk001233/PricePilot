import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'pricepilot-super-secret-key-123456';

export interface UserSession {
  email: string;
  role: 'Admin' | 'Pricing Analyst' | 'Manager' | 'Viewer';
  name: string;
}

export function signToken(payload: UserSession): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): UserSession | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserSession;
  } catch (error) {
    return null;
  }
}

export function getSession(req: NextRequest): UserSession | null {
  const cookie = req.cookies.get('pricepilot_session');
  if (!cookie) return null;
  return verifyToken(cookie.value);
}

// Check role permissions on server-side
export function hasPermission(
  session: UserSession | null, 
  allowedRoles: Array<'Admin' | 'Pricing Analyst' | 'Manager' | 'Viewer'>
): boolean {
  if (!session) return false;
  return allowedRoles.includes(session.role);
}
