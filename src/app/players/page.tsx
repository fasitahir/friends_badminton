import { createClient } from "@/lib/supabase/server";
import { PlayerTable } from "@/components/players/player-table";

export const metadata = {
  title: "Players — Shuttle Stats",
  description: "Manage your badminton group players",
};

export default async function PlayersPage() {
  const supabase = await createClient();
  const { data: players } = await supabase
    .from("players")
    .select("*")
    .order("name");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">
          Players
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your badminton group roster
        </p>
      </div>
      <PlayerTable players={players || []} />
    </div>
  );
}
