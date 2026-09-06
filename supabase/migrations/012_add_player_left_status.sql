-- ============================================================
-- Badminton Analytics — Add has_left and left_at to players
-- ============================================================

ALTER TABLE players ADD COLUMN IF NOT EXISTS has_left BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE players ADD COLUMN IF NOT EXISTS left_at DATE DEFAULT NULL;

-- Index for querying active/left players
CREATE INDEX IF NOT EXISTS idx_players_has_left ON players(has_left);
