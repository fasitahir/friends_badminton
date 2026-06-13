import type {
  Player,
  MatchWithDetails,
  PairWithPlayers,
  PlayerStats,
  HeadToHeadResult,
  PairStatsResult,
  PartnerStats,
  OpponentStats,
  SkillLevelBreakdown,
  UnderdogStats,
  MatchGameWithPairs,
} from "@/lib/supabase/types";

// Skill level weight for underdog calculations
const SKILL_WEIGHTS: Record<string, number> = {
  Developing: 1,
  Competitive: 2,
  Advanced: 3,
};

/**
 * Check if a player is in a pair
 */
function isPlayerInPair(playerId: string, pair: PairWithPlayers): boolean {
  return pair.player1_id === playerId || pair.player2_id === playerId;
}

/**
 * Get the partner ID from a pair
 */
function getPartnerId(playerId: string, pair: PairWithPlayers): string {
  return pair.player1_id === playerId ? pair.player2_id : pair.player1_id;
}

/**
 * Extract all completed sets from matches
 */
function getAllSets(matches: MatchWithDetails[]): MatchGameWithPairs[] {
  return matches.flatMap((m) => m.games.filter((g) => g.winning_pair !== null));
}

/**
 * Compute stats for a single player across all matches
 */
export function computePlayerStats(
  player: Player,
  matches: MatchWithDetails[]
): PlayerStats {
  const sets = getAllSets(matches);
  let setsPlayed = 0;
  let setsWon = 0;

  for (const set of sets) {
    // If the set doesn't have a winning pair, it's not finished, but we filter those out in getAllSets
    const isPair1 = isPlayerInPair(player.id, set.pair1);
    const isPair2 = isPlayerInPair(player.id, set.pair2);
    
    if (isPair1 || isPair2) {
      setsPlayed++;
      const won = set.winning_pair_id === (isPair1 ? set.pair1.id : set.pair2.id);
      if (won) setsWon++;
    }
  }

  return {
    player,
    setsPlayed,
    setsWon,
    setsLost: setsPlayed - setsWon,
    winRate: setsPlayed > 0 ? (setsWon / setsPlayed) * 100 : 0,
  };
}

/**
 * Compute stats for all players
 */
export function computeAllPlayerStats(
  players: Player[],
  matches: MatchWithDetails[]
): PlayerStats[] {
  return players
    .map((p) => computePlayerStats(p, matches))
    .sort((a, b) => b.winRate - a.winRate || b.setsWon - a.setsWon);
}

/**
 * Head-to-head comparison between two players
 */
export function computeHeadToHead(
  playerA: Player,
  playerB: Player,
  matches: MatchWithDetails[]
): HeadToHeadResult {
  const sets = getAllSets(matches);
  const relevantSets: MatchGameWithPairs[] = [];
  let playerAWins = 0;
  let playerBWins = 0;

  for (const set of sets) {
    const aIn1 = isPlayerInPair(playerA.id, set.pair1);
    const aIn2 = isPlayerInPair(playerA.id, set.pair2);
    const bIn1 = isPlayerInPair(playerB.id, set.pair1);
    const bIn2 = isPlayerInPair(playerB.id, set.pair2);

    // They faced each other if one is in pair1 and the other in pair2
    if ((aIn1 && bIn2) || (aIn2 && bIn1)) {
      relevantSets.push(set);
      const aWon = set.winning_pair_id === (aIn1 ? set.pair1.id : set.pair2.id);
      if (aWon) {
        playerAWins++;
      } else {
        playerBWins++;
      }
    }
  }

  const timesFaced = relevantSets.length;

  return {
    playerA,
    playerB,
    timesFaced,
    playerAWins,
    playerBWins,
    playerAWinRate: timesFaced > 0 ? (playerAWins / timesFaced) * 100 : 0,
    sets: relevantSets,
  };
}

/**
 * Get unique pair key (player IDs sorted)
 */
function getPairKey(p1Id: string, p2Id: string): string {
  return [p1Id, p2Id].sort().join(":");
}

/**
 * Compute stats for all unique pairs
 */
