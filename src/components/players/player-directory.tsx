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
import { Minus, Flame, Search, Snowflake } from "lucide-react";
import { EloTrend } from "@/components/dashboard/elo-trend";
import { Sparkline } from "@/components/dashboard/sparkline";
import { cn } from "@/lib/utils";
import { getEloTier } from "@/lib/elo";

interface EnrichedPlayer extends Player {
  winStreak: number;
  lossStreak: number;
  totalSets: number;
  setsWon: number;
  setsLost: number;
  winRate: number;
  sparkline: number[];
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
      <div className="flex items-center gap-2 mt-1">
        <input
          type="checkbox"
          id="is_temporary"
          name="is_temporary"
          defaultChecked={(player as any)?.is_temporary}
          className="rounded-none border-border bg-transparent text-foreground focus:ring-0 size-4"
        />
        <Label htmlFor="is_temporary" className="font-mono text-xs uppercase text-muted-foreground cursor-pointer">
          Temporary / Guest Player (Hide from Leaderboard)
        </Label>
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

export function PlayerDirectory({ players, isAdmin }: { players: EnrichedPlayer[], isAdmin?: boolean }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editPlayer, setEditPlayer] = useState<Player | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Sort players alphabetically by name
  const sortedPlayers = [...players].sort((a, b) => a.name.localeCompare(b.name));

  // Filter players based on search query
  const filteredPlayers = sortedPlayers.filter(
    (player) =>
      player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (player.nickname && player.nickname.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Search & Actions Panel */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="SEARCH PLAYERS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-transparent border border-border rounded-none focus:border-foreground focus:ring-0 text-sm font-mono uppercase h-9 w-full"
          />
        </div>

        {isAdmin && (
          <div className="flex shrink-0 w-full sm:w-auto justify-end">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger render={
                <Button className="w-full sm:w-auto rounded-none border border-border bg-transparent hover:bg-muted text-foreground transition-colors font-mono text-xs uppercase h-9 px-4 cursor-pointer">
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
      </div>

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

      {/* Player Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlayers.map((player) => {
          const tier = getEloTier(player.elo_rating);
          const isOnFire = player.winStreak >= 3;
          const isCold = player.lossStreak >= 3 && player.totalSets > 0;
          const isElite = player.elo_rating && player.elo_rating >= 700;

          return (
            <div
              key={player.id}
              className={cn(
                "flex flex-col justify-between border border-border p-4 bg-muted/5 hover:bg-muted/10 hover:border-foreground/30 transition-all gap-4 relative",
                isElite ? "border-l-2 border-l-aviation-red" : "",
                isOnFire ? "shadow-[0_0_10px_rgba(224,86,36,0.1)] animate-glow-fire" : "",
                isCold ? "border-l-2 border-l-sky-400 shadow-[0_0_10px_rgba(14,165,233,0.15)] animate-glow-cold" : ""
              )}
            >
              {/* Card Top section */}
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Initials Avatar */}
                    <div className="size-10 bg-muted/20 border border-border/80 flex items-center justify-center font-heading font-bold text-lg text-foreground shrink-0 uppercase">
                      {player.name.charAt(0)}
                    </div>
                    {/* Name & Nickname */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <NextLink
                          href={`/players/${player.id}`}
                          className={cn(
                            "font-heading hover:text-primary transition-colors text-base font-bold uppercase truncate",
                            isElite ? "text-foreground" : "text-foreground/90"
                          )}
                        >
                          {player.name}
                        </NextLink>
                        {isOnFire && (
                          <span className="inline-flex items-center gap-0.5 text-aviation-red font-bold text-xs shrink-0">
                            <Flame className="size-3.5 fill-aviation-red animate-pulse" />
                            <span className="font-mono text-[10px]">{player.winStreak}</span>
                          </span>
                        )}
                        {isCold && (
                          <span className="inline-flex items-center gap-0.5 text-sky-400 font-bold text-xs shrink-0">
                            <Snowflake className="size-3.5 fill-sky-400/20 animate-pulse" />
                            <span className="font-mono text-[10px]">{player.lossStreak}</span>
                          </span>
                        )}
                      </div>
                      {player.nickname && (
                        <p className="text-[10px] font-mono text-muted-foreground uppercase truncate mt-0.5">
                          "{player.nickname}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ELO Display */}
                  <div className="text-right shrink-0 flex flex-col items-end">
                    <span className="font-mono text-base font-bold text-foreground">
                      {player.elo_rating || "—"}
                    </span>
                    {player.elo_rating && <EloTrend elo={player.elo_rating} />}
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("text-[9px] font-mono tracking-wider border px-1.5 py-0.5 rounded-none uppercase", tier.color, tier.bg)}>
                    {tier.emoji} {tier.label}
                  </span>
                  {(player as any).is_temporary && (
                    <span className="text-[9px] font-mono text-orange-400 uppercase tracking-wider border border-orange-400/30 bg-orange-500/5 px-1.5 py-0.5">
                      GUEST
                    </span>
                  )}
                  {isOnFire && (
                    <span className="text-[9px] font-mono text-aviation-red uppercase tracking-wider border border-aviation-red/20 bg-aviation-red/5 px-1.5 py-0.5">
                      On Fire
                    </span>
                  )}
                  {isCold && (
                    <span className="text-[9px] font-mono text-sky-400 uppercase tracking-wider border border-sky-400/30 bg-sky-500/5 px-1.5 py-0.5 animate-pulse">
                      Needs a Win
                    </span>
                  )}
                </div>
              </div>

              {/* Stats Section */}
              <div className="grid grid-cols-2 gap-4 border-t border-b border-border/50 py-3 font-mono text-xs">
                <div className="flex flex-col">
                  <span className="text-[9px] text-muted-foreground uppercase tracking-widest">Sets Record</span>
                  <span className="text-foreground font-semibold mt-0.5 uppercase tabular-nums">
                    {player.totalSets} Sets ({player.setsWon}W / {player.setsLost}L)
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-muted-foreground uppercase tracking-widest">Win Rate</span>
                  <span className="text-foreground font-semibold mt-0.5 tabular-nums">
                    {player.winRate.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Sparkline & Action panel */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Trend</span>
                  <Sparkline data={player.sparkline} />
                </div>

                {/* Admin Actions */}
                {isAdmin && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditPlayer(player)}
                      className="h-7 w-12 rounded-none border border-border bg-transparent hover:bg-muted text-foreground transition-colors font-mono text-[9px] uppercase cursor-pointer"
                    >
                      EDIT
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger render={
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-12 rounded-none border border-destructive bg-transparent text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors font-mono text-[9px] uppercase cursor-pointer"
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
                            className="rounded-none bg-destructive border border-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors font-mono text-xs uppercase cursor-pointer"
                          >
                            Delete Player
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredPlayers.length === 0 && (
          <div className="col-span-full py-16 text-center border border-dashed border-border">
            <span className="text-5xl">🏸</span>
            <p className="text-muted-foreground mt-4 font-mono text-sm uppercase tracking-wider">
              {searchQuery ? "No players match your search." : "No players registered."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
