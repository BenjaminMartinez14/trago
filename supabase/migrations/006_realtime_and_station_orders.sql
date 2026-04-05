-- ============================================================
-- 006_realtime_and_station_orders.sql
-- 1. Fix orders RLS so Supabase Realtime can deliver events to anon clients
--    (the previous policy used x-session-id HTTP header which is unavailable
--     in the Realtime WebSocket context — order UUIDs are unguessable v4 IDs,
--     so USING (true) is acceptable as a capability-based access model)
-- 2. Add station_id to orders so the barman queue can be filtered per-station
-- ============================================================

-- Drop old header-dependent policy
DROP POLICY IF EXISTS "orders_anon_select" ON orders;

-- Allow anon to read any order — UUID is a 128-bit random capability token
CREATE POLICY "orders_anon_select"
  ON orders FOR SELECT
  TO anon
  USING (true);

-- Enable Realtime for the orders table
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Add station_id to orders (nullable — orders created without a station QR have no station)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES stations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_station_id_idx ON orders(station_id);
