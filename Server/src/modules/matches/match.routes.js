import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import { rateLimit } from '../../middleware/rateLimit.js'
import { canManageMatch } from '../../middleware/authorize.js'
import {
  createMatchHandler,
  listMatchesHandler,
  getMatchHandler,
  startMatchHandler,
} from './match.controller.js'
import {
  createMatchSchema,
  matchParamsSchema,
  listMatchesQuerySchema,
} from './match.validation.js'

const router = Router()

router.post(
  '/',
  authenticate,
  rateLimit({ windowMs: 60_000, limit: 30 }),
  validate({ body: createMatchSchema }),
  createMatchHandler,
)

router.get(
  '/',
  authenticate,
  validate({ query: listMatchesQuerySchema }),
  listMatchesHandler,
)

router.get(
  '/:matchId',
  authenticate,
  validate({ params: matchParamsSchema }),
  getMatchHandler,
)

router.post(
  '/:matchId/start',
  authenticate,
  validate({ params: matchParamsSchema }),
  canManageMatch,
  startMatchHandler,
)

export default router