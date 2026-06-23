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
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">📅</span>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight gradient-text">
              Sessions
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Track your badminton gatherings & matches · {sessionsWithCounts.length} sessions
          </p>
        </div>
      </div>
      <SessionList sessions={sessionsWithCounts} isAdmin={isAdmin} />
    </div>
  );
}
