import { createClient } from "@/lib/supabase/server";
import type { Player, MatchWithDetails } from "@/lib/supabase/types";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";

export const metadata = {
  title: "Analytics — Shuttle Stats",
  description: "Deep analytics for your badminton group",
};

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const [{ data: players }, { data: rawMatches }] = await Promise.all([
    supabase.from("players").select("*").order("name"),
    supabase
      .from("matches")
      .select(
        `*, team1:teams!matches_team1_id_fkey(*), team2:teams!matches_team2_id_fkey(*), winning_team:teams!matches_winning_team_id_fkey(*), games:match_games(*, pair1:pairs!match_games_pair1_id_fkey(*, player1:players!pairs_player1_id_fkey(*), player2:players!pairs_player2_id_fkey(*)), pair2:pairs!match_games_pair2_id_fkey(*, player1:players!pairs_player1_id_fkey(*), player2:players!pairs_player2_id_fkey(*)), winning_pair:pairs!match_games_winning_pair_id_fkey(*, player1:players!pairs_player1_id_fkey(*), player2:players!pairs_player2_id_fkey(*)))`
      )
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight">
          Analytics
        </h1>
        <p className="text-muted-foreground mt-1">
          Deep dive into performance, partnerships, and rivalries
        </p>
      </div>
      <AnalyticsDashboard
        players={(players || []) as Player[]}
        matches={(rawMatches || []) as unknown as MatchWithDetails[]}
      />
    </div>
  );
}
