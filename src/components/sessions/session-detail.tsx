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
}

export function SessionDetail({
  session,
  teams,
  pairs,
  matches,
  allPlayers,
}: SessionDetailProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">
          {session.name}
        </h1>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-muted-foreground">
            {new Date(session.date).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
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
          <TabsTrigger value="matches">Matches</TabsTrigger>
          <TabsTrigger value="pairs">Pairs</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>

        {/* ==================== MATCHES TAB ==================== */}
        <TabsContent value="matches" className="mt-6">
          <MatchesTab
            sessionId={session.id}
            matches={matches}
            pairs={pairs}
          />
        </TabsContent>

        {/* ==================== PAIRS TAB ==================== */}
        <TabsContent value="pairs" className="mt-6">
          <PairsTab
            sessionId={session.id}
            pairs={pairs}
            allPlayers={allPlayers}
          />
        </TabsContent>

        {/* ==================== TEAMS TAB ==================== */}
        <TabsContent value="teams" className="mt-6">
          <TeamsTab
            sessionId={session.id}
            teams={teams}
            allPlayers={allPlayers}
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
}: {
  match: any;
  sessionId: string;
  pairs: any[];
}) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <Card className="group relative">
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-3 border-b border-border pb-3">
          <Badge variant="outline" className="text-xs">
            Match • {match.games?.length || 0} Sets (Format: Best of {match.best_of})
          </Badge>
          <div className="flex items-center gap-2">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger render={<Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
              />}>
                Edit Sets
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Edit Match Sets</DialogTitle>
                </DialogHeader>
                <MatchForm
                  sessionId={sessionId}
                  pairs={pairs}
                  onClose={() => setEditOpen(false)}
                  initialMatch={match}
                />
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger render={<Button
                variant="ghost"
                size="sm"
                className="text-destructive h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
              />}>
                Delete Match
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
        </div>

        <div className="flex flex-col gap-2 mt-2">
          {match.games?.map((game: any) => {
            const p1won = game.winning_pair_id === game.pair1_id;
            const p2won = game.winning_pair_id === game.pair2_id;
            return (
              <div key={game.game_number} className="flex items-center gap-4 text-sm bg-muted/50 p-2 rounded-md">
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
}: {
  sessionId: string;
  matches: any[];
  pairs: any[];
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Match History</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button disabled={pairs.length < 2} />}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 mr-2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Record Match
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Record Match</DialogTitle>
            </DialogHeader>
            <MatchForm
              sessionId={sessionId}
              pairs={pairs}
              onClose={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {pairs.length < 2 && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Create at least 2 pairs in the Pairs tab before recording matches.
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            sessionId={sessionId}
            pairs={pairs}
          />
        ))}
      </div>

      {matches.length === 0 && pairs.length >= 2 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No matches recorded yet. Hit &ldquo;Record Match&rdquo; to get started!
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== MATCH FORM ====================
function MatchForm({
  sessionId,
  pairs,
  onClose,
  initialMatch,
}: {
  sessionId: string;
  pairs: any[];
  onClose: () => void;
  initialMatch?: any;
}) {
  const [bestOf, setBestOf] = useState(initialMatch ? initialMatch.best_of.toString() : "1");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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
    setGames([...games, { pair1_id: "", pair2_id: "", pair1_score: "", pair2_score: "" }]);
  };

  const removeGame = (idx: number) => {
    setGames(games.filter((_, i) => i !== idx));
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto px-1">
      <div className="flex flex-col gap-2">
        <Label>Format</Label>
        <Select value={bestOf} onValueChange={(v) => setBestOf(v || "")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 Set (Single Game)</SelectItem>
            <SelectItem value="3">Best of 3</SelectItem>
            <SelectItem value="5">Best of 5</SelectItem>
            <SelectItem value="7">Best of 7</SelectItem>
            <SelectItem value="9">Best of 9</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <Label className="text-sm">Sets</Label>
      </div>

      <div className="flex flex-col gap-4">
        {games.map((game, idx) => (
          <Card key={idx}>
            <CardContent className="pt-4 pb-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Set {idx + 1}</span>
                {games.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeGame(idx)}
                    className="text-destructive h-6 px-2"
                  >
                    Remove
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3 items-center">
                <div className="flex flex-col gap-2">
                  <Select
                    value={game.pair1_id}
                    onValueChange={(v) => {
                      const newGames = [...games];
                      newGames[idx].pair1_id = v || "";
                      setGames(newGames);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs w-full">
                      <SelectValue placeholder="Pair 1" />
                    </SelectTrigger>
                    <SelectContent>
                      {pairs.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {pairLabel(p)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Score"
                    value={game.pair1_score}
                    onChange={(e) => {
                      const newGames = [...games];
                      newGames[idx].pair1_score = e.target.value;
                      setGames(newGames);
                    }}
                    className="h-8 text-xs"
                    required
                  />
                </div>
                <div className="text-xs font-bold text-muted-foreground px-2">VS</div>
                <div className="flex flex-col gap-2">
                  <Select
                    value={game.pair2_id}
                    onValueChange={(v) => {
                      const newGames = [...games];
                      newGames[idx].pair2_id = v || "";
                      setGames(newGames);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs w-full">
                      <SelectValue placeholder="Pair 2" />
                    </SelectTrigger>
                    <SelectContent>
                      {pairs.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {pairLabel(p)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Score"
                    value={game.pair2_score}
                    onChange={(e) => {
                      const newGames = [...games];
                      newGames[idx].pair2_score = e.target.value;
                      setGames(newGames);
                    }}
                    className="h-8 text-xs"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addGame}>
          + Add Set
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading || games.some(g => !g.pair1_id || !g.pair2_id || g.pair1_id === g.pair2_id)}>
        {loading ? "Saving..." : "Record Match"}
      </Button>
    </form>
  );
}

// ==================== PAIRS TAB ====================
function PairsTab({
  sessionId,
  pairs,
  allPlayers,
}: {
  sessionId: string;
  pairs: any[];
  allPlayers: Player[];
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Pairs</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button />}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 mr-2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {pairs.map((pair) => (
          <Card key={pair.id} className="group">
            <CardContent className="py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                  {pair.player1?.name?.charAt(0)}
                </div>
                <span className="text-sm font-medium">
                  {pair.player1?.name}
                </span>
                <span className="text-muted-foreground text-xs">&amp;</span>
                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                  {pair.player2?.name?.charAt(0)}
                </div>
                <span className="text-sm font-medium">
                  {pair.player2?.name}
                </span>
              </div>
              <AlertDialog>
                <AlertDialogTrigger render={<Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
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
            </CardContent>
          </Card>
        ))}
      </div>

      {pairs.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
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
          <SelectTrigger>
            <SelectValue placeholder="Select player" />
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
          <SelectTrigger>
            <SelectValue placeholder="Select player" />
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
      <Button type="submit" disabled={loading || !player1 || !player2}>
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
}: {
  sessionId: string;
  teams: any[];
  allPlayers: Player[];
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Teams</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button />}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 mr-2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teams.map((team) => (
          <Card key={team.id} className="group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">{team.name}</CardTitle>
              <AlertDialog>
                <AlertDialogTrigger render={<Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
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
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
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
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
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
      <Button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create Team"}
      </Button>
    </form>
  );
}
