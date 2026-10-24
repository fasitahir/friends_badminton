-- Top 10 longest winning and losing streaks (completed sets, chronological).
-- Temporary players are excluded. Tie-break is player name.

WITH player_results AS (
  SELECT
    pl.id AS player_id,
    pl.name AS player_name,
    m.created_at AS match_at,
    m.id AS match_id,
    mg.game_number,
    mg.id AS game_id,
    CASE
      WHEN (pr.pair_id = mg.pair1_id AND mg.winning_pair_id = mg.pair1_id)
        OR (pr.pair_id = mg.pair2_id AND mg.winning_pair_id = mg.pair2_id)
      THEN 1
      ELSE 0
    END AS is_win
  FROM match_games mg
  JOIN matches m ON m.id = mg.match_id
  JOIN (
    SELECT id AS pair_id, player1_id AS player_id FROM pairs
    UNION ALL
    SELECT id AS pair_id, player2_id AS player_id FROM pairs WHERE player2_id IS NOT NULL
  ) pr ON pr.pair_id IN (mg.pair1_id, mg.pair2_id)
  JOIN players pl ON pl.id = pr.player_id
  WHERE mg.winning_pair_id IS NOT NULL
    AND COALESCE(pl.is_temporary, false) = false
),
ordered AS (
  SELECT
    player_id,
    player_name,
    is_win,
    ROW_NUMBER() OVER (
      PARTITION BY player_id
      ORDER BY match_at, match_id, game_number, game_id
    ) AS rn,
    ROW_NUMBER() OVER (
      PARTITION BY player_id, is_win
      ORDER BY match_at, match_id, game_number, game_id
    ) AS rn_grp
  FROM player_results
),
streaks AS (
  SELECT
    player_id,
    player_name,
    is_win,
    COUNT(*) AS streak_len
  FROM ordered
  GROUP BY player_id, player_name, is_win, (rn - rn_grp)
),
best AS (
  SELECT
    player_id,
    player_name,
    CASE WHEN is_win = 1 THEN 'win' ELSE 'loss' END AS streak_type,
    MAX(streak_len) AS longest_streak
  FROM streaks
  GROUP BY player_id, player_name, is_win
),
ranked AS (
  SELECT
    streak_type,
    player_id,
    player_name,
    longest_streak,
    ROW_NUMBER() OVER (
      PARTITION BY streak_type
      ORDER BY longest_streak DESC, player_name ASC
    ) AS rank
  FROM best
)
SELECT
  streak_type,
  rank,
  player_name,
  longest_streak
FROM ranked
WHERE rank <= 10
ORDER BY streak_type DESC, rank;
