import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import {
  getProfile,
  updateProfile,
  listUsers,
  updateUserRole,
} from './users.controller.js'
import { updateProfileSchema, updateRoleSchema } from './users.validation.js'

const router = Router()

router.use(authenticate)

router.get('/me', getProfile)
router.patch('/me', validate({ body: updateProfileSchema }), updateProfile)

router.get('/', requireRole('admin'), listUsers)
router.patch('/:userId/role', requireRole('admin'), validate({ body: updateRoleSchema }), updateUserRole)

export default router