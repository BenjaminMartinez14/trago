-- ============================================================
-- 009_product_images.sql
-- Add curated Unsplash images to seed products so the menu looks polished.
-- All URLs are Unsplash photo IDs with explicit width/quality params for
-- consistent rendering on mobile.
-- ============================================================

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1618885472179-5e474019f2a9?w=600&q=80&auto=format&fit=crop'
  WHERE venue_id = 'a1b2c3d4-0000-0000-0000-000000000001' AND name = 'Heineken';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1613618797388-e9576068d563?w=600&q=80&auto=format&fit=crop'
  WHERE venue_id = 'a1b2c3d4-0000-0000-0000-000000000001' AND name = 'Corona';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&q=80&auto=format&fit=crop'
  WHERE venue_id = 'a1b2c3d4-0000-0000-0000-000000000001' AND name = 'Kunstmann';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&q=80&auto=format&fit=crop'
  WHERE venue_id = 'a1b2c3d4-0000-0000-0000-000000000001' AND name = 'Pisco Sour';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1587223962930-cb7f31384c19?w=600&q=80&auto=format&fit=crop'
  WHERE venue_id = 'a1b2c3d4-0000-0000-0000-000000000001' AND name = 'Gin Tonic';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1560512823-829485b8bf24?w=600&q=80&auto=format&fit=crop'
  WHERE venue_id = 'a1b2c3d4-0000-0000-0000-000000000001' AND name = 'Aperol Spritz';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=600&q=80&auto=format&fit=crop'
  WHERE venue_id = 'a1b2c3d4-0000-0000-0000-000000000001' AND name = 'Mojito';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1564419320461-6870880221ad?w=600&q=80&auto=format&fit=crop'
  WHERE venue_id = 'a1b2c3d4-0000-0000-0000-000000000001' AND name = 'Agua mineral';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600&q=80&auto=format&fit=crop'
  WHERE venue_id = 'a1b2c3d4-0000-0000-0000-000000000001' AND name = 'Coca-Cola';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1613534900087-d10ed7a51e92?w=600&q=80&auto=format&fit=crop'
  WHERE venue_id = 'a1b2c3d4-0000-0000-0000-000000000001' AND name = 'Red Bull';
