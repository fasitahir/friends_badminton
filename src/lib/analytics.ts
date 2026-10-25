import type {
  Player,
  MatchWithDetails,
  PairWithPlayers,
  PlayerStats,
  HeadToHeadResult,
  PairStatsResult,
  PartnerStats,
  OpponentStats,
  MatchGameWithPairs,
  RecordEntry,
  Records,
} from "@/lib/supabase/types";


/**
 * Check if a player is in a pair
 */
function isPlayerInPair(playerId: string, pair: PairWithPlayers): boolean {
  return pair.player1_id === playerId || pair.player2_id === playerId;
}

/**
 * Get the partner ID from a pair
 */
function getPartnerId(playerId: string, pair: PairWithPlayers): string | null {
  return pair.player1_id === playerId ? pair.player2_id : pair.player1_id;
}

/**
 * Extract all completed sets from matches
 */
function getAllSets(matches: MatchWithDetails[]): MatchGameWithPairs[] {
  return matches.flatMap((m) => m.games.filter((g) => g.winning_pair !== null));
}

/**
 * Get match weight: 0.5 if any player is temporary, 1.0 otherwise
 */
function getMatchWeight(set: MatchGameWithPairs): number {
  if (
    set.pair1.player1?.is_temporary ||
    set.pair1.player2?.is_temporary ||
    set.pair2.player1?.is_temporary ||
    set.pair2.player2?.is_temporary
  ) {
    return 0.5;
  }
  return 1.0;
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
      const weight = getMatchWeight(set);
      setsPlayed += weight;
      const won = set.winning_pair_id === (isPair1 ? set.pair1.id : set.pair2.id);
      if (won) setsWon += weight;
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
      const weight = getMatchWeight(set);
      const aWon = set.winning_pair_id === (aIn1 ? set.pair1.id : set.pair2.id);
      if (aWon) {
        playerAWins += weight;
      } else {
        playerBWins += weight;
      }
    }
  }

  const timesFaced = playerAWins + playerBWins;

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
    // Skip singles matches in Pair stats
    if (!set.pair1.player2_id || !set.pair2.player2_id) continue;

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

    const weight = getMatchWeight(set);
    if (set.winning_pair_id === set.pair1.id) {
      pairMap.get(p1Key)!.wins += weight;
      pairMap.get(p2Key)!.losses += weight;
    } else {
      pairMap.get(p2Key)!.wins += weight;
      pairMap.get(p1Key)!.losses += weight;
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
      const weight = getMatchWeight(set);
      if (set.winning_pair_id === set.pair1.id) pair1Wins += weight;
      else pair2Wins += weight;
    } else if (p2In1 && p1In2) {
      const weight = getMatchWeight(set);
      if (set.winning_pair_id === set.pair2.id) pair1Wins += weight;
      else pair2Wins += weight;
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
      const weight = getMatchWeight(set);
      const pair = isPair1 ? set.pair1 : set.pair2;
      const partnerId = getPartnerId(playerId, pair);
      if (!partnerId) continue; // Skip singles matches
      
      const won = set.winning_pair_id === pair.id;

      if (!partnerMap.has(partnerId)) partnerMap.set(partnerId, { wins: 0, losses: 0 });
      if (won) {
        partnerMap.get(partnerId)!.wins += weight;
      } else {
        partnerMap.get(partnerId)!.losses += weight;
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
      const weight = getMatchWeight(set);
      const myPair = isPair1 ? set.pair1 : set.pair2;
      const oppPair = isPair1 ? set.pair2 : set.pair1;
      const won = set.winning_pair_id === myPair.id;

      for (const oppId of [oppPair.player1_id, oppPair.player2_id]) {
        if (!opponentMap.has(oppId)) opponentMap.set(oppId, { wins: 0, losses: 0 });
        if (won) {
          opponentMap.get(oppId)!.wins += weight;
        } else {
          opponentMap.get(oppId)!.losses += weight;
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

// ─── Records ────────────────────────────────────────────────────────────────

function pairLabel(pair: PairWithPlayers): string {
  const n1 = pair.player1?.nickname || pair.player1?.name || "?";
  const n2 = pair.player2?.nickname || pair.player2?.name || "?";
  return `${n1} & ${n2}`;
}

function playerLabel(p: Player): string {
  return p.nickname || p.name;
}

/**
 * Compute all-time records from raw match data.
 * Only real (non-temporary) players are included.
 */
export function computeRecords(
  players: Player[],
  matches: MatchWithDetails[]
): Records {
  const realPlayerIds = new Set(
    players.filter((p) => !p.is_temporary).map((p) => p.id)
  );

  // Track per-player aggregates
  const playerSetsWon = new Map<string, number>();
  const playerSetsPlayed = new Map<string, number>();
  const playerWinStreaks = new Map<string, number>();   // longest ever
  const playerLossStreaks = new Map<string, number>();  // longest ever
  const playerCurWin = new Map<string, number>();       // running current streak
  const playerCurLoss = new Map<string, number>();
  const playerElo = new Map<string, number>();

  for (const p of players) {
    if (realPlayerIds.has(p.id)) {
      playerSetsWon.set(p.id, 0);
      playerSetsPlayed.set(p.id, 0);
      playerWinStreaks.set(p.id, 0);
      playerLossStreaks.set(p.id, 0);
      playerCurWin.set(p.id, 0);
      playerCurLoss.set(p.id, 0);
      playerElo.set(p.id, p.elo_rating);
    }
  }

  // Track per-duo aggregates
  const duoWins = new Map<string, { label: string; wins: number; played: number }>();

  // Track margin records
  let biggestMargin = -1;
  let biggestMarginEntry: RecordEntry | null = null;

  // Sort matches chronologically for streak computation
  const sortedMatches = [...matches].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  for (const match of sortedMatches) {
    for (const game of match.games || []) {
      if (!game.winning_pair_id || !game.pair1 || !game.pair2) continue;

      const p1 = game.pair1;
      const p2 = game.pair2;
      const allIds = [
        p1.player1_id, p1.player2_id,
        p2.player1_id, p2.player2_id,
      ].filter(Boolean) as string[];

      const allReal = allIds.every((id) => realPlayerIds.has(id));

      // Per-player stats (include if at least one real player in each side)
      const p1HasReal = realPlayerIds.has(p1.player1_id) || realPlayerIds.has(p1.player2_id);
      const p2HasReal = realPlayerIds.has(p2.player1_id) || realPlayerIds.has(p2.player2_id);

      if (p1HasReal && p2HasReal) {
        const pair1Won = game.winning_pair_id === p1.id;

        for (const [pair, pairWon] of [[p1, pair1Won], [p2, !pair1Won]] as [PairWithPlayers, boolean][]) {
          for (const pid of [pair.player1_id, pair.player2_id]) {
            if (!realPlayerIds.has(pid)) continue;
            playerSetsPlayed.set(pid, (playerSetsPlayed.get(pid) ?? 0) + 1);
            if (pairWon) {
              playerSetsWon.set(pid, (playerSetsWon.get(pid) ?? 0) + 1);
              const cw = (playerCurWin.get(pid) ?? 0) + 1;
              playerCurWin.set(pid, cw);
              playerCurLoss.set(pid, 0);
              if (cw > (playerWinStreaks.get(pid) ?? 0)) playerWinStreaks.set(pid, cw);
            } else {
              const cl = (playerCurLoss.get(pid) ?? 0) + 1;
              playerCurLoss.set(pid, cl);
              playerCurWin.set(pid, 0);
              if (cl > (playerLossStreaks.get(pid) ?? 0)) playerLossStreaks.set(pid, cl);
            }
          }
        }

        // Biggest margin win (all-real games only)
        if (
          allReal &&
          typeof game.pair1_score === "number" &&
          typeof game.pair2_score === "number"
        ) {
          const winnerPair = pair1Won ? p1 : p2;
          const loserPair = pair1Won ? p2 : p1;
          const winnerScore = pair1Won ? game.pair1_score : game.pair2_score;
          const loserScore = pair1Won ? game.pair2_score : game.pair1_score;
          const margin = winnerScore - loserScore;
          if (margin > biggestMargin) {
            biggestMargin = margin;
            biggestMarginEntry = {
              id: game.id,
              label: pairLabel(winnerPair),
              detail: `beat ${pairLabel(loserPair)} · ${winnerScore}–${loserScore}`,
              value: margin,
            };
          }
        }

        // Duo win rates (all-real only, doubles only)
        if (allReal && p1.player2_id && p2.player2_id) {
          for (const [pair, pairWon] of [[p1, pair1Won], [p2, !pair1Won]] as [PairWithPlayers, boolean][]) {
            const key = [pair.player1_id, pair.player2_id].sort().join(":");
            if (!duoWins.has(key)) {
              duoWins.set(key, { label: pairLabel(pair), wins: 0, played: 0 });
            }
            const d = duoWins.get(key)!;
            d.played++;
            if (pairWon) d.wins++;
          }
        }
      }
    }
  }

  const playerMap = new Map(players.map((p) => [p.id, p]));

  function topN<T>(arr: T[], n = 5): T[] {
    return arr.slice(0, n);
  }

  // Most sets won
  const mostSetsWon: RecordEntry[] = topN(
    [...playerSetsWon.entries()]
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([id, v]) => {
        const p = playerMap.get(id)!;
        return {
          id,
          label: playerLabel(p),
          detail: `${playerSetsPlayed.get(id) ?? 0} sets played`,
          value: v,
          href: `/players/${id}`,
        };
      })
  );

  // Most sets played
  const mostSetsPlayed: RecordEntry[] = topN(
    [...playerSetsPlayed.entries()]
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([id, v]) => {
        const p = playerMap.get(id)!;
        return {
          id,
          label: playerLabel(p),
          detail: `${playerSetsWon.get(id) ?? 0} wins`,
          value: v,
          href: `/players/${id}`,
        };
      })
  );

  // Best win rate (min 10 sets)
  const bestWinRate: RecordEntry[] = topN(
    [...playerSetsPlayed.entries()]
      .filter(([, played]) => played >= 10)
      .map(([id, played]) => {
        const won = playerSetsWon.get(id) ?? 0;
        const p = playerMap.get(id)!;
        return {
          id,
          label: playerLabel(p),
          detail: `${won}W / ${played - won}L`,
          value: Math.round((won / played) * 100),
          href: `/players/${id}`,
        };
      })
      .sort((a, b) => b.value - a.value)
  );

  // Longest win streak
  const longestWinStreak: RecordEntry[] = topN(
    [...playerWinStreaks.entries()]
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([id, v]) => {
        const p = playerMap.get(id)!;
        return {
          id,
          label: playerLabel(p),
          detail: "consecutive sets won",
          value: v,
          href: `/players/${id}`,
        };
      })
  );

  // Longest loss streak
  const longestLossStreak: RecordEntry[] = topN(
    [...playerLossStreaks.entries()]
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([id, v]) => {
        const p = playerMap.get(id)!;
        return {
          id,
          label: playerLabel(p),
          detail: "consecutive sets lost",
          value: v,
          href: `/players/${id}`,
        };
      })
  );

  // Highest ELO
  const highestElo: RecordEntry[] = topN(
    [...playerElo.entries()]
      .sort(([, a], [, b]) => b - a)
      .map(([id, elo]) => {
        const p = playerMap.get(id)!;
        return {
          id,
          label: playerLabel(p),
          detail: `${playerSetsWon.get(id) ?? 0}W · ${playerSetsPlayed.get(id) ?? 0} played`,
          value: Math.round(elo),
          href: `/players/${id}`,
        };
      })
  );

  // Biggest margin win
  const biggestMarginWin: RecordEntry[] = biggestMarginEntry ? [biggestMarginEntry] : [];

  // Best duo (min 5 sets)
  const bestDuo: RecordEntry[] = topN(
    [...duoWins.values()]
      .filter((d) => d.played >= 5)
      .sort((a, b) => b.wins / b.played - a.wins / a.played)
      .map((d) => ({
        id: d.label,
        label: d.label,
        detail: `${d.wins}W / ${d.played - d.wins}L · ${Math.round((d.wins / d.played) * 100)}% win rate`,
        value: Math.round((d.wins / d.played) * 100),
      }))
  );

  return {
    mostSetsWon,
    mostSetsPlayed,
    bestWinRate,
    longestWinStreak,
    highestElo,
    biggestMarginWin,
    bestDuo,
    longestLossStreak,
  };
}
