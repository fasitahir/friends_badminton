-- ============================================================
-- Elo Rating System Migration
-- ============================================================

-- 1. Modify Players Table
ALTER TABLE players
ADD COLUMN elo_rating INT NOT NULL DEFAULT 600;

ALTER TABLE players
DROP COLUMN skill_level;

-- 2. Modify Match Games Table to track Elo history
ALTER TABLE match_games
ADD COLUMN pair1_p1_elo_before INT,
ADD COLUMN pair1_p2_elo_before INT,
ADD COLUMN pair2_p1_elo_before INT,
ADD COLUMN pair2_p2_elo_before INT,
ADD COLUMN pair1_elo_change INT,
ADD COLUMN pair2_elo_change INT;

-- 3. Create RPC Function to process games and calculate Elo sequentially
CREATE OR REPLACE FUNCTION process_match_games_elo(
  p_match_id UUID,
  p_games JSONB
) RETURNS VOID AS $$
DECLARE
  v_game JSONB;
  
  v_pair1_id UUID;
  v_pair2_id UUID;
  v_winning_pair_id UUID;
  
  v_p1_a UUID;
  v_p1_b UUID;
  v_p2_a UUID;
  v_p2_b UUID;
  
  v_p1_a_elo INT;
  v_p1_b_elo INT;
  v_p2_a_elo INT;
  v_p2_b_elo INT;
  
  v_p1_avg FLOAT;
  v_p2_avg FLOAT;
  
  v_exp_p1 FLOAT;
  v_exp_p2 FLOAT;
  
  v_act_p1 FLOAT;
  v_act_p2 FLOAT;
  
  v_delta_p1 INT;
  v_delta_p2 INT;
