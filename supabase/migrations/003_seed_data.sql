-- ============================================================
-- 003_seed_data.sql
-- Trago MVP — local development & staging seed data
-- ============================================================

-- ============================================================
-- Venue
-- ============================================================
INSERT INTO venues (id, name, slug, contact_email, mp_access_token, commission_pct, active)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Club Demo',
  'club-demo',
  'admin@clubdemo.cl',
  'TEST_MP_ACCESS_TOKEN_PLACEHOLDER',   -- replace with a real MP sandbox token for payment testing
  2.50,
  true
);

-- ============================================================
-- Categories
-- ============================================================
INSERT INTO categories (id, venue_id, name, display_order, active)
VALUES
  (
    'a1b2c3d4-0000-0000-0001-000000000001',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Cervezas',
    1,
    true
  ),
  (
    'a1b2c3d4-0000-0000-0001-000000000002',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Tragos',
    2,
    true
  ),
  (
    'a1b2c3d4-0000-0000-0001-000000000003',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Sin Alcohol',
    3,
    true
  );

-- ============================================================
-- Products
-- Prices in CLP (integer). display_order within each category.
-- ============================================================

-- Cervezas
INSERT INTO products (venue_id, category_id, name, price_clp, available, display_order)
VALUES
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'a1b2c3d4-0000-0000-0001-000000000001',
    'Heineken',
    4500,
    true,
    1
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'a1b2c3d4-0000-0000-0001-000000000001',
    'Corona',
    4000,
    true,
    2
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'a1b2c3d4-0000-0000-0001-000000000001',
    'Kunstmann',
    5000,
    true,
    3
  );

-- Tragos
INSERT INTO products (venue_id, category_id, name, price_clp, available, display_order)
VALUES
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'a1b2c3d4-0000-0000-0001-000000000002',
    'Pisco Sour',
    5500,
    true,
    1
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'a1b2c3d4-0000-0000-0001-000000000002',
    'Gin Tonic',
    6500,
    true,
    2
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'a1b2c3d4-0000-0000-0001-000000000002',
    'Aperol Spritz',
    7000,
    true,
    3
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'a1b2c3d4-0000-0000-0001-000000000002',
    'Mojito',
    6000,
    true,
    4
  );

-- Sin Alcohol
INSERT INTO products (venue_id, category_id, name, price_clp, available, display_order)
VALUES
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'a1b2c3d4-0000-0000-0001-000000000003',
    'Agua mineral',
    2000,
    true,
    1
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'a1b2c3d4-0000-0000-0001-000000000003',
    'Coca-Cola',
    2500,
    true,
    2
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'a1b2c3d4-0000-0000-0001-000000000003',
    'Red Bull',
    4000,
    true,
    3
  );

-- ============================================================
-- Staff users
-- PIN hashes use bcrypt via pgcrypto crypt()
-- Admin Demo  → PIN 1234
-- Barra 1     → PIN 0000
-- ============================================================
INSERT INTO staff_users (venue_id, name, pin_hash, role, active)
VALUES
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Admin Demo',
    crypt('1234', gen_salt('bf', 10)),
    'admin',
    true
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Barra 1',
    crypt('0000', gen_salt('bf', 10)),
    'scanner',
    true
  );
