-- Saved QR codes for venue menu links
CREATE TABLE qr_codes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id   UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  label      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX qr_codes_venue_id_idx ON qr_codes(venue_id);
