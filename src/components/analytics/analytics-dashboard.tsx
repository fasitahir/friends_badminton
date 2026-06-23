"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import type { Player, MatchWithDetails } from "@/lib/supabase/types";
import {
  computeAllPlayerStats,
  computeHeadToHead,
  computeAllPairStats,
  computePairVsPair,
  computeBestPartners,
  computeToughestOpponents,
} from "@/lib/analytics";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronRight } from "lucide-react";

// Lazy-load win rate chart (~200KB recharts) — only loaded when analytics page is visited
const WinRateChart = dynamic(
  () => import("./win-rate-chart"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full rounded-lg" />,
  }
);



interface AnalyticsDashboardProps {
  players: Player[];
  matches: MatchWithDetails[];
}

export function AnalyticsDashboard({ players, matches }: AnalyticsDashboardProps) {
  const allPlayerStats = useMemo(
    () => computeAllPlayerStats(players, matches),
    [players, matches]
  );

  const allPairStats = useMemo(
    () => computeAllPairStats(players, matches),
    [players, matches]
  );


  // A helper to get the total number of sets played across all matches
  const totalSetsPlayed = useMemo(() => {
    return matches.reduce((acc, m) => acc + m.games.filter(g => g.winning_pair_id).length, 0);
  }, [matches]);

  if (players.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No data available. Add players and record matches to see analytics.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="overview" className="w-full">
      <div className="relative w-full">
        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 scrollbar-none">
          <TabsList className="flex !h-auto w-max sm:w-full sm:flex-wrap justify-start gap-1 p-1 bg-muted/50">
            <TabsTrigger value="overview" className="h-8 text-xs sm:text-sm shrink-0">Overview</TabsTrigger>
            <TabsTrigger value="head-to-head" className="h-8 text-xs sm:text-sm shrink-0">Head-to-Head</TabsTrigger>
            <TabsTrigger value="pairs" className="h-8 text-xs sm:text-sm shrink-0">Pairs</TabsTrigger>
            <TabsTrigger value="pair-vs-pair" className="h-8 text-xs sm:text-sm shrink-0">Pair vs Pair</TabsTrigger>
            <TabsTrigger value="partners" className="h-8 text-xs sm:text-sm shrink-0">Best Partners</TabsTrigger>
            <TabsTrigger value="opponents" className="h-8 text-xs sm:text-sm shrink-0">Toughest Opponents</TabsTrigger>
          </TabsList>
        </div>
        {/* Mobile scroll-right indicator */}
        <div className="sm:hidden absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center h-8 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none pr-1">
          <ChevronRight className="size-4 text-muted-foreground/80 animate-pulse" />
        </div>
      </div>

      {/* ==================== OVERVIEW ==================== */}
      <TabsContent value="overview" className="mt-6">
        <OverviewTab stats={allPlayerStats} totalSets={totalSetsPlayed} />
      </TabsContent>

      {/* ==================== HEAD-TO-HEAD ==================== */}
      <TabsContent value="head-to-head" className="mt-6">
        <HeadToHeadTab players={players} matches={matches} />
      </TabsContent>

      {/* ==================== PAIRS ==================== */}
      <TabsContent value="pairs" className="mt-6">
        <PairsTab stats={allPairStats} />
      </TabsContent>

      {/* ==================== PAIR VS PAIR ==================== */}
      <TabsContent value="pair-vs-pair" className="mt-6">
        <PairVsPairTab players={players} matches={matches} />
      </TabsContent>

      {/* ==================== BEST PARTNERS ==================== */}
      <TabsContent value="partners" className="mt-6">
        <BestPartnersTab players={players} matches={matches} />
      </TabsContent>

      {/* ==================== TOUGHEST OPPONENTS ==================== */}
      <TabsContent value="opponents" className="mt-6">
        <ToughestOpponentsTab players={players} matches={matches} />
      </TabsContent>

    </Tabs>
  );
}

