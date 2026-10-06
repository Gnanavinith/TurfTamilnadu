import { z } from 'zod'

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(60).optional().or(z.literal('')),
  avatarUrl: z.string().url().optional().or(z.literal('')),
})

export const updateRoleSchema = z.object({
  role: z.enum(['player', 'scorer', 'admin']),
})

export const searchPlayersQuerySchema = z.object({
  search: z.string().trim().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
})

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100),
  role: z.enum(['player', 'scorer', 'admin']).default('player'),
})

export const adminUpdateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(60),
    email: z.string().trim().toLowerCase().email(),
    role: z.enum(['player', 'scorer', 'admin']),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  })

export default {
  updateProfileSchema,
  updateRoleSchema,
  searchPlayersQuerySchema,
  createUserSchema,
  adminUpdateUserSchema,
}