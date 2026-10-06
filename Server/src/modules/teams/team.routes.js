import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import { isTeamAdmin } from '../../middleware/authorize.js'
import {
  createTeamHandler,
  updateTeamHandler,
  myTeamsHandler,
  getTeamHandler,
  inviteHandler,
  inviteInfoHandler,
  acceptInviteHandler,
  updateMemberHandler,
  removeMemberHandler,
} from './team.controller.js'
import {
  createTeamSchema,
  updateTeamSchema,
  inviteSchema,
  acceptInviteSchema,
  inviteTokenParamsSchema,
  teamParamsSchema,
  memberParamsSchema,
  updateMemberSchema,
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
router.patch(
  '/:teamId',
  validate({ params: teamParamsSchema, body: updateTeamSchema }),
  isTeamAdmin,
  updateTeamHandler,
)
router.post(
  '/:teamId/invites',
  validate({ params: teamParamsSchema, body: inviteSchema }),
  isTeamAdmin,
  inviteHandler,
)
router.patch(
  '/:teamId/members/:memberId',
  validate({ params: memberParamsSchema, body: updateMemberSchema }),
  // Same gate as DELETE and PATCH /:teamId — editing a member (role, shirt
  // number) is an admin action. It was only authenticated before.
  isTeamAdmin,
  updateMemberHandler,
)
router.delete(
  '/:teamId/members/:memberId',
  validate({ params: memberParamsSchema }),
  isTeamAdmin,
  removeMemberHandler,
)

export default router