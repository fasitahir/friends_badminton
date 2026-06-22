"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function LiveLeaderboard({ players }: { players: any[] }) {
  const sortedPlayers = [...players]
    .filter(p => p.elo_rating)
    .sort((a, b) => b.elo_rating - a.elo_rating)
    .slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 text-primary">
              <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
            </svg>
            All-Time Elo Leaderboard
            <Dialog>
              <DialogTrigger render={
                <button className="text-muted-foreground hover:text-foreground cursor-pointer flex items-center transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                  </svg>
                </button>
              } />
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>How Elo Ratings Work</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-sm text-muted-foreground mt-2 leading-relaxed">
                  <p>
                    Elo is a dynamic rating system that updates after every match. Here is how your points are calculated:
                  </p>
                  
                  <div className="space-y-2 border-l-2 border-primary/20 pl-3">
                    <p className="font-medium text-foreground text-xs uppercase tracking-wider">1. Starting Fresh at 600</p>
                    <p>Every player starts with an initial Elo rating of <strong>600</strong>.</p>
                  </div>
                  
                  <div className="space-y-2 border-l-2 border-primary/20 pl-3">
                    <p className="font-medium text-foreground text-xs uppercase tracking-wider">2. Calculated Per Set</p>
                    <p>Rating changes are calculated for <strong>each individual set</strong> played rather than just the overall match outcome. This rewards close games and competitive fights.</p>
                  </div>

                  <div className="space-y-2 border-l-2 border-primary/20 pl-3">
                    <p className="font-medium text-foreground text-xs uppercase tracking-wider">3. Addition & Subtraction (K-Factor = 24)</p>
                    <p>The maximum rating change per set is capped at <strong>24 points</strong>. The actual points gained or lost depend on the difference between the teams' ratings:</p>
                    <ul className="list-disc list-inside space-y-1 pl-1">
                      <li><strong>Beating stronger players:</strong> Large point gain (+13 to +23)</li>
                      <li><strong>Beating weaker players:</strong> Small point gain (+1 to +11)</li>
                      <li><strong>Losing to stronger players:</strong> Small point loss (-1 to -11)</li>
                      <li><strong>Losing to weaker players:</strong> Large point loss (-13 to -23)</li>
                    </ul>
                  </div>

                  <div className="space-y-2 border-l-2 border-primary/20 pl-3">
                    <p className="font-medium text-foreground text-xs uppercase tracking-wider">4. Accurate Rollbacks</p>
                    <p>If a match is edited or deleted, the system rolls back the exact Elo points added/subtracted to ensure historical accuracy.</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Top players sorted by Elo rating
        </p>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-3">
          {sortedPlayers.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No rated players yet.
            </p>
          )}

          {sortedPlayers.map((player, idx) => (
            <Link
              key={player.id}
              href={`/players/${player.id}`}
              className="flex items-center gap-3 group"
            >
              <span className="size-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold font-mono text-muted-foreground shrink-0">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                  {player.name}
                </p>
                {player.nickname && (
                  <p className="text-xs text-muted-foreground truncate">
                    &ldquo;{player.nickname}&rdquo;
                  </p>
                )}
              </div>
              <div className="flex items-center shrink-0">
                <span className="text-sm font-bold font-mono tabular-nums">
                  {player.elo_rating}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
