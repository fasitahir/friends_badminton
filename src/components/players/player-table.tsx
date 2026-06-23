"use client";

import { useState } from "react";
import NextLink from "next/link";
import type { Player } from "@/lib/supabase/types";
import { createPlayer, updatePlayer, deletePlayer } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Flame } from "lucide-react";
import { EloTrend } from "@/components/dashboard/elo-trend";
import { Sparkline } from "@/components/dashboard/sparkline";
import { cn } from "@/lib/utils";

interface EnrichedPlayer extends Player {
  winStreak: number;
  lossStreak: number;
  totalSets: number;
  setsWon: number;
  setsLost: number;
  winRate: number;
  sparkline: number[];
}

function getRankStyle(idx: number) {
  if (idx === 0) return "font-heading text-2xl text-foreground font-bold";
  if (idx === 1) return "font-heading text-xl text-foreground/90 font-semibold";
  if (idx === 2) return "font-heading text-lg text-foreground/80 font-medium";
  return "font-mono text-sm text-muted-foreground";
}

function getEloTier(elo: number | null | undefined) {
  if (!elo) return { label: "UNRANKED", color: "text-muted-foreground border-muted-foreground/30 bg-muted-foreground/5" };
  if (elo >= 700) return { label: "ELITE", color: "text-aviation-red border-aviation-red/30 bg-aviation-red/5 font-bold" };
  if (elo >= 650) return { label: "ADVANCED", color: "text-foreground border-foreground/30 bg-foreground/5" };
  if (elo >= 600) return { label: "INTERMEDIATE", color: "text-muted-foreground border-muted-foreground/50 bg-muted/5" };
  return { label: "BEGINNER", color: "text-muted-foreground border-muted-foreground/30 bg-muted/3" };
}

