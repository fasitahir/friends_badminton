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
import { Flame, Snowflake } from "lucide-react";
import { getEloTier } from "@/lib/elo";

/**
 * C3 fix: rank column no longer has a fixed `w-8` — it uses responsive sizing.
 * The rank numeral font now scales responsively (not 4xl on a 32px wide column).
 */
function getRankStyle(idx: number) {
  if (idx === 0) return "font-heading text-2xl sm:text-4xl";
  if (idx === 1) return "font-heading text-xl sm:text-3xl";
  if (idx === 2) return "font-heading text-lg sm:text-2xl";
  return "font-mono text-sm text-muted-foreground";
}

export function LiveLeaderboard({ players }: { players: any[] }) {
  const sortedPlayers = [...players]
    .filter(p => p.elo_rating && !p.has_left)
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

          const isOnFire = player.winStreak >= 3;
          const isCold = player.lossStreak >= 3 && player.totalSets > 0 && idx !== 0;

          return (
            <Link
              key={player.id}
              href={`/players/${player.id}`}
              className={`relative flex items-center gap-2 sm:gap-4 p-3 sm:p-4 border-b border-border hover:bg-muted/30 transition-colors pl-4 ${
                isRankOne ? "animate-glow-fire" : ""
              } ${isCold ? "animate-glow-cold" : ""}`}
            >
              {/* C4 fix: left accent is absolute, decoupled from padding — uniform pl-4 on all rows */}
              {isElite && (
                <span className="absolute left-0 inset-y-0 w-0.5 bg-aviation-red" />
              )}

              {/* C3 fix: rank col uses responsive widths; font scales via getRankStyle */}
              <div className={`w-6 sm:w-9 text-right shrink-0 ${getRankStyle(idx)} ${isElite ? "font-bold text-foreground" : ""}`}>
                {idx + 1}.
              </div>

              {/* Name & nickname */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <p className={`truncate ${isRankOne ? "font-bold font-heading text-lg sm:text-xl tracking-tight text-foreground" : isElite ? "font-bold font-heading text-base sm:text-lg tracking-tight" : "font-medium text-sm sm:text-base"}`}>
                    {player.name}
                  </p>
                  {/* M4 fix: minimum text-[10px] for badge to survive font scaling */}
                  <span className={`text-[10px] font-mono tracking-wider border border-current/30 px-1.5 py-0.5 rounded-none uppercase shrink-0 ${getEloTier(player.elo_rating).color}`}>
                    {getEloTier(player.elo_rating).label}
                  </span>
                  {isOnFire && (
                    <span className="inline-flex items-center gap-0.5 text-aviation-red font-bold text-xs shrink-0">
                      <Flame className="size-3 sm:size-3.5 fill-aviation-red" />
                      <span className="font-mono text-[10px]">{player.winStreak}</span>
                    </span>
                  )}
                  {/* m3 fix: cold colour now uses the --cold-stripe token */}
                  {isCold && (
                    <span
                      className="inline-flex items-center gap-0.5 font-bold text-xs shrink-0"
                      style={{ color: "var(--cold-stripe)" }}
                    >
                      <Snowflake
                        className="size-3 sm:size-3.5"
                        style={{ fill: "color-mix(in oklch, var(--cold-stripe) 20%, transparent)" }}
                      />
                      <span className="font-mono text-[10px]">{player.lossStreak}</span>
                    </span>
                  )}
                </div>
                {player.nickname && (
                  <p className="text-xs font-mono text-muted-foreground uppercase truncate">
                    {player.nickname}
                  </p>
                )}
                {isRankOne && (
                  <p className="text-[10px] font-mono text-muted-foreground uppercase mt-1 tracking-widest">
                    Defending #1
                  </p>
                )}
              </div>

              {/* Sparkline — hidden on mobile to save space (M3 fix) */}
              <div className="hidden sm:block shrink-0 px-2">
                <Sparkline data={player.sparkline} />
              </div>

              {/* M3 fix: ELO column narrowed on mobile */}
              <div className="flex flex-col items-end shrink-0 gap-1 w-14 sm:w-20">
                <span className={`font-mono tabular-nums ${isRankOne ? "text-2xl sm:text-3xl font-bold text-foreground" : isElite ? "text-xl sm:text-2xl font-bold" : "text-lg sm:text-xl"}`}>
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
