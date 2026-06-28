-- ============================================================
-- 005_incremental_elo_recalculate.sql
-- Incremental ELO recalculation based on chronological snapshots
-- ============================================================

-- 1. Create player_elo_snapshots table
CREATE TABLE IF NOT EXISTS player_elo_snapshots (
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES match_games(id) ON DELETE CASCADE,
  elo_after INT NOT NULL,
  PRIMARY KEY (player_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_player_elo_snapshots_game_id ON player_elo_snapshots(game_id);

ALTER TABLE player_elo_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to player_elo_snapshots" ON player_elo_snapshots FOR ALL USING (true) WITH CHECK (true);

-- 2. Core recalculation algorithm
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

    -- Get their current (restored) ELO
    SELECT elo_rating INTO v_p1_a_elo FROM players WHERE id = v_p1_a;
    SELECT elo_rating INTO v_p1_b_elo FROM players WHERE id = v_p1_b;
    SELECT elo_rating INTO v_p2_a_elo FROM players WHERE id = v_p2_a;
    SELECT elo_rating INTO v_p2_b_elo FROM players WHERE id = v_p2_b;

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

    v_delta_p1 := ROUND(24.0 * (v_act_p1 - v_exp_p1))::INT;
    v_delta_p2 := ROUND(24.0 * (v_act_p2 - v_exp_p2))::INT;

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


-- 3. Row-level trigger to capture the earliest affected game
CREATE OR REPLACE FUNCTION capture_affected_game_position()
RETURNS TRIGGER AS $$
DECLARE
  v_session_date DATE;
  v_match_created_at TIMESTAMPTZ;
  v_match_id UUID;
  v_game_number INT;
  v_game_record RECORD;
  
  v_prev_date DATE;
  v_prev_time TIMESTAMPTZ;
  v_prev_match UUID;
  v_prev_game_number INT;
BEGIN
  IF current_setting('elo.recalculating', true) = 'true' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  v_game_record := COALESCE(OLD, NEW);
  
  SELECT s.date, m.created_at, m.id INTO v_session_date, v_match_created_at, v_match_id
  FROM matches m
  JOIN sessions s ON s.id = m.session_id
  WHERE m.id = v_game_record.match_id;
  
  v_game_number := v_game_record.game_number;

  v_prev_date := NULLIF(current_setting('elo.earliest_date', true), '')::DATE;
  v_prev_time := NULLIF(current_setting('elo.earliest_time', true), '')::TIMESTAMPTZ;
  v_prev_match := NULLIF(current_setting('elo.earliest_match', true), '')::UUID;
  v_prev_game_number := NULLIF(current_setting('elo.earliest_game_number', true), '')::INT;

  IF v_prev_date IS NULL OR (v_session_date, v_match_created_at, v_match_id, v_game_number) < (v_prev_date, v_prev_time, v_prev_match, v_prev_game_number) THEN
    PERFORM set_config('elo.earliest_date', v_session_date::TEXT, true);
    PERFORM set_config('elo.earliest_time', v_match_created_at::TEXT, true);
    PERFORM set_config('elo.earliest_match', v_match_id::TEXT, true);
    PERFORM set_config('elo.earliest_game_number', v_game_number::TEXT, true);
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_capture_affected_game_position ON match_games;
CREATE TRIGGER trg_capture_affected_game_position
BEFORE INSERT OR UPDATE OR DELETE ON match_games
FOR EACH ROW
EXECUTE FUNCTION capture_affected_game_position();


-- 4. Statement-level trigger to execute recalculation
CREATE OR REPLACE FUNCTION trigger_recalculate_elo()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('elo.recalculating', true) = 'true' OR current_setting('elo.defer_recalculation', true) = 'true' THEN
    RETURN NULL;
  END IF;
  
  -- Prevent recursion
  PERFORM set_config('elo.recalculating', 'true', true);

  PERFORM recalculate_elo_from_earliest();

  -- Clear earliest variables
  PERFORM set_config('elo.earliest_date', '', true);
  PERFORM set_config('elo.earliest_time', '', true);
  PERFORM set_config('elo.earliest_match', '', true);
  PERFORM set_config('elo.earliest_game_number', '', true);
  
  -- Reset recalculating
  PERFORM set_config('elo.recalculating', 'false', true);

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalculate_elo_after_statement ON match_games;
CREATE TRIGGER trg_recalculate_elo_after_statement
AFTER INSERT OR UPDATE OR DELETE ON match_games
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_recalculate_elo();


-- 5. Utility for force deferred recalculation
CREATE OR REPLACE FUNCTION force_recalculate_deferred_elo()
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('elo.recalculating', 'true', true);
  PERFORM recalculate_elo_from_earliest();
  PERFORM set_config('elo.earliest_date', '', true);
  PERFORM set_config('elo.earliest_time', '', true);
  PERFORM set_config('elo.earliest_match', '', true);
  PERFORM set_config('elo.earliest_game_number', '', true);
  PERFORM set_config('elo.recalculating', 'false', true);
END;
$$ LANGUAGE plpgsql;


-- 6. Redefine process_match_games_elo to just insert (triggers handle ELO)
CREATE OR REPLACE FUNCTION process_match_games_elo(
  p_match_id UUID,
  p_games JSONB
) RETURNS VOID AS $$
DECLARE
  v_game JSONB;
  v_pair1_id UUID;
  v_pair2_id UUID;
  v_winning_pair_id UUID;
BEGIN
  -- We just insert the games. The triggers will handle ELO recalculation.
  FOR v_game IN SELECT * FROM jsonb_array_elements(p_games) LOOP
    v_pair1_id := (v_game->>'pair1_id')::UUID;
    v_pair2_id := (v_game->>'pair2_id')::UUID;
    v_winning_pair_id := (v_game->>'winning_pair_id')::UUID;

    INSERT INTO match_games (
      match_id, game_number, pair1_id, pair2_id, pair1_score, pair2_score, winning_pair_id
    )
    VALUES (
      p_match_id,
      (v_game->>'game_number')::INT,
      v_pair1_id,
      v_pair2_id,
      (v_game->>'pair1_score')::INT,
      (v_game->>'pair2_score')::INT,
      v_winning_pair_id
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;


-- 7. Redefine update_match_with_elo to use deferral
CREATE OR REPLACE FUNCTION update_match_with_elo(
  p_match_id UUID,
  p_best_of INT,
  p_team1_id UUID,
  p_team2_id UUID,
  p_winning_team_id UUID,
  p_games JSONB
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
    winning_team_id = p_winning_team_id
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


-- 8. Redefine delete_match_with_elo to just delete
DROP FUNCTION IF EXISTS revert_match_elo;

CREATE OR REPLACE FUNCTION delete_match_with_elo(p_match_id UUID) RETURNS VOID AS $$
DECLARE
  v_session_date DATE;
  v_match_created_at TIMESTAMPTZ;
  v_game_number INT := 1;
BEGIN
  -- Explicitly capture the match's date and time BEFORE deleting it,
  -- because during a CASCADE DELETE, querying the matches table in a trigger might fail.
  SELECT s.date, m.created_at INTO v_session_date, v_match_created_at
  FROM matches m
  JOIN sessions s ON s.id = m.session_id
  WHERE m.id = p_match_id;

  -- Defer ELO recalculation so we can explicitly force it
  PERFORM set_config('elo.defer_recalculation', 'true', true);

  -- Manually set the earliest affected point
  PERFORM set_config('elo.earliest_date', v_session_date::TEXT, true);
  PERFORM set_config('elo.earliest_time', v_match_created_at::TEXT, true);
  PERFORM set_config('elo.earliest_match', p_match_id::TEXT, true);
  PERFORM set_config('elo.earliest_game_number', v_game_number::TEXT, true);

  -- Delete the match (cascades to match_games)
  DELETE FROM matches WHERE id = p_match_id;

  -- Re-enable and force recalculate
  PERFORM set_config('elo.defer_recalculation', 'false', true);
  PERFORM force_recalculate_deferred_elo();
END;
$$ LANGUAGE plpgsql;


-- 9. Initial Seed Recalculation
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
END $$;
