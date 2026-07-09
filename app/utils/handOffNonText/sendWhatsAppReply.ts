const D360_BASE_URL = "https://waba-sandbox.360dialog.io"; // switch to waba-sandbox.360dialog.io while testing sandbox

export async function sendWhatsAppReply(
  to: string,
  text: string,
): Promise<void> {
  const res = await fetch(`${D360_BASE_URL}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "D360-API-KEY": process.env.D460_API_KEYS!,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error("Failed to send WhatsApp reply:", res.status, errBody);
    throw new Error(`WhatsApp send failed: ${res.status}`);
  }
}
