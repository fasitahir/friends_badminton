"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EloTrend } from "./elo-trend";
import { Sparkline } from "./sparkline";
import { Flame, TrendingDown, Minus } from "lucide-react";

function getRankStyle(idx: number) {
  if (idx === 0) return "font-heading text-4xl";
  if (idx === 1) return "font-heading text-3xl";
  if (idx === 2) return "font-heading text-2xl";
  return "font-mono text-sm text-muted-foreground";
}

export function LiveLeaderboard({ players }: { players: any[] }) {
  const sortedPlayers = [...players]
    .filter(p => p.elo_rating)
    .sort((a, b) => b.elo_rating - a.elo_rating)
    .slice(0, 10);

  const avgElo =
    sortedPlayers.length > 0
      ? sortedPlayers.reduce((s, p) => s + p.elo_rating, 0) / sortedPlayers.length
      : 600;

  return (
    <div className="flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-4 border-b border-border mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground">
            All-Time Elo Leaderboard
          </h2>
          <Dialog>
            <DialogTrigger render={
              <button className="text-muted-foreground hover:text-foreground cursor-pointer flex items-center transition-colors">
                <span className="font-mono text-[10px] border border-border px-1 uppercase">[?]</span>
              </button>
            } />
            <DialogContent className="max-w-md bg-background border border-border rounded-none shadow-none">
              <DialogHeader>
                <DialogTitle className="font-heading uppercase tracking-widest text-lg">
                  Elo Parameters
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm font-mono text-muted-foreground mt-4">
                <div className="flex justify-between border-b border-border pb-2">
                  <span>BASE_RATING</span>
                  <span className="text-foreground">600</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span>K_FACTOR_MAX</span>
                  <span className="text-foreground">24</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span>BEATING_STRONGER_DELTA</span>
                  <span className="text-foreground">+13 TO +23</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span>BEATING_WEAKER_DELTA</span>
                  <span className="text-foreground">+1 TO +11</span>
                </div>
                <p className="mt-4 text-xs leading-relaxed uppercase">
                  Rating changes are calculated per set. Dynamic rollback applies to altered historical data.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-xs font-mono text-muted-foreground mt-2 sm:mt-0 uppercase">
          SYS_AVG: <span className="text-foreground">{avgElo.toFixed(0)}</span>
        </p>
      </div>

      <div className="flex flex-col gap-0">
        {sortedPlayers.length === 0 && (
          <div className="py-8 text-xs font-mono text-muted-foreground uppercase text-center">
            [ No Signal ]
          </div>
        )}

        {sortedPlayers.map((player, idx) => {
          const isTopThree = idx < 3;
          const isRankOne = idx === 0;
          const isElite = player.elo_rating >= 700;
          
          // Streaks
          const isOnFire = player.winStreak >= 3;
          const isCold = player.lossStreak >= 3 && player.totalSets > 0 && idx !== 0; // rank 1 can't be "cold" stylistically

          return (
            <Link
              key={player.id}
              href={`/players/${player.id}`}
              className={`flex items-center gap-4 p-4 border-b border-border hover:bg-muted/30 transition-colors ${
                isElite ? "border-l-2 border-l-aviation-red pl-3" : "pl-4"
              } ${isRankOne ? "shadow-[-4px_0_12px_rgba(230,25,25,0.15)] animate-pulse" : ""} ${
                isCold ? "opacity-70" : ""
              }`}
            >
              {/* Rank typographic */}
              <div className={`w-8 text-right shrink-0 ${getRankStyle(idx)} ${isElite ? 'font-bold text-foreground' : ''}`}>
                {idx + 1}.
              </div>

              {/* Name & nickname */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <p className={`text-base truncate ${isRankOne ? 'font-bold font-heading text-xl tracking-tight text-foreground' : isElite ? 'font-bold font-heading text-lg tracking-tight' : 'font-medium'}`}>
                    {player.name}
                  </p>
                  {isOnFire && <Flame className="size-3.5 text-aviation-red fill-aviation-red" />}
                  {isCold && <Minus className="size-3.5 text-muted-foreground" />}
                </div>
                {player.nickname && (
                  <p className="text-xs font-mono text-muted-foreground uppercase truncate">
                    {player.nickname}
                  </p>
                )}
                {isRankOne && (
                  <p className="text-[10px] font-mono text-muted-foreground uppercase mt-1 tracking-widest">
                    [DEFENDING #1]
                  </p>
                )}
                {isCold && (
                  <p className="text-[10px] font-mono text-muted-foreground uppercase mt-1 tracking-widest">
                    [NEEDS A WIN]
                  </p>
                )}
              </div>

              {/* Sparkline */}
              <div className="hidden sm:block shrink-0 px-2">
                <Sparkline data={player.sparkline} />
              </div>

              {/* ELO + trend */}
              <div className="flex flex-col items-end shrink-0 gap-1 w-20">
                <span className={`font-mono tabular-nums ${isRankOne ? 'text-3xl font-bold text-foreground' : isElite ? 'text-2xl font-bold' : 'text-xl'}`}>
                  {player.elo_rating}
                </span>
                <EloTrend elo={player.elo_rating} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
