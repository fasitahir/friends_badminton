"use client";

import { Flame, Trophy } from "lucide-react";
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
        <TabsList className="gap-1 p-1">
          <TabsTrigger value="winrate" className="flex items-center gap-1.5">
            <Flame className="size-3.5" strokeWidth={1.5} />
            Hot Streaks
          </TabsTrigger>
          <TabsTrigger
            value="elo"
            className="flex items-center gap-1.5 border transition-colors duration-150"
            style={{
              borderColor: "color-mix(in oklch, var(--color-elo) 40%, transparent)",
              color: "var(--color-elo)",
            }}
          >
            <Trophy className="size-3.5" strokeWidth={1.5} />
            Power Ranking
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
