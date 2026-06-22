import { getSessions, getMatchCounts } from "@/lib/data";
import { SessionList } from "@/components/sessions/session-list";
import { getIsAdmin } from "@/lib/auth";

export const metadata = {
  title: "Sessions — Shuttle Stats",
  description: "View and manage badminton sessions",
};

// ISR: serve from cache, revalidate every 60 s
export const revalidate = 60;

export default async function SessionsPage() {
  const [isAdmin, sessions, matchCounts] = await Promise.all([
    getIsAdmin(),
    getSessions(),
    getMatchCounts(),
  ]);

  const countMap: Record<string, number> = {};
  for (const m of matchCounts || []) {
    countMap[m.session_id] = (countMap[m.session_id] || 0) + 1;
  }

  const sessionsWithCounts = (sessions || []).map((s) => ({
    ...s,
    matchCount: countMap[s.id] || 0,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight">
          Sessions
        </h1>
        <p className="text-muted-foreground mt-1">
          Track your badminton gatherings and matches
        </p>
      </div>
      <SessionList sessions={sessionsWithCounts} isAdmin={isAdmin} />
    </div>
  );
}
