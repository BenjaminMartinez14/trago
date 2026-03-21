-- ============================================================
-- 001_initial_schema.sql
-- Trago MVP — initial schema
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid(), crypt()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- uuid_generate_v4() fallback

-- ============================================================
-- Utility: auto-update updated_at on row change
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- venues
-- ============================================================
CREATE TABLE venues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,         -- URL-friendly identifier
  logo_url        TEXT,
  contact_email   TEXT NOT NULL,
  mp_access_token TEXT NOT NULL,               -- venue's Mercado Pago OAuth token
  commission_pct  NUMERIC(5,2) DEFAULT 2.50,  -- Trago commission %
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER venues_updated_at
  BEFORE UPDATE ON venues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- categories
-- ============================================================
CREATE TABLE categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id      UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX categories_venue_id_idx ON categories(venue_id);

CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- products
-- ============================================================
CREATE TABLE products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  venue_id      UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  price_clp     INTEGER NOT NULL,              -- price in CLP (integer, no decimals)
  image_url     TEXT,
  available     BOOLEAN DEFAULT true,          -- staff can toggle 86'd items
  stock_count   INTEGER,                       -- NULL = unlimited stock
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX products_venue_id_idx     ON products(venue_id);
CREATE INDEX products_category_id_idx  ON products(category_id);

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- orders
-- ============================================================
CREATE TABLE orders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id       UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  session_id     UUID NOT NULL,                -- browser session (from sessionStorage)
  order_number   SERIAL,                       -- human-readable sequential number
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','paid','preparing','ready','delivered','cancelled')),
  total_clp      INTEGER NOT NULL,
  mp_payment_id  TEXT,                         -- Mercado Pago payment ID
  mp_status      TEXT,                         -- MP payment status for debugging
  notes          TEXT,                         -- customer order-level notes
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX orders_venue_id_idx    ON orders(venue_id);
CREATE INDEX orders_session_id_idx  ON orders(session_id);
CREATE INDEX orders_status_idx      ON orders(status);
-- Idempotency: ensure mp_payment_id uniqueness when set
CREATE UNIQUE INDEX orders_mp_payment_id_idx ON orders(mp_payment_id) WHERE mp_payment_id IS NOT NULL;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- order_items
-- ============================================================
CREATE TABLE order_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id     UUID NOT NULL REFERENCES products(id),
  product_name   TEXT NOT NULL,                -- denormalized: snapshot at order time
  quantity       INTEGER NOT NULL DEFAULT 1,
  unit_price_clp INTEGER NOT NULL,             -- snapshot at order time
  notes          TEXT                          -- item-level customization
);

CREATE INDEX order_items_order_id_idx ON order_items(order_id);

-- ============================================================
-- staff_users
-- ============================================================
CREATE TABLE staff_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id   UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  pin_hash   TEXT NOT NULL,                    -- bcrypt hash of 4-digit PIN
  role       TEXT NOT NULL CHECK (role IN ('scanner','admin')),
  active     BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX staff_users_venue_id_idx ON staff_users(venue_id);
