import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { Flame, Minus } from "lucide-react";

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
  availableMonths: string[];
  initialMonth: string;
  initialEntries: MonthlyEntry[];
  allTimeStats: AllTimeEntry[];
}

function formatMonthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function getRankStyle(idx: number) {
  if (idx === 0) return "font-heading text-4xl";
  if (idx === 1) return "font-heading text-3xl";
  if (idx === 2) return "font-heading text-2xl";
  return "font-mono text-sm text-muted-foreground";
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
    <div className="flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-4 border-b border-border mb-6">
        <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground">
          Monthly Win Rate
        </h2>

        {/* Month selector */}
        <Select value={selectedMonth} onValueChange={(val) => handleMonthChange(val ?? initialMonth)}>
          <SelectTrigger className="mt-4 sm:mt-0 h-8 text-xs font-mono uppercase w-44 bg-transparent border-border/50 rounded-none focus:ring-0 focus:border-foreground" id="leaderboard-month-select">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent className="rounded-none border-border font-mono text-xs uppercase">
            {availableMonths.map((m) => (
              <SelectItem key={m} value={m} className="rounded-none focus:bg-muted">
                {formatMonthLabel(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-0">
        {loading && (
          <div className="flex flex-col gap-0">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 border-b border-border bg-muted/10 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && displayedStats.length === 0 && (
          <div className="py-8 text-xs font-mono text-muted-foreground uppercase text-center">
            [ No Data for {formatMonthLabel(selectedMonth)} ]
          </div>
        )}

        {!loading && displayedStats.map((entry, idx) => {
          const allTime = allTimeStats.find((a) => a.id === entry.player_id);
          const isTopThree = idx < 3;
          const isRankOne = idx === 0;
          const isElite = entry.win_rate >= 65;

          // If allTime is available, we can use streaks. If not, default to false.
          const isOnFire = allTime ? (allTime as any).winStreak >= 3 : false;
          const isCold = allTime ? ((allTime as any).lossStreak >= 3 && (allTime as any).totalSets > 0 && idx !== 0) : false;

          return (
            <Link
              key={entry.player_id}
              href={`/players/${entry.player_id}`}
              className={`flex items-center gap-4 p-4 border-b border-border hover:bg-muted/30 transition-colors ${
                isElite ? "border-l-2 border-l-aviation-red pl-3" : "pl-4"
              } ${isRankOne ? "animate-glow-fire" : ""} ${
                isCold ? "opacity-70 animate-glow-cold" : ""
              }`}
            >
              {/* Rank */}
              <div className={`w-8 text-right shrink-0 ${getRankStyle(idx)} ${isElite ? 'font-bold text-foreground' : ''}`}>
                {idx + 1}.
              </div>

              {/* Name + win bar */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <p className={`text-base truncate ${isRankOne ? 'font-bold font-heading text-xl tracking-tight text-foreground' : isElite ? 'font-bold font-heading text-lg tracking-tight' : 'font-medium'}`}>
                    {entry.player?.name ?? entry.player_id}
                  </p>
                  {isOnFire && <Flame className="size-3.5 text-aviation-red fill-aviation-red" />}
                  {isCold && <Minus className="size-3.5 text-muted-foreground" />}
                </div>
                {isRankOne && (
                  <p className="text-[10px] font-mono text-muted-foreground uppercase mt-1 tracking-widest">
                    [MONTHLY LEADER]
                  </p>
                )}
                {isCold && (
                  <p className="text-[10px] font-mono text-muted-foreground uppercase mt-1 tracking-widest">
                    [NEEDS A WIN]
                  </p>
                )}
                
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-[2px] bg-border overflow-hidden">
                    <div
                      className={`h-full ${isElite ? 'bg-aviation-red' : 'bg-foreground'}`}
                      style={{ width: `${entry.win_rate}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-col items-end shrink-0 gap-1 w-20">
                <span className={`font-mono tabular-nums ${isRankOne ? 'text-3xl font-bold text-foreground' : isElite ? 'text-2xl font-bold' : 'text-xl'}`}>
                  {entry.win_rate.toFixed(0)}%
                </span>
                <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
                  {entry.sets_won}W / {entry.sets_lost}L
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
