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
