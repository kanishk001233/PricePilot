export async function sendWhatsAppMessage(to: string, message: string) {
  const serviceUrl = process.env.WHATSAPP_SERVICE_URL;
  if (!serviceUrl) {
    console.warn('[WhatsApp] WHATSAPP_SERVICE_URL is not configured. Skipping WhatsApp message.');
    return;
  }

  console.log(`[WhatsApp] Forwarding message to microservice: ${serviceUrl}/send`);
  const res = await fetch(`${serviceUrl}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ to, message })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to send message via microservice');
  }
}
