import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { ScraperService } from '@/services/ScraperService';

export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const product = await db.getProductById(id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('GET product single error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, ['Admin', 'Pricing Analyst'])) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const product = await db.getProductById(id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const body = await req.json();
    
    // Resolve dynamic categoryName if present
    if (body.categoryName && body.categoryName.trim() !== '') {
      const categories = await db.getCategories();
      let matchingCat = categories.find(c => c.name.toLowerCase() === body.categoryName.trim().toLowerCase());
      if (!matchingCat) {
        try {
          matchingCat = await db.createCategory(body.categoryName.trim(), 'Dynamically created during product update');
        } catch (err: any) {
          console.error(`Failed to dynamically create category ${body.categoryName}:`, err.message);
        }
      }
      if (matchingCat) {
        body.categoryId = matchingCat.id;
      }
      delete body.categoryName;
    }
    
    // Perform update
    const updated = await db.updateProduct(id, body);
    
    // Log details of what changed
    const changes: string[] = [];
    if (body.currentPrice !== undefined && body.currentPrice !== product.currentPrice) {
      changes.push(`price: ₹${product.currentPrice} -> ₹${body.currentPrice}`);
    }
    if (body.minPrice !== undefined && body.minPrice !== product.minPrice) {
      changes.push(`minPrice: ₹${product.minPrice} -> ₹${body.minPrice}`);
    }
    if (body.maxPrice !== undefined && body.maxPrice !== product.maxPrice) {
      changes.push(`maxPrice: ₹${product.maxPrice} -> ₹${body.maxPrice}`);
    }
    if (body.inventory !== undefined && body.inventory !== product.inventory) {
      changes.push(`inventory: ${product.inventory} -> ${body.inventory}`);
    }
    if (body.status !== undefined && body.status !== product.status) {
      changes.push(`status: ${product.status} -> ${body.status}`);
    }

    if (changes.length > 0) {
      await db.logAction(
        session.email, 
        'UPDATE_PRODUCT', 
        `Updated SKU ${product.sku} (${product.name}). Changes: ${changes.join(', ')}.`
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, ['Admin', 'Pricing Analyst'])) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const product = await db.getProductById(id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const success = await db.deleteProduct(id);
    if (success) {
      // Clear URL matcher cache for this product name
      try {
        ScraperService.clearProductCache(product.name);
      } catch (err) {
        console.error('Failed to clear scraper cache for deleted product:', err);
      }

      await db.logAction(
        session.email, 
        'DELETE_PRODUCT', 
        `Deleted product SKU: ${product.sku} - ${product.name}.`
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  } catch (error) {
    console.error('DELETE product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
