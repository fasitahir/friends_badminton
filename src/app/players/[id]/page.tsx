import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Player, MatchWithDetails } from "@/lib/supabase/types";
import {
  computePlayerStats,
  computeBestPartners,
  computeToughestOpponents,
} from "@/lib/analytics";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, Trophy, Target, Zap, Shield } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: player } = await supabase
    .from("players")
    .select("name")
    .eq("id", id)
    .single();

  return {
    title: player ? `${player.name} — Shuttle Stats` : "Player Not Found",
  };
}

const AVATAR_COLORS = [
  "from-green-500 to-emerald-600",
  "from-blue-500 to-cyan-600",
  "from-purple-500 to-violet-600",
  "from-orange-500 to-amber-600",
  "from-pink-500 to-rose-600",
  "from-teal-500 to-cyan-600",
  "from-indigo-500 to-blue-600",
  "from-yellow-500 to-amber-600",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getEloTier(elo: number) {
  if (elo >= 700) return { label: "Elite", emoji: "🔥", color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/30" };
  if (elo >= 650) return { label: "Advanced", emoji: "⚡", color: "text-primary", bg: "bg-primary/15 border-primary/30" };
  if (elo >= 600) return { label: "Intermediate", emoji: "🌟", color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/30" };
  return { label: "Beginner", emoji: "🎯", color: "text-muted-foreground", bg: "bg-muted/50 border-border/50" };
}

function getNextTierProgress(elo: number) {
  if (elo >= 700) return null; // Max tier
  if (elo >= 650) return { nextLabel: "Elite", nextElo: 700, prevElo: 650, current: elo };
  if (elo >= 600) return { nextLabel: "Advanced", nextElo: 650, prevElo: 600, current: elo };
  return { nextLabel: "Intermediate", nextElo: 600, prevElo: 0, current: elo };
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: player } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .single();

  if (!player) notFound();

  const { data: allPlayers } = await supabase
    .from("players")
    .select("*")
    .order("name");

  const { data: matchesData } = await supabase
    .from("matches")
    .select(`*`)
    .order("created_at", { ascending: false });

  const matchIds = matchesData?.map(m => m.id) || [];
  const { data: gamesData } = await supabase
    .from("match_games")
    .select(`*, pair1:pairs!match_games_pair1_id_fkey(*, player1:players!pairs_player1_id_fkey(*), player2:players!pairs_player2_id_fkey(*)), pair2:pairs!match_games_pair2_id_fkey(*, player1:players!pairs_player1_id_fkey(*), player2:players!pairs_player2_id_fkey(*))`)
    .in("match_id", matchIds);

  const matchesWithDetails: MatchWithDetails[] = (matchesData || []).map(match => ({
    ...match,
    games: (gamesData || []).filter((g: any) => g.match_id === match.id)
  }));

  const matches = matchesWithDetails;
  const players = (allPlayers || []) as Player[];

  const stats = computePlayerStats(player as Player, matches);
  const bestPartners = computeBestPartners(player.id, players, matches);
  const toughestOpponents = computeToughestOpponents(player.id, players, matches);

  const allSets = matches.flatMap(m => m.games);
  const recentSets = allSets.filter(
    (s) =>
      s.pair1?.player1_id === id ||
      s.pair1?.player2_id === id ||
      s.pair2?.player1_id === id ||
      s.pair2?.player2_id === id
  ).sort((a, b) => b.game_number - a.game_number).slice(0, 10);

  const avatarGradient = getAvatarColor(player.name);
  const tier = getEloTier(player.elo_rating ?? 600);
  const winStreak = recentSets.reduce((streak, set, i) => {
    if (i > 0) return streak; // only check most recent
    const won = set.winning_pair_id === set.pair1_id
      ? (set.pair1?.player1_id === id || set.pair1?.player2_id === id)
      : (set.pair2?.player1_id === id || set.pair2?.player2_id === id);
    return won ? streak + 1 : streak;
  }, 0);

  const currentElo = player.elo_rating ?? 600;
  let peakElo = currentElo;
  let tempElo = currentElo;
  for (const m of matches) {
    for (const g of m.games || []) {
      const isP1 = g.pair1?.player1_id === id || g.pair1?.player2_id === id;
      const isP2 = g.pair2?.player1_id === id || g.pair2?.player2_id === id;
      if (isP1 || isP2) {
        if (tempElo > peakElo) peakElo = tempElo;
        const eloChange = isP1 ? g.pair1_elo_change : g.pair2_elo_change;
        if (eloChange != null) {
          tempElo -= eloChange;
        } else {
          const wonSet = g.winning_pair_id === (isP1 ? g.pair1_id : g.pair2_id);
          tempElo -= wonSet ? 15 : -15;
        }
      }
    }
  }
  if (tempElo > peakElo) peakElo = tempElo;

  const tierProgress = getNextTierProgress(currentElo);

  return (
    <div className="flex flex-col gap-6">
      {/* Hero Header */}
      <div className="relative rounded-2xl overflow-hidden border border-border/50 bg-card">
        <div className="absolute inset-0 court-bg opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 sm:p-6">
          {/* Large Avatar */}
          <div className={`size-20 sm:size-24 rounded-2xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center font-heading font-bold text-4xl sm:text-5xl text-white shrink-0 shadow-lg`}>
            {player.name.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight">
                  {player.name}
                </h1>
                {player.nickname && (
                  <p className="text-muted-foreground text-sm sm:text-base mt-0.5">
                    &ldquo;{player.nickname}&rdquo;
                  </p>
                )}
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-semibold ${tier.bg} ${tier.color} shrink-0`}>
                <span>{tier.emoji}</span>
                <span>{tier.label}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              {player.elo_rating && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/40 border border-border/50">
                  <Zap className="size-3.5 text-primary" />
                  <span className="text-sm font-mono font-bold">{player.elo_rating}</span>
                  <span className="text-xs text-muted-foreground">ELO</span>
                </div>
              )}
              {peakElo > 0 && peakElo >= currentElo && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/40 border border-border/50">
                  <TrendingUp className="size-3.5 text-yellow-500" />
                  <span className="text-sm font-mono font-bold text-yellow-500">{peakElo}</span>
                  <span className="text-xs text-muted-foreground">PEAK ELO</span>
                </div>
              )}
              {stats.setsPlayed > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/40 border border-border/50">
                  <span className="text-sm font-mono font-bold">{stats.winRate.toFixed(0)}%</span>
                  <span className="text-xs text-muted-foreground">win rate</span>
                  {stats.winRate >= 60 ? (
                    <TrendingUp className="size-3.5 text-win" />
                  ) : stats.winRate < 40 ? (
                    <TrendingDown className="size-3.5 text-loss" />
                  ) : (
                    <Minus className="size-3.5 text-muted-foreground/40" />
                  )}
                </div>
              )}
            </div>

            {tierProgress && (
              <div className="mt-4 max-w-sm">
                <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                  <span className="text-muted-foreground uppercase">{currentElo} / {tierProgress.nextElo} ELO</span>
                  <span className="text-primary font-bold uppercase">{tierProgress.nextLabel} TIER</span>
                </div>
                <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-700 rounded-full" 
                    style={{ width: `${Math.min(100, Math.max(0, ((currentElo - tierProgress.prevElo) / (tierProgress.nextElo - tierProgress.prevElo)) * 100))}%` }} 
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            label: "Sets Played",
            value: stats.setsPlayed,
            emoji: "🎯",
            gradient: "from-blue-500/20 via-blue-500/8 to-transparent",
            color: "text-blue-400",
            icon: <Target className="size-4" />,
          },
          {
            label: "Wins",
            value: stats.setsWon,
            emoji: "🏆",
            gradient: "from-win/20 via-win/8 to-transparent",
            color: "text-win",
            icon: <Trophy className="size-4" />,
          },
          {
            label: "Losses",
            value: stats.setsLost,
            emoji: "💔",
            gradient: "from-loss/20 via-loss/8 to-transparent",
            color: "text-loss",
            icon: <Shield className="size-4" />,
          },
          {
            label: "Win Rate",
            value: `${stats.winRate.toFixed(1)}%`,
            emoji: stats.winRate >= 60 ? "🔥" : stats.winRate >= 50 ? "⚡" : "📊",
            gradient: stats.winRate >= 60 ? "from-yellow-500/20 via-yellow-500/8 to-transparent" : "from-primary/20 via-primary/8 to-transparent",
            color: stats.winRate >= 60 ? "text-yellow-400" : "text-primary",
            icon: <Zap className="size-4" />,
          },
        ].map((s, i) => (
          <Card key={s.label} className="relative overflow-hidden border-border/50 hover:border-primary/20 transition-all duration-200">
            <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} pointer-events-none`} />
            <CardContent className="relative pt-4 pb-4 px-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{s.label}</p>
                <span className="text-base">{s.emoji}</span>
              </div>
              <p className={`text-3xl font-bold font-heading tabular-nums mt-1 ${s.color}`}>
                {s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best Partners */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <span className="text-lg">🤝</span>
              Best Partners
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {bestPartners.length > 0 ? (
                bestPartners.slice(0, 6).map((ps, i) => (
                  <div key={ps.partner.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/30 transition-colors group">
                    <div className={`size-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      i === 0 ? "bg-yellow-500/20 text-yellow-400" : "bg-primary/10 text-primary"
                    }`}>
                      {ps.partner.name.charAt(0).toUpperCase()}
                    </div>
                    <Link
                      href={`/players/${ps.partner.id}`}
                      className="text-sm font-medium hover:text-primary transition-colors flex-1 min-w-0 truncate"
                    >
                      {ps.partner.name}
                    </Link>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-win transition-all duration-700"
                          style={{ width: `${ps.winRate}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-muted-foreground tabular-nums w-9 text-right">
                        {ps.winRate.toFixed(0)}%
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs tabular-nums bg-muted/30 text-muted-foreground">
                      {ps.setsPlayed}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <span className="text-3xl">🤝</span>
                  <p className="text-sm text-muted-foreground mt-2">No partner data yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Toughest Opponents */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <span className="text-lg">⚔️</span>
              Toughest Opponents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {toughestOpponents.length > 0 ? (
                toughestOpponents.slice(0, 6).map((os, i) => (
                  <div key={os.opponent.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/30 transition-colors group">
                    <div className={`size-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      i === 0 ? "bg-loss/20 text-loss" : "bg-muted/30 text-muted-foreground"
                    }`}>
                      {os.opponent.name.charAt(0).toUpperCase()}
                    </div>
                    <Link
                      href={`/players/${os.opponent.id}`}
                      className="text-sm font-medium hover:text-primary transition-colors flex-1 min-w-0 truncate"
                    >
                      {os.opponent.name}
                    </Link>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-loss transition-all duration-700"
                          style={{ width: `${100 - os.winRate}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-muted-foreground tabular-nums w-9 text-right">
                        {os.winRate.toFixed(0)}%
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs tabular-nums bg-muted/30 text-muted-foreground">
                      {os.setsPlayed}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <span className="text-3xl">⚔️</span>
                  <p className="text-sm text-muted-foreground mt-2">No opponent data yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sets */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <span className="text-lg">📋</span>
            Recent Sets
            {recentSets.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs bg-muted/30">
                {recentSets.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {recentSets.length > 0 ? (
              recentSets.map((set, idx) => {
                let won = false;
                if (set.winning_pair_id === set.pair1_id) {
                  won = set.pair1?.player1_id === id || set.pair1?.player2_id === id;
                } else if (set.winning_pair_id === set.pair2_id) {
                  won = set.pair2?.player1_id === id || set.pair2?.player2_id === id;
                }

                let eloChange = null;
                if (set.pair1?.player1_id === id || set.pair1?.player2_id === id) {
                  eloChange = set.pair1_elo_change ?? (won ? 15 : -15);
                } else {
                  eloChange = set.pair2_elo_change ?? (won ? 15 : -15);
                }
                const eloChangeText = eloChange > 0 ? `+${eloChange}` : `${eloChange}`;

                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 sm:gap-3 p-3 rounded-xl border transition-colors ${
                      won
                        ? "bg-win/8 border-win/20 hover:bg-win/12"
                        : "bg-loss/8 border-loss/20 hover:bg-loss/12"
                    }`}
                  >
                    <div className={`flex items-center justify-center size-8 rounded-lg font-bold text-sm ${
                      won
                        ? "bg-win/20 text-win"
                        : "bg-loss/20 text-loss"
                    }`}>
                      {won ? "W" : "L"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm truncate">
                        <span className="font-medium">
                          {set.pair1?.player1?.name} & {set.pair1?.player2?.name}
                        </span>{" "}
                        <span className="text-muted-foreground text-xs">vs</span>{" "}
                        <span className="font-medium">
                          {set.pair2?.player1?.name} & {set.pair2?.player2?.name}
                        </span>
                      </p>
                    </div>
                    
                    <div className={`flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-lg font-mono text-xs font-bold ${
                      won ? "bg-win/10 text-win" : "bg-loss/10 text-loss"
                    }`}>
                      {eloChangeText} ELO
                    </div>

                    <div className={`flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-lg font-mono font-bold text-sm ${
                      won ? "bg-win/20 text-win" : "bg-loss/20 text-loss"
                    }`}>
                      {set.pair1_score} <span className="text-muted-foreground font-normal text-xs">–</span> {set.pair2_score}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <span className="text-4xl">🏸</span>
                <p className="text-sm text-muted-foreground mt-3">No sets recorded yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
