-- 008_customer_phone.sql
-- Add customer phone number for WhatsApp notifications via Kapso
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
