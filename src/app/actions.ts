"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  playerSchema,
  sessionSchema,
  matchSchema,
  matchGameSchema,
} from "@/lib/validations";

// ==================== PLAYER ACTIONS ====================

export async function createPlayer(formData: FormData) {
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
