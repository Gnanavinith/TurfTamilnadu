import { z } from 'zod'

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id')

const xiSchema = z
  .array(objectId)
  .min(1, 'At least 1 player is required')
  .max(11, 'A team can have at most 11 players')

const tossSchema = z
  .object({
    winnerTeamId: objectId.optional(),
    decision: z.enum(['bat', 'bowl']).optional(),
  })
  .default({})

export const createMatchSchema = z
  .object({
    teamAId: objectId,
    teamBId: objectId,
    overs: z.coerce.number().int().min(1).max(50).default(10),
    matchType: z.enum(['single', 'tournament']).default('single'),
    tournamentName: z.string().trim().max(120).optional().or(z.literal('')),
  // The 5-minute grace lets a "start now" match be created with the current
    // instant, which is how an immediate fixture records its start time.
    scheduledAt: z.coerce.date().refine((date) => date.getTime() > Date.now() - 5 * 60 * 1000, {
      message: 'scheduledAt must be in the future',
    }),
    venue: z.string().trim().max(120).optional().or(z.literal('')),
    toss: tossSchema.optional(),
    playingXI: z
      .object({
        teamA: xiSchema,
        teamB: xiSchema,
      })
      .optional(),
  })
  .refine(
    (data) =>
      data.matchType !== 'tournament' || (data.tournamentName ?? '').length >= 2,
    { message: 'tournamentName is required for a tournament match', path: ['tournamentName'] },
  )

export const matchParamsSchema = z.object({
  matchId: objectId,
})

export const listMatchesQuerySchema = z.object({
  status: z.enum(['scheduled', 'live', 'completed', 'abandoned']).optional(),
  // Omitted (or "all") returns the global feed; "mine" narrows to the caller's
  // own teams, their account and the fixtures they created.
  scope: z.enum(['all', 'mine']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export default {
  createMatchSchema,
  matchParamsSchema,
  listMatchesQuerySchema,
  objectId,
}