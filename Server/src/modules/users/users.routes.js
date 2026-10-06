import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import {
  getProfile,
  updateProfile,
  listUsers,
  searchPlayers,
  createUser,
  adminEditUser,
  updateUserRole,
} from './users.controller.js'
import {
  updateProfileSchema,
  updateRoleSchema,
  searchPlayersQuerySchema,
  createUserSchema,
  adminUpdateUserSchema,
} from './users.validation.js'

const router = Router()

router.use(authenticate)

router.get('/me', getProfile)
router.patch('/me', validate({ body: updateProfileSchema }), updateProfile)

// Player directory for squad building: any signed-in user, profile fields only.
router.get(
  '/players',
  validate({ query: searchPlayersQuerySchema }),
  searchPlayers,
)

router.post('/', requireRole('admin'), validate({ body: createUserSchema }), createUser)

router.get('/', requireRole('admin'), listUsers)
router.patch(
  '/:userId',
  requireRole('admin'),
  validate({ body: adminUpdateUserSchema }),
  adminEditUser,
)
router.patch('/:userId/role', requireRole('admin'), validate({ body: updateRoleSchema }), updateUserRole)

export default router