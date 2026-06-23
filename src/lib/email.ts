import { Resend } from 'resend';
import path from 'path';
import fs from 'fs';

interface InvoiceItem {
  name: string;
  sku: string;
  quantity: number;
  currentPrice: number;
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  customer: {
    name: string;
    phone: string;
    email: string;
  };
  items: InvoiceItem[];
  total: number;
}

export async function sendEmailInvoice(toEmail: string, invoice: InvoiceData) {
  const resendApiKey = process.env.RESEND_API_KEY || 're_FeM3urNq_67mpvjHqyJSpc5rg8gpzVcpi';
  if (!resendApiKey) {
    throw new Error('Missing RESEND_API_KEY');
  }

  const resend = new Resend(resendApiKey);

  // Resend uses a full email in the `from` header. Avoid legacy SMTP_USER.
  const from = process.env.EMAIL_FROM || `"PricePilot Store" <pricepilot.store@gmail.com>`;

  const logoPath = path.join(process.cwd(), 'public', 'logo.png');
  // NOTE: Resend API does not support nodemailer-style `cid` images reliably.
  // Keeping the logo discovery logic for future enhancement; currently we send HTML only.
  if (fs.existsSync(logoPath)) {
    // no-op
  }

  // Generate beautiful HTML template
  const itemsHtml = invoice.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: left;">
        <div style="font-size: 13px; font-weight: bold; color: #1e293b;">${item.name}</div>
        <div style="font-size: 11px; color: #64748b;">SKU: ${item.sku}</div>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #475569; font-size: 13px;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #475569; font-size: 13px;">₹${item.currentPrice.toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #1e293b; font-weight: bold; font-size: 13px;">₹${(item.currentPrice * item.quantity).toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>PricePilot Purchase Invoice</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f6; -webkit-font-smoothing: antialiased;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f5f6; padding: 30px 15px;">
        <tr>
          <td align="center">
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
              
              <!-- Header Section -->
              <tr>
                <td style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); padding: 35px; text-align: left;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="vertical-align: middle;">
                        ${
                          fs.existsSync(logoPath)
                            ? '<img src="cid:logo" alt="PricePilot" style="height: 38px; display: block;" />'
                            : '<h1 style="color: #ffffff; font-size: 24px; font-weight: 850; margin: 0; letter-spacing: -0.5px;">PRICEPILOT</h1>'
                        }
                      </td>
                      <td style="text-align: right; color: #e0e7ff; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; vertical-align: middle;">
                        Invoice Receipt
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Customer Info / Metadata Section -->
              <tr>
                <td style="padding: 35px 35px 20px 35px;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td width="55%" style="vertical-align: top; text-align: left;">
                        <h4 style="font-size: 11px; font-weight: 800; color: #4f46e5; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.5px;">Billed To:</h4>
                        <div style="font-size: 14px; font-weight: bold; color: #1e293b; margin-bottom: 4px;">${invoice.customer.name}</div>
                        <div style="font-size: 12px; color: #64748b; margin-bottom: 2px;">Phone: ${invoice.customer.phone}</div>
                        <div style="font-size: 12px; color: #64748b;">Email: ${invoice.customer.email}</div>
                      </td>
                      <td width="45%" style="vertical-align: top; text-align: right;">
                        <h4 style="font-size: 11px; font-weight: 800; color: #4f46e5; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.5px;">Invoice details:</h4>
                        <div style="font-size: 12px; font-weight: bold; color: #1e293b; margin-bottom: 4px;">${invoice.invoiceNumber}</div>
                        <div style="font-size: 12px; color: #64748b;">Date: ${invoice.date}</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Items Table Section -->
              <tr>
                <td style="padding: 0 35px 20px 35px;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                    <thead>
                      <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                        <th style="padding: 12px; font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; text-align: left; letter-spacing: 0.5px;">Item Details</th>
                        <th style="padding: 12px; font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; text-align: center; letter-spacing: 0.5px;">Qty</th>
                        <th style="padding: 12px; font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; text-align: right; letter-spacing: 0.5px;">Rate</th>
                        <th style="padding: 12px; font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; text-align: right; letter-spacing: 0.5px;">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHtml}
                    </tbody>
                  </table>
                </td>
              </tr>

              <!-- Totals Section -->
              <tr>
                <td style="padding: 0 35px 35px 35px;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td width="50%">&nbsp;</td>
                      <td width="50%">
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                          <tr>
                            <td style="padding: 8px 12px; font-size: 13px; color: #64748b; text-align: left;">Subtotal:</td>
                            <td style="padding: 8px 12px; font-size: 13px; color: #1e293b; text-align: right; font-weight: bold;">₹${invoice.total.toFixed(2)}</td>
                          </tr>
                          <tr style="border-top: 2px solid #3b82f6; background-color: #eff6ff;">
                            <td style="padding: 12px; font-size: 14px; font-weight: bold; color: #1d4ed8; text-align: left;">Total Paid:</td>
                            <td style="padding: 12px; font-size: 16px; font-weight: 900; color: #1d4ed8; text-align: right;">₹${invoice.total.toFixed(2)}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer Section -->
              <tr>
                <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 25px; text-align: center;">
                  <p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.5;">
                    Thank you for shopping with PricePilot Store!<br>
                    This is an automatically generated receipt. For support, reply to store@pricepilot.com.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // Logo attachments via cid are not required for Resend; keep attachments variable for now.
  console.log(`[Email] Dispatching invoice email to ${toEmail}...`);
  await resend.emails.send({
    from,
    to: [toEmail],
    subject: `Your Invoice Receipt: ${invoice.invoiceNumber}`,
    html: htmlContent,
  });
  console.log(`[Email] Email sent successfully!`);
}

