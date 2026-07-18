-- ============================================================
-- 009_temp_player_elo_weight.sql
-- Reduces the weight of matches involving temporary players.
-- Both Elo impact (K-factor) and Win/Loss counts are halved.
-- ============================================================

-- 1. Alter monthly_snapshots to allow fractional sets_played, sets_won, sets_lost
ALTER TABLE monthly_snapshots ALTER COLUMN sets_played TYPE NUMERIC(5,1);
ALTER TABLE monthly_snapshots ALTER COLUMN sets_won TYPE NUMERIC(5,1);
ALTER TABLE monthly_snapshots ALTER COLUMN sets_lost TYPE NUMERIC(5,1);

-- 2. Redefine auto monthly snapshot to sum weights
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


-- 3. Redefine recalculate_elo_from_earliest to apply K-factor halving
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
      mg.id as game_id, mg.match_id, mg.game_number, mg.pair1_id, mg.pair2_id, mg.winning_pair_id
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
    SELECT elo_rating, COALESCE(is_temporary, false) INTO v_p1_b_elo, v_p1_b_temp FROM players WHERE id = v_p1_b;
    SELECT elo_rating, COALESCE(is_temporary, false) INTO v_p2_a_elo, v_p2_a_temp FROM players WHERE id = v_p2_a;
    SELECT elo_rating, COALESCE(is_temporary, false) INTO v_p2_b_elo, v_p2_b_temp FROM players WHERE id = v_p2_b;

    -- Compute ELO logic
    v_p1_avg := (v_p1_a_elo + v_p1_b_elo) / 2.0;
    v_p2_avg := (v_p2_a_elo + v_p2_b_elo) / 2.0;

    v_exp_p1 := 1.0 / (1.0 + POWER(10.0, (v_p2_avg - v_p1_avg) / 400.0));
    v_exp_p2 := 1.0 / (1.0 + POWER(10.0, (v_p1_avg - v_p2_avg) / 400.0));

    IF v_game.winning_pair_id = v_game.pair1_id THEN
      v_act_p1 := 1.0; v_act_p2 := 0.0;
    ELSEIF v_game.winning_pair_id = v_game.pair2_id THEN
      v_act_p1 := 0.0; v_act_p2 := 1.0;
    ELSE
      v_act_p1 := 0.5; v_act_p2 := 0.5;
    END IF;

    -- Adjust K-factor if any player is temporary
    IF v_p1_a_temp OR v_p1_b_temp OR v_p2_a_temp OR v_p2_b_temp THEN
      v_k := 12.0;
    ELSE
      v_k := 24.0;
    END IF;

    v_delta_p1 := ROUND(v_k * (v_act_p1 - v_exp_p1))::INT;
    v_delta_p2 := ROUND(v_k * (v_act_p2 - v_exp_p2))::INT;

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
    UPDATE players SET elo_rating = elo_rating + v_delta_p1 WHERE id IN (v_p1_a, v_p1_b);
    UPDATE players SET elo_rating = elo_rating + v_delta_p2 WHERE id IN (v_p2_a, v_p2_b);

    -- Insert new snapshots
    INSERT INTO player_elo_snapshots (player_id, game_id, elo_after) VALUES (v_p1_a, v_game.game_id, v_p1_a_elo + v_delta_p1) ON CONFLICT (player_id, game_id) DO UPDATE SET elo_after = EXCLUDED.elo_after;
    INSERT INTO player_elo_snapshots (player_id, game_id, elo_after) VALUES (v_p1_b, v_game.game_id, v_p1_b_elo + v_delta_p1) ON CONFLICT (player_id, game_id) DO UPDATE SET elo_after = EXCLUDED.elo_after;
    INSERT INTO player_elo_snapshots (player_id, game_id, elo_after) VALUES (v_p2_a, v_game.game_id, v_p2_a_elo + v_delta_p2) ON CONFLICT (player_id, game_id) DO UPDATE SET elo_after = EXCLUDED.elo_after;
    INSERT INTO player_elo_snapshots (player_id, game_id, elo_after) VALUES (v_p2_b, v_game.game_id, v_p2_b_elo + v_delta_p2) ON CONFLICT (player_id, game_id) DO UPDATE SET elo_after = EXCLUDED.elo_after;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. Initial Seed Recalculation (Nullify and Rectify)
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
        SELECT id AS pair_id, player2_id AS player_id FROM pairs
      ) p ON p.pair_id IN (mg.pair1_id, mg.pair2_id)
      WHERE mg.winning_pair_id IS NOT NULL                        
        AND m.created_at >= v_month_start
        AND m.created_at <  v_month_end
      GROUP BY p.player_id;
    END LOOP;
  END;
END $$;
