import { z } from "zod";

export const playerSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name too long"),
  nickname: z.string().max(30, "Nickname too long").nullable().optional(),
});

export const sessionSchema = z.object({
  name: z.string().min(1, "Session name is required").max(100, "Name too long"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().max(500, "Notes too long").nullable().optional(),
});

export const pairSchema = z
  .object({
    player1_id: z.string().uuid("Invalid player"),
    player2_id: z.string().uuid("Invalid player"),
    session_id: z.string().uuid("Invalid session"),
  })
  .refine((data) => data.player1_id !== data.player2_id, {
    message: "A player cannot be paired with themselves",
    path: ["player2_id"],
  });

export const matchSchema = z
  .object({
    session_id: z.string().uuid("Invalid session"),
    team1_id: z.string().uuid("Invalid team").nullable().optional(),
    team2_id: z.string().uuid("Invalid team").nullable().optional(),
    best_of: z.coerce.number().refine((v) => [1, 3, 5, 7, 9, 11, 13, 15].includes(v), {
      message: "Best of must be 1, 3, 5, 7, 9, 11, 13, or 15",
    }),
    winning_team_id: z.string().uuid("Invalid team").nullable().optional(),
  })
  .refine(
    (data) => {
      // If teams are provided, they must be different
      if (data.team1_id && data.team2_id) {
        return data.team1_id !== data.team2_id;
      }
      return true;
    },
    {
      message: "A team cannot play against itself",
      path: ["team2_id"],
    }
  );

export const matchGameSchema = z.object({
  match_id: z.string().uuid("Invalid match"),
  game_number: z.coerce.number().int().positive("Game number must be positive"),
  pair1_id: z.string().uuid("Invalid pair"),
  pair2_id: z.string().uuid("Invalid pair"),
  pair1_score: z.coerce.number().int().min(0, "Score cannot be negative"),
  pair2_score: z.coerce.number().int().min(0, "Score cannot be negative"),
  winning_pair_id: z.string().uuid("Invalid pair").nullable().optional(),
});

export type PlayerFormData = z.infer<typeof playerSchema>;
export type SessionFormData = z.infer<typeof sessionSchema>;
export type PairFormData = z.infer<typeof pairSchema>;
export type MatchFormData = z.infer<typeof matchSchema>;
export type MatchGameFormData = z.infer<typeof matchGameSchema>;
