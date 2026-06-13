"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

const skillColors: Record<string, string> = {
  Developing: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Competitive: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Advanced: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

function PlayerForm({
  player,
  onClose,
}: {
  player?: Player;
  onClose: () => void;
}) {
  const [skillLevel, setSkillLevel] = useState(player?.skill_level || "Competitive");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.set("skill_level", skillLevel); // Ensure the state value is set in form data
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
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={player?.name}
          placeholder="Player name"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="nickname">Nickname (optional)</Label>
        <Input
          id="nickname"
          name="nickname"
          defaultValue={player?.nickname || ""}
          placeholder="Nickname"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="skill_level">Skill Level</Label>
        <input type="hidden" name="skill_level" value={skillLevel} />
        <Select
          value={skillLevel}
          onValueChange={(v) => setSkillLevel(v as "Developing" | "Competitive" | "Advanced")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select skill level">
              {skillLevel}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Developing">Developing</SelectItem>
            <SelectItem value="Competitive">Competitive</SelectItem>
            <SelectItem value="Advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : player ? "Update Player" : "Add Player"}
      </Button>
    </form>
  );
}

export function PlayerTable({ players, isAdmin }: { players: Player[], isAdmin?: boolean }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editPlayer, setEditPlayer] = useState<Player | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<Button />}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 mr-2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              Add Player
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Player</DialogTitle>
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
            <DialogTitle>Edit Player</DialogTitle>
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
        {players.map((player) => (
          <Card key={player.id} className="group relative overflow-hidden hover:border-primary/30 transition-colors">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <Link
                      href={`/players/${player.id}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {player.name}
                    </Link>
                    {player.nickname && (
                      <p className="text-xs text-muted-foreground">
                        &ldquo;{player.nickname}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={skillColors[player.skill_level]}
                >
                  {player.skill_level}
                </Badge>
              </div>
              {isAdmin && (
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditPlayer(player)}
                  >
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger render={<Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" />}>
                      Delete
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {player.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this player and all their
                          match history. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deletePlayer(player.id)}
                          className="bg-destructive text-white hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </CardContent>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/3 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
          </Card>
        ))}
      </div>

      {players.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No players yet. Add your first player to get started!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
