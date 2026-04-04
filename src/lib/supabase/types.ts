// Hand-authored types matching 001_initial_schema.sql
// Replace with `supabase gen types typescript --project-id <id>` once project is linked.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrderStatus =
  | "pending"
  | "paid"
  | "preparing"
  | "ready"
  | "delivered"
  | "cancelled";

// ── Row shapes (no circular references) ──────────────────────────────────────

interface VenueRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  contact_email: string;
  mp_access_token: string;
  commission_pct: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface CategoryRow {
  id: string;
  venue_id: string;
  name: string;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductRow {
  id: string;
  category_id: string;
  venue_id: string;
  name: string;
  description: string | null;
  price_clp: number;
  image_url: string | null;
  available: boolean;
  stock_count: number | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface OrderRow {
  id: string;
  venue_id: string;
  session_id: string;
  order_number: number;
  status: OrderStatus;
  total_clp: number;
  mp_payment_id: string | null;
  mp_status: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price_clp: number;
  notes: string | null;
}

interface StaffUserRow {
  id: string;
  venue_id: string;
  name: string;
  pin_hash: string;
  role: "scanner" | "admin";
  active: boolean;
  created_at: string;
}

interface QrCodeRow {
  id: string;
  venue_id: string;
  label: string;
  created_at: string;
}

// ── Insert shapes (no auto-generated fields) ──────────────────────────────────

interface VenueInsert {
  id?: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  contact_email: string;
  mp_access_token: string;
  commission_pct?: number;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface CategoryInsert {
  id?: string;
  venue_id: string;
  name: string;
  display_order?: number;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface ProductInsert {
  id?: string;
  category_id: string;
  venue_id: string;
  name: string;
  description?: string | null;
  price_clp: number;
  image_url?: string | null;
  available?: boolean;
  stock_count?: number | null;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
}

interface OrderInsert {
  id?: string;
  venue_id: string;
  session_id: string;
  status?: OrderStatus;
  total_clp: number;
  mp_payment_id?: string | null;
  mp_status?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface OrderItemInsert {
  id?: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity?: number;
  unit_price_clp: number;
  notes?: string | null;
}

interface StaffUserInsert {
  id?: string;
  venue_id: string;
  name: string;
  pin_hash: string;
  role: "scanner" | "admin";
  active?: boolean;
  created_at?: string;
}

interface QrCodeInsert {
  id?: string;
  venue_id: string;
  label: string;
  created_at?: string;
}

// ── Database type ─────────────────────────────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      venues: {
        Row: VenueRow;
        Insert: VenueInsert;
        Update: Partial<VenueInsert>;
        Relationships: [];
      };
      categories: {
        Row: CategoryRow;
        Insert: CategoryInsert;
        Update: Partial<CategoryInsert>;
        Relationships: [];
      };
      products: {
        Row: ProductRow;
        Insert: ProductInsert;
        Update: Partial<ProductInsert>;
        Relationships: [];
      };
      orders: {
        Row: OrderRow;
        Insert: OrderInsert;
        Update: Partial<OrderInsert>;
        Relationships: [];
      };
      order_items: {
        Row: OrderItemRow;
        Insert: OrderItemInsert;
        Update: Partial<OrderItemInsert>;
        Relationships: [];
      };
      staff_users: {
        Row: StaffUserRow;
        Insert: StaffUserInsert;
        Update: Partial<StaffUserInsert>;
        Relationships: [];
      };
      qr_codes: {
        Row: QrCodeRow;
        Insert: QrCodeInsert;
        Update: Partial<QrCodeInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// ── Convenience row types ─────────────────────────────────────────────────────

export type Venue = VenueRow;
export type Category = CategoryRow;
export type Product = ProductRow;
export type Order = OrderRow;
export type OrderItem = OrderItemRow;
export type StaffUser = StaffUserRow;
export type QrCode = QrCodeRow;
