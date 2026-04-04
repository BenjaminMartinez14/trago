-- Stations: zones within a venue (e.g., "Barra VIP", "Terraza")
CREATE TABLE stations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id   UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL,
  active     BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(venue_id, slug)
);

CREATE INDEX stations_venue_id_idx ON stations(venue_id);

-- Junction: which products are available at each station
CREATE TABLE station_products (
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (station_id, product_id)
);

-- Add optional station_id to qr_codes
ALTER TABLE qr_codes ADD COLUMN station_id UUID REFERENCES stations(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Full access on stations" ON stations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access on station_products" ON station_products FOR ALL USING (true) WITH CHECK (true);

-- Seed: default station for club-demo
INSERT INTO stations (venue_id, name, slug) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Barra Principal', 'barra-principal');
