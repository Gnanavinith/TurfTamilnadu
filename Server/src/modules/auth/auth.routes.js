import { Router } from 'express'
import { validate } from '../../middleware/validate.js'
import { rateLimit } from '../../middleware/rateLimit.js'
import {
  register,
  login,
  refresh,
  logout,
} from './auth.controller.js'
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from './auth.validation.js'

const router = Router()

router.post(
  '/register',
  rateLimit({ windowMs: 60_000, limit: 10 }),
  validate({ body: registerSchema }),
  register,
)

router.post(
  '/login',
  rateLimit({ windowMs: 60_000, limit: 20 }),
  validate({ body: loginSchema }),
  login,
)

router.post(
  '/refresh',
  rateLimit({ windowMs: 60_000, limit: 20 }),
  validate({ body: refreshTokenSchema }),
  refresh,
)

router.post(
  '/logout',
  rateLimit({ windowMs: 60_000, limit: 20 }),
  validate({ body: refreshTokenSchema }),
  logout,
)

export default router