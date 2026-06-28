-- 006_fix_delete_match_elo.sql

-- 1. Update the row-level trigger to NOT ignore capturing the earliest date 
-- when we are explicitly deferring recalculation (since we still need to know 
-- what date to recalculate from).
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
  -- We ONLY ignore capturing if we are actively RECALCULATING right now.
  -- We MUST NOT ignore capturing if we are merely deferring it for later.
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

-- 2. Redefine delete_match_with_elo to explicitly handle deferred ELO recalculation
-- since AFTER STATEMENT triggers do not fire on cascading deletes in PostgreSQL.
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
