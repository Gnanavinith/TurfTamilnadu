import { z } from 'zod'

export const emailSchema = z
  .string({ message: 'Email is required' })
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')

export const passwordSchema = z
  .string({ message: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be at most 100 characters')

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z
    .string()
    .trim()
    .max(60, 'Name must be at most 60 characters')
    .optional()
    .or(z.literal('')),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ message: 'Password is required' }).min(1),
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
})

export default {
  emailSchema,
  passwordSchema,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
}