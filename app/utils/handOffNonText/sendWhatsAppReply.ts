const D360_BASE_URL = "https://waba-v2.360dialog.io"; // switch to waba-sandbox.360dialog.io while testing sandbox

export async function sendWhatsAppReply(
  to: string,
  text: string,
): Promise<void> {
  const res = await fetch(`${D360_BASE_URL}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "D360-API-KEY": process.env.D360_API_KEY!,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error(
      "Failed to send WhatsApp reply:",
      "res",
      res,
      res.status,
      errBody,
    );
    throw new Error(`WhatsApp send failed: ${res.status}`);
  }
}
