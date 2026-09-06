import {
  getCounts,
  getRecentSessions,
  getPlayers,
  getMatchesWithDetails,
  getSavedMonths,
  isSupabaseConfigured,
} from "@/lib/data";
import Link from "next/link";
import { LeaderboardTabs } from "@/components/dashboard/leaderboard-tabs";

// ISR: serve from cache, revalidate in background every 60 s
export const revalidate = 60;

export default async function DashboardPage() {
  const [
    { playerCount, sessionCount, matchCount },
    recentSessions,
    players,
    matchesData,
    savedMonths,
  ] = await Promise.all([
    getCounts(),
    getRecentSessions(),
    getPlayers(),
    getMatchesWithDetails(),
    getSavedMonths(),
  ]);

  const matches = (matchesData || []) as any[];

  // Compute streaks and historical Elo (sparkline) for each player
  const enrichedPlayers = (players ?? []).map((player) => {
    let wStreak = 0;
    let lStreak = 0;
    let streakActive = true;
    let sparkline = [player.elo_rating];
    let currentElo = player.elo_rating;
    let totalSets = 0;

    for (const m of matches) {
      for (const g of m.games || []) {
        const inP1 = g.pair1?.player1_id === player.id || g.pair1?.player2_id === player.id;
        const inP2 = g.pair2?.player1_id === player.id || g.pair2?.player2_id === player.id;
        if (inP1 || inP2) {
          totalSets++;
          const wonSet = g.winning_pair_id === (inP1 ? g.pair1_id : g.pair2_id);

          if (streakActive) {
            if (wonSet) {
              if (lStreak > 0) streakActive = false;
              else wStreak++;
            } else {
              if (wStreak > 0) streakActive = false;
              else lStreak++;
            }
          }

          if (sparkline.length < 10) {
            const eloChange = inP1 ? g.pair1_elo_change : g.pair2_elo_change;
            if (eloChange != null) {
              currentElo = currentElo - eloChange;
              sparkline.unshift(currentElo);
            } else {
              currentElo = currentElo - (wonSet ? 15 : -15);
              sparkline.unshift(currentElo);
            }
          }
        }
      }
    }

    return {
      ...player,
      winStreak: wStreak,
      lossStreak: lStreak,
      totalSets,
      sparkline,
    };
  });

  // 1. Calculate all-time player stats for comparison total badge
  const allTimeStats = enrichedPlayers
    .filter((player: any) => !player.is_temporary)
    .map((player) => {
      let played = 0;
      let won = 0;
      for (const m of matches) {
        for (const g of m.games || []) {
          const inP1 =
            g.pair1?.player1_id === player.id ||
            g.pair1?.player2_id === player.id;
          const inP2 =
            g.pair2?.player1_id === player.id ||
            g.pair2?.player2_id === player.id;
          if (inP1 || inP2) {
            played++;
            const wonSet =
              g.winning_pair_id === (inP1 ? g.pair1_id : g.pair2_id);
            if (wonSet) won++;
          }
        }
      }
      return {
        id: player.id,
        name: player.name,
        played,
        won,
        winRate: played > 0 ? (won / played) * 100 : 0,
        winStreak: player.winStreak,
        lossStreak: player.lossStreak,
        totalSets: player.totalSets,
        elo: player.elo_rating,
      };
    })
    .sort((a, b) => b.winRate - a.winRate || b.won - a.won);

  // 2. Determine current month
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // 3. Compute live current month leaderboard dynamically
  const initialEntries = enrichedPlayers
    .filter((player: any) => !player.is_temporary)
    .map((player) => {
      let played = 0;
      let won = 0;
      let lost = 0;
      for (const m of matches) {
        if (m.created_at && m.created_at.startsWith(currentMonth)) {
          for (const g of m.games || []) {
            const inP1 =
              g.pair1?.player1_id === player.id ||
              g.pair1?.player2_id === player.id;
            const inP2 =
              g.pair2?.player1_id === player.id ||
              g.pair2?.player2_id === player.id;
            if (inP1 || inP2) {
              played++;
              const wonSet =
                g.winning_pair_id === (inP1 ? g.pair1_id : g.pair2_id);
              if (wonSet) {
                won++;
              } else {
                lost++;
              }
            }
          }
        }
      }
      return {
        player_id: player.id,
        sets_played: played,
        sets_won: won,
        sets_lost: lost,
        win_rate: played > 0 ? (won / played) * 100 : 0,
        player: {
          id: player.id,
          name: player.name,
          nickname: player.nickname || null,
          elo_rating: player.elo_rating,
        },
      };
    })
    .filter((entry) => entry.sets_played > 0)
    .sort((a, b) => b.win_rate - a.win_rate || b.sets_won - a.sets_won);

  // 4. Combine months for dropdown (ensure currentMonth is at top and unique)
  const availableMonths = Array.from(new Set([currentMonth, ...savedMonths]));

  const eligibleMonthlyPlayers = initialEntries.filter(p => p.sets_played >= 5);
  const topWinRateEntry = eligibleMonthlyPlayers.length > 0
    ? eligibleMonthlyPlayers[0]
    : initialEntries.length > 0
      ? initialEntries[0]
      : null;

  const topEloPlayer = [...allTimeStats].sort((a, b) => (b.elo || 0) - (a.elo || 0))[0];

  const statCards = [
    // {
    //   label: "Total Players",
    //   value: playerCount ?? 0,
    // },
    {
      label: "Sessions",
      value: sessionCount ?? 0,
    },
    {
      label: "Sets Recorded",
      value: matchCount ?? 0,
    },
    {
      label: "Top Win Rate",
      value: topWinRateEntry ? `${topWinRateEntry.win_rate.toFixed(1)}%` : "—",
      subValue: topWinRateEntry ? topWinRateEntry.player.name : null,
    },
    {
      label: "Final Boss",
      value: topEloPlayer ? Math.round(topEloPlayer.elo || 0) : "—",
      subValue: topEloPlayer ? topEloPlayer.name : null,
      highlight: true,
    },
  ];

  const isConfigured = isSupabaseConfigured();

  return (
    <div className="flex flex-col gap-8">
      {/* Header Panel (Bridged to Stats) */}
      <div className="flex flex-col">
        <h1 className="text-3xl sm:text-4xl font-heading tracking-tight uppercase mb-1">
          Badminton Log
        </h1>
        <div className="flex items-center gap-4">
          <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
            System Status: {isConfigured ? "Active" : "Unconnected (Demo Mode)"}
          </p>
          <div className="flex-1 h-px bg-border hidden sm:block" />
        </div>
      </div>

      {!isConfigured && (
        <div className="border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-amber-600 dark:text-amber-400 font-bold uppercase text-xs tracking-wider">
              [ Setup Notice ]
            </span>
            <span className="text-foreground/80 text-xs font-mono">
              Supabase is not configured. Add your credentials to <code className="text-foreground bg-muted px-1.5 py-0.5 font-mono rounded">.env.local</code> to connect your live data.
            </span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider whitespace-nowrap">
            Showing empty state
          </span>
        </div>
      )}

      {/* Stat Blocks (Instrument Cluster) — C2 fix: grid kills 320px overflow */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-y border-border bg-muted/5">
        {statCards.map((stat, i) => (
          <div
            key={stat.label}
            className="flex flex-col px-4 py-6 sm:px-8 border-r border-border last:border-r-0 [&:nth-child(2)]:border-r-0 sm:[&:nth-child(2)]:border-r"
          >
            {/* m2 fix: --color-elo token replaces raw yellow-* */}
            <span
              className="text-[10px] font-mono uppercase tracking-[0.2em] mb-2 text-muted-foreground"
              style={stat.highlight ? { color: "var(--color-elo)" } : undefined}
            >
              {stat.label}
            </span>
            <div
              className="font-mono text-3xl sm:text-4xl text-foreground"
              style={
                stat.highlight
                  ? {
                      color: "var(--color-elo)",
                      /* m1 fix: glow uses named token, no raw rgba */
                      filter: "drop-shadow(0 0 8px var(--color-elo-glow))",
                    }
                  : undefined
              }
            >
              {stat.value}
            </div>
            {stat.subValue && (
              <div
                className="text-xs font-mono uppercase mt-1 text-muted-foreground"
                style={stat.highlight ? { color: "var(--color-elo)" } : undefined}
              >
                {stat.subValue}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* M5 fix: md breakpoint added — tablet no longer stacks both columns full-width */}
      <div className="grid grid-cols-1 md:grid-cols-5 lg:grid-cols-12 gap-8">
        <div className="md:col-span-3 lg:col-span-8">
          <LeaderboardTabs 
            players={enrichedPlayers.filter((p: any) => !p.is_temporary)}
            availableMonths={availableMonths}
            initialMonth={currentMonth}
            initialEntries={initialEntries}
            allTimeStats={allTimeStats}
          />
        </div>

        {/* Recent Sessions */}
        <div className="md:col-span-2 lg:col-span-4 flex flex-col">
          <div className="pb-4 mb-2 border-b border-border">
            <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-foreground font-semibold">
              Recent Log
            </h2>
          </div>
          
          <div className="flex flex-col">
            {recentSessions?.map((session) => {
              const formattedDate = new Date(session.date).toLocaleDateString("en-US", {
                month: "2-digit",
                day: "2-digit",
                year: "2-digit",
              });
              return (
                <Link
                  key={session.id}
                  href={`/sessions/${session.id}`}
                  className="flex flex-row items-center justify-between py-4 border-b border-border group hover:bg-muted/30 transition-colors"
                >
                  <span className="text-sm font-medium group-hover:text-foreground/80">
                    {session.name}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {formattedDate}
                  </span>
                </Link>
              );
            })}
            {(!recentSessions || recentSessions.length === 0) && (
              <div className="py-8 text-xs font-mono text-muted-foreground uppercase">
                [ No Data ]
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
