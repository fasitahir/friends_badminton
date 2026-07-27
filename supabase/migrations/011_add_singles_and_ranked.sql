-- ============================================================
-- 011_add_singles_and_ranked.sql
-- Add match_type and is_ranked to support single player and unranked matches
-- ============================================================

-- 1. Modify Matches Table
ALTER TABLE matches ADD COLUMN match_type TEXT NOT NULL DEFAULT 'doubles' CHECK (match_type IN ('singles', 'doubles'));
ALTER TABLE matches ADD COLUMN is_ranked BOOLEAN NOT NULL DEFAULT true;

-- 2. Modify Pairs Table to allow single player pairs (player2_id can be NULL)
ALTER TABLE pairs ALTER COLUMN player2_id DROP NOT NULL;
ALTER TABLE pairs DROP CONSTRAINT IF EXISTS pairs_different_players;
ALTER TABLE pairs ADD CONSTRAINT pairs_different_players CHECK (player2_id IS NULL OR player1_id <> player2_id);

-- 3. Redefine auto monthly snapshot to ignore NULL player2_id
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
    SUM(mg.weight)                                            AS sets_played,
    SUM(CASE WHEN ((mg.pair1_id = p.pair_id AND mg.winning_pair_id = mg.pair1_id)
         OR (mg.pair2_id = p.pair_id AND mg.winning_pair_id = mg.pair2_id)) THEN mg.weight ELSE 0 END) AS sets_won,
    SUM(CASE WHEN ((mg.pair1_id = p.pair_id AND mg.winning_pair_id <> mg.pair1_id)
         OR (mg.pair2_id = p.pair_id AND mg.winning_pair_id <> mg.pair2_id)) THEN mg.weight ELSE 0 END) AS sets_lost,
    ROUND(
      (SUM(CASE WHEN ((mg.pair1_id = p.pair_id AND mg.winning_pair_id = mg.pair1_id)
         OR (mg.pair2_id = p.pair_id AND mg.winning_pair_id = mg.pair2_id)) THEN mg.weight ELSE 0 END)
      / NULLIF(SUM(mg.weight), 0)) * 100,
      2
    )                                                         AS win_rate
  FROM (
    SELECT mg_inner.*,
      (CASE WHEN EXISTS (
        SELECT 1 FROM pairs p1 
        JOIN players pl1 ON pl1.id IN (p1.player1_id, p1.player2_id)
        WHERE p1.id IN (mg_inner.pair1_id, mg_inner.pair2_id) AND pl1.is_temporary = true
      ) THEN 0.5 ELSE 1.0 END) AS weight
    FROM match_games mg_inner
  ) mg
  -- join to get the match timestamp
  JOIN matches m ON m.id = mg.match_id
  -- expand each game into one or two rows: one per player
  JOIN (
    SELECT id AS pair_id, player1_id AS player_id FROM pairs
    UNION ALL
    SELECT id AS pair_id, player2_id AS player_id FROM pairs WHERE player2_id IS NOT NULL
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


-- 4. Redefine recalculate_elo_from_earliest
CREATE OR REPLACE FUNCTION recalculate_elo_from_earliest()
RETURNS VOID AS $$
DECLARE
  v_date DATE := NULLIF(current_setting('elo.earliest_date', true), '')::DATE;
  v_time TIMESTAMPTZ := NULLIF(current_setting('elo.earliest_time', true), '')::TIMESTAMPTZ;
  v_match UUID := NULLIF(current_setting('elo.earliest_match', true), '')::UUID;
  v_game_number INT := NULLIF(current_setting('elo.earliest_game_number', true), '')::INT;
  
  v_game RECORD;
  
  v_p1_a UUID;  v_p1_b UUID;  v_p2_a UUID;  v_p2_b UUID;
  v_p1_a_elo INT;  v_p1_b_elo INT;  v_p2_a_elo INT;  v_p2_b_elo INT;
  v_p1_a_temp BOOLEAN; v_p1_b_temp BOOLEAN; v_p2_a_temp BOOLEAN; v_p2_b_temp BOOLEAN;
  v_k FLOAT;
  v_divisor FLOAT;
  
  v_p1_avg FLOAT;  v_p2_avg FLOAT;
  v_exp_p1 FLOAT;  v_exp_p2 FLOAT;
  v_act_p1 FLOAT;  v_act_p2 FLOAT;
  v_delta_p1 INT;  v_delta_p2 INT;
BEGIN
  -- If nothing to recalculate, exit
  IF v_date IS NULL THEN
    RETURN;
  END IF;

  -- 1. Delete invalid snapshots that fall on or after the earliest affected game
  DELETE FROM player_elo_snapshots
  WHERE game_id IN (
    SELECT mg.id
    FROM match_games mg
    JOIN matches m ON m.id = mg.match_id
    JOIN sessions s ON s.id = m.session_id
    WHERE (s.date, m.created_at, m.id, mg.game_number) >= (v_date, v_time, v_match, v_game_number)
  );

  -- 2. Restore players to their last valid snapshot (or 600 if none)
  UPDATE players p
  SET elo_rating = COALESCE((
    SELECT pes.elo_after 
    FROM player_elo_snapshots pes
    JOIN match_games mg ON mg.id = pes.game_id
    JOIN matches m ON m.id = mg.match_id
    JOIN sessions s ON s.id = m.session_id
    WHERE pes.player_id = p.id
    ORDER BY s.date DESC, m.created_at DESC, m.id DESC, mg.game_number DESC
    LIMIT 1
  ), 600)
  WHERE id IS NOT NULL;

  -- 3. Iterate over all games from the earliest point onwards
  FOR v_game IN 
    SELECT 
      mg.id as game_id, mg.match_id, mg.game_number, mg.pair1_id, mg.pair2_id, mg.winning_pair_id,
      m.match_type, m.is_ranked
    FROM match_games mg
    JOIN matches m ON m.id = mg.match_id
    JOIN sessions s ON s.id = m.session_id
    WHERE (s.date, m.created_at, m.id, mg.game_number) >= (v_date, v_time, v_match, v_game_number)
    ORDER BY s.date ASC, m.created_at ASC, m.id ASC, mg.game_number ASC
  LOOP
    -- Get players
    SELECT player1_id, player2_id INTO v_p1_a, v_p1_b FROM pairs WHERE id = v_game.pair1_id;
    SELECT player1_id, player2_id INTO v_p2_a, v_p2_b FROM pairs WHERE id = v_game.pair2_id;

    -- Get their current (restored) ELO and temp status
    SELECT elo_rating, COALESCE(is_temporary, false) INTO v_p1_a_elo, v_p1_a_temp FROM players WHERE id = v_p1_a;
    IF v_p1_b IS NOT NULL THEN
      SELECT elo_rating, COALESCE(is_temporary, false) INTO v_p1_b_elo, v_p1_b_temp FROM players WHERE id = v_p1_b;
    ELSE
      v_p1_b_elo := NULL; v_p1_b_temp := false;
    END IF;

    SELECT elo_rating, COALESCE(is_temporary, false) INTO v_p2_a_elo, v_p2_a_temp FROM players WHERE id = v_p2_a;
    IF v_p2_b IS NOT NULL THEN
      SELECT elo_rating, COALESCE(is_temporary, false) INTO v_p2_b_elo, v_p2_b_temp FROM players WHERE id = v_p2_b;
    ELSE
      v_p2_b_elo := NULL; v_p2_b_temp := false;
    END IF;

    IF v_game.is_ranked = false THEN
      v_delta_p1 := 0; v_delta_p2 := 0;
    ELSE
      -- Compute ELO logic
      v_p1_avg := (v_p1_a_elo + COALESCE(v_p1_b_elo, v_p1_a_elo)) / 2.0;
      v_p2_avg := (v_p2_a_elo + COALESCE(v_p2_b_elo, v_p2_a_elo)) / 2.0;

      IF v_game.match_type = 'singles' THEN
        v_divisor := 800.0;
        IF v_p1_a_temp OR v_p1_b_temp OR v_p2_a_temp OR v_p2_b_temp THEN
          v_k := 24.0;
        ELSE
          v_k := 48.0;
        END IF;
      ELSE
        v_divisor := 400.0;
        IF v_p1_a_temp OR v_p1_b_temp OR v_p2_a_temp OR v_p2_b_temp THEN
          v_k := 12.0;
        ELSE
          v_k := 24.0;
        END IF;
      END IF;

      v_exp_p1 := 1.0 / (1.0 + POWER(10.0, (v_p2_avg - v_p1_avg) / v_divisor));
      v_exp_p2 := 1.0 / (1.0 + POWER(10.0, (v_p1_avg - v_p2_avg) / v_divisor));

      IF v_game.winning_pair_id = v_game.pair1_id THEN
        v_act_p1 := 1.0; v_act_p2 := 0.0;
      ELSEIF v_game.winning_pair_id = v_game.pair2_id THEN
        v_act_p1 := 0.0; v_act_p2 := 1.0;
      ELSE
        v_act_p1 := 0.5; v_act_p2 := 0.5;
      END IF;

      v_delta_p1 := ROUND(v_k * (v_act_p1 - v_exp_p1))::INT;
      v_delta_p2 := ROUND(v_k * (v_act_p2 - v_exp_p2))::INT;
    END IF;

    -- Update match_games (historic record)
    UPDATE match_games 
    SET 
      pair1_p1_elo_before = v_p1_a_elo,
      pair1_p2_elo_before = v_p1_b_elo,
      pair2_p1_elo_before = v_p2_a_elo,
      pair2_p2_elo_before = v_p2_b_elo,
      pair1_elo_change = v_delta_p1,
      pair2_elo_change = v_delta_p2
    WHERE id = v_game.game_id;

    -- Update players
    IF v_delta_p1 <> 0 THEN
      UPDATE players SET elo_rating = elo_rating + v_delta_p1 WHERE id IN (v_p1_a, v_p1_b) AND id IS NOT NULL;
    END IF;
    IF v_delta_p2 <> 0 THEN
      UPDATE players SET elo_rating = elo_rating + v_delta_p2 WHERE id IN (v_p2_a, v_p2_b) AND id IS NOT NULL;
    END IF;

    -- Insert new snapshots
    INSERT INTO player_elo_snapshots (player_id, game_id, elo_after) VALUES (v_p1_a, v_game.game_id, v_p1_a_elo + v_delta_p1) ON CONFLICT (player_id, game_id) DO UPDATE SET elo_after = EXCLUDED.elo_after;
    IF v_p1_b IS NOT NULL THEN
      INSERT INTO player_elo_snapshots (player_id, game_id, elo_after) VALUES (v_p1_b, v_game.game_id, v_p1_b_elo + v_delta_p1) ON CONFLICT (player_id, game_id) DO UPDATE SET elo_after = EXCLUDED.elo_after;
    END IF;
    INSERT INTO player_elo_snapshots (player_id, game_id, elo_after) VALUES (v_p2_a, v_game.game_id, v_p2_a_elo + v_delta_p2) ON CONFLICT (player_id, game_id) DO UPDATE SET elo_after = EXCLUDED.elo_after;
    IF v_p2_b IS NOT NULL THEN
      INSERT INTO player_elo_snapshots (player_id, game_id, elo_after) VALUES (v_p2_b, v_game.game_id, v_p2_b_elo + v_delta_p2) ON CONFLICT (player_id, game_id) DO UPDATE SET elo_after = EXCLUDED.elo_after;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 5. Redefine record_match_with_elo
CREATE OR REPLACE FUNCTION record_match_with_elo(
  p_session_id UUID,
  p_best_of INT,
  p_team1_id UUID,
  p_team2_id UUID,
  p_winning_team_id UUID,
  p_games JSONB,
  p_match_type TEXT DEFAULT 'doubles',
  p_is_ranked BOOLEAN DEFAULT true
) RETURNS UUID AS $$
DECLARE
  v_match_id UUID;
BEGIN
  -- Insert Match
  INSERT INTO matches (session_id, team1_id, team2_id, best_of, winning_team_id, match_type, is_ranked)
  VALUES (p_session_id, p_team1_id, p_team2_id, p_best_of, p_winning_team_id, p_match_type, p_is_ranked)
  RETURNING id INTO v_match_id;

  -- Process games (triggers handle ELO via process_match_games_elo from 005)
  IF jsonb_array_length(p_games) > 0 THEN
    PERFORM process_match_games_elo(v_match_id, p_games);
  END IF;

  RETURN v_match_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Redefine update_match_with_elo
CREATE OR REPLACE FUNCTION update_match_with_elo(
  p_match_id UUID,
  p_best_of INT,
  p_team1_id UUID,
  p_team2_id UUID,
  p_winning_team_id UUID,
  p_games JSONB,
  p_match_type TEXT DEFAULT 'doubles',
  p_is_ranked BOOLEAN DEFAULT true
) RETURNS VOID AS $$
BEGIN
  -- Defer ELO recalculation to avoid recalculating per statement
  PERFORM set_config('elo.defer_recalculation', 'true', true);

  -- Delete old games (fires BEFORE DELETE trigger to capture earliest date)
  DELETE FROM match_games WHERE match_id = p_match_id;

  -- Update match record
  UPDATE matches SET
    best_of = p_best_of,
    team1_id = p_team1_id,
    team2_id = p_team2_id,
    winning_team_id = p_winning_team_id,
    match_type = p_match_type,
    is_ranked = p_is_ranked
  WHERE id = p_match_id;

  -- Process new games (fires BEFORE INSERT trigger)
  IF jsonb_array_length(p_games) > 0 THEN
    PERFORM process_match_games_elo(p_match_id, p_games);
  END IF;

  -- Re-enable and force recalculate
  PERFORM set_config('elo.defer_recalculation', 'false', true);
  PERFORM force_recalculate_deferred_elo();
END;
$$ LANGUAGE plpgsql;

-- 7. Initial Seed Recalculation (Nullify and Rectify for the new math)
DO $$
DECLARE
  v_first_game RECORD;
BEGIN
  -- Reset everyone to 600
  UPDATE players SET elo_rating = 600 WHERE id IS NOT NULL;
  DELETE FROM player_elo_snapshots WHERE player_id IS NOT NULL;
  
  -- Clear ELO metadata in match_games
  UPDATE match_games SET pair1_p1_elo_before=NULL, pair1_p2_elo_before=NULL, pair2_p1_elo_before=NULL, pair2_p2_elo_before=NULL, pair1_elo_change=NULL, pair2_elo_change=NULL WHERE id IS NOT NULL;
  
  -- Set the earliest date to the absolute beginning to force a full recalculation
  SELECT s.date, m.created_at, m.id, mg.game_number INTO v_first_game
  FROM match_games mg
  JOIN matches m ON m.id = mg.match_id
  JOIN sessions s ON s.id = m.session_id
  ORDER BY s.date ASC, m.created_at ASC, m.id ASC, mg.game_number ASC
  LIMIT 1;

  IF FOUND THEN
    PERFORM set_config('elo.earliest_date', v_first_game.date::TEXT, true);
    PERFORM set_config('elo.earliest_time', v_first_game.created_at::TEXT, true);
    PERFORM set_config('elo.earliest_match', v_first_game.id::TEXT, true);
    PERFORM set_config('elo.earliest_game_number', v_first_game.game_number::TEXT, true);
    
    PERFORM force_recalculate_deferred_elo();
  END IF;

  -- Re-generate all monthly snapshots
  DELETE FROM monthly_snapshots;

  DECLARE
    v_month_rec RECORD;
    v_month_start DATE;
    v_month_end DATE;
  BEGIN
    FOR v_month_rec IN
      SELECT DISTINCT date_trunc('month', created_at)::date AS month_start
      FROM matches
      ORDER BY 1
    LOOP
      v_month_start := v_month_rec.month_start;
      v_month_end   := (v_month_start + interval '1 month')::date;

      INSERT INTO monthly_snapshots (month, player_id, sets_played, sets_won, sets_lost, win_rate)
      SELECT
        v_month_start                                             AS month,
        p.player_id,
        SUM(mg.weight)                                            AS sets_played,
        SUM(CASE WHEN ((mg.pair1_id = p.pair_id AND mg.winning_pair_id = mg.pair1_id)
             OR (mg.pair2_id = p.pair_id AND mg.winning_pair_id = mg.pair2_id)) THEN mg.weight ELSE 0 END) AS sets_won,
        SUM(CASE WHEN ((mg.pair1_id = p.pair_id AND mg.winning_pair_id <> mg.pair1_id)
             OR (mg.pair2_id = p.pair_id AND mg.winning_pair_id <> mg.pair2_id)) THEN mg.weight ELSE 0 END) AS sets_lost,
        ROUND(
          (SUM(CASE WHEN ((mg.pair1_id = p.pair_id AND mg.winning_pair_id = mg.pair1_id)
             OR (mg.pair2_id = p.pair_id AND mg.winning_pair_id = mg.pair2_id)) THEN mg.weight ELSE 0 END)
          / NULLIF(SUM(mg.weight), 0)) * 100,
          2
        )                                                         AS win_rate
      FROM (
        SELECT mg_inner.*,
          (CASE WHEN EXISTS (
            SELECT 1 FROM pairs p1 
            JOIN players pl1 ON pl1.id IN (p1.player1_id, p1.player2_id)
            WHERE p1.id IN (mg_inner.pair1_id, mg_inner.pair2_id) AND pl1.is_temporary = true
          ) THEN 0.5 ELSE 1.0 END) AS weight
        FROM match_games mg_inner
      ) mg
      JOIN matches m ON m.id = mg.match_id
      JOIN (
        SELECT id AS pair_id, player1_id AS player_id FROM pairs
        UNION ALL
        SELECT id AS pair_id, player2_id AS player_id FROM pairs WHERE player2_id IS NOT NULL
      ) p ON p.pair_id IN (mg.pair1_id, mg.pair2_id)
      WHERE mg.winning_pair_id IS NOT NULL                        
        AND m.created_at >= v_month_start
        AND m.created_at <  v_month_end
      GROUP BY p.player_id;
    END LOOP;
  END;
END $$;
