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
      <div className="flex flex-col">
        <h1 className="text-3xl sm:text-4xl font-heading tracking-tight uppercase mb-1">
          Sessions
        </h1>
        <div className="flex items-center gap-4">
          <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
            {sessionsWithCounts.length} sessions recorded
          </p>
          <div className="flex-1 h-px bg-border hidden sm:block" />
        </div>
      </div>
      <SessionList sessions={sessionsWithCounts} isAdmin={isAdmin} />
    </div>
  );
}
