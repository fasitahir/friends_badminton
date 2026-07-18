import { getPlayers } from "@/lib/data";
import { getSessions } from "@/lib/data";
import { getIsAdmin } from "@/lib/auth";
import { SchedulerClient } from "@/components/scheduler/scheduler-client";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Session Scheduler — Shuttle Stats",
  description: "Generate a fair, ELO-balanced doubles match schedule for today's session.",
};

export default async function SchedulerPage() {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) redirect("/login");

  const [players, sessions] = await Promise.all([getPlayers(), getSessions()]);

  return (
    <SchedulerClient
      allPlayers={players as any[]}
      sessions={sessions as any[]}
    />
  );
}
