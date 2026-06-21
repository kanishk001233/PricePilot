import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rules = await db.getBusinessRules();
    return NextResponse.json(rules);
  } catch (error) {
    console.error('GET rules error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Changing business rules requires Manager or Admin roles
    if (!hasPermission(session, ['Admin', 'Manager'])) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions. Manager credentials required.' }, { status: 403 });
    }

    const body = await req.json();
    const { id, isActive, parameters, name } = body;

    if (!id) {
      return NextResponse.json({ error: 'Rule ID parameter required' }, { status: 400 });
    }

    const updated = await db.updateBusinessRule(id, {
      ...(isActive !== undefined ? { isActive } : {}),
      ...(parameters !== undefined ? { parameters } : {}),
      ...(name !== undefined ? { name } : {})
    });

    if (!updated) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    await db.logAction(
      session.email,
      'UPDATE_RULE',
      `Modified business rule "${updated.name}" (${updated.code}). Active: ${updated.isActive}. Parameters: ${JSON.stringify(updated.parameters)}.`
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT rules error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
