import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { sendEmailInvoice } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const invoice = await req.json();

    if (!invoice || !invoice.items || invoice.items.length === 0) {
      return NextResponse.json({ error: 'Invalid invoice data' }, { status: 400 });
    }

    // Send directly to customer inputs, no fallback
    const isCustomerPhoneValid = invoice.customer.phone && invoice.customer.phone !== 'N/A' && invoice.customer.phone.trim() !== '';
    const whatsappTarget = isCustomerPhoneValid ? invoice.customer.phone : null;

    const isCustomerEmailValid = invoice.customer.email && invoice.customer.email !== 'N/A' && invoice.customer.email.includes('@');
    const emailTarget = isCustomerEmailValid ? invoice.customer.email : null;

    let whatsappStatus = 'skipped';
    let emailStatus = 'skipped';
    let errors: string[] = [];

    // 1. Send WhatsApp message if target is available
    if (whatsappTarget && whatsappTarget !== 'N/A') {
      try {
        console.log(`[Invoice API] Processing WhatsApp to: ${whatsappTarget}`);
        
        // Construct clean shopping text template
        const itemsText = invoice.items
          .map((item: any) => `- ${item.name} (Qty: ${item.quantity}) - ₹${(item.currentPrice * item.quantity).toFixed(2)}`)
          .join('\n');
          
        const whatsappText = `🛒 *PricePilot Purchase Receipt* 🛒\n` +
          `Invoice: ${invoice.invoiceNumber}\n` +
          `Date: ${invoice.date}\n\n` +
          `*Customer details:*\n` +
          `Name: ${invoice.customer.name}\n` +
          `Phone: ${invoice.customer.phone}\n\n` +
          `*Items Purchased:*\n${itemsText}\n\n` +
          `*Total Paid: ₹${invoice.total.toFixed(2)}*\n\n` +
          `Thank you for shopping with PricePilot!`;

        await sendWhatsAppMessage(whatsappTarget, whatsappText);
        whatsappStatus = 'success';
      } catch (err: any) {
        console.error('[Invoice API] WhatsApp sending failed:', err);
        whatsappStatus = 'failed';
        errors.push(`WhatsApp: ${err.message || err}`);
      }
    } else {
      console.log('[Invoice API] WhatsApp sending skipped (no number provided)');
    }

    // 2. Send Email if target is available
    if (emailTarget && emailTarget !== 'N/A' && emailTarget.includes('@')) {
      try {
        console.log(`[Invoice API] Processing Email to: ${emailTarget}`);
        await sendEmailInvoice(emailTarget, invoice);
        emailStatus = 'success';
      } catch (err: any) {
        console.error('[Invoice API] Email sending failed:', err);
        emailStatus = 'failed';
        errors.push(`Email: ${err.message || err}`);
      }
    } else {
      console.log('[Invoice API] Email sending skipped (no valid email provided)');
    }

    return NextResponse.json({
      success: errors.length === 0,
      whatsappStatus,
      emailStatus,
      errors
    });

  } catch (error: any) {
    console.error('[Invoice API] API route execution error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
