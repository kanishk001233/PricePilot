import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categories = await db.getCategories();
    return NextResponse.json(categories);
  } catch (error: any) {
    console.error('GET categories API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const name = body?.name;
    const description = body?.description || null;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    // Check for duplicate before inserting
    const existing = await db.getCategories();
    const duplicate = existing.find(c => c.name.toLowerCase() === name.trim().toLowerCase());
    if (duplicate) {
      return NextResponse.json({ error: `Category "${name.trim()}" already exists` }, { status: 409 });
    }

    const newCategory = await db.createCategory(name.trim(), description ?? undefined);
    console.log('[Categories] Created new category:', JSON.stringify(newCategory));
    return NextResponse.json(newCategory, { status: 201 });
  } catch (error: any) {
    console.error('POST categories API error:', error);
    const msg = error.message || 'Unknown error';
    if (msg.includes('duplicate') || msg.includes('unique')) {
      return NextResponse.json({ error: 'Category name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: `Failed to create category: ${msg}` }, { status: 500 });
  }
}
