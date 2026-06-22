const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

let client = null;
let whatsappStatus = 'DISCONNECTED';
let lastQr = null;

function getWhatsAppStatus() {
  if (client) {
    if (client.pupPage) {
      // Check if actually ready, handled by events below
    }
  }
  return {
    status: whatsappStatus,
    qr: lastQr
  };
}

async function disconnectWhatsApp() {
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
  }
  whatsappStatus = 'DISCONNECTED';
  lastQr = null;
}

function getWhatsAppClient(forceReinit = false) {
  if (forceReinit) {
    console.log('[WhatsApp] Force re-initializing WhatsApp client...');
    if (client) {
      try {
        client.destroy();
      } catch (e) {
        console.error('Error destroying old client:', e);
      }
      client = null;
    }
    whatsappStatus = 'DISCONNECTED';
    lastQr = null;
  }

  if (client) return client;

  console.log('[WhatsApp] Initializing WhatsApp Client...');
  whatsappStatus = 'INITIALIZING';
  lastQr = null;

  const dataPath = process.env.WWEBJS_AUTH_PATH || path.join(__dirname, '.wwebjs_auth');
  const executablePath = process.env.CHROME_PATH || undefined;

  console.log(`[WhatsApp] Using data path: ${dataPath}`);
  if (executablePath) {
    if (fs.existsSync(executablePath)) {
      console.log(`[WhatsApp] Using custom Chrome path: ${executablePath}`);
    } else {
      console.warn(`[WhatsApp] Configured CHROME_PATH does not exist at "${executablePath}"! Falling back to default.`);
      executablePath = undefined;
    }
  }

  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: dataPath
    }),
    userAgent: userAgent,
    puppeteer: {
      headless: true,
      handleSIGINT: false,
      executablePath: executablePath,
      timeout: 60000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--single-process',
        '--disable-extensions',
        '--disable-blink-features=AutomationControlled'
      ]
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
    try {
      if (client) client.destroy();
    } catch (e) {}
    client = null;
  });

  return client;
}

// Endpoints
app.get('/status', (req, res) => {
  res.json(getWhatsAppStatus());
});

app.post('/connect', async (req, res) => {
  try {
    getWhatsAppClient(true);
    
    // Wait for state transition
    let statusObj = getWhatsAppStatus();
    let attempts = 0;
    while ((statusObj.status === 'INITIALIZING' || statusObj.status === 'DISCONNECTED') && attempts < 15) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      statusObj = getWhatsAppStatus();
      attempts++;
    }
    
    res.json(statusObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/status', async (req, res) => {
  try {
    await disconnectWhatsApp();
    res.json({ success: true, status: 'DISCONNECTED' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/send', async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ error: 'Missing to or message parameter' });
  }

  try {
    const activeClient = getWhatsAppClient();
    
    // Wait up to 15 seconds if not ready
    let attempts = 0;
    while (!activeClient.pupPage && attempts < 15) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    // Anti-ban delay
    const humanDelay = Math.floor(Math.random() * 2000) + 1500;
    await new Promise(resolve => setTimeout(resolve, humanDelay));

    let formattedNumber = to.replace(/\D/g, '');
    if (formattedNumber.length === 10) {
      formattedNumber = '91' + formattedNumber;
    }
    if (!formattedNumber.endsWith('@c.us')) {
      formattedNumber += '@c.us';
    }

    console.log(`[WhatsApp Service] Sending message to ${formattedNumber}...`);
    await activeClient.sendMessage(formattedNumber, message);
    
    res.json({ success: true });
  } catch (err) {
    console.error('[WhatsApp Service] Send failed:', err);
    res.status(500).json({ error: err.message || err });
  }
});

// Auto-boot WhatsApp client if auth folder exists on startup
const sessionPath = process.env.WWEBJS_AUTH_PATH || path.join(__dirname, '.wwebjs_auth');
if (fs.existsSync(sessionPath)) {
  console.log('[WhatsApp Service] Existing session folder detected. Auto-initializing client...');
  getWhatsAppClient();
}

app.listen(PORT, () => {
  console.log(`[WhatsApp Service] Running on port ${PORT}`);
});
