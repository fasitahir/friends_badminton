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
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🏸</span>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight gradient-text">
              Players
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Your badminton squad · {(players || []).length} athletes registered
          </p>
        </div>
      </div>
      <PlayerTable players={players || []} isAdmin={isAdmin} />
    </div>
  );
}
