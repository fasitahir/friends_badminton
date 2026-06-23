import { getPlayers, getMatchesWithDetails } from "@/lib/data";
import { PlayerTable } from "@/components/players/player-table";
import { getIsAdmin } from "@/lib/auth";

export const metadata = {
  title: "Players — Shuttle Stats",
  description: "Manage your badminton group players",
};

// ISR: revalidate every 60 s
export const revalidate = 60;

export default async function PlayersPage() {
  const [isAdmin, players, matchesData] = await Promise.all([
    getIsAdmin(),
    getPlayers(),
    getMatchesWithDetails(),
  ]);

  const matches = (matchesData || []) as any[];

  // Compute streaks, sparkline (last 10 Elo), and set stats for each player
  const enrichedPlayers = (players ?? []).map((player) => {
    let wStreak = 0;
    let lStreak = 0;
    let streakActive = true;
    let sparkline = [player.elo_rating];
    let currentElo = player.elo_rating;
    let totalSets = 0;
    let setsWon = 0;
    let setsLost = 0;

    for (const m of matches) {
      for (const g of m.games || []) {
        const inP1 = g.pair1?.player1_id === player.id || g.pair1?.player2_id === player.id;
        const inP2 = g.pair2?.player1_id === player.id || g.pair2?.player2_id === player.id;
        if (inP1 || inP2) {
          totalSets++;
          const wonSet = g.winning_pair_id === (inP1 ? g.pair1_id : g.pair2_id);
          if (wonSet) setsWon++;
          else setsLost++;

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
      setsWon,
      setsLost,
      winRate: totalSets > 0 ? (setsWon / totalSets) * 100 : 0,
      sparkline,
    };
  });

  return (
    <div className="flex flex-col gap-10">
      {/* Header Panel */}
      <div className="flex flex-col">
        <h1 className="text-3xl sm:text-4xl font-heading tracking-tight uppercase mb-1">
          Players
        </h1>
        <div className="flex items-center gap-4">
          <p className="text-muted-foreground font-mono text-sm tracking-widest uppercase">
            [Squad Registry: {enrichedPlayers.length} Active]
          </p>
          <div className="flex-1 h-px bg-border hidden sm:block" />
        </div>
      </div>

      <PlayerTable players={enrichedPlayers} isAdmin={isAdmin} />
    </div>
  );
}