// ==================== OVERVIEW TAB ====================
function OverviewTab({
  stats,
  totalSets,
}: {
  stats: ReturnType<typeof computeAllPlayerStats>;
  totalSets: number;
}) {
  const chartData = stats
    .filter((s) => s.setsPlayed > 0)
    .map((s) => ({
      name: s.player.name,
      winRate: Math.round(s.winRate),
      played: s.setsPlayed,
    }));

  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Sets</p>
            <p className="text-3xl font-bold font-mono tabular-nums mt-1">{totalSets}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Active Players</p>
            <p className="text-3xl font-bold font-mono tabular-nums mt-1">
              {stats.filter((s) => s.setsPlayed > 0).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Highest Win Rate</p>
            <p className="text-3xl font-bold font-mono tabular-nums mt-1 text-win">
              {stats.length > 0 && stats[0].setsPlayed > 0
                ? `${stats[0].winRate.toFixed(0)}%`
                : "—"}
            </p>
            {stats.length > 0 && stats[0].setsPlayed > 0 && (
              <p className="text-xs text-muted-foreground">{stats[0].player.name}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Most Sets</p>
            <p className="text-3xl font-bold font-mono tabular-nums mt-1">
              {stats.length > 0
                ? Math.max(...stats.map((s) => s.setsPlayed))
                : 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Win Rate by Player</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: `${Math.max(260, chartData.length * 30)}px` }} className="w-full text-foreground">
              <WinRateChart data={chartData} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard Table */}
      <Card>
        <CardHeader>
          <CardTitle>Player Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground whitespace-nowrap">#</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground whitespace-nowrap">Player</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground whitespace-nowrap">Win %</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground whitespace-nowrap">Sets Played</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground whitespace-nowrap">Won</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground whitespace-nowrap">Lost</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s, idx) => (
                  <tr key={s.player.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-2 font-mono text-muted-foreground">{idx + 1}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium whitespace-nowrap">{s.player.name}</span>
                        <span className="text-xs font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border">
                          {s.player.elo_rating}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="hidden sm:block w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${s.winRate}%` }}
                          />
                        </div>
                        <span className="font-mono tabular-nums text-xs w-10 text-right">
                          {s.winRate.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center font-mono tabular-nums">{s.setsPlayed}</td>
                    <td className="py-3 px-2 text-center font-mono tabular-nums text-win">{s.setsWon}</td>
                    <td className="py-3 px-2 text-center font-mono tabular-nums text-loss">{s.setsLost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== HEAD-TO-HEAD TAB ====================
function HeadToHeadTab({ players, matches }: { players: Player[]; matches: MatchWithDetails[] }) {
  const [playerAId, setPlayerAId] = useState("");
  const [playerBId, setPlayerBId] = useState("");

  const result = useMemo(() => {
    if (!playerAId || !playerBId) return null;
    const pA = players.find((p) => p.id === playerAId);
    const pB = players.find((p) => p.id === playerBId);
    if (!pA || !pB) return null;
    return computeHeadToHead(pA, pB, matches);
  }, [playerAId, playerBId, players, matches]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Player A</label>
          <Select value={playerAId} onValueChange={(v) => setPlayerAId(v || "")}>
            <SelectTrigger>
              <SelectValue placeholder="Select player">
                {players.find((p) => p.id === playerAId)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {players.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Player B</label>
          <Select value={playerBId} onValueChange={(v) => setPlayerBId(v || "")}>
            <SelectTrigger>
              <SelectValue placeholder="Select player">
                {players.find((p) => p.id === playerBId)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {players.filter((p) => p.id !== playerAId).map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {result && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <div className="text-center flex-1 min-w-0">
                <p className="text-base sm:text-2xl font-bold truncate">{result.playerA.name}</p>
                <p className="text-2xl sm:text-4xl font-bold font-mono tabular-nums text-win mt-2">
                  {result.playerAWins}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">set wins</p>
              </div>
              <div className="text-center px-3 sm:px-6 shrink-0">
                <p className="text-xs sm:text-sm text-muted-foreground">faced</p>
                <p className="text-2xl sm:text-3xl font-bold font-mono tabular-nums">
                  {result.timesFaced}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">sets</p>
              </div>
              <div className="text-center flex-1 min-w-0">
                <p className="text-base sm:text-2xl font-bold truncate">{result.playerB.name}</p>
                <p className="text-2xl sm:text-4xl font-bold font-mono tabular-nums text-loss mt-2">
                  {result.playerBWins}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">set wins</p>
              </div>
            </div>

            {result.timesFaced > 0 && (
              <>
                <Separator className="my-4" />
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium mb-2">Match History</p>
                  {result.sets.map((s) => {
                    const aWon = s.winning_pair_id && (
                      (s.winning_pair?.player1_id === playerAId || s.winning_pair?.player2_id === playerAId)
                    );
                    const losing_pair = s.winning_pair_id === s.pair1.id ? s.pair2 : s.pair1;
                    return (
                      <div key={s.id} className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className={aWon ? "bg-win/15 text-win border-win/30" : "bg-loss/15 text-loss border-loss/30"}>
                          {aWon ? `${result.playerA.name} W` : `${result.playerB.name} W`}
                        </Badge>
                        <span className="text-muted-foreground">
                          {s.winning_pair?.player1?.name} & {s.winning_pair?.player2?.name} beat {losing_pair.player1?.name} & {losing_pair.player2?.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {result.timesFaced === 0 && (
              <p className="text-center text-muted-foreground py-4">
                These players have never faced each other in a set.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== PAIRS TAB ====================
function PairsTab({ stats }: { stats: ReturnType<typeof computeAllPairStats> }) {
  return (
    <Card>
      <CardHeader><CardTitle>All Pair Statistics</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 font-medium text-muted-foreground whitespace-nowrap">Pair</th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground whitespace-nowrap">Win %</th>
                <th className="text-center py-3 px-2 font-medium text-muted-foreground whitespace-nowrap">Sets Played</th>
                <th className="text-center py-3 px-2 font-medium text-muted-foreground whitespace-nowrap">Won</th>
                <th className="text-center py-3 px-2 font-medium text-muted-foreground whitespace-nowrap">Lost</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={`${s.player1.id}-${s.player2.id}`} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-2 font-medium whitespace-nowrap">
                    {s.player1.name} & {s.player2.name}
                  </td>
                  <td className="py-3 px-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="hidden sm:block w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${s.winRate}%` }} />
                      </div>
                      <span className="font-mono tabular-nums text-xs w-10 text-right">{s.winRate.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center font-mono tabular-nums">{s.setsPlayed}</td>
                  <td className="py-3 px-2 text-center font-mono tabular-nums text-win">{s.wins}</td>
                  <td className="py-3 px-2 text-center font-mono tabular-nums text-loss">{s.losses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {stats.length === 0 && (
          <p className="text-center text-muted-foreground py-6">No pair data available.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== PAIR VS PAIR TAB ====================
function PairVsPairTab({ players, matches }: { players: Player[]; matches: MatchWithDetails[] }) {
  const [p1a, setP1a] = useState("");
  const [p1b, setP1b] = useState("");
  const [p2a, setP2a] = useState("");
  const [p2b, setP2b] = useState("");

  const selectedIds = [p1a, p1b, p2a, p2b].filter(Boolean);

  const result = useMemo(() => {
    if (!p1a || !p1b || !p2a || !p2b) return null;
    const pp1a = players.find((p) => p.id === p1a);
    const pp1b = players.find((p) => p.id === p1b);
    const pp2a = players.find((p) => p.id === p2a);
    const pp2b = players.find((p) => p.id === p2b);
    if (!pp1a || !pp1b || !pp2a || !pp2b) return null;
    return { ...computePairVsPair(pp1a, pp1b, pp2a, pp2b, matches), pp1a, pp1b, pp2a, pp2b };
  }, [p1a, p1b, p2a, p2b, players, matches]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Pair 1</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Select value={p1a} onValueChange={(v) => setP1a(v || "")}>
              <SelectTrigger>
                <SelectValue placeholder="Player 1">
                  {players.find((p) => p.id === p1a)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {players.filter((p) => !selectedIds.includes(p.id) || p.id === p1a).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={p1b} onValueChange={(v) => setP1b(v || "")}>
              <SelectTrigger>
                <SelectValue placeholder="Player 2">
                  {players.find((p) => p.id === p1b)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {players.filter((p) => !selectedIds.includes(p.id) || p.id === p1b).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Pair 2</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Select value={p2a} onValueChange={(v) => setP2a(v || "")}>
              <SelectTrigger>
                <SelectValue placeholder="Player 1">
                  {players.find((p) => p.id === p2a)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {players.filter((p) => !selectedIds.includes(p.id) || p.id === p2a).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={p2b} onValueChange={(v) => setP2b(v || "")}>
              <SelectTrigger>
                <SelectValue placeholder="Player 2">
                  {players.find((p) => p.id === p2b)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {players.filter((p) => !selectedIds.includes(p.id) || p.id === p2b).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {result && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-bold truncate">{result.pp1a.name} & {result.pp1b.name}</p>
                <p className="text-2xl sm:text-4xl font-bold font-mono tabular-nums text-win mt-2">{result.pair1Wins}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">wins ({result.pair1WinRate.toFixed(0)}%)</p>
              </div>
              <div className="text-center px-2 sm:px-4 shrink-0">
                <p className="text-2xl sm:text-3xl font-bold font-mono tabular-nums">{result.total}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">total sets</p>
              </div>
              <div className="text-center flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-bold truncate">{result.pp2a.name} & {result.pp2b.name}</p>
                <p className="text-2xl sm:text-4xl font-bold font-mono tabular-nums text-loss mt-2">{result.pair2Wins}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">wins ({result.total > 0 ? (100 - result.pair1WinRate).toFixed(0) : 0}%)</p>
              </div>
            </div>
            {result.total === 0 && (
              <p className="text-center text-muted-foreground mt-4">These pairs have never faced each other.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== BEST PARTNERS TAB ====================
function BestPartnersTab({ players, matches }: { players: Player[]; matches: MatchWithDetails[] }) {
  const [selectedId, setSelectedId] = useState("");

  const partners = useMemo(() => {
    if (!selectedId) return [];
    return computeBestPartners(selectedId, players, matches);
  }, [selectedId, players, matches]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 max-w-sm">
        <label className="text-sm font-medium">Select Player</label>
        <Select value={selectedId} onValueChange={(v) => setSelectedId(v || "")}>
          <SelectTrigger>
            <SelectValue placeholder="Select player">
              {players.find((p) => p.id === selectedId)?.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {players.map((p) => (
               <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedId && partners.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Partners ranked by Win Rate</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {partners.map((ps, idx) => (
                <div key={ps.partner.id} className="flex items-center gap-3">
                  <span className="size-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold font-mono text-muted-foreground">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium flex-1">{ps.partner.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono tabular-nums">
                      {ps.wins}W {ps.losses}L
                    </span>
                    <div className="hidden sm:block w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-win" style={{ width: `${ps.winRate}%` }} />
                    </div>
                    <span className="text-sm font-bold font-mono tabular-nums w-12 text-right">
                      {ps.winRate.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedId && partners.length === 0 && (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            No partner data for this player.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== TOUGHEST OPPONENTS TAB ====================
function ToughestOpponentsTab({ players, matches }: { players: Player[]; matches: MatchWithDetails[] }) {
  const [selectedId, setSelectedId] = useState("");

  const opponents = useMemo(() => {
    if (!selectedId) return [];
    return computeToughestOpponents(selectedId, players, matches);
  }, [selectedId, players, matches]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 max-w-sm">
        <label className="text-sm font-medium">Select Player</label>
        <Select value={selectedId} onValueChange={(v) => setSelectedId(v || "")}>
          <SelectTrigger>
            <SelectValue placeholder="Select player">
              {players.find((p) => p.id === selectedId)?.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {players.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedId && opponents.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Opponents ranked by Difficulty (lowest win rate first)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {opponents.map((os, idx) => (
                <div key={os.opponent.id} className="flex items-center gap-3">
                  <span className="size-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold font-mono text-muted-foreground">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium flex-1">{os.opponent.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono tabular-nums">
                      {os.wins}W {os.losses}L
                    </span>
                    <div className="hidden sm:block w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-loss" style={{ width: `${100 - os.winRate}%` }} />
                    </div>
                    <span className="text-sm font-bold font-mono tabular-nums w-12 text-right">
                      {os.winRate.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedId && opponents.length === 0 && (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            No opponent data for this player.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

