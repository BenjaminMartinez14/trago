const KAPSO_API_KEY = process.env.KAPSO_API_KEY;
const KAPSO_PHONE_NUMBER_ID = process.env.KAPSO_PHONE_NUMBER_ID;

export async function sendOrderReadyWhatsApp(params: {
  to: string;
  orderNumber: number;
}): Promise<void> {
  if (!KAPSO_API_KEY || !KAPSO_PHONE_NUMBER_ID) {
    console.warn("[kapso] KAPSO_API_KEY or KAPSO_PHONE_NUMBER_ID not set — skipping");
    return;
  }

  const res = await fetch(
    `https://api.kapso.ai/meta/whatsapp/v24.0/${KAPSO_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": KAPSO_API_KEY,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: params.to,
        type: "template",
        recipient_type: "individual",
        template: {
          name: "order_confirmation",
          language: { code: "es" },
          components: [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  parameter_name: "order_number",
                  text: String(params.orderNumber),
                },
              ],
            },
          ],
        },
      }),
    }
  );

  if (!res.ok) {
    console.error(`[kapso] ${res.status}`, await res.text().catch(() => ""));
  }
  // Never throw — WhatsApp failure must not affect order transitions
}
