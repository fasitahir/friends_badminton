export type Player = {
  id: string;
  name: string;
  nickname: string | null;
  skill_level: 'Developing' | 'Competitive' | 'Advanced';
  created_at: string;
};

export type Session = {
  id: string;
  name: string;
  date: string;
  notes: string | null;
  created_at: string;
};

export type Team = {
  id: string;
  session_id: string;
  name: string;
};

export type TeamMember = {
  team_id: string;
  player_id: string;
};

export type Pair = {
  id: string;
  player1_id: string;
  player2_id: string;
  session_id: string;
  created_at: string;
};

export type Match = {
  id: string;
  session_id: string;
  team1_id: string | null;
  team2_id: string | null;
  best_of: number;
  winning_team_id: string | null;
  created_at: string;
};

export type MatchGame = {
  id: string;
  match_id: string;
  game_number: number;
  pair1_id: string;
  pair2_id: string;
  pair1_score: number;
  pair2_score: number;
  winning_pair_id: string | null;
};

// Extended types with joined data
export type PairWithPlayers = Pair & {
  player1: Player;
  player2: Player;
};

export type TeamWithMembers = Team & {
  members: Player[];
};

export type MatchGameWithPairs = MatchGame & {
  pair1: PairWithPlayers;
  pair2: PairWithPlayers;
  winning_pair: PairWithPlayers | null;
};

export type MatchWithDetails = Match & {
  team1: Team | null;
  team2: Team | null;
  winning_team: Team | null;
  games: MatchGameWithPairs[];
};

export type SessionWithDetails = Session & {
  teams: TeamWithMembers[];
  pairs: PairWithPlayers[];
  matches: MatchWithDetails[];
};

// Analytics types (based on sets/games, not overall matches)
export type PlayerStats = {
  player: Player;
  setsPlayed: number;
  setsWon: number;
  setsLost: number;
  winRate: number;
};

export type HeadToHeadResult = {
  playerA: Player;
  playerB: Player;
  timesFaced: number;
  playerAWins: number;
  playerBWins: number;
  playerAWinRate: number;
  sets: MatchGameWithPairs[];
};

export type PairStatsResult = {
  player1: Player;
  player2: Player;
  setsPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
};

export type PartnerStats = {
  partner: Player;
  setsPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
};

export type OpponentStats = {
  opponent: Player;
  setsPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
};

export type SkillLevelBreakdown = {
  level: 'Developing' | 'Competitive' | 'Advanced';
  setsPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
};

export type UnderdogStats = {
  player: Player;
  underdogWins: number;
  underdogLosses: number;
  totalUnderdogSets: number;
  underdogWinRate: number;
};
