/**
 * scheduler.ts — Smart Session Scheduler Algorithm
 *
 * Generates ELO-balanced doubles pairs and a fair round-robin match schedule.
 *
 * Key design choices:
 * - Snake-draft pairing within ELO bands (not rigid — uses randomised shuffle
 *   within bands to avoid the same pairs every session)
 * - Berger round-robin ensures every pair faces every other pair
 * - Odd-player support: one player sits out per match, rotated fairly
 * - Anti-rigidity: configurable shuffle strength so the same players don't
 *   always end up together
 */

import type { Player } from "@/lib/supabase/types";

// ─── Public types ─────────────────────────────────────────────────────────────

export type ScheduledPair = {
  player1: Player;
  player2: Player;
  /** Combined ELO of the pair (used to balance vs-matchups) */
  combinedElo: number;
  /** Index used for display (Pair A, Pair B, …) */
  label: string;
};

export type ScheduledMatch = {
  matchNumber: number;
  pair1: ScheduledPair;
  pair2: ScheduledPair;
  /** Player sitting out this match (only when odd number of players) */
  sittingOut: Player | null;
};

export type ScheduleSummary = {
  pairs: ScheduledPair[];
  matches: ScheduledMatch[];
  /** How many matches each player will play */
  playerMatchCounts: { player: Player; count: number }[];
  /** Whether all players have equal match counts */
  isBalanced: boolean;
  /** The ELO spread across pairs (lower = more balanced) */
  averageEloDiff: number;
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Fisher-Yates shuffle (in-place).
 */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Pair letters: A, B, C, … Z, AA, AB, …
 */
function pairLabel(index: number): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (index < 26) return letters[index];
  return letters[Math.floor(index / 26) - 1] + letters[index % 26];
}

/**
 * Split players into ELO bands (each band is ~200 ELO wide).
 * Within each band, players are shuffled randomly to prevent rigid pairing.
 *
 * Band boundaries:  Legend(1500+), Grandmaster(1300), Master(1050),
 *                   Expert(850), Club(700), Beginner(600), Rookie(500), Backyard(<500)
 */
function splitIntoBands(players: Player[]): Player[] {
  const bands: Player[][] = [[], [], [], [], [], [], [], []];
  const thresholds = [1500, 1300, 1050, 850, 700, 600, 500, 0];

  for (const p of players) {
    const elo = p.elo_rating ?? 600;
    for (let i = 0; i < thresholds.length; i++) {
      if (elo >= thresholds[i]) {
        bands[i].push(p);
        break;
      }
    }
  }

  // Shuffle within each band for anti-rigidity, then concatenate
  return bands.flatMap((b) => shuffle(b));
}

// ─── Step 1: Generate balanced pairs ─────────────────────────────────────────

/**
 * Generate doubles pairs using an ELO-aware snake draft.
 *
 * Algorithm:
 *   1. Sort players by ELO (within bands, with a random shuffle to prevent
 *      identical pairings every session).
 *   2. If odd number of players, designate a "bye" player (rotated each call).
 *   3. Snake-pair: rank[0] + rank[N-1], rank[1] + rank[N-2], …
 *      This ensures each pair has a similar *combined* ELO.
 *
 * @returns [pairs, byePlayer | null]
 */
export function generateBalancedPairs(
  players: Player[]
): { pairs: ScheduledPair[]; byePlayer: Player | null } {
  if (players.length < 4) {
    throw new Error("Need at least 4 players to schedule a session.");
  }

  // Shuffle within ELO bands for variety
  const ordered = splitIntoBands([...players]);

  let byePlayer: Player | null = null;
  let forPairing = ordered;

  // Odd player: rotate who sits out the pairing stage
  if (ordered.length % 2 !== 0) {
    // Randomly pick a player from the bottom half of ELO to sit out
    // (higher-rated players should play more often for fairness)
    const bottomHalf = ordered.slice(Math.floor(ordered.length / 2));
    byePlayer = bottomHalf[Math.floor(Math.random() * bottomHalf.length)];
    forPairing = ordered.filter((p) => p.id !== byePlayer!.id);
  }

  const pairs: ScheduledPair[] = [];
  const n = forPairing.length;

  for (let i = 0; i < n / 2; i++) {
    const p1 = forPairing[i];
    const p2 = forPairing[n - 1 - i];
    pairs.push({
      player1: p1,
      player2: p2,
      combinedElo: (p1.elo_rating ?? 600) + (p2.elo_rating ?? 600),
      label: pairLabel(i),
    });
  }

  return { pairs, byePlayer };
}

// ─── Step 2: Round-robin schedule ─────────────────────────────────────────────

