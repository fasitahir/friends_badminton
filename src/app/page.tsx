import {
  getCounts,
  getRecentSessions,
  getPlayers,
  getMatchesWithDetails,
  getSavedMonths,
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
      };
    })
    .sort((a, b) => b.winRate - a.winRate || b.won - a.won);

  // 2. Determine current month
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // 3. Compute live current month leaderboard dynamically
  const initialEntries = enrichedPlayers
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
        },
      };
    })
    .filter((entry) => entry.sets_played > 0)
    .sort((a, b) => b.win_rate - a.win_rate || b.sets_won - a.sets_won);

  // 4. Combine months for dropdown (ensure currentMonth is at top and unique)
  const availableMonths = Array.from(new Set([currentMonth, ...savedMonths]));

  const eligiblePlayers = allTimeStats.filter(p => p.played >= 5);
  const topWinRatePlayer = eligiblePlayers.length > 0
    ? eligiblePlayers.sort((a, b) => b.winRate - a.winRate)[0]
    : allTimeStats.sort((a, b) => b.winRate - a.winRate)[0];

  const statCards = [
    {
      label: "Total Players",
      value: playerCount ?? 0,
    },
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
      value: topWinRatePlayer ? `${topWinRatePlayer.winRate.toFixed(1)}%` : "—",
      subValue: topWinRatePlayer ? topWinRatePlayer.name : null,
    },
  ];

  return (
    <div className="flex flex-col gap-10">
      {/* Header Panel (Bridged to Stats) */}
      <div className="flex flex-col">
        <h1 className="text-3xl sm:text-4xl font-heading tracking-tight uppercase mb-1">
          Badminton Log
        </h1>
        <div className="flex items-center gap-4">
          <p className="text-muted-foreground font-mono text-sm tracking-widest uppercase">
            [System Status: Active]
          </p>
          <div className="flex-1 h-px bg-border hidden sm:block" />
        </div>
      </div>

      {/* Stat Blocks (Instrument Cluster) */}
      <div className="flex flex-row flex-wrap items-center border-y border-border py-6 bg-muted/5">
        {statCards.map((stat, i) => (
          <div 
            key={stat.label} 
            className="flex flex-col flex-1 min-w-[140px] px-4 sm:px-8 border-r border-border last:border-r-0"
          >
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em] mb-2">
              {stat.label}
            </span>
            <div className="font-mono text-3xl sm:text-4xl text-foreground">
              {stat.value}
            </div>
            {stat.subValue && (
              <div className="text-xs font-mono text-muted-foreground mt-1 uppercase">
                {stat.subValue}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 sm:gap-16">
        <div className="lg:col-span-8">
          <LeaderboardTabs 
            players={enrichedPlayers}
            availableMonths={availableMonths}
            initialMonth={currentMonth}
            initialEntries={initialEntries}
            allTimeStats={allTimeStats}
          />
        </div>

        {/* Recent Sessions */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="pb-4 mb-2 border-b border-border">
            <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground">
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
