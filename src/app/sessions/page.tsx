import { createClient } from "@/lib/supabase/server";
import { SessionList } from "@/components/sessions/session-list";
import { getIsAdmin } from "@/lib/auth";

export const metadata = {
  title: "Sessions — Shuttle Stats",
  description: "View and manage badminton sessions",
};

export default async function SessionsPage() {
  const supabase = await createClient();

  const [isAdmin, { data: sessions }, { data: matchCounts }] =
    await Promise.all([
      getIsAdmin(),
      supabase
        .from("sessions")
        .select("*")
        .order("date", { ascending: false }),
      supabase.from("matches").select("session_id"),
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
