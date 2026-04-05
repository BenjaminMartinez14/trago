-- Supabase Realtime postgres_changes needs REPLICA IDENTITY FULL
-- to deliver the complete row payload on UPDATE events.
-- Without this, the NEW row in the realtime payload may be missing columns.
ALTER TABLE orders REPLICA IDENTITY FULL;