BEGIN
  -- Process each game in the JSON array sequentially
  FOR v_game IN SELECT * FROM jsonb_array_elements(p_games) LOOP
    v_pair1_id := (v_game->>'pair1_id')::UUID;
    v_pair2_id := (v_game->>'pair2_id')::UUID;
    v_winning_pair_id := (v_game->>'winning_pair_id')::UUID;

    -- Get players for pair 1
    SELECT player1_id, player2_id INTO v_p1_a, v_p1_b
    FROM pairs WHERE id = v_pair1_id;
    
    -- Get players for pair 2
    SELECT player1_id, player2_id INTO v_p2_a, v_p2_b
    FROM pairs WHERE id = v_pair2_id;

    -- Fetch current Elo for all 4 players (locking them for update)
    SELECT elo_rating INTO v_p1_a_elo FROM players WHERE id = v_p1_a FOR UPDATE;
    SELECT elo_rating INTO v_p1_b_elo FROM players WHERE id = v_p1_b FOR UPDATE;
    SELECT elo_rating INTO v_p2_a_elo FROM players WHERE id = v_p2_a FOR UPDATE;
    SELECT elo_rating INTO v_p2_b_elo FROM players WHERE id = v_p2_b FOR UPDATE;

    -- Calculate Average Elos
    v_p1_avg := (v_p1_a_elo + v_p1_b_elo) / 2.0;
    v_p2_avg := (v_p2_a_elo + v_p2_b_elo) / 2.0;

    -- Calculate Expected probabilities
    v_exp_p1 := 1.0 / (1.0 + POWER(10.0, (v_p2_avg - v_p1_avg) / 400.0));
    v_exp_p2 := 1.0 / (1.0 + POWER(10.0, (v_p1_avg - v_p2_avg) / 400.0));

    -- Actual Outcomes
    IF v_winning_pair_id = v_pair1_id THEN
      v_act_p1 := 1.0;
      v_act_p2 := 0.0;
    ELSEIF v_winning_pair_id = v_pair2_id THEN
      v_act_p1 := 0.0;
      v_act_p2 := 1.0;
    ELSE
      v_act_p1 := 0.5;
      v_act_p2 := 0.5;
    END IF;

    -- Calculate Deltas (K=24)
    v_delta_p1 := ROUND(24.0 * (v_act_p1 - v_exp_p1))::INT;
    v_delta_p2 := ROUND(24.0 * (v_act_p2 - v_exp_p2))::INT;

    -- Update players table
    UPDATE players SET elo_rating = elo_rating + v_delta_p1 WHERE id IN (v_p1_a, v_p1_b);
    UPDATE players SET elo_rating = elo_rating + v_delta_p2 WHERE id IN (v_p2_a, v_p2_b);

    -- Insert game record
    INSERT INTO match_games (
      match_id, game_number, pair1_id, pair2_id, pair1_score, pair2_score, winning_pair_id,
      pair1_p1_elo_before, pair1_p2_elo_before, pair2_p1_elo_before, pair2_p2_elo_before,
      pair1_elo_change, pair2_elo_change
    )
    VALUES (
      p_match_id,
      (v_game->>'game_number')::INT,
      v_pair1_id,
      v_pair2_id,
      (v_game->>'pair1_score')::INT,
      (v_game->>'pair2_score')::INT,
      v_winning_pair_id,
      v_p1_a_elo, v_p1_b_elo, v_p2_a_elo, v_p2_b_elo,
      v_delta_p1, v_delta_p2
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. Create RPC Function to record a new match
CREATE OR REPLACE FUNCTION record_match_with_elo(
  p_session_id UUID,
  p_best_of INT,
  p_team1_id UUID,
  p_team2_id UUID,
  p_winning_team_id UUID,
  p_games JSONB
) RETURNS UUID AS $$
DECLARE
  v_match_id UUID;
BEGIN
  -- Insert Match
  INSERT INTO matches (session_id, team1_id, team2_id, best_of, winning_team_id)
  VALUES (p_session_id, p_team1_id, p_team2_id, p_best_of, p_winning_team_id)
  RETURNING id INTO v_match_id;

  -- Process games
  IF jsonb_array_length(p_games) > 0 THEN
    PERFORM process_match_games_elo(v_match_id, p_games);
  END IF;

  RETURN v_match_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Create RPC Function to revert match elo
CREATE OR REPLACE FUNCTION revert_match_elo(p_match_id UUID) RETURNS VOID AS $$
DECLARE
  v_game RECORD;
  v_p1_a UUID;
  v_p1_b UUID;
  v_p2_a UUID;
  v_p2_b UUID;
BEGIN
  -- We must revert games in reverse chronological order to be perfectly accurate
  FOR v_game IN 
    SELECT * FROM match_games 
    WHERE match_id = p_match_id 
    ORDER BY game_number DESC 
  LOOP
    -- Get players for pair 1
    SELECT player1_id, player2_id INTO v_p1_a, v_p1_b
    FROM pairs WHERE id = v_game.pair1_id;
    
    -- Get players for pair 2
    SELECT player1_id, player2_id INTO v_p2_a, v_p2_b
    FROM pairs WHERE id = v_game.pair2_id;

    -- Revert the Elo changes in the players table
    UPDATE players SET elo_rating = elo_rating - v_game.pair1_elo_change WHERE id IN (v_p1_a, v_p1_b);
    UPDATE players SET elo_rating = elo_rating - v_game.pair2_elo_change WHERE id IN (v_p2_a, v_p2_b);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 6. Create RPC Function to update a match (revert old, apply new)
CREATE OR REPLACE FUNCTION update_match_with_elo(
  p_match_id UUID,
  p_best_of INT,
  p_team1_id UUID,
  p_team2_id UUID,
  p_winning_team_id UUID,
  p_games JSONB
) RETURNS VOID AS $$
BEGIN
  -- Revert old Elo changes
  PERFORM revert_match_elo(p_match_id);

  -- Delete old games
  DELETE FROM match_games WHERE match_id = p_match_id;

  -- Update match record
  UPDATE matches SET
    best_of = p_best_of,
    team1_id = p_team1_id,
    team2_id = p_team2_id,
    winning_team_id = p_winning_team_id
  WHERE id = p_match_id;

  -- Process new games
  IF jsonb_array_length(p_games) > 0 THEN
    PERFORM process_match_games_elo(p_match_id, p_games);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. Create RPC Function to delete a match
CREATE OR REPLACE FUNCTION delete_match_with_elo(p_match_id UUID) RETURNS VOID AS $$
BEGIN
  -- Revert old Elo changes
  PERFORM revert_match_elo(p_match_id);

  -- Delete match (cascade will delete match_games)
  DELETE FROM matches WHERE id = p_match_id;
END;
$$ LANGUAGE plpgsql;
