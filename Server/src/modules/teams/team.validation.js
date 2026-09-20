import { z } from 'zod'
import { emailSchema } from '../auth/auth.validation.js'

export const createTeamSchema = z.object({
  name: z.string().trim().min(2).max(60),
  city: z.string().trim().max(60).optional().or(z.literal('')),
  members: z
    .array(
      z.object({
        email: emailSchema,
        role: z.enum(['admin', 'member']).optional(),
        password: z.string().min(8).max(100).optional(),
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

export default {
  createTeamSchema,
  inviteSchema,
  acceptInviteSchema,
  inviteTokenParamsSchema,
  teamParamsSchema,
  memberParamsSchema,
}