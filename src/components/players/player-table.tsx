"use client";

import { useState } from "react";
import NextLink from "next/link";
import type { Player } from "@/lib/supabase/types";
import { createPlayer, updatePlayer, deletePlayer } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// Vibrant player avatar colors (rotating)
const AVATAR_COLORS = [
  "from-green-500/30 to-emerald-500/20 text-green-400",
  "from-blue-500/30 to-cyan-500/20 text-blue-400",
  "from-purple-500/30 to-violet-500/20 text-purple-400",
  "from-orange-500/30 to-amber-500/20 text-orange-400",
  "from-pink-500/30 to-rose-500/20 text-pink-400",
  "from-teal-500/30 to-cyan-500/20 text-teal-400",
  "from-indigo-500/30 to-blue-500/20 text-indigo-400",
  "from-yellow-500/30 to-amber-500/20 text-yellow-400",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getEloTier(elo: number | null | undefined) {
  if (!elo) return { label: "Unranked", color: "text-muted-foreground", emoji: "⬜" };
  if (elo >= 700) return { label: "Elite", color: "text-yellow-400", emoji: "🔥" };
  if (elo >= 650) return { label: "Advanced", color: "text-primary", emoji: "⚡" };
  if (elo >= 600) return { label: "Intermediate", color: "text-blue-400", emoji: "🌟" };
  return { label: "Beginner", color: "text-muted-foreground", emoji: "🎯" };
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name" className="font-medium">Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={player?.name}
          placeholder="Player name"
          required
          className="bg-muted/30 border-border/50"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="nickname" className="font-medium">Nickname <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Input
          id="nickname"
          name="nickname"
          defaultValue={player?.nickname || ""}
          placeholder="e.g. The Smasher"
          className="bg-muted/30 border-border/50"
        />
      </div>
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
      )}
      <Button type="submit" disabled={loading} className="mt-2">
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="size-3.5 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground animate-spin" />
            Saving...
          </span>
        ) : player ? "Update Player ✏️" : "Add Player 🏸"}
      </Button>
    </form>
  );
}

export function PlayerTable({ players, isAdmin }: { players: Player[], isAdmin?: boolean }) {
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
              <Button className="gap-2 neon-glow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                Add Player
              </Button>
            } />
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span>🏸</span> Add New Player
                </DialogTitle>
              </DialogHeader>
              <PlayerForm onClose={() => setCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editPlayer} onOpenChange={(open) => !open && setEditPlayer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>✏️</span> Edit Player
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedPlayers.map((player, i) => {
          const avatarColor = getAvatarColor(player.name);
          const tier = getEloTier(player.elo_rating);
          const rank = i + 1;
          const isTop3 = rank <= 3;

          return (
            <Card
              key={player.id}
              className={`group relative overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/5 ${isTop3 ? "border-primary/20" : ""}`}
            >
              {isTop3 && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              )}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/3 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className={`relative size-12 rounded-xl bg-gradient-to-br ${avatarColor} flex items-center justify-center font-bold text-lg shrink-0`}>
                      {player.name.charAt(0).toUpperCase()}
                      {isTop3 && (
                        <span className="absolute -top-1.5 -right-1.5 text-base leading-none">
                          {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
                        </span>
                      )}
                    </div>
                    
                    {/* Name & nickname */}
                    <div>
                      <NextLink
                        href={`/players/${player.id}`}
                        className="font-heading font-semibold hover:text-primary transition-colors text-sm"
                      >
                        {player.name}
                      </NextLink>
                      {player.nickname && (
                        <p className="text-[11px] text-muted-foreground/60 italic">
                          &ldquo;{player.nickname}&rdquo;
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs">{tier.emoji}</span>
                        <span className={`text-[10px] font-medium ${tier.color}`}>{tier.label}</span>
                      </div>
                    </div>
                  </div>

                  {/* ELO badge */}
                  <div className="flex flex-col items-end gap-1">
                    {player.elo_rating ? (
                      <div className={`px-2 py-1 rounded-lg text-xs font-mono font-bold bg-muted/50 ${
                        isTop3 ? "text-primary" : "text-muted-foreground"
                      }`}>
                        {player.elo_rating}
                      </div>
                    ) : (
                      <div className="px-2 py-1 rounded-lg text-xs font-mono text-muted-foreground/40 bg-muted/30">—</div>
                    )}
                    <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wide">ELO</span>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex gap-2 mt-4 pt-3 border-t border-border/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditPlayer(player)}
                      className="flex-1 text-xs h-7 hover:bg-primary/10 hover:text-primary"
                    >
                      ✏️ Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger render={<Button variant="ghost" size="sm" className="flex-1 text-xs h-7 text-destructive hover:text-destructive hover:bg-destructive/10" />}>
                        🗑️ Delete
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <span>⚠️</span> Delete {player.name}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this player and all their match history. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deletePlayer(player.id)}
                            className="bg-destructive text-white hover:bg-destructive/90"
                          >
                            Delete Player
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {players.length === 0 && (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <span className="text-5xl">🏸</span>
            <p className="text-muted-foreground mt-4 font-medium">No players yet.</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Add your first player to get started!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
