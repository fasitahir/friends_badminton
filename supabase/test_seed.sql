-- Test Seed Data for Elo System
-- Run this in Supabase SQL Editor

-- 1. Create a dummy session (backdated to last month)
DO $$
DECLARE
  v_session_id UUID;
  v_p1 UUID;
  v_p2 UUID;
  v_p3 UUID;
  v_p4 UUID;
  
  v_team1 UUID;
  v_team2 UUID;
BEGIN
  -- Insert a session for last month
  INSERT INTO sessions (name, date, created_at)
  VALUES ('Last Month Test Session', NOW() - INTERVAL '1 month', NOW() - INTERVAL '1 month')
  RETURNING id INTO v_session_id;

  -- Create 4 test players (or use existing ones if you prefer, but this is safer)
  INSERT INTO players (name, nickname) VALUES ('Alice', 'A') RETURNING id INTO v_p1;
  INSERT INTO players (name, nickname) VALUES ('Bob', 'B') RETURNING id INTO v_p2;
  INSERT INTO players (name, nickname) VALUES ('Charlie', 'C') RETURNING id INTO v_p3;
  INSERT INTO players (name, nickname) VALUES ('David', 'D') RETURNING id INTO v_p4;

  -- Create Teams
  INSERT INTO teams (session_id, name) VALUES (v_session_id, 'Team Alpha') RETURNING id INTO v_team1;
  INSERT INTO teams (session_id, name) VALUES (v_session_id, 'Team Beta') RETURNING id INTO v_team2;
  
  -- We don't strictly need to link pairs to teams for Elo, but we will create pairs
  -- Pairs:
  -- Pair 1: Alice & Bob
  -- Pair 2: Charlie & David
  
  -- Create pairs
  WITH inserted_pairs AS (
    INSERT INTO pairs (session_id, player1_id, player2_id)
    VALUES 
      (v_session_id, v_p1, v_p2),
      (v_session_id, v_p3, v_p4)
    RETURNING id
  )
  -- Store pair IDs for the JSON payload
  SELECT id INTO v_team1 FROM inserted_pairs LIMIT 1; -- Just reusing v_team1 as pair1_id
  -- We'll just build JSON using the DB directly in the RPC call.
END;
$$;

-- Wait, a simpler way is to just let the user test using the web interface!
-- "How to test it?" -> Go to "Players", add 4 players. Go to "Sessions", add a session.
-- Create a match between the 4 players and save.
-- The leaderboard on Dashboard and Players page will instantly reflect the Elo changes!