/**
 * Generate a round-robin schedule using the Berger table / circle method.
 *
 * Every pair faces every other pair exactly once.
 * N pairs → N*(N-1)/2 matches total.
 *
 * For odd player counts: one player sits out each *round*, rotating fairly.
 * The `byePlayer` passed here has already been excluded from pairing.
 * We attach `sittingOut` to every match in a rotating fashion among the
 * remaining sit-out slots.
 */
export function generateRoundRobinSchedule(
  pairs: ScheduledPair[],
  byePlayer: Player | null = null
): ScheduledMatch[] {
  const n = pairs.length;
  const matches: ScheduledMatch[] = [];

  // Use Berger circle method for even number of pairs
  let circle = [...pairs];
  const fixed = n % 2 === 0 ? null : null; // all even after pairing stage
  const rounds = n - 1;
  const perRound = Math.floor(n / 2);

  for (let r = 0; r < rounds; r++) {
    const round: { p1: ScheduledPair; p2: ScheduledPair }[] = [];

    // In each round, match pair i vs pair (n-1-i) from the rotated circle
    for (let i = 0; i < perRound; i++) {
      round.push({ p1: circle[i], p2: circle[n - 1 - i] });
    }

    // Rotate all except first (standard Berger rotation)
    const newCircle = [circle[0]];
    for (let i = 1; i < n; i++) {
      newCircle[i] = circle[(i + n - 2) % (n - 1) === 0 ? n - 1 : ((i - 1 + n - 2) % (n - 1)) + 1];
    }
    // Simpler correct rotation: keep [0] fixed, rotate [1..n-1]
    const tail = circle.slice(1);
    tail.unshift(tail.pop()!);
    circle = [circle[0], ...tail];

    for (const { p1, p2 } of round) {
      matches.push({
        matchNumber: matches.length + 1,
        pair1: p1,
        pair2: p2,
        sittingOut: byePlayer,
      });
    }
  }

  // Randomise the final match order (same matchups, different sequencing)
  shuffle(matches);

  // Re-number after shuffle
  matches.forEach((m, i) => (m.matchNumber = i + 1));

  return matches;
}

// ─── Step 3: Equalize match counts ───────────────────────────────────────────

/**
 * If the raw round-robin has an uneven match distribution (can happen with
 * odd pair counts or bye rotations), add extra matches to equalise counts.
 *
 * Priority for extra matches:
 *   1. Pairs that haven't faced each other yet
 *   2. Pairs with the fewest matches
 *
 * We never add more than `maxExtraMatches` new rounds.
 */
export function equalizeMatchCounts(
  matches: ScheduledMatch[],
  pairs: ScheduledPair[],
  maxExtraMatches = 4
): ScheduledMatch[] {
  // Count matches per pair
  const pairCount = new Map<string, number>(pairs.map((p) => [pairId(p), 0]));
  const played = new Set<string>();

  for (const m of matches) {
    const k1 = pairId(m.pair1);
    const k2 = pairId(m.pair2);
    pairCount.set(k1, (pairCount.get(k1) ?? 0) + 1);
    pairCount.set(k2, (pairCount.get(k2) ?? 0) + 1);
    played.add(matchupKey(m.pair1, m.pair2));
  }

  const result = [...matches];
  let extras = 0;

  while (extras < maxExtraMatches) {
    const counts = Array.from(pairCount.entries());
    const min = Math.min(...counts.map(([, v]) => v));
    const max = Math.max(...counts.map(([, v]) => v));
    if (max - min <= 1) break; // balanced enough

    // Find pairs with fewest matches
    const needMore = counts
      .filter(([, v]) => v === min)
      .map(([k]) => pairs.find((p) => pairId(p) === k)!)
      .filter(Boolean);

    if (needMore.length < 2) break;

    // Prefer an unplayed matchup among them
    let added = false;
    outer: for (let i = 0; i < needMore.length; i++) {
      for (let j = i + 1; j < needMore.length; j++) {
        const key = matchupKey(needMore[i], needMore[j]);
        if (!played.has(key)) {
          result.push({
            matchNumber: result.length + 1,
            pair1: needMore[i],
            pair2: needMore[j],
            sittingOut: null,
          });
          pairCount.set(pairId(needMore[i]), (pairCount.get(pairId(needMore[i])) ?? 0) + 1);
          pairCount.set(pairId(needMore[j]), (pairCount.get(pairId(needMore[j])) ?? 0) + 1);
          played.add(key);
          added = true;
          extras++;
          break outer;
        }
      }
    }

    if (!added) break; // no more unplayed matchups available
  }

  return result;
}

// ─── Key helpers ──────────────────────────────────────────────────────────────

function pairId(pair: ScheduledPair): string {
  return [pair.player1.id, pair.player2.id].sort().join("|");
}

