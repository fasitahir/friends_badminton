import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Player, MatchWithDetails } from "@/lib/supabase/types";
import {
  computePlayerStats,
  computeBestPartners,
  computeToughestOpponents,
} from "@/lib/analytics";
import Link from "next/link";


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

  // Fetch all matches, then we will fetch games separately or joined
  const { data: matchesData } = await supabase
    .from("matches")
    .select(`*`)
    .order("created_at", { ascending: false });

  // Fetch games for these matches
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

  // Recent sets for this player
  const allSets = matches.flatMap(m => m.games);
  const recentSets = allSets.filter(
    (s) =>
      s.pair1?.player1_id === id ||
      s.pair1?.player2_id === id ||
      s.pair2?.player1_id === id ||
      s.pair2?.player2_id === id
  ).sort((a, b) => b.game_number - a.game_number).slice(0, 10); // basic sort

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <div className="size-14 sm:size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl sm:text-2xl shrink-0">
          {player.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight">
            {player.name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {player.nickname && (
              <span className="text-muted-foreground text-sm sm:text-base">&ldquo;{player.nickname}&rdquo;</span>
            )}
            <span className="text-sm font-semibold text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-md border font-mono">
              Elo: {player.elo_rating}
            </span>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Sets Played", value: stats.setsPlayed },
          { label: "Wins", value: stats.setsWon, color: "text-win" },
          { label: "Losses", value: stats.setsLost, color: "text-loss" },
          { label: "Win Rate", value: `${stats.winRate.toFixed(1)}%` },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                {s.label}
              </p>
              <p className={`text-3xl font-bold font-mono tabular-nums mt-1 ${s.color || ""}`}>
                {s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best Partners */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Best Partners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {bestPartners.length > 0 ? (
                bestPartners.slice(0, 6).map((ps) => (
                  <div key={ps.partner.id} className="flex items-center gap-3">
                    <Link
                      href={`/players/${ps.partner.id}`}
                      className="text-sm font-medium hover:text-primary transition-colors flex-1 min-w-0 truncate"
                    >
                      {ps.partner.name}
                    </Link>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-win"
                          style={{ width: `${ps.winRate}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono tabular-nums text-muted-foreground w-10 text-right">
                        {ps.winRate.toFixed(0)}%
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs tabular-nums">
                      {ps.setsPlayed}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No partner data yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Toughest Opponents */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Toughest Opponents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {toughestOpponents.length > 0 ? (
                toughestOpponents.slice(0, 6).map((os) => (
                  <div key={os.opponent.id} className="flex items-center gap-3">
                    <Link
                      href={`/players/${os.opponent.id}`}
                      className="text-sm font-medium hover:text-primary transition-colors flex-1 min-w-0 truncate"
                    >
                      {os.opponent.name}
                    </Link>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-loss"
                          style={{ width: `${100 - os.winRate}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono tabular-nums text-muted-foreground w-10 text-right">
                        {os.winRate.toFixed(0)}%
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs tabular-nums">
                      {os.setsPlayed}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No opponent data yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Recent Matches */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Sets</CardTitle>
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

                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-muted/50"
                  >
                    <Badge
                      variant="outline"
                      className={
                        won
                          ? "bg-win/15 text-win border-win/30"
                          : "bg-loss/15 text-loss border-loss/30"
                      }
                    >
                      {won ? "W" : "L"}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm truncate">
                        <span className="font-medium">
                          {set.pair1?.player1?.name} &amp; {set.pair1?.player2?.name}
                        </span>{" "}
                        <span className="text-muted-foreground">vs</span>{" "}
                        <span className="font-medium">
                          {set.pair2?.player1?.name} &amp; {set.pair2?.player2?.name}
                        </span>
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs font-mono tabular-nums shrink-0">
                      {set.pair1_score} - {set.pair2_score}
                    </Badge>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No sets recorded yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