export function computeAllPairStats(
  players: Player[],
  matches: MatchWithDetails[]
): PairStatsResult[] {
  const sets = getAllSets(matches);
  const pairMap = new Map<
    string,
    { player1: Player; player2: Player; wins: number; losses: number }
  >();

  const playerMap = new Map(players.map((p) => [p.id, p]));

  for (const set of sets) {
    const p1Key = getPairKey(set.pair1.player1_id, set.pair1.player2_id);
    const p2Key = getPairKey(set.pair2.player1_id, set.pair2.player2_id);
    
    if (!pairMap.has(p1Key)) {
      pairMap.set(p1Key, {
        player1: playerMap.get(set.pair1.player1_id)!,
        player2: playerMap.get(set.pair1.player2_id)!,
        wins: 0,
        losses: 0,
      });
    }
    if (!pairMap.has(p2Key)) {
      pairMap.set(p2Key, {
        player1: playerMap.get(set.pair2.player1_id)!,
        player2: playerMap.get(set.pair2.player2_id)!,
        wins: 0,
        losses: 0,
      });
    }

    if (set.winning_pair_id === set.pair1.id) {
      pairMap.get(p1Key)!.wins++;
      pairMap.get(p2Key)!.losses++;
    } else {
      pairMap.get(p2Key)!.wins++;
      pairMap.get(p1Key)!.losses++;
    }
  }

  return Array.from(pairMap.values())
    .map((p) => ({
      player1: p.player1,
      player2: p.player2,
      setsPlayed: p.wins + p.losses,
      wins: p.wins,
      losses: p.losses,
      winRate: p.wins + p.losses > 0 ? (p.wins / (p.wins + p.losses)) * 100 : 0,
    }))
    .sort((a, b) => b.winRate - a.winRate || b.setsPlayed - a.setsPlayed);
}

/**
 * Pair vs Pair comparison
 */
export function computePairVsPair(
  pair1Player1: Player,
  pair1Player2: Player,
  pair2Player1: Player,
  pair2Player2: Player,
  matches: MatchWithDetails[]
): { total: number; pair1Wins: number; pair2Wins: number; pair1WinRate: number } {
  const sets = getAllSets(matches);
  let pair1Wins = 0;
  let pair2Wins = 0;

  for (const set of sets) {
    const p1In1 =
      isPlayerInPair(pair1Player1.id, set.pair1) && isPlayerInPair(pair1Player2.id, set.pair1);
    const p2In2 =
      isPlayerInPair(pair2Player1.id, set.pair2) && isPlayerInPair(pair2Player2.id, set.pair2);
    
    const p2In1 =
      isPlayerInPair(pair2Player1.id, set.pair1) && isPlayerInPair(pair2Player2.id, set.pair1);
    const p1In2 =
      isPlayerInPair(pair1Player1.id, set.pair2) && isPlayerInPair(pair1Player2.id, set.pair2);

    if (p1In1 && p2In2) {
      if (set.winning_pair_id === set.pair1.id) pair1Wins++;
      else pair2Wins++;
    } else if (p2In1 && p1In2) {
      if (set.winning_pair_id === set.pair2.id) pair2Wins++;
      else pair1Wins++;
    }
  }

  const total = pair1Wins + pair2Wins;

  return {
    total,
    pair1Wins,
    pair2Wins,
    pair1WinRate: total > 0 ? (pair1Wins / total) * 100 : 0,
  };
}

/**
 * Best partners for a player, sorted by win rate
 */
export function computeBestPartners(
  playerId: string,
  players: Player[],
  matches: MatchWithDetails[]
): PartnerStats[] {
  const sets = getAllSets(matches);
  const partnerMap = new Map<string, { wins: number; losses: number }>();
  const playerMap = new Map(players.map((p) => [p.id, p]));

  for (const set of sets) {
    const isPair1 = isPlayerInPair(playerId, set.pair1);
    const isPair2 = isPlayerInPair(playerId, set.pair2);

    if (isPair1 || isPair2) {
      const pair = isPair1 ? set.pair1 : set.pair2;
      const partnerId = getPartnerId(playerId, pair);
      const won = set.winning_pair_id === pair.id;

      if (!partnerMap.has(partnerId)) partnerMap.set(partnerId, { wins: 0, losses: 0 });
      if (won) {
        partnerMap.get(partnerId)!.wins++;
      } else {
        partnerMap.get(partnerId)!.losses++;
      }
    }
  }

  return Array.from(partnerMap.entries())
    .map(([partnerId, stats]) => {
      const played = stats.wins + stats.losses;
      return {
        partner: playerMap.get(partnerId)!,
        setsPlayed: played,
        wins: stats.wins,
        losses: stats.losses,
        winRate: played > 0 ? (stats.wins / played) * 100 : 0,
      };
    })
    .filter((s) => s.partner)
    .sort((a, b) => b.winRate - a.winRate || b.setsPlayed - a.setsPlayed);
}

/**
 * Toughest opponents for a player, sorted by lowest win rate against them
 */
