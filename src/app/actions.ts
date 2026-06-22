"use server";

import { revalidatePath } from "next/cache";
import { getIsAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function login(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "Username and password are required" };
  }

  const supabase = await createClient();
  
  const { data: admin, error } = await supabase
    .from("admins")
    .select("id")
    .eq("username", username)
    .eq("password", password)
    .single();

  if (error || !admin) {
    return { error: "Invalid username or password" };
  }

  const cookieStore = await cookies();
  cookieStore.set("admin_auth", "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return { success: true };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_auth");
}
import {
  playerSchema,
  sessionSchema,
  matchSchema,
  matchGameSchema,
} from "@/lib/validations";

// ==================== PLAYER ACTIONS ====================

export async function createPlayer(formData: FormData) {
  if (!(await getIsAdmin())) return { error: "Unauthorized" };

  const supabase = await createClient();

  const parsed = playerSchema.safeParse({
    name: formData.get("name"),
    nickname: formData.get("nickname") || null,
    skill_level: formData.get("skill_level"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase.from("players").insert(parsed.data);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/players");
  revalidatePath("/");
  return { success: true };
}

export async function updatePlayer(id: string, formData: FormData) {
  if (!(await getIsAdmin())) return { error: "Unauthorized" };

  const supabase = await createClient();

  const parsed = playerSchema.safeParse({
    name: formData.get("name"),
    nickname: formData.get("nickname") || null,
    skill_level: formData.get("skill_level"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase
    .from("players")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/players");
  revalidatePath(`/players/${id}`);
  revalidatePath("/analytics");
  return { success: true };
}

export async function deletePlayer(id: string) {
  if (!(await getIsAdmin())) return { error: "Unauthorized" };

  const supabase = await createClient();

  const { error } = await supabase.from("players").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/players");
  revalidatePath("/");
  revalidatePath("/analytics");
  return { success: true };
}

// ==================== SESSION ACTIONS ====================

export async function createSession(formData: FormData) {
  if (!(await getIsAdmin())) return { error: "Unauthorized" };

  const supabase = await createClient();

  const parsed = sessionSchema.safeParse({
    name: formData.get("name"),
    date: formData.get("date"),
    notes: formData.get("notes") || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { data, error } = await supabase
    .from("sessions")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/sessions");
  revalidatePath("/");
  return { success: true, sessionId: data.id };
}

export async function updateSession(id: string, formData: FormData) {
  if (!(await getIsAdmin())) return { error: "Unauthorized" };

  const supabase = await createClient();

  const parsed = sessionSchema.safeParse({
    name: formData.get("name"),
    date: formData.get("date"),
    notes: formData.get("notes") || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase
    .from("sessions")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/sessions");
  revalidatePath(`/sessions/${id}`);
  return { success: true };
}

export async function deleteSession(id: string) {
  if (!(await getIsAdmin())) return { error: "Unauthorized" };

  const supabase = await createClient();

  const { error } = await supabase.from("sessions").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/sessions");
  revalidatePath("/");
  revalidatePath("/analytics");
  return { success: true };
}

// ==================== TEAM ACTIONS ====================

export async function createTeam(sessionId: string, name: string, playerIds: string[]) {
  if (!(await getIsAdmin())) return { error: "Unauthorized" };

  const supabase = await createClient();

  // Create team
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({ session_id: sessionId, name })
    .select()
    .single();

  if (teamError) {
    return { error: teamError.message };
  }

  // Add members
  if (playerIds.length > 0) {
    const members = playerIds.map((pid) => ({
      team_id: team.id,
      player_id: pid,
    }));

    const { error: memberError } = await supabase
      .from("team_members")
      .insert(members);

    if (memberError) {
      // Rollback team
      await supabase.from("teams").delete().eq("id", team.id);
      return { error: memberError.message };
    }
  }

  revalidatePath(`/sessions/${sessionId}`);
  return { success: true, teamId: team.id };
}

export async function deleteTeam(teamId: string, sessionId: string) {
  if (!(await getIsAdmin())) return { error: "Unauthorized" };

  const supabase = await createClient();

  const { error } = await supabase.from("teams").delete().eq("id", teamId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/sessions/${sessionId}`);
  return { success: true };
}

// ==================== PAIR ACTIONS ====================

export async function createPair(
  sessionId: string,
  player1Id: string,
  player2Id: string
) {
  if (!(await getIsAdmin())) return { error: "Unauthorized" };

  const supabase = await createClient();

  if (player1Id === player2Id) {
    return { error: "A player cannot be paired with themselves" };
  }

  // Normalize order for consistency
  const [p1, p2] = [player1Id, player2Id].sort();

  const { data, error } = await supabase
    .from("pairs")
    .insert({
      player1_id: p1,
      player2_id: p2,
      session_id: sessionId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "This pair already exists in this session" };
    }
    return { error: error.message };
  }

  revalidatePath(`/sessions/${sessionId}`);
  return { success: true, pairId: data.id };
}

export async function deletePair(pairId: string, sessionId: string) {
  if (!(await getIsAdmin())) return { error: "Unauthorized" };

  const supabase = await createClient();

  // Check if pair is used in any match_games
  const { data: matchCount } = await supabase
    .from("match_games")
    .select("id", { count: "exact", head: true })
    .or(`pair1_id.eq.${pairId},pair2_id.eq.${pairId}`);

  if (matchCount && matchCount.length > 0) {
    return { error: "Cannot delete pair — it is used in matches. Delete the matches first." };
  }

  const { error } = await supabase.from("pairs").delete().eq("id", pairId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/sessions/${sessionId}`);
  return { success: true };
}

// ==================== MATCH ACTIONS ====================

export async function createMatch(data: {
  session_id: string;
  best_of: number;
  team1_id?: string | null;
  team2_id?: string | null;
  winning_team_id?: string | null;
  games?: { game_number: number; pair1_id: string; pair2_id: string; pair1_score: number; pair2_score: number; winning_pair_id?: string | null }[];
}) {
  if (!(await getIsAdmin())) return { error: "Unauthorized" };

  const supabase = await createClient();

  const parsed = matchSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .insert({
      session_id: parsed.data.session_id,
      best_of: parsed.data.best_of,
      team1_id: parsed.data.team1_id,
      team2_id: parsed.data.team2_id,
      winning_team_id: parsed.data.winning_team_id,
    })
    .select()
    .single();

  if (matchError) {
    return { error: matchError.message };
  }

  // Insert game scores if provided
  if (data.games && data.games.length > 0) {
    const games = data.games.map((g) => ({
      match_id: match.id,
      game_number: g.game_number,
      pair1_id: g.pair1_id,
      pair2_id: g.pair2_id,
      pair1_score: g.pair1_score,
      pair2_score: g.pair2_score,
      winning_pair_id: g.winning_pair_id,
    }));

    for (const game of games) {
      const gameParsed = matchGameSchema.safeParse(game);
      if (!gameParsed.success) {
        return { error: `Game ${game.game_number}: ${gameParsed.error.issues[0].message}` };
      }
    }

    const { error: gameError } = await supabase
      .from("match_games")
      .insert(games);

    if (gameError) {
      return { error: gameError.message };
    }
  }

  revalidatePath(`/sessions/${data.session_id}`);
  revalidatePath("/analytics");
  revalidatePath("/");
  return { success: true, matchId: match.id };
}

export async function deleteMatch(matchId: string, sessionId: string) {
  if (!(await getIsAdmin())) return { error: "Unauthorized" };

  const supabase = await createClient();

  const { error } = await supabase.from("matches").delete().eq("id", matchId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/analytics");
  revalidatePath("/");
  return { success: true };
}

export async function updateMatch(
  matchId: string,
  data: {
    session_id: string;
    best_of: number;
    team1_id?: string | null;
    team2_id?: string | null;
    winning_team_id?: string | null;
    games?: { game_number: number; pair1_id: string; pair2_id: string; pair1_score: number; pair2_score: number; winning_pair_id?: string | null }[];
  }
) {
  if (!(await getIsAdmin())) return { error: "Unauthorized" };

  const supabase = await createClient();

  const parsed = matchSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error: matchError } = await supabase
    .from("matches")
    .update({
      best_of: parsed.data.best_of,
      team1_id: parsed.data.team1_id,
      team2_id: parsed.data.team2_id,
      winning_team_id: parsed.data.winning_team_id,
    })
    .eq("id", matchId);

  if (matchError) {
    return { error: matchError.message };
  }

  // Delete existing games
  const { error: deleteError } = await supabase
    .from("match_games")
    .delete()
    .eq("match_id", matchId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  // Insert new game scores if provided
  if (data.games && data.games.length > 0) {
    const games = data.games.map((g) => ({
      match_id: matchId,
      game_number: g.game_number,
      pair1_id: g.pair1_id,
      pair2_id: g.pair2_id,
      pair1_score: g.pair1_score,
      pair2_score: g.pair2_score,
      winning_pair_id: g.winning_pair_id,
    }));

    for (const game of games) {
      const gameParsed = matchGameSchema.safeParse(game);
      if (!gameParsed.success) {
        return { error: `Game ${game.game_number}: ${gameParsed.error.issues[0].message}` };
      }
    }

    const { error: gameError } = await supabase
      .from("match_games")
      .insert(games);

    if (gameError) {
      return { error: gameError.message };
    }
  }

  revalidatePath(`/sessions/${data.session_id}`);
  revalidatePath("/analytics");
  revalidatePath("/");
  return { success: true };
}

// ==================== MONTHLY SNAPSHOT ACTIONS ====================

/**
 * Snapshot leaderboard for a given month (YYYY-MM, e.g. "2026-06").
 * Queries all completed sets in that month, computes per-player stats,
 * and upserts into monthly_snapshots. Safe to call multiple times
 * (upsert overwrites with latest data).
 */
export async function snapshotMonth(yearMonth: string) {
  if (!(await getIsAdmin())) return { error: "Unauthorized" };

  // Validate format
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
    return { error: "Invalid month format. Use YYYY-MM." };
  }

  const supabase = await createClient();

  // Derive date range
  const [year, month] = yearMonth.split("-").map(Number);
  const start = new Date(year, month - 1, 1).toISOString();
  const end = new Date(year, month, 1).toISOString(); // first day of next month

  // First day of month as DATE for the snapshot record
  const monthDate = `${yearMonth}-01`;

  // Fetch all completed sets in that month via their parent match created_at
  const { data: rawGames, error: gamesError } = await supabase
    .from("match_games")
    .select(
      `id, winning_pair_id,
       pair1:pairs!match_games_pair1_id_fkey(player1_id, player2_id),
       pair2:pairs!match_games_pair2_id_fkey(player1_id, player2_id),
       match:matches!match_games_match_id_fkey(created_at)`
    )
    .not("winning_pair_id", "is", null);

  if (gamesError) return { error: gamesError.message };

  // Filter to the target month client-side (avoids a join filter complexity)
  const games = (rawGames ?? []).filter((g: any) => {
    const t = g.match?.created_at;
    return t && t >= start && t < end;
  });

  // Aggregate per-player stats
  const statsMap = new Map<string, { won: number; played: number }>();
  const ensure = (id: string) => {
    if (!statsMap.has(id)) statsMap.set(id, { won: 0, played: 0 });
  };

  for (const g of games as any[]) {
    const p1ids: string[] = [g.pair1?.player1_id, g.pair1?.player2_id].filter(Boolean);
    const p2ids: string[] = [g.pair2?.player1_id, g.pair2?.player2_id].filter(Boolean);

    // Determine which pair won (we need pair IDs — fetch them separately is expensive;
    // instead compare winning_pair_id against pair1_id / pair2_id embedded in g)
    // Actually we need the pair id to compare with winning_pair_id.
    // Let's re-query with pair id included.
    for (const id of [...p1ids, ...p2ids]) ensure(id);
    // We'll recompute with pair IDs below
  }

  // Re-fetch including pair ids for win determination
  const { data: games2, error: err2 } = await supabase
    .from("match_games")
    .select(
      `id, pair1_id, pair2_id, winning_pair_id,
       pair1:pairs!match_games_pair1_id_fkey(id, player1_id, player2_id),
       pair2:pairs!match_games_pair2_id_fkey(id, player1_id, player2_id),
       match:matches!match_games_match_id_fkey(created_at)`
    )
    .not("winning_pair_id", "is", null);

  if (err2) return { error: err2.message };

  const monthGames = (games2 ?? []).filter((g: any) => {
    const t = g.match?.created_at;
    return t && t >= start && t < end;
  });

  const stats = new Map<string, { won: number; played: number }>();
  const inc = (id: string) => {
    if (!stats.has(id)) stats.set(id, { won: 0, played: 0 });
  };

  for (const g of monthGames as any[]) {
    const pair1Players: string[] = [g.pair1?.player1_id, g.pair1?.player2_id].filter(Boolean);
    const pair2Players: string[] = [g.pair2?.player1_id, g.pair2?.player2_id].filter(Boolean);
    const pair1Won = g.winning_pair_id === g.pair1_id;

    for (const id of pair1Players) {
      inc(id);
      stats.get(id)!.played++;
      if (pair1Won) stats.get(id)!.won++;
    }
    for (const id of pair2Players) {
      inc(id);
      stats.get(id)!.played++;
      if (!pair1Won) stats.get(id)!.won++;
    }
  }

  if (stats.size === 0) {
    return { error: `No completed sets found for ${yearMonth}.` };
  }

  // Build upsert rows
  const rows = Array.from(stats.entries()).map(([player_id, s]) => ({
    month: monthDate,
    player_id,
    sets_played: s.played,
    sets_won: s.won,
    sets_lost: s.played - s.won,
    win_rate: s.played > 0 ? Math.round((s.won / s.played) * 10000) / 100 : 0,
  }));

  const { error: upsertError } = await supabase
    .from("monthly_snapshots")
    .upsert(rows, { onConflict: "month,player_id" });

  if (upsertError) return { error: upsertError.message };

  revalidatePath("/");
  return { success: true, month: yearMonth, players: rows.length };
}

/** Delete a monthly snapshot (admin correction). */
export async function deleteMonthlySnapshot(month: string) {
  if (!(await getIsAdmin())) return { error: "Unauthorized" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("monthly_snapshots")
    .delete()
    .eq("month", `${month}-01`);

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}
