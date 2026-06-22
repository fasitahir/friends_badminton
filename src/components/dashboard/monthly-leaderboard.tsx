"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

interface MonthlyEntry {
  player_id: string;
  sets_played: number;
  sets_won: number;
  sets_lost: number;
  win_rate: number;
  player: { id: string; name: string; nickname: string | null };
}

interface AllTimeEntry {
  id: string;
  name: string;
  played: number;
  won: number;
  winRate: number;
}

interface MonthlyLeaderboardProps {
  availableMonths: string[];       // ['2026-06', '2026-05', ...] with current month first
  initialMonth: string;            // current month (e.g. '2026-06')
  initialEntries: MonthlyEntry[];  // pre-computed live leaderboard for current month
  allTimeStats: AllTimeEntry[];    // pre-computed all-time stats for the total badge
}

function formatMonthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function MonthlyLeaderboard({
  availableMonths,
  initialMonth,
  initialEntries,
  allTimeStats,
}: MonthlyLeaderboardProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);
  const [entries, setEntries] = useState<MonthlyEntry[]>(initialEntries);
  const [loading, setLoading] = useState(false);

  async function handleMonthChange(val: string) {
    setSelectedMonth(val);
    setLoading(true);
    try {
      const res = await fetch(`/api/monthly-leaderboard?month=${val}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  const displayedStats = loading ? [] : entries.slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 text-primary">
              <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
            </svg>
            Leaderboard
          </CardTitle>

          {/* Month selector */}
          <Select value={selectedMonth} onValueChange={(val) => handleMonthChange(val ?? initialMonth)}>
            <SelectTrigger className="h-8 text-xs w-44" id="leaderboard-month-select">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((m) => (
                <SelectItem key={m} value={m}>
                  {formatMonthLabel(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="text-xs text-muted-foreground mt-1">
          Stats for <span className="text-foreground font-medium">
            {formatMonthLabel(selectedMonth)}
          </span> · All-time totals shown in parentheses
        </p>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-3">
          {loading && (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-9 rounded bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {!loading && displayedStats.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No games played yet in this period.
            </p>
          )}

          {!loading && displayedStats.map((entry, idx) => {
            const allTime = allTimeStats.find((a) => a.id === entry.player_id);
            return (
              <Link
                key={entry.player_id}
                href={`/players/${entry.player_id}`}
                className="flex items-center gap-3 group"
              >
                <span className="size-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold font-mono text-muted-foreground shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {entry.player?.name ?? entry.player_id}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${entry.win_rate}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground tabular-nums w-10 text-right">
                      {entry.win_rate.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {entry.sets_played} sets
                  </Badge>
                  {allTime && (
                    <span className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {allTime.played} total
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
