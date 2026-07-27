"use client";

import { useState, useEffect, useTransition } from "react";
import type { Player } from "@/lib/supabase/types";
import {
  createTeam,
  deleteTeam,
  createPair,
  deletePair,
  createMatch,
  deleteMatch,
  updateMatch,
  deleteSessionSchedule,
  saveSessionSchedule,
} from "@/app/actions";
import { getEloTier } from "@/lib/elo";
import { extendSchedule } from "@/lib/scheduler";
import { InSessionScheduler } from "@/components/scheduler/in-session-scheduler";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

/* eslint-disable @typescript-eslint/no-explicit-any */

interface SessionDetailProps {
  session: any;
  teams: any[];
  pairs: any[];
  matches: any[];
  allPlayers: Player[];
  isAdmin?: boolean;
  /** Planned match schedule rows from session_schedule table */
  schedule?: any[];
}

export function SessionDetail({
  session,
  teams,
  pairs,
  matches,
  allPlayers,
  isAdmin,
  schedule = [],
}: SessionDetailProps) {
  // Controlled tab + cross-tab prefill for "Play" from schedule
  const [activeTab, setActiveTab] = useState<string>(
    schedule.length > 0 ? "schedule" : "matches"
  );
  const [prefilledPair1Id, setPrefilledPair1Id] = useState<string | null>(null);
  const [prefilledPair2Id, setPrefilledPair2Id] = useState<string | null>(null);

  /** Called from Schedule tab — switches to Matches and pre-fills the form */
  const handlePlayMatch = (p1Id: string | null, p2Id: string | null) => {
    setPrefilledPair1Id(p1Id);
    setPrefilledPair2Id(p2Id);
    setActiveTab("matches");
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight">
          {session.name}
        </h1>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-sm sm:text-base text-muted-foreground">
            {new Date(session.date).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <Badge variant="secondary">{matches.length} matches</Badge>
        </div>
        {session.notes && (
          <p className="text-sm text-muted-foreground mt-2">{session.notes}</p>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schedule" className="text-xs sm:text-sm relative">
            Schedule
            {schedule.length > 0 && (
              <span className="absolute -top-1 -right-1 size-2 rounded-full bg-primary" />
            )}
          </TabsTrigger>
          <TabsTrigger value="matches" className="text-xs sm:text-sm">Matches</TabsTrigger>
          <TabsTrigger value="pairs" className="text-xs sm:text-sm">Pairs</TabsTrigger>
          <TabsTrigger value="teams" className="text-xs sm:text-sm">Teams</TabsTrigger>
        </TabsList>

        {/* ==================== SCHEDULE TAB ==================== */}
        <TabsContent value="schedule" className="mt-4 sm:mt-6">
          <ScheduleTab
            sessionId={session.id}
            schedule={schedule}
            allPlayers={allPlayers}
            pairs={pairs}
            isAdmin={isAdmin}
            onPlayMatch={handlePlayMatch}
          />
        </TabsContent>

        {/* ==================== MATCHES TAB ==================== */}
        <TabsContent value="matches" className="mt-4 sm:mt-6">
          <MatchesTab
            sessionId={session.id}
            matches={matches}
            pairs={pairs}
            allPlayers={allPlayers}
            isAdmin={isAdmin}
            prefilledPair1Id={prefilledPair1Id}
            prefilledPair2Id={prefilledPair2Id}
            onPrefilledConsumed={() => {
              setPrefilledPair1Id(null);
              setPrefilledPair2Id(null);
            }}
          />
        </TabsContent>

        {/* ==================== PAIRS TAB ==================== */}
        <TabsContent value="pairs" className="mt-4 sm:mt-6">
          <PairsTab
            sessionId={session.id}
            pairs={pairs}
            allPlayers={allPlayers}
            isAdmin={isAdmin}
          />
        </TabsContent>

        {/* ==================== TEAMS TAB ==================== */}
        <TabsContent value="teams" className="mt-4 sm:mt-6">
          <TeamsTab
            sessionId={session.id}
            teams={teams}
            allPlayers={allPlayers}
            isAdmin={isAdmin}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== MATCHES TAB ====================
function MatchCard({
  match,
  sessionId,
  pairs,
  allPlayers,
  isAdmin,
}: {
  match: any;
  sessionId: string;
  pairs: any[];
  allPlayers: Player[];
  isAdmin?: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <Card className="group relative">
      <CardContent className="py-3 sm:py-4">
        <div className="flex items-center justify-between mb-2 sm:mb-3 border-b border-border pb-2 sm:pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] sm:text-xs">
              {match.games?.length || 0} Sets • Bo{match.best_of}
            </Badge>
            <Badge variant={match.match_type === "singles" ? "secondary" : "default"} className="text-[10px] sm:text-xs">
              {match.match_type === "singles" ? "Singles" : "Doubles"}
            </Badge>
            {!match.is_ranked && (
              <Badge variant="destructive" className="text-[10px] sm:text-xs">Unranked</Badge>
            )}
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1 sm:gap-2">
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger render={<Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground h-8 px-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                />}>
                  Edit
                </DialogTrigger>
                <DialogContent className="max-w-lg sm:max-w-lg max-h-[95vh] sm:max-h-[85vh] overflow-hidden flex flex-col p-0 sm:p-6 gap-0">
                  <DialogHeader className="px-4 pt-4 sm:px-0 sm:pt-0 pb-2">
                    <DialogTitle>Edit Match Sets</DialogTitle>
                  </DialogHeader>
                  <MatchForm
                    sessionId={sessionId}
                    pairs={pairs}
                    allPlayers={allPlayers}
                    onClose={() => setEditOpen(false)}
                    initialMatch={match}
                  />
                </DialogContent>
              </Dialog>

              <AlertDialog>
                <AlertDialogTrigger render={<Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive h-8 px-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                />}>
                  Del
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this match?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This cannot be undone. The match and all its sets will be removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMatch(match.id, sessionId)}
                      className="bg-destructive text-white hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 mt-1 sm:mt-2">
          {match.games?.map((game: any) => {
            const p1won = game.winning_pair_id === game.pair1_id;
            const p2won = game.winning_pair_id === game.pair2_id;
            return (
              <div key={game.game_number} className="text-sm bg-muted/50 p-2 rounded-md">
                {/* Mobile: stacked layout / Desktop: horizontal */}
                <div className="hidden sm:flex items-center gap-4">
                  <div className="w-10 text-center text-xs text-muted-foreground font-mono">
                    Set {game.game_number}
                  </div>
                  <div className={`flex-1 text-right ${p1won ? 'font-bold text-win' : 'text-muted-foreground'}`}>
                    {game.pair1?.player1?.name}{game.pair1?.player2 ? ` & ${game.pair1.player2.name}` : ''}
                    {game.pair1_elo_change !== undefined && (
                      <span className={`ml-2 text-[10px] font-mono ${game.pair1_elo_change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {game.pair1_elo_change > 0 ? '+' : ''}{game.pair1_elo_change}
                      </span>
                    )}
                  </div>
                  <div className="font-mono tabular-nums font-bold px-3 py-1 bg-background rounded-md border shadow-sm">
                    {game.pair1_score} - {game.pair2_score}
                  </div>
                  <div className={`flex-1 ${p2won ? 'font-bold text-win' : 'text-muted-foreground'}`}>
                    {game.pair2_elo_change !== undefined && (
                      <span className={`mr-2 text-[10px] font-mono ${game.pair2_elo_change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {game.pair2_elo_change > 0 ? '+' : ''}{game.pair2_elo_change}
                      </span>
                    )}
                    {game.pair2?.player1?.name}{game.pair2?.player2 ? ` & ${game.pair2.player2.name}` : ''}
                  </div>
                </div>
                {/* Mobile layout */}
                <div className="flex sm:hidden items-center gap-2">
                  <div className="text-[10px] text-muted-foreground font-mono w-6 shrink-0">
                    S{game.game_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs truncate ${p1won ? 'font-bold text-win' : 'text-muted-foreground'}`}>
                      {game.pair1?.player1?.name?.split(' ')[0]}{game.pair1?.player2 ? ` & ${game.pair1.player2.name?.split(' ')[0]}` : ''}
                      {game.pair1_elo_change !== undefined && (
                        <span className={`ml-1 text-[9px] font-mono ${game.pair1_elo_change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {game.pair1_elo_change > 0 ? '+' : ''}{game.pair1_elo_change}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="font-mono tabular-nums font-bold text-xs px-2 py-0.5 bg-background rounded border shadow-sm shrink-0">
                    {game.pair1_score}-{game.pair2_score}
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <div className={`text-xs truncate ${p2won ? 'font-bold text-win' : 'text-muted-foreground'}`}>
                      {game.pair2_elo_change !== undefined && (
                        <span className={`mr-1 text-[9px] font-mono ${game.pair2_elo_change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {game.pair2_elo_change > 0 ? '+' : ''}{game.pair2_elo_change}
                        </span>
                      )}
                      {game.pair2?.player1?.name?.split(' ')[0]}{game.pair2?.player2 ? ` & ${game.pair2.player2.name?.split(' ')[0]}` : ''}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {(!match.games || match.games.length === 0) && (
            <p className="text-sm text-muted-foreground italic text-center py-2">No sets recorded.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MatchesTab({
  sessionId,
  matches,
  pairs,
  allPlayers,
  isAdmin,
  prefilledPair1Id,
  prefilledPair2Id,
  onPrefilledConsumed,
}: {
  sessionId: string;
  matches: any[];
  pairs: any[];
  allPlayers: Player[];
  isAdmin?: boolean;
  /** When set, auto-opens the Record Match dialog with these pairs pre-selected */
  prefilledPair1Id?: string | null;
  prefilledPair2Id?: string | null;
  onPrefilledConsumed?: () => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);

  // Auto-open match dialog when navigated here via Play button from schedule
  const [consumedPrefill, setConsumedPrefill] = useState(false);
  if (prefilledPair1Id && !consumedPrefill && !createOpen) {
    setCreateOpen(true);
    setConsumedPrefill(true);
  }
  // Reset consumed flag when prefill is cleared
  if (!prefilledPair1Id && consumedPrefill) {
    setConsumedPrefill(false);
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base sm:text-lg font-semibold">Match History</h2>
        {isAdmin && (
          <Dialog open={createOpen} onOpenChange={(o) => {
            setCreateOpen(o);
            if (!o) onPrefilledConsumed?.();
          }}>
            <DialogTrigger render={<Button size="sm" className="h-9 touch-target" />}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 mr-1.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              Record Match
            </DialogTrigger>
            <DialogContent className="max-w-lg sm:max-w-lg max-h-[95vh] sm:max-h-[85vh] overflow-hidden flex flex-col p-0 sm:p-6 gap-0">
              <DialogHeader className="px-4 pt-4 sm:px-0 sm:pt-0 pb-2">
                <DialogTitle>Record Match</DialogTitle>
              </DialogHeader>
              <MatchForm
                sessionId={sessionId}
                pairs={pairs}
                allPlayers={allPlayers}
                onClose={() => {
                  setCreateOpen(false);
                  onPrefilledConsumed?.();
                }}
                initialPair1Id={prefilledPair1Id ?? undefined}
                initialPair2Id={prefilledPair2Id ?? undefined}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:gap-4">
        {matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            sessionId={sessionId}
            pairs={pairs}
            allPlayers={allPlayers}
            isAdmin={isAdmin}
          />
        ))}
      </div>

      {matches.length === 0 && (
        <Card>
          <CardContent className="py-6 sm:py-8 text-center text-sm text-muted-foreground">
            No matches recorded yet. Hit &ldquo;Record Match&rdquo; to get started!
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== INLINE QUICK-CREATE PAIR ====================
function InlineQuickPair({
  sessionId,
  allPlayers,
  matchType,
  onCreated,
  onCancel,
}: {
  sessionId: string;
  allPlayers: Player[];
  matchType: "singles" | "doubles";
  onCreated: (pairId: string, p1Id: string, p2Id?: string | null) => void;
  onCancel: () => void;
}) {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleQuickCreate() {
    if (!p1) return;
    if (matchType === "doubles" && !p2) return;
    setLoading(true);
    setError("");
    const result = await createPair(sessionId, p1, matchType === "doubles" ? p2 : null);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onCreated(result.pairId!, p1, matchType === "doubles" ? p2 : null);
    }
  }

  return (
    <div className="p-3 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-primary">
          {matchType === "singles" ? "Quick Add Player" : "Quick Add Pair"}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-6 px-2 text-xs text-muted-foreground">
          Cancel
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <Select value={p1} onValueChange={(v) => setP1(v || "")}>
          <SelectTrigger className="h-9 text-xs w-full">
            <SelectValue placeholder={matchType === "singles" ? "Player" : "Player 1"}>
              {allPlayers.find((p) => p.id === p1)?.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {allPlayers.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-xs">
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {matchType === "doubles" && (
          <Select value={p2} onValueChange={(v) => setP2(v || "")}>
            <SelectTrigger className="h-9 text-xs w-full">
              <SelectValue placeholder="Player 2">
                {allPlayers.find((p) => p.id === p2)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {allPlayers
                .filter((p) => p.id !== p1)
                .map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        type="button"
        size="sm"
        className="h-8 text-xs w-full"
        onClick={handleQuickCreate}
        disabled={loading || !p1 || (matchType === "doubles" && (!p2 || p1 === p2))}
      >
        {loading ? "Creating..." : "Create & Select"}
      </Button>
    </div>
  );
}

// ==================== PAIR SELECTOR WITH INLINE CREATE ====================
function PairSelector({
  value,
  pairs,
  allPlayers,
  sessionId,
  matchType,
  placeholder,
  onValueChange,
  onPairCreated,
}: {
  value: string;
  pairs: any[];
  allPlayers: Player[];
  sessionId: string;
  matchType: "singles" | "doubles";
  placeholder: string;
  onValueChange: (v: string) => void;
  onPairCreated: (pairId: string, p1Id: string, p2Id?: string | null) => void;
}) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const pairLabel = (pair: any) => {
    if (matchType === "singles") return pair?.player1?.name || "?";
    return `${pair?.player1?.name || "?"} & ${pair?.player2?.name || "?"}`;
  };

  const filteredPairs = matchType === "singles" ? pairs.filter((p) => !p.player2) : pairs.filter((p) => p.player2);

  if (showQuickAdd) {
    return (
      <InlineQuickPair
        sessionId={sessionId}
        allPlayers={allPlayers}
        matchType={matchType}
        onCreated={(pairId, p1Id, p2Id) => {
          setShowQuickAdd(false);
          onPairCreated(pairId, p1Id, p2Id);
        }}
        onCancel={() => setShowQuickAdd(false)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Select value={value} onValueChange={(v) => onValueChange(v || "")}>
        <SelectTrigger className="h-10 text-xs sm:text-sm">
          <SelectValue placeholder={placeholder}>
            {value ? pairLabel(filteredPairs.find((p) => p.id === value) || { player1: { name: "New" }, player2: { name: "Pair" } }) : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {filteredPairs.map((p) => (
            <SelectItem key={p.id} value={p.id} className="text-xs sm:text-sm">
              {pairLabel(p)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button
        type="button"
        onClick={() => setShowQuickAdd(true)}
        className="text-[11px] text-primary hover:text-primary/80 font-medium text-left flex items-center gap-1 py-0.5"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-3"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        New {matchType === "singles" ? "player" : "pair"}
      </button>
    </div>
  );
}

// ==================== MATCH FORM ====================
function MatchForm({
  sessionId,
  pairs: initialPairs,
  allPlayers,
  onClose,
  initialMatch,
  initialPair1Id,
  initialPair2Id,
}: {
  sessionId: string;
  pairs: any[];
  allPlayers: Player[];
  onClose: () => void;
  initialMatch?: any;
  /** Pre-select pair IDs when opening from the schedule */
  initialPair1Id?: string;
  initialPair2Id?: string;
}) {
  const [bestOf, setBestOf] = useState(initialMatch ? initialMatch.best_of.toString() : "1");
  const [matchType, setMatchType] = useState<"singles" | "doubles">(initialMatch ? initialMatch.match_type : "doubles");
  const [isRanked, setIsRanked] = useState<boolean>(initialMatch ? initialMatch.is_ranked : true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pairs, setPairs] = useState(initialPairs);
  const [games, setGames] = useState<{ pair1_id: string; pair2_id: string; pair1_score: string; pair2_score: string }[]>(
    initialMatch?.games?.map((g: any) => ({
      pair1_id: g.pair1_id,
      pair2_id: g.pair2_id,
      pair1_score: g.pair1_score.toString(),
      pair2_score: g.pair2_score.toString(),
    })) || [
      {
        pair1_id: initialPair1Id || "",
        pair2_id: initialPair2Id || "",
        pair1_score: "",
        pair2_score: "",
      },
    ]
  );

  useEffect(() => {
    if (!initialMatch && (initialPair1Id || initialPair2Id)) {
      setGames((prev) => {
        const newGames = [...prev];
        if (initialPair1Id) newGames[0].pair1_id = initialPair1Id;
        if (initialPair2Id) newGames[0].pair2_id = initialPair2Id;
        return newGames;
      });
    }
  }, [initialPair1Id, initialPair2Id, initialMatch]);

  const addGame = () => {
    // Pre-fill with the last set's pair selections for speed
    const lastGame = games[games.length - 1];
    setGames([...games, {
      pair1_id: lastGame?.pair1_id || "",
      pair2_id: lastGame?.pair2_id || "",
      pair1_score: "",
      pair2_score: "",
    }]);
  };

  const removeGame = (idx: number) => {
    setGames(games.filter((_, i) => i !== idx));
  };

  // When a new pair is created inline, refresh the local pairs list
  const handlePairCreated = (pairId: string, idx: number, side: "pair1" | "pair2", p1Id: string, p2Id?: string | null) => {
    // We need to refetch pairs, but since this is a server action result,
    // the page will revalidate. For now, we add the pair optimistically.
    // The pairId is returned from the server action.
    const newGames = [...games];
    if (side === "pair1") newGames[idx].pair1_id = pairId;
    else newGames[idx].pair2_id = pairId;
    setGames(newGames);

    // Optimistically add the pair to local state
    // We don't have the full pair object, but we'll get it on next render
    // For now, add a placeholder that will be replaced on revalidation
    const existingPair = pairs.find(p => p.id === pairId);
    if (!existingPair) {
      const p1Obj = allPlayers.find(p => p.id === p1Id);
      const p2Obj = p2Id ? allPlayers.find(p => p.id === p2Id) : null;
      setPairs(prev => [...prev, {
        id: pairId,
        player1: { name: p1Obj?.name || "New" },
        player2: p2Obj ? { name: p2Obj.name } : null
      }]);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (games.length === 0) {
      setError("Please add at least one set");
      setLoading(false);
      return;
    }

    const matchGames = games.map((g, i) => {
      const p1Score = parseInt(g.pair1_score) || 0;
      const p2Score = parseInt(g.pair2_score) || 0;
      let winningPairId = null;
      if (p1Score > p2Score) winningPairId = g.pair1_id;
      else if (p2Score > p1Score) winningPairId = g.pair2_id;

      return {
        game_number: i + 1,
        pair1_id: g.pair1_id,
        pair2_id: g.pair2_id,
        pair1_score: p1Score,
        pair2_score: p2Score,
        winning_pair_id: winningPairId,
      };
    });

    let result;
    if (initialMatch) {
      result = await updateMatch(initialMatch.id, {
        session_id: sessionId,
        best_of: parseInt(bestOf),
        games: matchGames,
        match_type: matchType,
        is_ranked: isRanked,
      });
    } else {
      result = await createMatch({
        session_id: sessionId,
        best_of: parseInt(bestOf),
        games: matchGames,
        match_type: matchType,
        is_ranked: isRanked,
      });
    }

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onClose();
    }
  }

  const pairLabel = (pair: any) =>
    pair.player2 ? `${pair.player1?.name || "?"} & ${pair.player2.name}` : pair.player1?.name || "?";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-4 overflow-y-auto px-4 pb-4 sm:px-1 sm:pb-1 flex-1">
      {/* Settings row */}
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Type</Label>
            <Select value={matchType} onValueChange={(v) => {
              setMatchType(v as "singles" | "doubles");
              // Clear game selections when changing type since pair requirements change
              setGames(games.map(g => ({ ...g, pair1_id: "", pair2_id: "" })));
            }}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="doubles">Doubles</SelectItem>
                <SelectItem value="singles">Singles</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Ranked</Label>
            <Select value={isRanked ? "yes" : "no"} onValueChange={(v) => setIsRanked(v === "yes")}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Ranked</SelectItem>
                <SelectItem value="no">Unranked</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Format</Label>
            <Select value={bestOf} onValueChange={(v) => setBestOf(v || "")}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Set</SelectItem>
                <SelectItem value="3">Best of 3</SelectItem>
                <SelectItem value="5">Best of 5</SelectItem>
                <SelectItem value="7">Best of 7</SelectItem>
                <SelectItem value="9">Best of 9</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Sets */}
      <div className="flex flex-col gap-3">
        {games.map((game, idx) => (
          <Card key={idx} className="border-border/60">
            <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4 flex flex-col gap-2 sm:gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-semibold">Set {idx + 1}</span>
                {games.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeGame(idx)}
                    className="text-destructive h-7 px-2 text-xs"
                  >
                    Remove
                  </Button>
                )}
              </div>

              {/* Mobile: stacked layout / Desktop: side-by-side */}
              <div className="flex flex-col sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2 sm:gap-3 sm:items-start">
                {/* Pair 1 */}
                <div className="flex flex-col gap-1.5">
                  <PairSelector
                    value={game.pair1_id}
                    pairs={pairs}
                    allPlayers={allPlayers}
                    sessionId={sessionId}
                    matchType={matchType}
                    placeholder={matchType === "singles" ? "Player 1" : "Pair 1"}
                    onValueChange={(v) => {
                      const newGames = [...games];
                      newGames[idx].pair1_id = v;
                      setGames(newGames);
                    }}
                    onPairCreated={(pairId, p1Id, p2Id) => handlePairCreated(pairId, idx, "pair1", p1Id, p2Id)}
                  />
                </div>

                {/* VS + Scores - horizontal on mobile for compactness */}
                <div className="flex items-center gap-2 sm:flex-col sm:gap-1 sm:pt-0 justify-center">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="0"
                    value={game.pair1_score}
                    onChange={(e) => {
                      const newGames = [...games];
                      newGames[idx].pair1_score = e.target.value;
                      setGames(newGames);
                    }}
                    className="h-10 w-16 sm:w-14 text-center text-sm font-mono font-bold"
                    required
                  />
                  <div className="text-xs font-bold text-muted-foreground px-1">VS</div>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="0"
                    value={game.pair2_score}
                    onChange={(e) => {
                      const newGames = [...games];
                      newGames[idx].pair2_score = e.target.value;
                      setGames(newGames);
                    }}
                    className="h-10 w-16 sm:w-14 text-center text-sm font-mono font-bold"
                    required
                  />
                </div>

                {/* Pair 2 */}
                <div className="flex flex-col gap-1.5">
                  <PairSelector
                    value={game.pair2_id}
                    pairs={pairs}
                    allPlayers={allPlayers}
                    sessionId={sessionId}
                    matchType={matchType}
                    placeholder={matchType === "singles" ? "Player 2" : "Pair 2"}
                    onValueChange={(v) => {
                      const newGames = [...games];
                      newGames[idx].pair2_id = v;
                      setGames(newGames);
                    }}
                    onPairCreated={(pairId, p1Id, p2Id) => handlePairCreated(pairId, idx, "pair2", p1Id, p2Id)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addGame} className="h-9 touch-target">
          + Add Set
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        className="h-11 touch-target text-sm font-semibold"
        disabled={loading || games.some(g => !g.pair1_id || !g.pair2_id || g.pair1_id === g.pair2_id)}
      >
        {loading ? "Saving..." : initialMatch ? "Update Match" : "Record Match"}
      </Button>
    </form>
  );
}

// ==================== PAIRS TAB ====================
function PairsTab({
  sessionId,
  pairs,
  allPlayers,
  isAdmin,
}: {
  sessionId: string;
  pairs: any[];
  allPlayers: Player[];
  isAdmin?: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base sm:text-lg font-semibold">Pairs</h2>
        {isAdmin && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<Button size="sm" className="h-9 touch-target" />}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 mr-1.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              Create Pair
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Pair</DialogTitle>
              </DialogHeader>
              <PairForm
                sessionId={sessionId}
                allPlayers={allPlayers}
                onClose={() => setCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
        {pairs.map((pair) => (
          <Card key={pair.id} className="group">
            <CardContent className="py-3 sm:py-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                <div className="size-7 sm:size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                  {pair.player1?.name?.charAt(0)}
                </div>
                <span className="text-xs sm:text-sm font-medium truncate">
                  {pair.player1?.name}
                </span>
                <span className="text-muted-foreground text-xs shrink-0">&amp;</span>
                <div className="size-7 sm:size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                  {pair.player2?.name?.charAt(0)}
                </div>
                <span className="text-xs sm:text-sm font-medium truncate">
                  {pair.player2?.name}
                </span>
              </div>
              {isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger render={<Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive h-8 w-8 p-0 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                  />}>
                    ×
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this pair?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This pair will be removed. Existing matches using this pair
                        must be deleted first.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deletePair(pair.id, sessionId)}
                        className="bg-destructive text-white hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {pairs.length === 0 && (
        <Card>
          <CardContent className="py-6 sm:py-8 text-center text-sm text-muted-foreground">
            No pairs yet. Create pairs to start recording matches.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== PAIR FORM ====================
function PairForm({
  sessionId,
  allPlayers,
  onClose,
}: {
  sessionId: string;
  allPlayers: Player[];
  onClose: () => void;
}) {
  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await createPair(sessionId, player1, player2);

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
        <Label>Player 1</Label>
        <Select value={player1} onValueChange={(v) => setPlayer1(v || "")}>
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Select player">
              {allPlayers.find((p) => p.id === player1)?.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {allPlayers.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Player 2</Label>
        <Select value={player2} onValueChange={(v) => setPlayer2(v || "")}>
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Select player">
              {allPlayers.find((p) => p.id === player2)?.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {allPlayers
              .filter((p) => p.id !== player1)
              .map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="h-11 touch-target" disabled={loading || !player1 || !player2}>
        {loading ? "Creating..." : "Create Pair"}
      </Button>
    </form>
  );
}

// ==================== TEAMS TAB ====================
function TeamsTab({
  sessionId,
  teams,
  allPlayers,
  isAdmin,
}: {
  sessionId: string;
  teams: any[];
  allPlayers: Player[];
  isAdmin?: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base sm:text-lg font-semibold">Teams</h2>
        {isAdmin && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<Button size="sm" className="h-9 touch-target" />}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 mr-1.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              Create Team
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Team</DialogTitle>
              </DialogHeader>
              <TeamForm
                sessionId={sessionId}
                allPlayers={allPlayers}
                onClose={() => setCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {teams.map((team) => (
          <Card key={team.id} className="group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">{team.name}</CardTitle>
              {isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger render={<Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                  />}>
                    Delete
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {team.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove the team and its member assignments.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteTeam(team.id, sessionId)}
                        className="bg-destructive text-white hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {team.members?.map((member: any) => (
                  <Badge key={member.id} variant="secondary">
                    {member.name}
                  </Badge>
                ))}
                {(!team.members || team.members.length === 0) && (
                  <span className="text-sm text-muted-foreground">No members</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {team.members?.length || 0} player{(team.members?.length || 0) !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {teams.length === 0 && (
        <Card>
          <CardContent className="py-6 sm:py-8 text-center text-sm text-muted-foreground">
            No teams created yet. Teams are optional — you can go directly to
            Pairs to start recording matches.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== TEAM FORM ====================
function TeamForm({
  sessionId,
  allPlayers,
  onClose,
}: {
  sessionId: string;
  allPlayers: Player[];
  onClose: () => void;
}) {
  const [teamName, setTeamName] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const togglePlayer = (id: string) => {
    setSelectedPlayers((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!teamName.trim()) {
      setError("Team name is required");
      setLoading(false);
      return;
    }

    const result = await createTeam(sessionId, teamName, selectedPlayers);

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
        <Label>Team Name</Label>
        <Input
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="e.g. Team A"
          className="h-10"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Select Players</Label>
        <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-input min-h-[80px]">
          {allPlayers.map((player) => {
            const selected = selectedPlayers.includes(player.id);
            return (
              <button
                key={player.id}
                type="button"
                onClick={() => togglePlayer(player.id)}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-colors touch-target ${
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {player.name}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {selectedPlayers.length} player{selectedPlayers.length !== 1 ? "s" : ""} selected
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="h-11 touch-target" disabled={loading}>
        {loading ? "Creating..." : "Create Team"}
      </Button>
    </form>
  );
}

// ==================== SCHEDULE TAB ====================

function ScheduleTab({
  sessionId,
  schedule: initialSchedule,
  allPlayers,
  pairs,
  isAdmin,
  onPlayMatch,
}: {
  sessionId: string;
  schedule: any[];
  allPlayers: any[];
  /** All session pairs — used to resolve scheduled player IDs to pair IDs */
  pairs: any[];
  isAdmin?: boolean;
  /** Jump to Matches tab with these pair IDs pre-selected */
  onPlayMatch?: (pair1Id: string | null, pair2Id: string | null) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [schedule, setSchedule] = useState<any[]>(initialSchedule);
  const [showGenerator, setShowGenerator] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteSessionSchedule(sessionId);
      if (result.error) {
        setError(result.error);
      } else {
        setSchedule([]);
        setShowGenerator(false);
      }
    });
  };

  const handleAddMoreMatches = () => {
    startTransition(async () => {
      setError(null);
      // Generate extra matches using existing DB rows
      const extended = extendSchedule(schedule);
      if (extended.matches.length === 0) return;

      // Transform new matches into DB input shape
      const newMatchesInput = extended.matches.map((m) => ({
        match_order: m.matchNumber,
        t1_player1_id: m.pair1.player1.id,
        t1_player2_id: m.pair1.player2.id,
        t2_player1_id: m.pair2.player1.id,
        t2_player2_id: m.pair2.player2.id,
        sitting_out_player_id: m.sittingOut?.id ?? null,
      }));

      // Combine existing with new
      const allMatchesInput = [
        ...schedule.map((row) => ({
          match_order: row.match_order,
          t1_player1_id: row.t1_player1_id,
          t1_player2_id: row.t1_player2_id,
          t2_player1_id: row.t2_player1_id,
          t2_player2_id: row.t2_player2_id,
          sitting_out_player_id: row.sitting_out_player_id ?? null,
        })),
        ...newMatchesInput,
      ];

      const result = await saveSessionSchedule(sessionId, allMatchesInput);
      if (result.error) {
        setError(result.error);
      } else {
        window.location.reload();
      }
    });
  };

  // Inline generator shown when there's no schedule (or user clicked Generate)
  if (showGenerator || schedule.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {schedule.length === 0 && !showGenerator && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="text-4xl">📋</span>
            <div>
              <p className="text-base font-semibold">No Schedule Yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Generate a fair, ELO-balanced match schedule for this session.
              </p>
            </div>
            {isAdmin && (
              <Button size="sm" onClick={() => setShowGenerator(true)}>
                ⚡ Generate Schedule
              </Button>
            )}
          </div>
        )}

        {isAdmin && showGenerator && (
          <InSessionScheduler
            sessionId={sessionId}
            allPlayers={allPlayers}
            onSaved={() => {
              // Schedule saved — reload page to pick up new rows from DB
              window.location.reload();
            }}
            onCancel={() => setShowGenerator(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">
            {schedule.length} planned match{schedule.length !== 1 ? "es" : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            ELO-balanced · generated by Session Scheduler
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-primary/30 text-primary hover:bg-primary/10"
              disabled={isPending}
              onClick={handleAddMoreMatches}
            >
              {isPending ? "Generating…" : "➕ Add More"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setShowGenerator(true)}
            >
              🔀 Regenerate
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
              disabled={isPending}
              onClick={handleDelete}
            >
              {isPending ? "Clearing…" : "Clear"}
            </Button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Inline regenerator */}
      {showGenerator && (
        <div className="border border-primary/20 rounded-xl p-4 bg-primary/5">
          <InSessionScheduler
            sessionId={sessionId}
            allPlayers={allPlayers}
            onSaved={() => window.location.reload()}
            onCancel={() => setShowGenerator(false)}
          />
        </div>
      )}

      {/* Match list */}
      <div className="flex flex-col gap-3">
        {schedule.map((row: any) => {
          const t1p1 = row.t1_player1;
          const t1p2 = row.t1_player2;
          const t2p1 = row.t2_player1;
          const t2p2 = row.t2_player2;
          const sittingOut = row.sitting_out;

          const t1Elo = (t1p1?.elo_rating ?? 600) + (t1p2?.elo_rating ?? 600);
          const t2Elo = (t2p1?.elo_rating ?? 600) + (t2p2?.elo_rating ?? 600);
          const eloDiff = Math.abs(t1Elo - t2Elo);
          const fairness =
            eloDiff < 100 ? "Very Fair" : eloDiff < 200 ? "Fair" : "Slight Mismatch";
          const fairnessColor =
            eloDiff < 100
              ? "text-emerald-400"
              : eloDiff < 200
              ? "text-yellow-400"
              : "text-orange-400";

          return (
            <Card key={row.id} className="border-border/60 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="text-[10px] font-bold tabular-nums">
                    #{row.match_order}
                  </Badge>
                  <span className={`text-[10px] font-medium ${fairnessColor}`}>
                    ⚖️ {fairness}
                  </span>
                  {isAdmin && onPlayMatch && (
                    <Button
                      size="sm"
                      className="ml-auto h-7 px-3 text-[11px] font-semibold"
                      onClick={() => {
                        // Resolve player IDs to pair IDs using the pairs array
                        const findPairId = (aId: string, bId: string) => {
                          const [s1, s2] = [aId, bId].sort();
                          return pairs.find(
                            (p) =>
                              [p.player1_id, p.player2_id].sort().join() === [s1, s2].join() ||
                              (p.player1?.id && [p.player1.id, p.player2?.id].sort().join() === [s1, s2].join())
                          )?.id ?? null;
                        };
                        const p1Id = findPairId(t1p1?.id, t1p2?.id);
                        const p2Id = findPairId(t2p1?.id, t2p2?.id);
                        onPlayMatch(p1Id, p2Id);
                      }}
                    >
                      ▶ Add Score
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  {/* Team 1 */}
                  <div className="flex flex-col gap-1">
                    <div className="text-[10px] text-muted-foreground font-medium">
                      Combined: {t1Elo}
                    </div>
                    {[t1p1, t1p2].map((p: any) =>
                      p ? (
                        <div key={p.id} className="flex items-center gap-1">
                          <span className="text-[11px]">{getEloTier(p.elo_rating).emoji}</span>
                          {/* Show name, not nickname */}
                          <span className="text-xs font-medium truncate">{p.name}</span>
                        </div>
                      ) : null
                    )}
                  </div>

                  {/* VS */}
                  <div className="text-base font-black text-muted-foreground/40 text-center">
                    VS
                  </div>

                  {/* Team 2 */}
                  <div className="flex flex-col gap-1 items-end">
                    <div className="text-[10px] text-muted-foreground font-medium">
                      Combined: {t2Elo}
                    </div>
                    {[t2p1, t2p2].map((p: any) =>
                      p ? (
                        <div key={p.id} className="flex items-center gap-1">
                          {/* Show name, not nickname */}
                          <span className="text-xs font-medium truncate">{p.name}</span>
                          <span className="text-[11px]">{getEloTier(p.elo_rating).emoji}</span>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>

                {sittingOut && (
                  <div className="mt-2 pt-2 border-t border-border/40 text-center">
                    <span className="text-[10px] text-muted-foreground">
                      🪑 Sitting out:{" "}
                      <span className="font-medium">{sittingOut.name}</span>
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
