"use client";

import { useState, useCallback, useTransition } from "react";
import { generateSessionSchedule } from "@/lib/scheduler";
import type { ScheduleSummary, ScheduledMatch } from "@/lib/scheduler";
import { saveSessionSchedule } from "@/app/actions";
import { getEloTier } from "@/lib/elo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface SchedulerClientProps {
  allPlayers: any[];
  sessions: any[];
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  const steps = [
    { n: 1, label: "Select Players" },
    { n: 2, label: "Review Schedule" },
    { n: 3, label: "Apply to Session" },
  ];

  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn(
                "size-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300",
                current === s.n
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30"
                  : current > s.n
                  ? "bg-primary/20 text-primary border-primary/50"
                  : "bg-muted/50 text-muted-foreground border-border"
              )}
            >
              {current > s.n ? "✓" : s.n}
            </div>
            <span
              className={cn(
                "text-[10px] font-medium whitespace-nowrap hidden sm:block",
                current === s.n ? "text-primary" : "text-muted-foreground"
              )}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "h-0.5 flex-1 mx-2 transition-all duration-500",
                current > s.n ? "bg-primary/50" : "bg-border"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── ELO badge ────────────────────────────────────────────────────────────────

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

// ─── Player selection card ────────────────────────────────────────────────────

function PlayerCard({
  player,
  selected,
  onToggle,
}: {
  player: any;
  selected: boolean;
  onToggle: () => void;
}) {
  const tier = getEloTier(player.elo_rating);
  const displayName = player.name;

  return (
    <button
      onClick={onToggle}
      className={cn(
        "relative flex flex-col gap-1.5 p-3 rounded-xl border-2 text-left transition-all duration-200 w-full",
        selected
          ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
          : "border-border bg-card hover:border-primary/40 hover:bg-muted/50"
      )}
    >
      {selected && (
        <div className="absolute top-2 right-2 size-5 rounded-full bg-primary flex items-center justify-center">
          <span className="text-[10px] text-primary-foreground font-bold">✓</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="text-base">{tier.emoji}</span>
        <span className="font-semibold text-sm truncate">{displayName}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <EloBadge elo={player.elo_rating ?? 600} />
        <span className={cn("text-[10px]", tier.color)}>{tier.label}</span>
      </div>
      {player.is_temporary && (
        <span className="text-[9px] text-amber-500 font-medium">Guest</span>
      )}
    </button>
  );
}

// ─── Match card ───────────────────────────────────────────────────────────────

function MatchCard({ match }: { match: ScheduledMatch }) {
  const tier1 = getEloTier(match.pair1.combinedElo / 2);
  const tier2 = getEloTier(match.pair2.combinedElo / 2);
  const eloDiff = Math.abs(match.pair1.combinedElo - match.pair2.combinedElo);
  const fairness = eloDiff < 100 ? "Very Fair" : eloDiff < 200 ? "Fair" : "Slight Mismatch";
  const fairnessColor =
    eloDiff < 100 ? "text-emerald-400" : eloDiff < 200 ? "text-yellow-400" : "text-orange-400";

  return (
    <Card className="border-border/60 bg-card/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="text-[10px] font-bold tabular-nums">
            #{match.matchNumber}
          </Badge>
          <span className={cn("text-[10px] font-medium ml-auto", fairnessColor)}>
            ⚖️ {fairness}
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {/* Pair 1 */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-primary">
                Pair {match.pair1.label}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {match.pair1.combinedElo} ELO
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              {[match.pair1.player1, match.pair1.player2].map((p) => (
                <div key={p.id} className="flex items-center gap-1">
                  <span className="text-[10px]">{getEloTier(p.elo_rating).emoji}</span>
                  <span className="text-xs font-medium truncate">
                    {p.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* VS */}
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-base font-black text-muted-foreground/40">VS</span>
          </div>

          {/* Pair 2 */}
          <div className="flex flex-col gap-1 text-right">
            <div className="flex items-center gap-1.5 justify-end">
              <span className="text-[10px] text-muted-foreground">
                {match.pair2.combinedElo} ELO
              </span>
              <span className="text-sm font-bold text-primary">
                Pair {match.pair2.label}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 items-end">
              {[match.pair2.player1, match.pair2.player2].map((p) => (
                <div key={p.id} className="flex items-center gap-1">
                  <span className="text-xs font-medium truncate">
                    {p.name}
                  </span>
                  <span className="text-[10px]">{getEloTier(p.elo_rating).emoji}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {match.sittingOut && (
          <div className="mt-2 pt-2 border-t border-border/40 text-center">
            <span className="text-[10px] text-muted-foreground">
              🪑 Sitting out:{" "}
              <span className="font-medium">
                {match.sittingOut.name}
              </span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main scheduler client ────────────────────────────────────────────────────

export function SchedulerClient({ allPlayers, sessions }: SchedulerClientProps) {
  const [step, setStep] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [schedule, setSchedule] = useState<ScheduleSummary | null>(null);
  const [targetSessionId, setTargetSessionId] = useState<string>("");
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── Step 1: toggle player selection ────────────────────────────────────────
  const togglePlayer = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectedPlayers = allPlayers.filter((p) => selectedIds.has(p.id));
  const pairCount = Math.floor(selectedPlayers.length / 2);
  const isOdd = selectedPlayers.length % 2 !== 0;

  // ── Step 2: generate schedule ───────────────────────────────────────────────
  const generate = useCallback(() => {
    if (selectedPlayers.length < 4) return;
    try {
      const result = generateSessionSchedule(selectedPlayers);
      setSchedule(result);
      setStep(2);
    } catch (e: any) {
      alert(e.message);
    }
  }, [selectedPlayers]);

  const regenerate = useCallback(() => {
    if (!selectedPlayers.length) return;
    try {
      const result = generateSessionSchedule(selectedPlayers);
      setSchedule(result);
    } catch (e: any) {
      alert(e.message);
    }
  }, [selectedPlayers]);

  // ── Step 3: save to session ─────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (!schedule || !targetSessionId) return;
    setSaveResult(null);

    startTransition(async () => {
      const matches = schedule.matches.map((m) => ({
        match_order: m.matchNumber,
        t1_player1_id: m.pair1.player1.id,
        t1_player2_id: m.pair1.player2.id,
        t2_player1_id: m.pair2.player1.id,
        t2_player2_id: m.pair2.player2.id,
        sitting_out_player_id: m.sittingOut?.id ?? null,
      }));

      const result = await saveSessionSchedule(targetSessionId, matches);
      if (result.error) {
        setSaveResult({ ok: false, msg: result.error });
      } else {
        setSaveResult({
          ok: true,
          msg: `✅ ${matches.length} matches saved! View them in the session's Schedule tab.`,
        });
        setStep(3);
      }
    });
  }, [schedule, targetSessionId]);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 pb-24 md:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight">
          ⚡ Session Scheduler
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate a fair, ELO-balanced match schedule for today&apos;s players.
        </p>
      </div>

      <StepIndicator current={step} />

      {/* ── STEP 1: Select Players ── */}
      {step === 1 && (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Who&apos;s playing today?</span>
                <div className="flex items-center gap-2">
                  {selectedPlayers.length > 0 && (
                    <Badge variant="secondary" className="font-mono text-xs">
                      {selectedPlayers.length} selected → {pairCount} pair{pairCount !== 1 ? "s" : ""}
                      {isOdd && " + 1 rotating"}
                    </Badge>
                  )}
                  {selectedPlayers.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setSelectedIds(new Set())}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {allPlayers.map((p) => (
                  <PlayerCard
                    key={p.id}
                    player={p}
                    selected={selectedIds.has(p.id)}
                    onToggle={() => togglePlayer(p.id)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Info card */}
          {selectedPlayers.length >= 4 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="py-4 px-5">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Players: </span>
                    <span className="font-semibold">{selectedPlayers.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pairs: </span>
                    <span className="font-semibold">{pairCount}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total matches: </span>
                    <span className="font-semibold">
                      {(pairCount * (pairCount - 1)) / 2}
                    </span>
                  </div>
                  {isOdd && (
                    <div>
                      <span className="text-amber-400">⚠ Odd number — 1 player rotates out per match</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            size="lg"
            disabled={selectedPlayers.length < 4}
            onClick={generate}
            className="w-full font-semibold"
          >
            {selectedPlayers.length < 4
              ? `Select at least ${4 - selectedPlayers.length} more player${4 - selectedPlayers.length !== 1 ? "s" : ""}`
              : "⚡ Generate Schedule"}
          </Button>
        </div>
      )}

      {/* ── STEP 2: Review Schedule ── */}
      {step === 2 && schedule && (
        <div className="flex flex-col gap-6">
          {/* Pairs summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">🎯 Generated Pairs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {schedule.pairs.map((pair) => (
                  <div
                    key={`${pair.player1.id}-${pair.player2.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-muted/30"
                  >
                    <span className="font-black text-primary w-6 text-center">
                      {pair.label}
                    </span>
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      {[pair.player1, pair.player2].map((p) => (
                        <div key={p.id} className="flex items-center gap-1.5">
                          <span className="text-[11px]">{getEloTier(p.elo_rating).emoji}</span>
                          <span className="text-xs font-medium truncate">
                            {p.name}
                          </span>
                          <EloBadge elo={p.elo_rating ?? 600} />
                        </div>
                      ))}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-muted-foreground">Combined</div>
                      <div className="text-xs font-bold">{pair.combinedElo}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Balance stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-border/60">
              <CardContent className="py-3 px-4 text-center">
                <div className="text-2xl font-black">{schedule.matches.length}</div>
                <div className="text-[10px] text-muted-foreground">Total Matches</div>
              </CardContent>
            </Card>
            <Card className={cn("border-border/60", schedule.isBalanced ? "border-emerald-500/30 bg-emerald-500/5" : "")}>
              <CardContent className="py-3 px-4 text-center">
                <div className="text-2xl font-black">
                  {schedule.isBalanced ? "✅" : "⚠️"}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {schedule.isBalanced ? "Balanced" : "Slight Imbalance"}
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="py-3 px-4 text-center">
                <div className="text-2xl font-black">{schedule.averageEloDiff}</div>
                <div className="text-[10px] text-muted-foreground">Avg ELO Diff</div>
              </CardContent>
            </Card>
          </div>

          {/* Per-player match count */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">📊 Matches per Player</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {schedule.playerMatchCounts.map(({ player, count }) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/30 border border-border/40"
                  >
                    <span className="text-xs font-medium truncate">
                      {player.name}
                    </span>
                    <Badge variant="secondary" className="text-xs font-bold shrink-0">
                      {count}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Match schedule */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-widest">
              Match Schedule
            </h3>
            <div className="flex flex-col gap-2">
              {schedule.matches.map((m) => (
                <MatchCard key={m.matchNumber} match={m} />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
              ← Back
            </Button>
            <Button variant="secondary" onClick={regenerate} className="flex-1">
              🔀 Reshuffle
            </Button>
            <Button onClick={() => setStep(3)} className="flex-1 font-semibold">
              Apply to Session →
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Apply to Session ── */}
      {step === 3 && (
        <div className="flex flex-col gap-6">
          {saveResult?.ok ? (
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="py-8 text-center">
                <div className="text-5xl mb-4">🎉</div>
                <p className="text-base font-semibold text-emerald-400">{saveResult.msg}</p>
                <div className="flex flex-wrap gap-3 justify-center mt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const s = sessions.find((s) => s.id === targetSessionId);
                      if (s) window.location.href = `/sessions/${s.id}`;
                    }}
                  >
                    View Session →
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setStep(1);
                      setSelectedIds(new Set());
                      setSchedule(null);
                      setSaveResult(null);
                      setTargetSessionId("");
                    }}
                  >
                    Start Fresh
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">🗓️ Save Schedule to Session</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <p className="text-sm text-muted-foreground">
                    Choose a session to attach this schedule to. It will appear as a{" "}
                    <strong className="text-foreground">Schedule</strong> tab visible to everyone.
                  </p>

                  <Select value={targetSessionId} onValueChange={(v) => setTargetSessionId(v ?? "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a session…" />
                    </SelectTrigger>
                    <SelectContent>
                      {sessions.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} —{" "}
                          {new Date(s.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {saveResult && !saveResult.ok && (
                    <p className="text-sm text-destructive">{saveResult.msg}</p>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setStep(2)}
                      className="flex-1"
                    >
                      ← Back
                    </Button>
                    <Button
                      className="flex-1 font-semibold"
                      disabled={!targetSessionId || isPending}
                      onClick={handleSave}
                    >
                      {isPending ? "Saving…" : "💾 Save Schedule"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Preview summary */}
              {schedule && (
                <Card className="border-border/40 bg-muted/20">
                  <CardContent className="py-4 px-5">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{schedule.matches.length} matches</span> will be saved ·{" "}
                      <span className="font-semibold text-foreground">{schedule.pairs.length} pairs</span> ·{" "}
                      avg ELO diff <span className="font-semibold text-foreground">{schedule.averageEloDiff}</span>
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
