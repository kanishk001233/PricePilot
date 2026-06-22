import { Client, LocalAuth } from 'whatsapp-web.js';
// @ts-ignore
import qrcode from 'qrcode-terminal';
import path from 'path';
import os from 'os';

let client: Client | null = null;
let whatsappStatus: 'DISCONNECTED' | 'INITIALIZING' | 'QR_RECEIVED' | 'CONNECTED' = 'DISCONNECTED';
let lastQr: string | null = null;

export function getWhatsAppStatus() {
  const globalRef = global as any;
  if (!client && globalRef.whatsappClient) {
    client = globalRef.whatsappClient;
  }
  if (client) {
    if ((client as any).pupPage) {
      if (whatsappStatus !== 'CONNECTED' && whatsappStatus !== 'QR_RECEIVED') {
        whatsappStatus = 'CONNECTED';
      }
    }
  }
  return {
    status: whatsappStatus,
    qr: lastQr
  };
}

export async function disconnectWhatsApp() {
  if (client) {
    try {
      await client.logout();
    } catch (e) {
      console.error('Error logging out:', e);
    }
    try {
      await client.destroy();
    } catch (e) {
      console.error('Error destroying client:', e);
    }
    client = null;
    const globalRef = global as any;
    delete globalRef.whatsappClient;
  }
  whatsappStatus = 'DISCONNECTED';
  lastQr = null;
}

export function getWhatsAppClient(): Client {
  if (client) return client;

  const globalRef = global as any;
  if (globalRef.whatsappClient) {
    client = globalRef.whatsappClient;
    if ((client as any).pupPage) {
      whatsappStatus = 'CONNECTED';
    }
    return client!;
  }

  console.log('[WhatsApp] Initializing WhatsApp Client...');
  whatsappStatus = 'INITIALIZING';
  lastQr = null;

  const dataPath = process.env.WWEBJS_AUTH_PATH || path.join(process.cwd(), '.wwebjs_auth');
  const executablePath = process.env.CHROME_PATH || undefined;

  console.log(`[WhatsApp] Using data path: ${dataPath}`);
  if (executablePath) {
    console.log(`[WhatsApp] Using custom Chrome path: ${executablePath}`);
  }

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: dataPath
    }),
    puppeteer: {
      headless: true,
      handleSIGINT: false,
      executablePath: executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--single-process'
      ],
    }
  });

  client.on('qr', (qr) => {
    console.log('\n====================================================================');
    console.log('Scan the QR code below to log in to WhatsApp for PricePilot:');
    console.log('====================================================================\n');
    qrcode.generate(qr, { small: true });
    console.log('\n====================================================================\n');
    whatsappStatus = 'QR_RECEIVED';
    lastQr = qr;
  });

  client.on('ready', () => {
    console.log('[WhatsApp] Client is ready and authenticated!');
    whatsappStatus = 'CONNECTED';
    lastQr = null;
  });

  client.on('auth_failure', (msg) => {
    console.error('[WhatsApp] Auth failure:', msg);
    whatsappStatus = 'DISCONNECTED';
    lastQr = null;
  });

  client.on('disconnected', (reason) => {
    console.log('[WhatsApp] Client disconnected:', reason);
    whatsappStatus = 'DISCONNECTED';
    lastQr = null;
  });

  client.initialize().catch(err => {
    console.error('[WhatsApp] Failed to initialize:', err);
    whatsappStatus = 'DISCONNECTED';
  });

  globalRef.whatsappClient = client;
  return client;
}

export async function sendWhatsAppMessage(to: string, message: string) {
  const client = getWhatsAppClient();
  
  // Wait up to 15 seconds if client is not ready
  let attempts = 0;
  // Use client.pupPage or info to determine readiness
  while (!(client as any).pupPage && attempts < 15) {
    console.log('[WhatsApp] Waiting for WhatsApp client to be ready (attempt ' + (attempts + 1) + ')...');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    attempts++;
  }

  // Format the number to WhatsApp format
  let formattedNumber = to.replace(/\D/g, ''); // keep only digits
  if (formattedNumber.length === 10) {
    formattedNumber = '91' + formattedNumber; // assume Indian country code by default if 10 digits
  }
  if (!formattedNumber.endsWith('@c.us')) {
    formattedNumber += '@c.us';
  }

  console.log(`[WhatsApp] Sending message to ${formattedNumber}...`);
  await client.sendMessage(formattedNumber, message);
}
