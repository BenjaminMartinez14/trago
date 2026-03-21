import { MercadoPagoConfig, Preference } from "mercadopago";

export type MPPreferenceItem = {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  currency_id: "CLP";
};

export async function createPreference({
  accessToken,
  items,
  orderId,
  venueSlug,
}: {
  accessToken: string;
  items: Omit<MPPreferenceItem, "id">[];
  orderId: string;
  venueSlug: string;
}): Promise<string> {
  const client = new MercadoPagoConfig({ accessToken });
  const preference = new Preference(client);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  // MP requires an id field on each item
  const itemsWithId: MPPreferenceItem[] = items.map((item, idx) => ({
    ...item,
    id: String(idx + 1),
  }));

  const result = await preference.create({
    body: {
      items: itemsWithId,
      external_reference: orderId,
      notification_url: `${baseUrl}/api/webhooks/mp`,
      back_urls: {
        success: `${baseUrl}/${venueSlug}/order/${orderId}`,
        failure: `${baseUrl}/${venueSlug}/checkout`,
        pending: `${baseUrl}/${venueSlug}/order/${orderId}`,
      },
      auto_return: "approved",
    },
  });

  if (!result.id) throw new Error("MP preference creation returned no id");
  return result.id;
}
