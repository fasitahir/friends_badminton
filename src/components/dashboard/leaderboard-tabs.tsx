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
        <TabsList>
          <TabsTrigger value="winrate">Monthly Win Rate</TabsTrigger>
          <TabsTrigger value="elo">All-Time Elo</TabsTrigger>
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
