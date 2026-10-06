import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { User } from '../modules/users/user.model.js'

export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization

  if (!header?.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Bearer token required')
  }

  let payload
  try {
    payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET)
  } catch {
    throw ApiError.unauthorized('Invalid or expired token')
  }

  const user = await User.findById(payload.sub)
    .select('_id email name role avatarUrl tenantId')
    .lean()

  if (!user) {
    throw ApiError.unauthorized('Account no longer exists')
  }

  // tenantId rides on req.user so controllers can scope without a second query.
  // It stays off the JWT so revoking an account takes effect immediately.
  req.user = { ...user, id: user._id.toString() }
  next()
})

export default authenticate