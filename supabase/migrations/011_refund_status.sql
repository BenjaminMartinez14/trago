-- ============================================================
-- 011_refund_status.sql
-- Add 'refunded' to the orders.status check constraint and a
-- refunded_at timestamp for audit trail.
-- ============================================================

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending','paid','preparing','ready','delivered','cancelled','refunded'));

ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mp_refund_id TEXT;
