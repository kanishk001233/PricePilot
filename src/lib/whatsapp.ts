export async function sendWhatsAppMessage(to: string, message: string) {
  const serviceUrl = process.env.WHATSAPP_SERVICE_URL || 'http://13.60.66.14:3001';

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
