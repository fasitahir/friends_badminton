-- ============================================================
-- Monthly Leaderboard Snapshots
-- ============================================================
-- Each row is one player's stats for one calendar month.
-- Snapshots are created manually by an admin at month-end.
-- Raw match data is never modified — this is a read cache only.
-- ============================================================

CREATE TABLE monthly_snapshots (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  month       DATE        NOT NULL,           -- first day of month, e.g. 2026-06-01
  player_id   UUID        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  sets_played INT         NOT NULL DEFAULT 0,
  sets_won    INT         NOT NULL DEFAULT 0,
  sets_lost   INT         NOT NULL DEFAULT 0,
  win_rate    NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT monthly_snapshots_unique UNIQUE (month, player_id)
);

ALTER TABLE monthly_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to monthly_snapshots"
  ON monthly_snapshots FOR ALL USING (true) WITH CHECK (true);

-- Index for fast month lookups
CREATE INDEX idx_monthly_snapshots_month ON monthly_snapshots(month DESC);
CREATE INDEX idx_monthly_snapshots_player ON monthly_snapshots(player_id);
