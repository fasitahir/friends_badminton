"use client";

import { useState, useCallback, useTransition } from "react";
import { generateSessionSchedule } from "@/lib/scheduler";
import type { ScheduleSummary, ScheduledMatch } from "@/lib/scheduler";
import { saveSessionSchedule } from "@/app/actions";
import { getEloTier } from "@/lib/elo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Helpers ──────────────────────────────────────────────────────────────────

function EloBadge({ elo }: { elo: number }) {
  const tier = getEloTier(elo);
  return (
    <span
      className={cn(
        "text-[10px] font-semibold px-1.5 py-0.5 rounded-full border",
        tier.bg,
        tier.color
      )}
    >
      {elo}
    </span>
  );
}

// ─── Player toggle card ───────────────────────────────────────────────────────

function PlayerToggle({
  player,
  selected,
  onToggle,
}: {
  player: any;
  selected: boolean;
  onToggle: () => void;
}) {
  const tier = getEloTier(player.elo_rating);

  return (
    <button
      onClick={onToggle}
      className={cn(
        "relative flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-left transition-all duration-150 w-full",
        selected
          ? "border-primary bg-primary/10"
          : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
      )}
    >
      {selected && (
        <span className="absolute top-1 right-1 size-4 rounded-full bg-primary flex items-center justify-center text-[9px] text-primary-foreground font-bold">
          ✓
        </span>
      )}
      <span className="text-sm">{tier.emoji}</span>
      <div className="flex flex-col gap-0.5 min-w-0">
        {/* Always show name (not nickname) */}
        <span className="text-xs font-semibold truncate">{player.name}</span>
        <EloBadge elo={player.elo_rating ?? 600} />
      </div>
    </button>
  );
}

// ─── Compact match card ───────────────────────────────────────────────────────

