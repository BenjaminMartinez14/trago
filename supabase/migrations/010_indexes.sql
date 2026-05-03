-- ============================================================
-- 010_indexes.sql
-- Composite indexes for hot dashboard / queue queries.
-- These are safe to add (no data migration, online build).
-- ============================================================

-- Used by: GET /api/staff/orders (queue), /api/dashboard/stats, /api/dashboard/orders
CREATE INDEX IF NOT EXISTS orders_venue_status_created_at_idx
  ON orders (venue_id, status, created_at DESC);

-- Used by: dashboard orders timeline, /api/admin/venues aggregation
CREATE INDEX IF NOT EXISTS orders_venue_created_at_idx
  ON orders (venue_id, created_at DESC);

-- Used by: order_items lookup when computing top products
CREATE INDEX IF NOT EXISTS order_items_order_id_idx
  ON order_items (order_id);

-- Used by: customer-facing order page (status polling)
CREATE INDEX IF NOT EXISTS orders_session_id_idx
  ON orders (session_id);
