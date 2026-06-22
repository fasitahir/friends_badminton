/**
 * Centralized data-fetching layer with caching.
 *
 * IMPORTANT: `unstable_cache` cannot call `cookies()` or any other dynamic
 * data source inside its callback. Because our Supabase `createClient` reads
 * cookies (for auth session refresh), we use a lightweight direct client that
 * only needs the public anon key — which is safe to call inside cache.
 *
 * Auth-gated pages (admin check) still call `getIsAdmin()` outside the cache;
 * the data fetches here are for public read-only data.
 *
 * Techniques used:
 *  1. `unstable_cache` — persists results across requests (server-side LRU),
 *     keyed with tags so `revalidatePath` can bust them on mutations.
 *  2. React `cache()` — deduplicates identical calls within the SAME request,
 *     so a page calling `getPlayers()` twice only hits Supabase once.
 *  3. ISR via `revalidate` export on pages — Next.js serves cached HTML, then
 *     revalidates in background every 60 s.
 */

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient as createBrowserClient } from "@supabase/supabase-js";

// ─── Cache tags (for targeted invalidation) ──────────────────────────────────
export const CACHE_TAGS = {
  players: "players",
  sessions: "sessions",
  matches: "matches",
  analytics: "analytics",
} as const;

// Default revalidation window (seconds)
const DEFAULT_REVALIDATE = 60;

/**
 * Create a lightweight Supabase client for cached queries.
 * Uses the anon key — safe inside unstable_cache because it doesn't
 * touch cookies() or any other dynamic data source.
 */
function createCacheClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── Raw Supabase fetchers (called inside unstable_cache) ────────────────────

async function _fetchPlayers() {
  const supabase = createCacheClient();
  const { data } = await supabase
    .from("players")
    .select("*")
    .order("name");
  return data ?? [];
}

async function _fetchSessions() {
  const supabase = createCacheClient();
  const { data } = await supabase
    .from("sessions")
    .select("*")
    .order("date", { ascending: false });
  return data ?? [];
}

async function _fetchRecentSessions() {
  const supabase = createCacheClient();
  const { data } = await supabase
    .from("sessions")
    .select("*")
    .order("date", { ascending: false })
    .limit(5);
  return data ?? [];
}

async function _fetchMatchCounts() {
  const supabase = createCacheClient();
  const { data } = await supabase.from("matches").select("session_id");
  return data ?? [];
}

async function _fetchCounts() {
  const supabase = createCacheClient();
  const [{ count: playerCount }, { count: sessionCount }, { count: matchCount }] =
    await Promise.all([
      supabase.from("players").select("*", { count: "exact", head: true }),
      supabase.from("sessions").select("*", { count: "exact", head: true }),
      supabase.from("matches").select("*", { count: "exact", head: true }),
    ]);
  return {
    playerCount: playerCount ?? 0,
    sessionCount: sessionCount ?? 0,
    matchCount: matchCount ?? 0,
  };
}

async function _fetchMatchesWithDetails() {
  const supabase = createCacheClient();
  const { data } = await supabase
    .from("matches")
    .select(
      `*, games:match_games(*, pair1:pairs!match_games_pair1_id_fkey(*, player1:players!pairs_player1_id_fkey(*), player2:players!pairs_player2_id_fkey(*)), pair2:pairs!match_games_pair2_id_fkey(*, player1:players!pairs_player1_id_fkey(*), player2:players!pairs_player2_id_fkey(*)))`
    )
    .order("created_at", { ascending: false });
  return data ?? [];
}

async function _fetchAnalyticsMatches() {
  const supabase = createCacheClient();
  const { data } = await supabase
    .from("matches")
    .select(
      `*, team1:teams!matches_team1_id_fkey(*), team2:teams!matches_team2_id_fkey(*), winning_team:teams!matches_winning_team_id_fkey(*), games:match_games(*, pair1:pairs!match_games_pair1_id_fkey(*, player1:players!pairs_player1_id_fkey(*), player2:players!pairs_player2_id_fkey(*)), pair2:pairs!match_games_pair2_id_fkey(*, player1:players!pairs_player1_id_fkey(*), player2:players!pairs_player2_id_fkey(*)), winning_pair:pairs!match_games_winning_pair_id_fkey(*, player1:players!pairs_player1_id_fkey(*), player2:players!pairs_player2_id_fkey(*)))`
    )
    .order("created_at", { ascending: false });
  return data ?? [];
}