function CompactMatchCard({ match }: { match: ScheduledMatch }) {
  const eloDiff = Math.abs(match.pair1.combinedElo - match.pair2.combinedElo);
  const fairnessColor =
    eloDiff < 100 ? "text-emerald-400" : eloDiff < 200 ? "text-yellow-400" : "text-orange-400";

  return (
    <Card className="border-border/50 bg-muted/20">
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Badge variant="outline" className="text-[10px] font-bold h-5">
            #{match.matchNumber}
          </Badge>
          <span className={cn("text-[9px] font-medium ml-auto", fairnessColor)}>
            ⚖ {eloDiff < 100 ? "Very Fair" : eloDiff < 200 ? "Fair" : "Mismatch"}
          </span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
          <div className="flex flex-col gap-0.5">
            {[match.pair1.player1, match.pair1.player2].map((p) => (
              <span key={p.id} className="text-[11px] font-medium truncate">
                {getEloTier(p.elo_rating).emoji} {p.name}
              </span>
            ))}
          </div>
          <span className="text-[10px] font-black text-muted-foreground/40">VS</span>
          <div className="flex flex-col gap-0.5 items-end">
            {[match.pair2.player1, match.pair2.player2].map((p) => (
              <span key={p.id} className="text-[11px] font-medium truncate">
                {p.name} {getEloTier(p.elo_rating).emoji}
              </span>
            ))}
          </div>
        </div>
        {match.sittingOut && (
          <p className="text-[9px] text-muted-foreground text-center mt-1.5 pt-1.5 border-t border-border/30">
            🪑 {match.sittingOut.name} sits out
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main: embedded in-session scheduler ─────────────────────────────────────

interface InSessionSchedulerProps {
  sessionId: string;
  allPlayers: any[];
  /** Called after schedule is saved so parent can refresh */
  onSaved: () => void;
  onCancel: () => void;
}

export function InSessionScheduler({
  sessionId,
  allPlayers,
  onSaved,
  onCancel,
}: InSessionSchedulerProps) {
  const [step, setStep] = useState<"select" | "preview">("select");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [schedule, setSchedule] = useState<ScheduleSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedPlayers = allPlayers.filter((p) => selectedIds.has(p.id));
  const pairCount = Math.floor(selectedPlayers.length / 2);
  const isOdd = selectedPlayers.length % 2 !== 0;

  const togglePlayer = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const generate = useCallback(() => {
    if (selectedPlayers.length < 4) return;
    try {
      const result = generateSessionSchedule(selectedPlayers);
      setSchedule(result);
      setStep("preview");
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [selectedPlayers]);

  const regenerate = useCallback(() => {
    if (!selectedPlayers.length) return;
    try {
      const result = generateSessionSchedule(selectedPlayers);
      setSchedule(result);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [selectedPlayers]);

  const handleSave = useCallback(() => {
    if (!schedule) return;
    setError(null);
    startTransition(async () => {
      const matches = schedule.matches.map((m) => ({
        match_order: m.matchNumber,
        t1_player1_id: m.pair1.player1.id,
        t1_player2_id: m.pair1.player2.id,
        t2_player1_id: m.pair2.player1.id,
        t2_player2_id: m.pair2.player2.id,
        sitting_out_player_id: m.sittingOut?.id ?? null,
      }));
      const result = await saveSessionSchedule(sessionId, matches);
      if (result.error) {
        setError(result.error);
      } else {
        onSaved();
      }
    });
  }, [schedule, sessionId, onSaved]);

  // ── Step: Select players ─────────────────────────────────────────────────

  if (step === "select") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Who&apos;s playing today?</p>
            <p className="text-xs text-muted-foreground">
              Select present players to generate a balanced schedule
            </p>
          </div>
          <Button variant="ghost" size="sm" className="text-xs" onClick={onCancel}>
            Cancel
          </Button>
        </div>

        {/* Player grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {allPlayers.map((p) => (
            <PlayerToggle
              key={p.id}
              player={p}
              selected={selectedIds.has(p.id)}
              onToggle={() => togglePlayer(p.id)}
            />
          ))}
        </div>

        {/* Summary bar */}
        {selectedPlayers.length > 0 && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-xs">
            <span>
              <strong>{selectedPlayers.length}</strong> players →{" "}
              <strong>{pairCount}</strong> pairs →{" "}
              <strong>{(pairCount * (pairCount - 1)) / 2}</strong> matches
            </span>
            {isOdd && (
              <span className="text-amber-400 ml-auto">⚠ 1 player rotates out</span>
            )}
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        {/* Select all / clear */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => setSelectedIds(new Set(allPlayers.map((p) => p.id)))}
          >
            Select All
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
          <Button
            size="sm"
            className="flex-1 text-xs font-semibold"
            disabled={selectedPlayers.length < 4}
            onClick={generate}
          >
            {selectedPlayers.length < 4
              ? `Need ${4 - selectedPlayers.length} more`
              : "⚡ Generate"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Step: Preview + Save ─────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* Stats bar */}
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs">
        <span className="font-semibold text-primary">{schedule!.matches.length} matches</span>
        <span className="text-muted-foreground">·</span>
        <span>{schedule!.pairs.length} pairs</span>
        <span className="text-muted-foreground">·</span>
        <span>avg ELO diff: <strong>{schedule!.averageEloDiff}</strong></span>
        {schedule!.isBalanced && <span className="ml-auto text-emerald-400 font-medium">✅ Balanced</span>}
      </div>

      {/* Per-player counts */}
      <div className="flex flex-wrap gap-1.5">
        {schedule!.playerMatchCounts.map(({ player, count }) => (
          <div
            key={player.id}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 border border-border/40 text-[10px]"
          >
            <span className="font-medium">{player.name}</span>
            <Badge variant="secondary" className="text-[10px] h-4 px-1">
              {count}
            </Badge>
          </div>
        ))}
      </div>

      {/* Match list */}
      <div className="flex flex-col gap-2">
        {schedule!.matches.map((m) => (
          <CompactMatchCard key={m.matchNumber} match={m} />
        ))}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          onClick={() => setStep("select")}
        >
          ← Back
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="flex-1 text-xs"
          onClick={regenerate}
        >
          🔀 Reshuffle
        </Button>
        <Button
          size="sm"
          className="flex-1 text-xs font-semibold"
          disabled={isPending}
          onClick={handleSave}
        >
          {isPending ? "Saving…" : "💾 Save Schedule"}
        </Button>
      </div>
    </div>
  );
}
