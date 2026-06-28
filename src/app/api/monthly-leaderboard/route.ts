import { NextRequest, NextResponse } from "next/server";
import { getMonthlyLeaderboard, getPlayers, getMatchesWithDetails } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // If requesting the current month, compute it dynamically (live)
  if (month === currentMonthStr) {
    const [players, matchesData] = await Promise.all([
      getPlayers(),
      getMatchesWithDetails(),
    ]);

    const matches = (matchesData || []) as any[];

    const liveEntries = (players ?? [])
      .map((player) => {
        let played = 0;
        let won = 0;
        let lost = 0;
        for (const m of matches) {
          if (m.created_at && m.created_at.startsWith(month)) {
            for (const g of m.games || []) {
              const inP1 =
                g.pair1?.player1_id === player.id ||
                g.pair1?.player2_id === player.id;
              const inP2 =
                g.pair2?.player1_id === player.id ||
                g.pair2?.player2_id === player.id;
              if (inP1 || inP2) {
                played++;
                const wonSet =
                  g.winning_pair_id === (inP1 ? g.pair1_id : g.pair2_id);
                if (wonSet) {
                  won++;
                } else {
                  lost++;
                }
              }
            }
          }
        }
        return {
          player_id: player.id,
          sets_played: played,
          sets_won: won,
          sets_lost: lost,
          win_rate: played > 0 ? (won / played) * 100 : 0,
          player: {
            id: player.id,
            name: player.name,
            nickname: player.nickname || null,
            elo_rating: player.elo_rating,
          },
        };
      })
      .filter((entry) => entry.sets_played > 0)
      .sort((a, b) => b.win_rate - a.win_rate || b.sets_won - a.sets_won);

    return NextResponse.json(liveEntries);
  }

  // Otherwise, load from saved snapshot
  const data = await getMonthlyLeaderboard(month);
  return NextResponse.json(data);
}
