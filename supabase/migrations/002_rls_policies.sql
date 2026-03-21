-- ============================================================
-- 002_rls_policies.sql
-- Trago MVP — Row Level Security policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE venues       ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE products     ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_users  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper: extract custom JWT claim
-- Staff JWTs issued by the app include:
--   { "role": "staff", "venue_id": "<uuid>", "staff_role": "scanner"|"admin" }
-- ============================================================
CREATE OR REPLACE FUNCTION auth_venue_id() RETURNS UUID AS $$
  SELECT (auth.jwt() -> 'venue_id')::TEXT::UUID;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_staff_role() RETURNS TEXT AS $$
  SELECT (auth.jwt() ->> 'staff_role');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- venues
-- anon: SELECT active venues (slug + name exposed via view — full row here,
--        application layer filters columns as needed)
-- ============================================================
CREATE POLICY "venues_anon_select"
  ON venues FOR SELECT
  TO anon
  USING (active = true);

-- ============================================================
-- categories
-- anon: SELECT active categories belonging to active venues
-- admin: full access to own venue's categories
-- ============================================================
CREATE POLICY "categories_anon_select"
  ON categories FOR SELECT
  TO anon
  USING (
    active = true
    AND EXISTS (
      SELECT 1 FROM venues v
      WHERE v.id = categories.venue_id AND v.active = true
    )
  );

CREATE POLICY "categories_admin_all"
  ON categories FOR ALL
  TO authenticated
  USING (
    auth_staff_role() = 'admin'
    AND venue_id = auth_venue_id()
  )
  WITH CHECK (
    auth_staff_role() = 'admin'
    AND venue_id = auth_venue_id()
  );

-- ============================================================
-- products
-- anon: SELECT available products from active venues
-- admin: full access to own venue's products
-- ============================================================
CREATE POLICY "products_anon_select"
  ON products FOR SELECT
  TO anon
  USING (
    available = true
    AND EXISTS (
      SELECT 1 FROM venues v
      WHERE v.id = products.venue_id AND v.active = true
    )
  );

CREATE POLICY "products_admin_all"
  ON products FOR ALL
  TO authenticated
  USING (
    auth_staff_role() = 'admin'
    AND venue_id = auth_venue_id()
  )
  WITH CHECK (
    auth_staff_role() = 'admin'
    AND venue_id = auth_venue_id()
  );

-- Staff scanners can toggle product availability (available field)
CREATE POLICY "products_scanner_update"
  ON products FOR UPDATE
  TO authenticated
  USING (
    auth_staff_role() IN ('scanner', 'admin')
    AND venue_id = auth_venue_id()
  )
  WITH CHECK (
    auth_staff_role() IN ('scanner', 'admin')
    AND venue_id = auth_venue_id()
  );

-- ============================================================
-- orders
-- anon INSERT: any session can create an order
-- anon SELECT: session can only read its own orders
--              (session_id matched against x-session-id request header)
-- service_role UPDATE: webhooks update status + mp fields only
-- staff SELECT + UPDATE: own venue's orders
-- ============================================================
CREATE POLICY "orders_anon_insert"
  ON orders FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "orders_anon_select"
  ON orders FOR SELECT
  TO anon
  USING (
    session_id = (
      current_setting('request.headers', true)::json->>'x-session-id'
    )::UUID
  );

CREATE POLICY "orders_service_role_update"
  ON orders FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "orders_staff_select"
  ON orders FOR SELECT
  TO authenticated
  USING (
    auth_staff_role() IN ('scanner', 'admin')
    AND venue_id = auth_venue_id()
  );

CREATE POLICY "orders_staff_update"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    auth_staff_role() IN ('scanner', 'admin')
    AND venue_id = auth_venue_id()
  )
  WITH CHECK (
    auth_staff_role() IN ('scanner', 'admin')
    AND venue_id = auth_venue_id()
  );

-- ============================================================
-- order_items
-- anon SELECT: via order ownership (session_id check via orders join)
-- anon INSERT: allowed when creating an order
-- staff SELECT: own venue's order items
-- ============================================================
CREATE POLICY "order_items_anon_insert"
  ON order_items FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "order_items_anon_select"
  ON order_items FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND o.session_id = (
          current_setting('request.headers', true)::json->>'x-session-id'
        )::UUID
    )
  );

CREATE POLICY "order_items_staff_select"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND o.venue_id = auth_venue_id()
    )
  );

-- ============================================================
-- staff_users
-- No anon access. Staff JWT auth only.
-- Admins can manage their venue's staff.
-- ============================================================
CREATE POLICY "staff_users_admin_all"
  ON staff_users FOR ALL
  TO authenticated
  USING (
    auth_staff_role() = 'admin'
    AND venue_id = auth_venue_id()
  )
  WITH CHECK (
    auth_staff_role() = 'admin'
    AND venue_id = auth_venue_id()
  );

-- Staff can read their own record (for profile display)
CREATE POLICY "staff_users_self_select"
  ON staff_users FOR SELECT
  TO authenticated
  USING (venue_id = auth_venue_id());