export function computeToughestOpponents(
  playerId: string,
  players: Player[],
  matches: MatchWithDetails[]
): OpponentStats[] {
  const sets = getAllSets(matches);
  const opponentMap = new Map<string, { wins: number; losses: number }>();
  const playerMap = new Map(players.map((p) => [p.id, p]));

  for (const set of sets) {
    const isPair1 = isPlayerInPair(playerId, set.pair1);
    const isPair2 = isPlayerInPair(playerId, set.pair2);

    if (isPair1 || isPair2) {
      const myPair = isPair1 ? set.pair1 : set.pair2;
      const oppPair = isPair1 ? set.pair2 : set.pair1;
      const won = set.winning_pair_id === myPair.id;

      for (const oppId of [oppPair.player1_id, oppPair.player2_id]) {
        if (!opponentMap.has(oppId)) opponentMap.set(oppId, { wins: 0, losses: 0 });
        if (won) {
          opponentMap.get(oppId)!.wins++;
        } else {
          opponentMap.get(oppId)!.losses++;
        }
      }
    }
  }

  return Array.from(opponentMap.entries())
    .map(([oppId, stats]) => {
      const played = stats.wins + stats.losses;
      return {
        opponent: playerMap.get(oppId)!,
        setsPlayed: played,
        wins: stats.wins,
        losses: stats.losses,
        winRate: played > 0 ? (stats.wins / played) * 100 : 0,
      };
    })
    .filter((s) => s.opponent)
    .sort((a, b) => a.winRate - b.winRate); // lowest win rate first = toughest
}

/**
 * Skill level analysis: performance when paired with players of each skill level
 */
export function computeSkillAnalysis(
  playerId: string,
  players: Player[],
  matches: MatchWithDetails[]
): SkillLevelBreakdown[] {
  const sets = getAllSets(matches);
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const levels: Record<string, { wins: number; losses: number }> = {
    Developing: { wins: 0, losses: 0 },
    Competitive: { wins: 0, losses: 0 },
    Advanced: { wins: 0, losses: 0 },
  };

  for (const set of sets) {
    const isPair1 = isPlayerInPair(playerId, set.pair1);
    const isPair2 = isPlayerInPair(playerId, set.pair2);

    if (isPair1 || isPair2) {
      const myPair = isPair1 ? set.pair1 : set.pair2;
      const won = set.winning_pair_id === myPair.id;
      const partnerId = getPartnerId(playerId, myPair);
      const partner = playerMap.get(partnerId);
      
      if (partner) {
        if (won) levels[partner.skill_level].wins++;
        else levels[partner.skill_level].losses++;
      }
    }
  }

  return (["Developing", "Competitive", "Advanced"] as const).map((level) => {
    const played = levels[level].wins + levels[level].losses;
    return {
      level,
      setsPlayed: played,
      wins: levels[level].wins,
      losses: levels[level].losses,
      winRate: played > 0 ? (levels[level].wins / played) * 100 : 0,
    };
  });
}

/**
 * Underdog analysis: wins when combined team skill level is lower
 */
export function computeUnderdogStats(
  players: Player[],
  matches: MatchWithDetails[]
): UnderdogStats[] {
  const sets = getAllSets(matches);
  const playerMap = new Map(players.map((p) => [p.id, p]));

  // For each player, track underdog situations
  const underdogMap = new Map<string, { wins: number; losses: number }>();

  for (const set of sets) {
    const wpId = set.winning_pair_id;
    const wp = wpId === set.pair1.id ? set.pair1 : set.pair2;
    const lp = wpId === set.pair1.id ? set.pair2 : set.pair1;

    const wpP1 = playerMap.get(wp.player1_id);
    const wpP2 = playerMap.get(wp.player2_id);
    const lpP1 = playerMap.get(lp.player1_id);
    const lpP2 = playerMap.get(lp.player2_id);

    if (!wpP1 || !wpP2 || !lpP1 || !lpP2) continue;

    const winningSkill =
      SKILL_WEIGHTS[wpP1.skill_level] + SKILL_WEIGHTS[wpP2.skill_level];
    const losingSkill =
      SKILL_WEIGHTS[lpP1.skill_level] + SKILL_WEIGHTS[lpP2.skill_level];

    if (winningSkill < losingSkill) {
      // Winning pair was the underdog — they won despite lower skill
      for (const pid of [wp.player1_id, wp.player2_id]) {
        if (!underdogMap.has(pid)) underdogMap.set(pid, { wins: 0, losses: 0 });
        underdogMap.get(pid)!.wins++;
      }
      for (const pid of [lp.player1_id, lp.player2_id]) {
        if (!underdogMap.has(pid)) underdogMap.set(pid, { wins: 0, losses: 0 });
        underdogMap.get(pid)!.losses++;
      }
    } else if (losingSkill < winningSkill) {
      // Losing pair was the underdog — they lost as underdog
      for (const pid of [lp.player1_id, lp.player2_id]) {
        if (!underdogMap.has(pid)) underdogMap.set(pid, { wins: 0, losses: 0 });
        underdogMap.get(pid)!.losses++;
      }
    }
  }

  return players
    .map((player) => {
      const stats = underdogMap.get(player.id) || { wins: 0, losses: 0 };
      const total = stats.wins + stats.losses;
      return {
        player,
        underdogWins: stats.wins,
        underdogLosses: stats.losses,
        totalUnderdogSets: total,
        underdogWinRate: total > 0 ? (stats.wins / total) * 100 : 0,
      };
    })
    .filter((s) => s.totalUnderdogSets > 0)
    .sort((a, b) => b.underdogWinRate - a.underdogWinRate);
}
