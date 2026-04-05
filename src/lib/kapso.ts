export async function sendWhatsApp(params: {
  to: string;
  templateId: string;
  variables?: string[];
}): Promise<void> {
  const apiKey = process.env.KAPSO_API_KEY;
  if (!apiKey) {
    console.warn("[kapso] KAPSO_API_KEY not set — skipping");
    return;
  }
  const res = await fetch(process.env.KAPSO_API_URL ?? "https://api.kapso.io/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ to: params.to, templateId: params.templateId, variables: params.variables }),
  });
  if (!res.ok) {
    console.error(`[kapso] ${res.status}`, await res.text().catch(() => ""));
  }
  // Never throw — WhatsApp failure must not affect order transitions
}
