export const ORDER_STATUSES = [
  "pending",
  "paid",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendiente",
  paid: "En espera",
  preparing: "Preparando",
  ready: "Listo",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export const POLL_INTERVAL_MS = 3000;
export const NETWORK_TIMEOUT_MS = 3000;

export const SW_CACHE_STRATEGIES = {
  STATIC_ASSETS: "CacheFirst",
  PRODUCT_IMAGES: "CacheFirst",
  MENU_DATA: "StaleWhileRevalidate",
  API_ROUTES: "NetworkOnly",
  ORDER_STATUS: "NetworkFirst",
} as const;

export const SESSION_ID_KEY = "trago_session_id";

export const STAFF_STATUS_TRANSITIONS: Record<
  string,
  { action: string; next: OrderStatus; label: string; color: string }
> = {
  paid: { action: "accept", next: "preparing", label: "Aceptar pedido", color: "bg-trago-orange" },
  preparing: { action: "mark_ready", next: "ready", label: "Marcar listo", color: "bg-yellow-500" },
  ready: { action: "deliver", next: "delivered", label: "Entregar", color: "bg-trago-green" },
};
