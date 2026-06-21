import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId, quantity, customerName, customerPhone, customerEmail } = await req.json();

    if (!productId || !quantity || quantity <= 0) {
      return NextResponse.json({ error: 'Invalid parameters. Need productId and positive quantity.' }, { status: 400 });
    }

    // 1. Get product details
    const product = await db.getProductById(productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // 2. Check inventory levels
    if (product.inventory < quantity) {
      return NextResponse.json({ 
        error: `Insufficient stock. Requested: ${quantity}, Available: ${product.inventory}` 
      }, { status: 400 });
    }

    // 3. Record transaction
    const priceSold = product.currentPrice;
    const revenue = priceSold * quantity;
    
    const transaction = await db.recordSale({
      productId,
      quantity,
      priceSold,
      revenue,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      customerEmail: customerEmail || null,
      cashierEmail: session.email
    });

    // 4. Update product inventory
    const updatedInventory = product.inventory - quantity;
    await db.updateProduct(productId, { inventory: updatedInventory });

    // 5. Log action in Audit Trail
    const custInfo = customerName ? ` Customer: ${customerName} (${customerPhone || 'N/A'}).` : '';
    await db.logAction(
      session.email,
      'SELL_PRODUCT',
      `Sold ${quantity} units of SKU ${product.sku} (${product.name}) for ₹${revenue.toFixed(2)}. Inventory updated to ${updatedInventory}.${custInfo}`
    );

    // 6. Check if stock falls below threshold and trigger notification
    if (updatedInventory < 15) {
      try {
        await db.addNotification(
          'Low Inventory Warning',
          `Product ${product.name} (SKU: ${product.sku}) has fallen to ${updatedInventory} units in stock.`,
          'stock'
        );
      } catch (err) {
        console.error('Failed to trigger low stock notification:', err);
      }
    }

    return NextResponse.json({
      success: true,
      transaction,
      updatedInventory
    });

  } catch (error: any) {
    console.error('POST sell API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
