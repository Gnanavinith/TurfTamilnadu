import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import { isTeamAdmin } from '../../middleware/authorize.js'
import {
  createTeamHandler,
  myTeamsHandler,
  getTeamHandler,
  inviteHandler,
  inviteInfoHandler,
  acceptInviteHandler,
  removeMemberHandler,
} from './team.controller.js'
import {
  createTeamSchema,
  inviteSchema,
  acceptInviteSchema,
  inviteTokenParamsSchema,
  teamParamsSchema,
  memberParamsSchema,
} from './team.validation.js'

const router = Router()

// Public: the invite link lander resolves the token without an account.
router.get(
  '/invites/:token',
  validate({ params: inviteTokenParamsSchema }),
  inviteInfoHandler,
)

router.use(authenticate)

router.post('/', validate({ body: createTeamSchema }), createTeamHandler)
router.get('/', myTeamsHandler)

router.post(
  '/invites/accept',
  validate({ body: acceptInviteSchema }),
  acceptInviteHandler,
)

router.get(
  '/:teamId',
  validate({ params: teamParamsSchema }),
  getTeamHandler,
)
router.post(
  '/:teamId/invites',
  validate({ params: teamParamsSchema, body: inviteSchema }),
  isTeamAdmin,
  inviteHandler,
)
router.delete(
  '/:teamId/members/:memberId',
  validate({ params: memberParamsSchema }),
  isTeamAdmin,
  removeMemberHandler,
)

export default router