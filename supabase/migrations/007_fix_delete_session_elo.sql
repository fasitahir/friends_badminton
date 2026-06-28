-- 007_fix_delete_session_elo.sql

-- When a session is deleted, the cascade delete drops matches and match_games.
-- Just like deleting a match, the AFTER STATEMENT trigger does not fire on cascading deletes.
-- We need a dedicated function to safely delete a session and trigger an ELO recalculation.

CREATE OR REPLACE FUNCTION delete_session_with_elo(p_session_id UUID) RETURNS VOID AS $$
DECLARE
  v_session_date DATE;
  v_earliest_match_created_at TIMESTAMPTZ;
  v_earliest_match_id UUID;
  v_game_number INT := 1;
BEGIN
  -- Explicitly capture the earliest match's date and time in this session BEFORE deleting it.
  -- If there are no matches, this will just be NULL and ELO won't need to recalculate.
  SELECT s.date, m.created_at, m.id 
  INTO v_session_date, v_earliest_match_created_at, v_earliest_match_id
  FROM sessions s
  LEFT JOIN matches m ON m.session_id = s.id
  WHERE s.id = p_session_id
  ORDER BY m.created_at ASC
  LIMIT 1;

  -- Defer ELO recalculation so we can explicitly force it
  PERFORM set_config('elo.defer_recalculation', 'true', true);

  -- Manually set the earliest affected point, if there was a match.
  -- If no matches exist, v_session_date is still captured to safely recalculate from that day.
  IF v_session_date IS NOT NULL THEN
    PERFORM set_config('elo.earliest_date', v_session_date::TEXT, true);
    IF v_earliest_match_created_at IS NOT NULL THEN
      PERFORM set_config('elo.earliest_time', v_earliest_match_created_at::TEXT, true);
      PERFORM set_config('elo.earliest_match', v_earliest_match_id::TEXT, true);
      PERFORM set_config('elo.earliest_game_number', v_game_number::TEXT, true);
    END IF;
  END IF;

  -- Delete the session (cascades to matches and match_games)
  DELETE FROM sessions WHERE id = p_session_id;

  -- Re-enable and force recalculate
  PERFORM set_config('elo.defer_recalculation', 'false', true);
  PERFORM force_recalculate_deferred_elo();
END;
$$ LANGUAGE plpgsql;
