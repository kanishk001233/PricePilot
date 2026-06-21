import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transactionId } = await req.json();
    if (!transactionId) {
      return NextResponse.json({ error: 'Missing transactionId parameter' }, { status: 400 });
    }

    // 1. Get all transactions to find this specific transaction
    const transactions = await db.getSalesTransactions();
    const transaction = transactions.find(t => t.id === transactionId);
    
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (transaction.returned) {
      return NextResponse.json({ error: 'Transaction has already been returned' }, { status: 400 });
    }

    // 2. Check if the purchase occurred in the last 3 days
    const transactionTime = new Date(transaction.transactionDate).getTime();
    const nowTime = new Date().getTime();
    const diffDays = (nowTime - transactionTime) / (1000 * 60 * 60 * 24);

    if (diffDays > 3) {
      return NextResponse.json({ error: 'Returns are only allowed within 3 days of purchase' }, { status: 400 });
    }

    // 3. Get product details
    const product = await db.getProductById(transaction.productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // 4. Update the transaction to be marked as returned
    await db.returnSale(transactionId);

    // 5. Update the product inventory (increment by quantity returned)
    const updatedInventory = product.inventory + transaction.quantity;
    await db.updateProduct(transaction.productId, { inventory: updatedInventory });

    // 6. Log action in Audit Trail
    await db.logAction(
      session.email,
      'RETURN_PRODUCT',
      `Returned ${transaction.quantity} units of SKU ${product.sku} (${product.name}) from transaction ID ${transactionId}. Inventory restored to ${updatedInventory}.`
    );

    return NextResponse.json({
      success: true,
      updatedInventory,
      message: 'Transaction returned successfully'
    });

  } catch (error: any) {
    console.error('POST return API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
