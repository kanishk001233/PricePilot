import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transactions = await db.getSalesTransactions();
    const products = await db.getProducts();

    const formattedSales = transactions.map(t => {
      const prod = products.find(p => p.id === t.productId);
      return {
        id: t.id,
        productSku: prod ? prod.sku : 'N/A',
        productName: prod ? prod.name : 'Unknown Product',
        quantity: t.quantity,
        priceSold: t.priceSold,
        revenue: t.revenue,
        customerName: t.customerName || 'Walk-in Customer',
        customerPhone: t.customerPhone || 'N/A',
        customerEmail: t.customerEmail || 'N/A',
        cashierEmail: t.cashierEmail || 'System Process',
        transactionDate: t.transactionDate
      };
    });

    // Sort by most recent transactions
    formattedSales.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

    return NextResponse.json(formattedSales);
  } catch (error: any) {
    console.error('GET sales transactions error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
