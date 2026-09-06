import { getPlayers, getAnalyticsMatches } from "@/lib/data";
import type { Player, MatchWithDetails } from "@/lib/supabase/types";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";

export const metadata = {
  title: "Analytics — Shuttle Stats",
  description: "Deep analytics for your badminton group",
};

// ISR: revalidate every 60 s (purged immediately on mutations via cache tags)
export const revalidate = 60;

export default async function AnalyticsPage() {
  const [players, rawMatches] = await Promise.all([
    getPlayers(),
    getAnalyticsMatches(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col">
        <h1 className="text-3xl sm:text-4xl font-heading tracking-tight uppercase mb-1">
          Analytics
        </h1>
        <div className="flex items-center gap-4">
          <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
            Performance, partnerships &amp; rivalries
          </p>
          <div className="flex-1 h-px bg-border hidden sm:block" />
        </div>
      </div>
      <AnalyticsDashboard
        players={(players || []) as Player[]}
        matches={(rawMatches || []) as unknown as MatchWithDetails[]}
      />
    </div>
  );
}