function PlayerForm({
  player,
  onClose,
}: {
  player?: Player;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = player
      ? await updatePlayer(player.id, formData)
      : await createPlayer(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onClose();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={player?.name}
          placeholder="ENTER PLAYER NAME"
          required
          className="bg-transparent border border-border rounded-none focus:border-foreground focus:ring-0 text-sm font-mono uppercase h-10 px-3"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="nickname" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Nickname</Label>
        <Input
          id="nickname"
          name="nickname"
          defaultValue={player?.nickname || ""}
          placeholder="E.G. THE SMASHER (OPTIONAL)"
          className="bg-transparent border border-border rounded-none focus:border-foreground focus:ring-0 text-sm font-mono uppercase h-10 px-3"
        />
      </div>
      {error && (
        <p className="text-xs font-mono text-red-500 bg-red-950/20 border border-red-900/30 px-3 py-2 rounded-none uppercase">{error}</p>
      )}
      <Button
        type="submit"
        disabled={loading}
        className="mt-2 rounded-none border border-border bg-transparent hover:bg-muted text-foreground transition-colors font-mono text-xs uppercase h-10 cursor-pointer"
      >
        {loading ? "SAVING..." : player ? "UPDATE PLAYER" : "ADD PLAYER"}
      </Button>
    </form>
  );
}

export function PlayerTable({ players, isAdmin }: { players: EnrichedPlayer[], isAdmin?: boolean }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editPlayer, setEditPlayer] = useState<Player | null>(null);

  // Sort players by elo rating
  const sortedPlayers = [...players].sort((a, b) => (b.elo_rating ?? 0) - (a.elo_rating ?? 0));

  return (
    <div className="flex flex-col gap-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={
              <Button className="rounded-none border border-border bg-transparent hover:bg-muted text-foreground transition-colors font-mono text-xs uppercase h-9 px-4 cursor-pointer">
                + ADD PLAYER
              </Button>
            } />
            <DialogContent className="rounded-none border border-border bg-background shadow-none max-w-md">
              <DialogHeader>
                <DialogTitle className="font-heading uppercase tracking-widest text-lg">
                  Add New Player
                </DialogTitle>
              </DialogHeader>
              <PlayerForm onClose={() => setCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editPlayer} onOpenChange={(open) => !open && setEditPlayer(null)}>
        <DialogContent className="rounded-none border border-border bg-background shadow-none max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase tracking-widest text-lg">
              Edit Player
            </DialogTitle>
          </DialogHeader>
          {editPlayer && (
            <PlayerForm
              player={editPlayer}
              onClose={() => setEditPlayer(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Player Instrument Panel List */}
      <div className="flex flex-col">
        {/* Table Header Row */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-border text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">
          <div className="w-8 text-right shrink-0">RNK</div>
          <div className="flex-1">PLAYER</div>
          <div className="hidden sm:block w-36 shrink-0 text-center">SPARKLINE</div>
          <div className="hidden md:block w-32 shrink-0 text-right">SETS RECORD</div>
          <div className="hidden sm:block w-24 shrink-0 text-right">WIN RATE</div>
          <div className="w-20 shrink-0 text-right">ELO</div>
          {isAdmin && <div className="w-28 shrink-0 text-right">ACTIONS</div>}
        </div>

        {/* Rows */}
        {sortedPlayers.map((player, idx) => {
          const tier = getEloTier(player.elo_rating);
          const rank = idx + 1;
          const isOnFire = player.winStreak >= 3;
          const isCold = player.lossStreak >= 3 && player.totalSets > 0 && idx !== 0;
          const isRankOne = idx === 0;
          const isElite = player.elo_rating && player.elo_rating >= 700;

          return (
            <div
              key={player.id}
              className={cn(
                "flex items-center gap-4 py-4 border-b border-border hover:bg-muted/15 transition-colors",
                isElite ? "border-l-2 border-l-aviation-red pl-3" : "pl-4",
                isRankOne ? "animate-glow-fire" : "",
                isCold ? "opacity-70 animate-glow-cold" : "pr-4"
              )}
            >
              {/* Rank */}
              <div className={cn("w-8 text-right shrink-0", getRankStyle(idx))}>
                {rank}.
              </div>

              {/* Name, Nickname & Status */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-2 flex-wrap">
                  <NextLink
                    href={`/players/${player.id}`}
                    className={cn(
                      "font-heading hover:text-primary transition-colors truncate",
                      isRankOne
                        ? "font-bold text-xl tracking-tight text-foreground"
                        : isElite
                          ? "font-bold text-lg tracking-tight"
                          : "font-medium text-base"
                    )}
                  >
                    {player.name}
                  </NextLink>
                  <span className={cn("text-[9px] font-mono tracking-wider border px-1.5 py-0.5 shrink-0 rounded-none uppercase", tier.color)}>
                    {tier.label}
                  </span>
                  {isOnFire && <Flame className="size-3.5 text-aviation-red fill-aviation-red shrink-0" />}
                  {isCold && <Minus className="size-3.5 text-muted-foreground shrink-0" />}
                </div>

                {/* Sub-details */}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {player.nickname && (
                    <span className="text-[10px] font-mono text-muted-foreground uppercase truncate">
                      "{player.nickname}"
                    </span>
                  )}
                  {isRankOne && (
                    <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                      [DEFENDING #1]
                    </span>
                  )}
                  {isCold && (
                    <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                      [NEEDS A WIN]
                    </span>
                  )}
                </div>
              </div>

              {/* Sparkline */}
              <div className="hidden sm:block w-36 shrink-0 flex justify-center">
                <Sparkline data={player.sparkline} />
              </div>

              {/* Sets Record */}
              <div className="hidden md:flex flex-col items-end w-32 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                <span className="text-foreground">{player.totalSets} SETS</span>
                <span>{player.setsWon}W / {player.setsLost}L</span>
              </div>

              {/* Win Rate */}
              <div className="hidden sm:flex flex-col items-end w-24 shrink-0 font-mono text-sm tabular-nums text-foreground">
                {player.winRate.toFixed(1)}%
              </div>

              {/* ELO Rating */}
              <div className="flex flex-col items-end w-20 shrink-0 gap-1">
                <span className={cn(
                  "font-mono tabular-nums text-foreground",
                  isRankOne ? "text-2xl font-bold" : isElite ? "text-xl font-bold" : "text-base"
                )}>
                  {player.elo_rating || "—"}
                </span>
                {player.elo_rating && <EloTrend elo={player.elo_rating} />}
              </div>

              {/* Admin Actions */}
              {isAdmin && (
                <div className="w-28 shrink-0 flex items-center justify-end gap-2 pr-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditPlayer(player)}
                    className="h-7 w-12 rounded-none border border-border bg-transparent hover:bg-muted text-foreground transition-colors font-mono text-[10px] uppercase cursor-pointer"
                  >
                    EDIT
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger render={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-12 rounded-none border border-red-900/30 bg-transparent text-red-500/80 hover:bg-red-950/20 hover:text-red-400 hover:border-red-500/50 transition-colors font-mono text-[10px] uppercase cursor-pointer"
                      >
                        DEL
                      </Button>
                    } />
                    <AlertDialogContent className="rounded-none border border-border bg-background shadow-none max-w-md">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-heading uppercase tracking-widest text-lg">
                          Delete {player.name}?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="font-mono text-xs uppercase text-muted-foreground mt-2 leading-relaxed">
                          This will permanently delete this player and all their match history. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="mt-4 gap-2">
                        <AlertDialogCancel className="rounded-none border border-border bg-transparent hover:bg-muted text-foreground transition-colors font-mono text-xs uppercase cursor-pointer">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deletePlayer(player.id)}
                          className="rounded-none bg-red-950/20 border border-red-900/30 text-red-500/80 hover:bg-red-950/40 hover:text-red-400 hover:border-red-500/50 transition-colors font-mono text-xs uppercase cursor-pointer"
                        >
                          Delete Player
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          );
        })}

        {players.length === 0 && (
          <div className="py-16 text-center border-b border-border">
            <span className="text-5xl">🏸</span>
            <p className="text-muted-foreground mt-4 font-mono text-sm uppercase tracking-wider">No players registered.</p>
          </div>
        )}
      </div>
    </div>
  );
}
