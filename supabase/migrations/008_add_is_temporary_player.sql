-- ============================================================
-- Badminton Analytics — Add is_temporary to players
-- ============================================================

ALTER TABLE players ADD COLUMN is_temporary BOOLEAN NOT NULL DEFAULT false;