// ─── Cached versions (server-side LRU, 60 s TTL) ─────────────────────────────

const cachedFetchPlayers = unstable_cache(
  _fetchPlayers,
  ["players"],
  { tags: [CACHE_TAGS.players], revalidate: DEFAULT_REVALIDATE }
);

const cachedFetchSessions = unstable_cache(
  _fetchSessions,
  ["sessions"],
  { tags: [CACHE_TAGS.sessions], revalidate: DEFAULT_REVALIDATE }
);

const cachedFetchRecentSessions = unstable_cache(
  _fetchRecentSessions,
  ["sessions-recent"],
  { tags: [CACHE_TAGS.sessions], revalidate: DEFAULT_REVALIDATE }
);

const cachedFetchMatchCounts = unstable_cache(
  _fetchMatchCounts,
  ["match-counts"],
  { tags: [CACHE_TAGS.matches], revalidate: DEFAULT_REVALIDATE }
);

const cachedFetchCounts = unstable_cache(
  _fetchCounts,
  ["counts"],
  {
    tags: [CACHE_TAGS.players, CACHE_TAGS.sessions, CACHE_TAGS.matches],
    revalidate: DEFAULT_REVALIDATE,
  }
);

const cachedFetchMatchesWithDetails = unstable_cache(
  _fetchMatchesWithDetails,
  ["matches-with-details"],
  { tags: [CACHE_TAGS.matches], revalidate: DEFAULT_REVALIDATE }
);

const cachedFetchAnalyticsMatches = unstable_cache(
  _fetchAnalyticsMatches,
  ["analytics-matches"],
  { tags: [CACHE_TAGS.analytics, CACHE_TAGS.matches], revalidate: DEFAULT_REVALIDATE }
);

// ─── Public API — wrapped in React cache() for per-request deduplication ─────

/** All players ordered by name. Cached 60 s, tagged "players". */
export const getPlayers = cache(cachedFetchPlayers);

/** All sessions ordered by date desc. Cached 60 s, tagged "sessions". */
export const getSessions = cache(cachedFetchSessions);

/** 5 most recent sessions. Cached 60 s, tagged "sessions". */
export const getRecentSessions = cache(cachedFetchRecentSessions);

/** All match session_id rows (for building match-count maps). */
export const getMatchCounts = cache(cachedFetchMatchCounts);

/** Aggregate counts (players / sessions / matches). Cached 60 s. */
export const getCounts = cache(cachedFetchCounts);

/** Matches with full game/pair/player details (used on dashboard). */
export const getMatchesWithDetails = cache(cachedFetchMatchesWithDetails);

/** Matches with full analytics detail (teams + pairs + players). */
export const getAnalyticsMatches = cache(cachedFetchAnalyticsMatches);

// ─── Monthly leaderboard fetchers ────────────────────────────────────────────

/** Returns list of saved month strings ['2026-06', '2026-05', ...] */
async function _fetchSavedMonths() {
  const supabase = createCacheClient();
  const { data } = await supabase
    .from("monthly_snapshots")
    .select("month")
    .order("month", { ascending: false });
  if (!data) return [] as string[];
  // Deduplicate months and format as YYYY-MM
  const seen = new Set<string>();
  for (const row of data) {
    seen.add((row.month as string).slice(0, 7));
  }
  return Array.from(seen);
}

/** Returns ranked leaderboard rows for a given month (YYYY-MM). */
async function _fetchMonthlyLeaderboard(yearMonth: string) {
  const supabase = createCacheClient();
  const monthDate = `${yearMonth}-01`;
  const { data } = await supabase
    .from("monthly_snapshots")
    .select("*, player:players(*)")
    .eq("month", monthDate)
    .order("win_rate", { ascending: false });
  return (data ?? []) as any[];
}

const cachedFetchSavedMonths = unstable_cache(
  _fetchSavedMonths,
  ["saved-months"],
  { tags: ["monthly_snapshots"], revalidate: DEFAULT_REVALIDATE }
);

const cachedFetchMonthlyLeaderboard = unstable_cache(
  _fetchMonthlyLeaderboard,
  ["monthly-leaderboard"],
  { tags: ["monthly_snapshots"], revalidate: DEFAULT_REVALIDATE }
);

/** List of months that have been snapshotted (most recent first). */
export const getSavedMonths = cache(cachedFetchSavedMonths);

/** Ranked leaderboard for a specific month (YYYY-MM). */
export const getMonthlyLeaderboard = cache(cachedFetchMonthlyLeaderboard);
