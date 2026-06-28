"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LiveLeaderboard } from "@/components/dashboard/live-leaderboard";
import { MonthlyLeaderboard } from "@/components/dashboard/monthly-leaderboard";

interface LeaderboardTabsProps {
  players: any[];
  availableMonths: string[];
  initialMonth: string;
  initialEntries: any[];
  allTimeStats: any[];
}

export function LeaderboardTabs({
  players,
  availableMonths,
  initialMonth,
  initialEntries,
  allTimeStats,
}: LeaderboardTabsProps) {
  return (
    <Tabs defaultValue="winrate" className="w-full">
      <div className="flex items-center justify-between mb-4">
        <TabsList className="gap-2 p-1">
          <TabsTrigger value="winrate">🔥 Hot Streaks</TabsTrigger>
          <TabsTrigger 
            value="elo"
            className="relative overflow-hidden border border-yellow-500/50 text-yellow-700 dark:text-yellow-400 data-[state=active]:bg-yellow-500/10 data-[state=active]:text-yellow-800 dark:data-[state=active]:text-yellow-400 drop-shadow-sm dark:shadow-[0_0_15px_rgba(234,179,8,0.3)] animate-pulse hover:animate-none hover:drop-shadow-md dark:hover:shadow-[0_0_20px_rgba(234,179,8,0.5)] transition-all duration-500"
          >
            👑 Power Ranking
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="winrate" className="mt-0">
        <MonthlyLeaderboard
          availableMonths={availableMonths}
          initialMonth={initialMonth}
          initialEntries={initialEntries}
          allTimeStats={allTimeStats}
        />
      </TabsContent>

      <TabsContent value="elo" className="mt-0">
        <LiveLeaderboard players={players} />
      </TabsContent>
    </Tabs>
  );
}
