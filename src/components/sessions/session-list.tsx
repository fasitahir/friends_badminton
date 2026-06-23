"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@/lib/supabase/types";
import { createSession, deleteSession } from "@/app/actions";
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
import Link from "next/link";

type SessionWithCount = Session & { matchCount: number };

function SessionForm({ onClose }: { onClose: () => void }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await createSession(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onClose();
      if (result.sessionId) {
        router.push(`/sessions/${result.sessionId}`);
      }
    }
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Session Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="e.g. Saturday Night Session"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="date">Date</Label>
        <Input id="date" name="date" type="date" defaultValue={today} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input id="notes" name="notes" placeholder="Any notes about this session" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create Session"}
      </Button>
    </form>
  );
}

export function SessionList({ sessions, isAdmin }: { sessions: SessionWithCount[], isAdmin?: boolean }) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={
              <Button className="gap-2 neon-glow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                New Session
              </Button>
            } />
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span>📅</span> Create New Session
                </DialogTitle>
              </DialogHeader>
              <SessionForm onClose={() => setCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {sessions.map((session, i) => (
          <Link key={session.id} href={`/sessions/${session.id}`}>
            <Card className={`hover:border-primary/30 border-border/50 transition-all duration-200 cursor-pointer group hover:scale-[1.01] hover:shadow-md hover:shadow-primary/5 slide-up stagger-${Math.min(i + 1, 6)}`}>
              <CardContent className="flex items-center justify-between py-3 sm:py-4 gap-3">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <div className="size-10 sm:size-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 group-hover:from-primary/30 transition-all">
                    <span className="text-xl sm:text-2xl">🎯</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold font-heading group-hover:text-primary transition-colors text-sm sm:text-base truncate">
                      {session.name}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground sm:hidden">
                      {new Date(session.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground hidden sm:block">
                      {new Date(session.date).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    {session.notes && (
                      <p className="text-xs text-muted-foreground/60 mt-0.5 truncate max-w-[200px] sm:max-w-md">
                        📝 {session.notes}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <Badge
                    variant="secondary"
                    className={`tabular-nums text-xs border ${
                      session.matchCount > 0
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-muted/30 text-muted-foreground border-border/50"
                    }`}
                  >
                    ⚡ {session.matchCount} match{session.matchCount !== 1 ? "es" : ""}
                  </Badge>
                  {isAdmin && (
                    <AlertDialog>
                      <AlertDialogTrigger render={<Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 transition-opacity h-8 px-2"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      />}>
                        🗑️
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <span>⚠️</span> Delete Session?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This will delete the session, all teams, pairs, and
                            matches within it. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSession(session.id);
                            }}
                            className="bg-destructive text-white hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all hidden sm:block">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {sessions.length === 0 && (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <span className="text-5xl">📅</span>
            <p className="text-muted-foreground mt-4 font-medium">No sessions yet.</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Create your first badminton session to get started!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
