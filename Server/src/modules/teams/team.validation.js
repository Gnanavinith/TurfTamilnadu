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

export const createTeamSchema = z.object({
  name: z.string().trim().min(2).max(60),
  shortName: z.string().trim().max(12).optional().or(z.literal('')),
  city: z.string().trim().max(60).optional().or(z.literal('')),
  members: z
    .array(
      z.object({
        email: emailSchema,
        role: z.enum(['admin', 'member']).optional(),
        password: z.string().min(8).max(100).optional(),
        specialty: specialtySchema.optional(),
      }),
    )
    .max(40)
    .optional(),
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
})

export default {
  createTeamSchema,
  inviteSchema,
  acceptInviteSchema,
  inviteTokenParamsSchema,
  teamParamsSchema,
  memberParamsSchema,
  updateMemberSchema,
}