import { getPlayers } from "@/lib/data";
import { PlayerTable } from "@/components/players/player-table";
import { getIsAdmin } from "@/lib/auth";

export const metadata = {
  title: "Players — Shuttle Stats",
  description: "Manage your badminton group players",
};

// ISR: revalidate every 60 s
export const revalidate = 60;

export default async function PlayersPage() {
  const [isAdmin, players] = await Promise.all([getIsAdmin(), getPlayers()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight">
          Players
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your badminton group roster
        </p>
      </div>
      <PlayerTable players={players || []} isAdmin={isAdmin} />
    </div>
  );
}
