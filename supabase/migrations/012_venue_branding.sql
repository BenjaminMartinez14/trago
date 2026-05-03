-- ============================================================
-- 012_venue_branding.sql
-- Per-venue branding: accent color override.
-- (logo_url already exists.)
-- ============================================================

ALTER TABLE venues ADD COLUMN IF NOT EXISTS accent_color TEXT;

-- Validate hex format if set
ALTER TABLE venues DROP CONSTRAINT IF EXISTS venues_accent_color_format;
ALTER TABLE venues ADD CONSTRAINT venues_accent_color_format
  CHECK (accent_color IS NULL OR accent_color ~* '^#[0-9a-f]{6}$');
