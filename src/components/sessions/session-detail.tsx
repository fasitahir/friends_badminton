"use client";

import { useState } from "react";
import type { Player } from "@/lib/supabase/types";
import {
  createTeam,
  deleteTeam,
  createPair,
  deletePair,
  createMatch,
  deleteMatch,
  updateMatch,
} from "@/app/actions";
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
}

export function SessionDetail({
  session,
  teams,
  pairs,
  matches,
  allPlayers,
  isAdmin,
}: SessionDetailProps) {
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

      <Tabs defaultValue="matches" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="matches" className="text-xs sm:text-sm">Matches</TabsTrigger>
          <TabsTrigger value="pairs" className="text-xs sm:text-sm">Pairs</TabsTrigger>
          <TabsTrigger value="teams" className="text-xs sm:text-sm">Teams</TabsTrigger>
        </TabsList>

        {/* ==================== MATCHES TAB ==================== */}
        <TabsContent value="matches" className="mt-4 sm:mt-6">
          <MatchesTab
            sessionId={session.id}
            matches={matches}
            pairs={pairs}
            allPlayers={allPlayers}
            isAdmin={isAdmin}
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
          <Badge variant="outline" className="text-[10px] sm:text-xs">
            {match.games?.length || 0} Sets • Bo{match.best_of}
          </Badge>
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
                    {game.pair1?.player1?.name} & {game.pair1?.player2?.name}
                  </div>
                  <div className="font-mono tabular-nums font-bold px-3 py-1 bg-background rounded-md border shadow-sm">
                    {game.pair1_score} - {game.pair2_score}
                  </div>
                  <div className={`flex-1 ${p2won ? 'font-bold text-win' : 'text-muted-foreground'}`}>
                    {game.pair2?.player1?.name} & {game.pair2?.player2?.name}
                  </div>
                </div>
                {/* Mobile layout */}
                <div className="flex sm:hidden items-center gap-2">
                  <div className="text-[10px] text-muted-foreground font-mono w-6 shrink-0">
                    S{game.game_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs truncate ${p1won ? 'font-bold text-win' : 'text-muted-foreground'}`}>
                      {game.pair1?.player1?.name?.split(' ')[0]} & {game.pair1?.player2?.name?.split(' ')[0]}
                    </div>
                  </div>
                  <div className="font-mono tabular-nums font-bold text-xs px-2 py-0.5 bg-background rounded border shadow-sm shrink-0">
                    {game.pair1_score}-{game.pair2_score}
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <div className={`text-xs truncate ${p2won ? 'font-bold text-win' : 'text-muted-foreground'}`}>
                      {game.pair2?.player1?.name?.split(' ')[0]} & {game.pair2?.player2?.name?.split(' ')[0]}
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
}: {
  sessionId: string;
  matches: any[];
  pairs: any[];
  allPlayers: Player[];
  isAdmin?: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base sm:text-lg font-semibold">Match History</h2>
        {isAdmin && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
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
                onClose={() => setCreateOpen(false)}
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
  onCreated,
  onCancel,
}: {
  sessionId: string;
  allPlayers: Player[];
  onCreated: (pairId: string, p1Id: string, p2Id: string) => void;
  onCancel: () => void;
}) {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleQuickCreate() {
    if (!p1 || !p2) return;
    setLoading(true);
    setError("");
    const result = await createPair(sessionId, p1, p2);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onCreated(result.pairId!, p1, p2);
    }
  }

  return (
    <div className="p-3 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-primary">Quick Add Pair</span>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-6 px-2 text-xs text-muted-foreground">
          Cancel
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <Select value={p1} onValueChange={(v) => setP1(v || "")}>
          <SelectTrigger className="h-9 text-xs w-full">
            <SelectValue placeholder="Player 1">
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
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        type="button"
        size="sm"
        className="h-8 text-xs w-full"
        onClick={handleQuickCreate}
        disabled={loading || !p1 || !p2 || p1 === p2}
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
  placeholder,
  onValueChange,
  onPairCreated,
}: {
  value: string;
  pairs: any[];
  allPlayers: Player[];
  sessionId: string;
  placeholder: string;
  onValueChange: (v: string) => void;
  onPairCreated: (pairId: string, p1Id: string, p2Id: string) => void;
}) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const pairLabel = (pair: any) =>
    `${pair.player1?.name || "?"} & ${pair.player2?.name || "?"}`;

  if (showQuickAdd) {
    return (
      <InlineQuickPair
        sessionId={sessionId}
        allPlayers={allPlayers}
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
            {value ? pairLabel(pairs.find((p) => p.id === value) || { player1: { name: "New" }, player2: { name: "Pair" } }) : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {pairs.map((p) => (
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
        New pair
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
}: {
  sessionId: string;
  pairs: any[];
  allPlayers: Player[];
  onClose: () => void;
  initialMatch?: any;
}) {
  const [bestOf, setBestOf] = useState(initialMatch ? initialMatch.best_of.toString() : "1");
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
      { pair1_id: "", pair2_id: "", pair1_score: "", pair2_score: "" }
    ]
  );

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
  const handlePairCreated = (pairId: string, idx: number, side: "pair1" | "pair2", p1Id: string, p2Id: string) => {
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
      const p2Obj = allPlayers.find(p => p.id === p2Id);
      setPairs(prev => [...prev, {
        id: pairId,
        player1: { name: p1Obj?.name || "New" },
        player2: { name: p2Obj?.name || "Pair" }
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
      });
    } else {
      result = await createMatch({
        session_id: sessionId,
        best_of: parseInt(bestOf),
        games: matchGames,
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
    `${pair.player1?.name || "?"} & ${pair.player2?.name || "?"}`;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-4 overflow-y-auto px-4 pb-4 sm:px-1 sm:pb-1 flex-1">
      {/* Format selector */}
      <div className="flex items-center gap-3">
        <Label className="text-sm shrink-0">Format</Label>
        <Select value={bestOf} onValueChange={(v) => setBestOf(v || "")}>
          <SelectTrigger className="h-10 flex-1">
            <SelectValue>
              {bestOf === "1" ? "1 Set" : `Best of ${bestOf}`}
            </SelectValue>
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
                    placeholder="Pair 1"
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
                    placeholder="Pair 2"
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
