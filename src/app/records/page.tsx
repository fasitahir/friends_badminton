import { getMatchesWithDetails, getPlayers, isSupabaseConfigured } from "@/lib/data";
import { computeRecords } from "@/lib/analytics";
import { RecordsGrid } from "@/components/dashboard/records-grid";
import type { MatchWithDetails, Player } from "@/lib/supabase/types";

export const revalidate = 60;

export default async function RecordsPage() {
  const [players, matchesData] = await Promise.all([
    getPlayers(),
    getMatchesWithDetails(),
  ]);
  const records = computeRecords(
    (players ?? []) as Player[],
    (matchesData ?? []) as MatchWithDetails[]
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col">
        <h1 className="text-3xl font-heading tracking-tight uppercase sm:text-4xl">
          Records
        </h1>
        <div className="mt-1 flex items-center gap-4">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            All-time leaderboard
          </p>
          <div className="hidden h-px flex-1 bg-border sm:block" />
        </div>
      </div>

      {!isSupabaseConfigured() && (
        <div className="border border-amber-500/30 bg-amber-500/10 px-4 py-3 font-mono text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400">
          Demo mode · connect Supabase to load records
        </div>
      )}

      <RecordsGrid records={records} />
    </div>
  );
}
