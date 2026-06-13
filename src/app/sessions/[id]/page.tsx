import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { SessionDetail } from "@/components/sessions/session-detail";
import { getIsAdmin } from "@/lib/auth";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("sessions")
    .select("name")
    .eq("id", id)
    .single();
  return {
    title: session ? `${session.name} — Shuttle Stats` : "Session Not Found",
  };
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const isAdmin = await getIsAdmin();

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (!session) notFound();

  // Fetch all related data
  const [
    { data: teams },
    { data: teamMembers },
    { data: pairs },
    { data: matches },
    { data: allPlayers },
    { data: matchGames },
  ] = await Promise.all([
    supabase.from("teams").select("*").eq("session_id", id),
    supabase
      .from("team_members")
      .select("*, player:players(*)")
      .in(
        "team_id",
        (await supabase.from("teams").select("id").eq("session_id", id)).data?.map((t) => t.id) || []
      ),
    supabase
      .from("pairs")
      .select("*, player1:players!pairs_player1_id_fkey(*), player2:players!pairs_player2_id_fkey(*)")
      .eq("session_id", id),
    supabase
      .from("matches")
      .select(
        "*, team1:teams!matches_team1_id_fkey(*), team2:teams!matches_team2_id_fkey(*), winning_team:teams!matches_winning_team_id_fkey(*)"
      )
      .eq("session_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("players").select("*").order("name"),
    supabase
      .from("match_games")
      .select(`
        *,
        pair1:pairs!match_games_pair1_id_fkey(*, player1:players!pairs_player1_id_fkey(*), player2:players!pairs_player2_id_fkey(*)),
        pair2:pairs!match_games_pair2_id_fkey(*, player1:players!pairs_player1_id_fkey(*), player2:players!pairs_player2_id_fkey(*)),
        winning_pair:pairs!match_games_winning_pair_id_fkey(*, player1:players!pairs_player1_id_fkey(*), player2:players!pairs_player2_id_fkey(*))
      `)
      .in(
        "match_id",
        (await supabase.from("matches").select("id").eq("session_id", id)).data?.map((m) => m.id) || []
      )
      .order("game_number"),
  ]);

  // Group team members by team
  const teamsWithMembers = (teams || []).map((team) => ({
    ...team,
    members: (teamMembers || [])
      .filter((tm) => tm.team_id === team.id)
      .map((tm) => tm.player),
  }));

  // Attach games to matches
  const matchesWithGames = (matches || []).map((match) => ({
    ...match,
    games: (matchGames || []).filter((g) => g.match_id === match.id),
  }));

  return (
    <SessionDetail
      session={session}
      teams={teamsWithMembers}
      pairs={pairs || []}
      matches={matchesWithGames}
      allPlayers={allPlayers || []}
      isAdmin={isAdmin}
    />
  );
}
