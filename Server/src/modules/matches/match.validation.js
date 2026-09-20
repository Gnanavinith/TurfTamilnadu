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

export const createMatchSchema = z.object({
  teamAId: objectId,
  teamBId: objectId,
  overs: z.coerce.number().int().min(1).max(50).default(10),
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

export const matchParamsSchema = z.object({
  matchId: objectId,
})

export const listMatchesQuerySchema = z.object({
  status: z.enum(['scheduled', 'live', 'completed', 'abandoned']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export default {
  createMatchSchema,
  matchParamsSchema,
  listMatchesQuerySchema,
  objectId,
}