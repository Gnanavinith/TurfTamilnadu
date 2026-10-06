import { z } from 'zod'
import { emailSchema } from '../auth/auth.validation.js'

export const specialtySchema = z
  .enum(['batter', 'bowler', 'all_rounder', 'wicket_keeper', ''])
  .default('')

export const avatarColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color')
  .optional()
  .or(z.literal(''))

// Squad players are picked from existing accounts by id, so a team is never
// created with placeholder logins the way the old email+password list did.
export const squadPlayerSchema = z.object({
  userId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid user id'),
  specialty: specialtySchema.optional(),
  jerseyNumber: z.coerce.number().int().min(1).max(99).optional().nullable(),
  role: z.enum(['admin', 'member']).optional(),
})

export const createTeamSchema = z.object({
  name: z.string().trim().min(2).max(60),
  shortName: z.string().trim().max(12).optional().or(z.literal('')),
  city: z.string().trim().max(60).optional().or(z.literal('')),
  players: z.array(squadPlayerSchema).max(40).optional(),
})

export const updateTeamSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  shortName: z.string().trim().max(12).optional().or(z.literal('')),
  city: z.string().trim().max(60).optional().or(z.literal('')),
  players: z.array(squadPlayerSchema).max(40).optional(),
})

export const inviteSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(100),
})

export const acceptInviteSchema = z.object({
  token: z.string().min(20),
})

export const inviteTokenParamsSchema = z.object({
  token: z.string().min(20).max(128),
})

export const teamParamsSchema = z.object({
  teamId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid team id'),
})

export const memberParamsSchema = z.object({
  teamId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid team id'),
  memberId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid member id'),
})

export const updateMemberSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  specialty: specialtySchema.optional(),
  designation: z.enum(['captain', 'vice_captain', 'none']).optional(),
  avatarColor: avatarColorSchema,
  jerseyNumber: z.coerce.number().int().min(1).max(99).nullable().optional(),
})

export default {
  createTeamSchema,
  updateTeamSchema,
  inviteSchema,
  acceptInviteSchema,
  inviteTokenParamsSchema,
  teamParamsSchema,
  memberParamsSchema,
  updateMemberSchema,
}