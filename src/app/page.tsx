import { getCounts, getRecentSessions, getPlayers, getMatchesWithDetails } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

// ISR: serve from cache, revalidate in background every 60 s
export const revalidate = 60;

export default async function DashboardPage() {
  const [{ playerCount, sessionCount, matchCount }, recentSessions, players, matchesData] =
    await Promise.all([
      getCounts(),
      getRecentSessions(),
      getPlayers(),
      getMatchesWithDetails(),
    ]);

  const matches = (matchesData || []) as any[];

  // Quick top players by win rate (calculated based on individual sets)
  const playerStats =
    players?.map((player) => {
      let played = 0;
      let won = 0;
      for (const m of matches) {
        for (const g of m.games || []) {
          const inP1 = g.pair1?.player1_id === player.id || g.pair1?.player2_id === player.id;
          const inP2 = g.pair2?.player1_id === player.id || g.pair2?.player2_id === player.id;
          if (inP1 || inP2) {
            played++;
            const wonSet = g.winning_pair_id === (inP1 ? g.pair1_id : g.pair2_id);
            if (wonSet) won++;
          }
        }
      }
      return { ...player, played, won, winRate: played > 0 ? (won / played) * 100 : 0 };
    }) || [];

  playerStats.sort((a, b) => b.winRate - a.winRate || b.won - a.won);

  const statCards = [
    {
      label: "Total Players",
      value: playerCount ?? 0,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 text-primary">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      label: "Sessions Played",
      value: sessionCount ?? 0,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 text-primary">
          <path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" />
        </svg>
      ),
    },
    {
      label: "Matches Recorded",
      value: matchCount ?? 0,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 text-primary">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 6 9 6 9" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 18 9 18 9" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      ),
    },
    {
      label: "Win Rate Leader",
      value:
        playerStats.length > 0
          ? `${playerStats[0].name} (${playerStats[0].winRate.toFixed(0)}%)`
          : "—",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 text-primary">
          <path d="m12 8-9.04 9.06a2.82 2.82 0 1 0 3.98 3.98L16 12" /><circle cx="17" cy="7" r="5" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Overview of your badminton group&apos;s performance
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono tracking-tight">
                {stat.value}
              </div>
            </CardContent>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 text-primary">
                <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
              </svg>
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {playerStats.slice(0, 8).map((player, idx) => (
                <Link
                  key={player.id}
                  href={`/players/${player.id}`}
                  className="flex items-center gap-3 group"
                >
                  <span className="size-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold font-mono text-muted-foreground">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {player.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${player.winRate}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-muted-foreground tabular-nums w-10 text-right">
                        {player.winRate.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {player.played}
                  </Badge>
                </Link>
              ))}
              {playerStats.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No match data yet.{" "}
                  <Link href="/sessions" className="text-primary hover:underline">
                    Record your first session
                  </Link>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 text-primary">
                <path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" />
              </svg>
              Recent Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {recentSessions?.map((session) => (
                <Link
                  key={session.id}
                  href={`/sessions/${session.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                >
                  <div>
                    <p className="text-sm font-medium group-hover:text-primary transition-colors">
                      {session.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(session.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 text-muted-foreground group-hover:text-primary transition-colors">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </Link>
              ))}
              {(!recentSessions || recentSessions.length === 0) && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No sessions yet.{" "}
                  <Link href="/sessions" className="text-primary hover:underline">
                    Create your first session
                  </Link>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
