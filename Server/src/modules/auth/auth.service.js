import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { env } from '../../config/env.js'
import { User } from '../users/user.model.js'
import { sanitizeUser } from '../users/users.service.js'
import { RefreshToken } from './refreshToken.model.js'
import { ensureAccountForUser } from '../accounts/account.service.js'
import { ApiError } from '../../utils/ApiError.js'

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex')

const TOKEN_TYPES = { access: 'access', refresh: 'refresh' }

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      type: TOKEN_TYPES.access,
      jti: crypto.randomUUID(),
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES },
  )
}

function signRefreshToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      type: TOKEN_TYPES.refresh,
      // jti guarantees uniqueness even when two tokens are minted in the
      // same second (jwt iat has 1s granularity), keeping the hashed
      // tokenHash unique-index safe.
      jti: crypto.randomUUID(),
    },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES },
  )
}

async function issueTokenPair(user) {
  const accessToken = signAccessToken(user)
  const refreshToken = signRefreshToken(user)
  const decoded = jwt.decode(refreshToken)

  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(decoded.exp * 1000),
  })

  return { accessToken, refreshToken }
}

const hashPassword = (password) => bcrypt.hash(password, 10)

export async function serviceRegister({ email, name, password }) {
  let user = await User.findOne({ email }).select('+password')

  if (user?.password) {
    throw ApiError.conflict(
      'An account already exists for this email. Sign in with your password instead.',
    )
  }

  const hashed = await hashPassword(password)

  if (user) {
    // The account exists as a stub (e.g. created for a team invite) but has no
    // password yet — finishing sign-up just sets one. Everyone who signs up
    // becomes an admin by default.
    user.name = name ?? user.name
    user.password = hashed
    user.role = 'admin'
    await user.save()
  } else {
    user = await User.create({ email, name, password: hashed, role: 'admin' })
  }

  // Every admin gets their own account, so a brand new sign-in starts with zero
  // teams, players and matches rather than inheriting anyone else's data.
  await ensureAccountForUser(user)

  const tokens = await issueTokenPair(user)
  return { user: sanitizeUser(user), ...tokens }
}

export async function serviceLogin({ email, password }) {
  const user = await User.findOne({ email }).select('+password')

  if (!user?.password) {
    throw ApiError.unauthorized(
      'No account found for this email. Create an account first.',
    )
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) throw ApiError.unauthorized('Incorrect email or password')

  // Backfill for accounts created before tenancy existed, so signing in is
  // enough to give an old admin their own (empty) account.
  await ensureAccountForUser(user)

  const tokens = await issueTokenPair(user)
  return { user: sanitizeUser(user), ...tokens }
}

export async function serviceRefresh(rawToken) {
  if (!rawToken) throw ApiError.unauthorized('Refresh token required')

  let payload
  try {
    payload = jwt.verify(rawToken, env.JWT_REFRESH_SECRET)
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token')
  }
  if (payload.type !== TOKEN_TYPES.refresh) {
    throw ApiError.unauthorized('Invalid token type')
  }

  const tokenHash = hashToken(rawToken)
  const record = await RefreshToken.findOne({ tokenHash })
  if (!record || record.revokedAt) {
    throw ApiError.unauthorized('Refresh token has been revoked')
  }

  const user = await User.findById(record.userId)
  if (!user) {
    throw ApiError.unauthorized('Account no longer exists')
  }

  // Rotate: revoke the presented token and issue a fresh pair.
  const { accessToken, refreshToken } = await issueTokenPair(user)
  await RefreshToken.updateOne(
    { _id: record._id },
    {
      $set: {
        revokedAt: new Date(),
        replacedByTokenHash: hashToken(refreshToken),
      },
    },
  )

  return { user: sanitizeUser(user), accessToken, refreshToken }
}

export async function serviceLogout(rawToken) {
  if (!rawToken) return
  const tokenHash = hashToken(rawToken)
  await RefreshToken.updateOne({ tokenHash }, { $set: { revokedAt: new Date() } })
}

export default { serviceRegister, serviceLogin, serviceRefresh, serviceLogout }