export interface ReturnData {
  transactionId: string;
  date: string;
  customer: {
    name: string;
    phone: string;
    email: string;
  };
  productName: string;
  sku: string;
  quantity: number;
  priceSold: number;
  totalRefunded: number;
}

export async function sendEmailReturn(toEmail: string, returnData: ReturnData) {
  const resendApiKey = process.env.RESEND_API_KEY || 're_FeM3urNq_67mpvjHqyJSpc5rg8gpzVcpi';
  if (!resendApiKey) {
    throw new Error('Missing RESEND_API_KEY');
  }

  const resend = new Resend(resendApiKey);

  // Resend uses a full email in the `from` header. Avoid legacy SMTP_USER.
  const from = process.env.EMAIL_FROM || `"PricePilot Store" <pricepilot.store@gmail.com>`;

  const logoPath = path.join(process.cwd(), 'public', 'logo.png');
  // NOTE: Resend API does not support nodemailer-style `cid` images reliably.
  // Keeping the logo discovery logic for future enhancement; currently we send HTML only.
  if (fs.existsSync(logoPath)) {
    // no-op
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>PricePilot Return Confirmation</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f6; -webkit-font-smoothing: antialiased;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f5f6; padding: 30px 15px;">
        <tr>
          <td align="center">
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
              
              <!-- Header Section -->
              <tr>
                <td style="background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); padding: 35px; text-align: left;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="vertical-align: middle;">
                        ${
                          fs.existsSync(logoPath)
                            ? '<img src="cid:logo" alt="PricePilot" style="height: 38px; display: block;" />'
                            : '<h1 style="color: #ffffff; font-size: 24px; font-weight: 850; margin: 0; letter-spacing: -0.5px;">PRICEPILOT</h1>'
                        }
                      </td>
                      <td style="text-align: right; color: #fee2e2; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; vertical-align: middle;">
                        Return Processed
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Customer Info Section -->
              <tr>
                <td style="padding: 35px 35px 20px 35px;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td width="55%" style="vertical-align: top; text-align: left;">
                        <h4 style="font-size: 11px; font-weight: 800; color: #ef4444; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.5px;">Customer Details:</h4>
                        <div style="font-size: 14px; font-weight: bold; color: #1e293b; margin-bottom: 4px;">${returnData.customer.name}</div>
                        <div style="font-size: 12px; color: #64748b; margin-bottom: 2px;">Phone: ${returnData.customer.phone}</div>
                        <div style="font-size: 12px; color: #64748b;">Email: ${returnData.customer.email}</div>
                      </td>
                      <td width="45%" style="vertical-align: top; text-align: right;">
                        <h4 style="font-size: 11px; font-weight: 800; color: #ef4444; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.5px;">Return Details:</h4>
                        <div style="font-size: 12px; font-weight: bold; color: #1e293b; margin-bottom: 4px;">Tx ID: ${returnData.transactionId}</div>
                        <div style="font-size: 12px; color: #64748b;">Date: ${returnData.date}</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Return Items Section -->
              <tr>
                <td style="padding: 0 35px 20px 35px;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                    <thead>
                      <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                        <th style="padding: 12px; font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; text-align: left; letter-spacing: 0.5px;">Returned Item</th>
                        <th style="padding: 12px; font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; text-align: center; letter-spacing: 0.5px;">Qty</th>
                        <th style="padding: 12px; font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; text-align: right; letter-spacing: 0.5px;">Rate</th>
                        <th style="padding: 12px; font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; text-align: right; letter-spacing: 0.5px;">Total Refunded</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: left;">
                          <div style="font-size: 13px; font-weight: bold; color: #1e293b;">${returnData.productName}</div>
                          <div style="font-size: 11px; color: #64748b;">SKU: ${returnData.sku}</div>
                        </td>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #475569; font-size: 13px;">${returnData.quantity}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #475569; font-size: 13px;">₹${returnData.priceSold.toFixed(2)}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #b91c1c; font-weight: bold; font-size: 13px;">₹${returnData.totalRefunded.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>

              <!-- Totals Section -->
              <tr>
                <td style="padding: 0 35px 35px 35px;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td width="50%">&nbsp;</td>
                      <td width="50%">
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                          <tr style="border-top: 2px solid #ef4444; background-color: #fef2f2;">
                            <td style="padding: 12px; font-size: 14px; font-weight: bold; color: #991b1b; text-align: left;">Total Refunded:</td>
                            <td style="padding: 12px; font-size: 16px; font-weight: 900; color: #991b1b; text-align: right;">₹${returnData.totalRefunded.toFixed(2)}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer Section -->
              <tr>
                <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 25px; text-align: center;">
                  <p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.5;">
                    This return has been successfully processed in our system.<br>
                    If you have any questions, please reply to store@pricepilot.com.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  console.log(`[Email] Dispatching return confirmation email to ${toEmail}...`);
  await resend.emails.send({
    from,
    to: [toEmail],
    subject: `Return Confirmation: Transaction #${returnData.transactionId}`,
    html: htmlContent,
  });
  console.log(`[Email] Return email sent successfully!`);
}

