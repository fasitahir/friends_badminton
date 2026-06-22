-- ============================================================
-- Auto Monthly Snapshot via pg_cron
-- ============================================================
-- Runs a stored procedure at 00:00 on the 1st of every month.
-- The procedure snapshots the PREVIOUS month's stats into
-- monthly_snapshots. No app code or admin action needed.
--
-- HOW TO APPLY:
--   Run this in your Supabase SQL Editor.
--   pg_cron and pg_net are already available on all Supabase projects.
-- ============================================================

-- 1. Enable pg_cron (already enabled on Supabase; this is a no-op if so)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. The snapshot function -----------------------------------------
CREATE OR REPLACE FUNCTION snapshot_previous_month()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_month_start  DATE;
  v_month_end    DATE;
  v_month_label  DATE;   -- first day of previous month stored as DATE
BEGIN
  -- Previous month boundaries (UTC)
  v_month_start := date_trunc('month', now() - interval '1 month')::date;
  v_month_end   := date_trunc('month', now())::date;           -- exclusive
  v_month_label := v_month_start;

  -- Upsert per-player stats for previous month
  INSERT INTO monthly_snapshots (month, player_id, sets_played, sets_won, sets_lost, win_rate)
  SELECT
    v_month_label                                             AS month,
    p.player_id,
    COUNT(*)                                                  AS sets_played,
    COUNT(*) FILTER (
      WHERE (mg.pair1_id = p.pair_id AND mg.winning_pair_id = mg.pair1_id)
         OR (mg.pair2_id = p.pair_id AND mg.winning_pair_id = mg.pair2_id)
    )                                                         AS sets_won,
    COUNT(*) FILTER (
      WHERE (mg.pair1_id = p.pair_id AND mg.winning_pair_id <> mg.pair1_id)
         OR (mg.pair2_id = p.pair_id AND mg.winning_pair_id <> mg.pair2_id)
    )                                                         AS sets_lost,
    ROUND(
      COUNT(*) FILTER (
        WHERE (mg.pair1_id = p.pair_id AND mg.winning_pair_id = mg.pair1_id)
           OR (mg.pair2_id = p.pair_id AND mg.winning_pair_id = mg.pair2_id)
      )::numeric * 100 / NULLIF(COUNT(*), 0),
      2
    )                                                         AS win_rate
  FROM match_games mg
  -- join to get the match timestamp
  JOIN matches m ON m.id = mg.match_id
  -- expand each game into two rows: one per pair
  JOIN (
    SELECT id AS pair_id, player1_id AS player_id FROM pairs
    UNION ALL
    SELECT id AS pair_id, player2_id AS player_id FROM pairs
  ) p ON p.pair_id IN (mg.pair1_id, mg.pair2_id)
  WHERE mg.winning_pair_id IS NOT NULL                        -- completed sets only
    AND m.created_at >= v_month_start
    AND m.created_at <  v_month_end
  GROUP BY p.player_id
  ON CONFLICT (month, player_id)
  DO UPDATE SET
    sets_played = EXCLUDED.sets_played,
    sets_won    = EXCLUDED.sets_won,
    sets_lost   = EXCLUDED.sets_lost,
    win_rate    = EXCLUDED.win_rate;

  RAISE NOTICE 'Monthly snapshot done for %', v_month_label;
END;
$$;

-- 3. Schedule: run at 00:00 UTC on the 1st of every month --------
--    (Supabase cron jobs run in UTC)
SELECT cron.schedule(
  'auto-monthly-snapshot',   -- job name (unique)
  '0 0 1 * *',               -- cron expr: minute=0, hour=0, day=1, every month
  $$ SELECT snapshot_previous_month(); $$
);

-- To verify the job was created:
-- SELECT * FROM cron.job WHERE jobname = 'auto-monthly-snapshot';

-- To manually trigger for testing (snapshots PREVIOUS month):
-- SELECT snapshot_previous_month();

-- To unschedule if needed:
-- SELECT cron.unschedule('auto-monthly-snapshot');
