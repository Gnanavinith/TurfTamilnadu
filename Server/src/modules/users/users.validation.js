import { z } from 'zod'

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(60).optional().or(z.literal('')),
  avatarUrl: z.string().url().optional().or(z.literal('')),
})

export const updateRoleSchema = z.object({
  role: z.enum(['player', 'scorer', 'admin']),
})

export default { updateProfileSchema, updateRoleSchema }