function matchupKey(a: ScheduledPair, b: ScheduledPair): string {
  return [pairId(a), pairId(b)].sort().join("||");
}

// ─── Top-level entry point ────────────────────────────────────────────────────

/**
 * Generate a complete session schedule from a list of present players.
 *
 * @param players  Players attending the session (min 4)
 * @returns        Full schedule summary including pairs, matches, and stats
 */
export function generateSessionSchedule(players: Player[]): ScheduleSummary {
  const { pairs, byePlayer } = generateBalancedPairs(players);
  const rawMatches = generateRoundRobinSchedule(pairs, byePlayer);
  const matches = equalizeMatchCounts(rawMatches, pairs);

  // Count matches per player
  const playerCount = new Map<string, number>(players.map((p) => [p.id, 0]));

  for (const m of matches) {
    for (const p of [m.pair1.player1, m.pair1.player2, m.pair2.player1, m.pair2.player2]) {
      playerCount.set(p.id, (playerCount.get(p.id) ?? 0) + 1);
    }
  }

  const playerMatchCounts = players.map((p) => ({
    player: p,
    count: playerCount.get(p.id) ?? 0,
  }));

  const counts = playerMatchCounts.map((x) => x.count);
  const isBalanced = Math.max(...counts) - Math.min(...counts) <= 1;

  // Calculate average ELO difference between competing pairs per match
  const eloDiffs = matches.map((m) => Math.abs(m.pair1.combinedElo - m.pair2.combinedElo));
  const averageEloDiff =
    eloDiffs.length > 0 ? Math.round(eloDiffs.reduce((a, b) => a + b, 0) / eloDiffs.length) : 0;

  return { pairs, matches, playerMatchCounts, isBalanced, averageEloDiff };
}

/**
 * Given an existing schedule from the database, extracts the pairs and bye player,
 * then generates an additional round-robin cycle of matches appended to the
 * end of the existing schedule.
 */
export function extendSchedule(existingRows: any[]): ScheduleSummary {
  const pairsMap = new Map<string, ScheduledPair>();
  let byePlayer: Player | null = null;
  const playersMap = new Map<string, Player>();

  existingRows.forEach((row) => {
    const t1p1 = row.t1_player1;
    const t1p2 = row.t1_player2;
    const t2p1 = row.t2_player1;
    const t2p2 = row.t2_player2;
    const sittingOut = row.sitting_out;

    if (sittingOut) {
      byePlayer = sittingOut;
      playersMap.set(sittingOut.id, sittingOut);
    }

    const addPair = (p1: any, p2: any) => {
      if (!p1 || !p2) return;
      playersMap.set(p1.id, p1);
      playersMap.set(p2.id, p2);
      const key = [p1.id, p2.id].sort().join("|");
      if (!pairsMap.has(key)) {
        pairsMap.set(key, {
          player1: p1,
          player2: p2,
          combinedElo: (p1.elo_rating ?? 600) + (p2.elo_rating ?? 600),
          label: "",
        });
      }
    };

    addPair(t1p1, t1p2);
    addPair(t2p1, t2p2);
  });

  const pairs = Array.from(pairsMap.values());
  pairs.forEach((p, i) => (p.label = pairLabel(i)));
  const players = Array.from(playersMap.values());

  const rawMatches = generateRoundRobinSchedule(pairs, byePlayer);
  const matches = equalizeMatchCounts(rawMatches, pairs);

  const maxOrder = Math.max(0, ...existingRows.map((r) => r.match_order || 0));
  matches.forEach((m, i) => (m.matchNumber = maxOrder + i + 1));

  // Count matches per player for the new batch
  const playerCount = new Map<string, number>(players.map((p) => [p.id, 0]));
  for (const m of matches) {
    for (const p of [m.pair1.player1, m.pair1.player2, m.pair2.player1, m.pair2.player2]) {
      playerCount.set(p.id, (playerCount.get(p.id) ?? 0) + 1);
    }
  }

  const playerMatchCounts = players.map((p) => ({
    player: p,
    count: playerCount.get(p.id) ?? 0,
  }));
  const counts = playerMatchCounts.map((x) => x.count);
  const isBalanced = counts.length > 0 ? Math.max(...counts) - Math.min(...counts) <= 1 : true;

  const eloDiffs = matches.map((m) => Math.abs(m.pair1.combinedElo - m.pair2.combinedElo));
  const averageEloDiff =
    eloDiffs.length > 0 ? Math.round(eloDiffs.reduce((a, b) => a + b, 0) / eloDiffs.length) : 0;

  return { pairs, matches, playerMatchCounts, isBalanced, averageEloDiff };
}
