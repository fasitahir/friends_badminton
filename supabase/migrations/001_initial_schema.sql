-- ============================================================
-- Badminton Analytics — Initial Database Schema
-- ============================================================
-- Run this migration in your Supabase SQL Editor or via CLI.
-- RLS is disabled on all tables (personal-use app, no auth).
-- ============================================================

-- 1. Players
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  nickname TEXT,
  skill_level TEXT NOT NULL CHECK (skill_level IN ('Developing', 'Competitive', 'Advanced')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to players" ON players FOR ALL USING (true) WITH CHECK (true);

-- 2. Sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);

-- 3. Teams (per session)
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to teams" ON teams FOR ALL USING (true) WITH CHECK (true);

-- 4. Team Members (junction)
CREATE TABLE team_members (
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  PRIMARY KEY (team_id, player_id)
);
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to team_members" ON team_members FOR ALL USING (true) WITH CHECK (true);

-- 5. Pairs (session-scoped)
CREATE TABLE pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player2_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pairs_different_players CHECK (player1_id <> player2_id),
  CONSTRAINT pairs_unique_per_session UNIQUE (player1_id, player2_id, session_id)
);
ALTER TABLE pairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to pairs" ON pairs FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_pairs_session ON pairs(session_id);
CREATE INDEX idx_pairs_player1 ON pairs(player1_id);
CREATE INDEX idx_pairs_player2 ON pairs(player2_id);

-- 6. Matches
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  team1_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  team2_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  best_of INT NOT NULL CHECK (best_of IN (1, 3, 5, 7, 9, 11, 13, 15)),
  winning_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT matches_different_teams CHECK (team1_id IS NULL OR team2_id IS NULL OR team1_id <> team2_id)
);
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to matches" ON matches FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_matches_session ON matches(session_id);
CREATE INDEX idx_matches_team1 ON matches(team1_id);
CREATE INDEX idx_matches_team2 ON matches(team2_id);

-- 7. Match Games (individual sets played by pairs)
CREATE TABLE match_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  game_number INT NOT NULL CHECK (game_number > 0),
  pair1_id UUID NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
  pair2_id UUID NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
  pair1_score INT NOT NULL CHECK (pair1_score >= 0),
  pair2_score INT NOT NULL CHECK (pair2_score >= 0),
  winning_pair_id UUID REFERENCES pairs(id) ON DELETE CASCADE,
  CONSTRAINT match_games_unique UNIQUE (match_id, game_number)
);
ALTER TABLE match_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to match_games" ON match_games FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_match_games_match ON match_games(match_id);
CREATE INDEX idx_match_games_pair1 ON match_games(pair1_id);
CREATE INDEX idx_match_games_pair2 ON match_games(pair2_id);

-- 8. Admins
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to admins" ON admins FOR ALL USING (true) WITH CHECK (true);

INSERT INTO admins (username, password) VALUES
  ('fasitahir', 'fasitahir@404'),
  ('rafay', 'rafay@500'),
  ('abdulrehman', 'adbdulrehman@200');
