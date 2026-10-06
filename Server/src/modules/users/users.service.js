import bcrypt from 'bcryptjs'
import { User } from './user.model.js'
import { Membership } from '../teams/membership.model.js'
import { ApiError } from '../../utils/ApiError.js'

const SELECT_PROFILE = '_id email name role avatarUrl createdAt'

/**
 * Can this account see and edit this user? True when they share a tenant, or
 * when the user sits on one of the caller's teams (a squad member who signed up
 * through someone else's ground). `memberIds` are *user* ids, not team ids.
 */
function isVisibleToAccount(target, { tenantId = null, memberIds = [] } = {}) {
  if (tenantId && target.tenantId && String(target.tenantId) === String(tenantId)) return true
  if (memberIds.some((id) => String(id) === String(target._id))) return true
  return false
}

export function sanitizeUser(user) {
  if (!user) return null
  return {
    id: String(user._id ?? user.id),
    email: user.email,
    name: user.name ?? null,
    role: user.role ?? 'player',
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt,
  }
}

export async function getUserById(userId) {
  const user = await User.findById(userId).select(SELECT_PROFILE).lean()
  return user ? sanitizeUser(user) : null
}

export async function updateUserById(userId, updates) {
  const allowed = {}
  if (updates.name !== undefined) allowed.name = updates.name
  if (updates.avatarUrl !== undefined) allowed.avatarUrl = updates.avatarUrl

  const user = await User.findByIdAndUpdate(userId, { $set: allowed }, { new: true })
    .select(SELECT_PROFILE)
    .lean()

  return user ? sanitizeUser(user) : null
}

export async function listUsers({
  search,
  role,
  tenantId = null,
  teamIds = [],
  page = 1,
  limit = 20,
} = {}) {
  // The admin user list is tenant-scoped too: an admin manages the accounts in
  // their own ground, not every account on the platform.
  const visibility = []
  if (teamIds.length > 0) {
    const memberIds = await memberUserIdsForTeams(teamIds)
    if (memberIds.length > 0) visibility.push({ _id: { $in: memberIds } })
  }
  if (tenantId) visibility.push({ tenantId })
  if (visibility.length === 0) {
    return { users: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } }
  }

  const filter = { $or: visibility }
  if (role) filter.role = role
  if (search && search.trim()) {
    const term = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    filter.$and = [
      {
        $or: [
          { name: { $regex: term, $options: 'i' } },
          { email: { $regex: term, $options: 'i' } },
        ],
      },
    ]
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100)
  const safePage = Math.max(Number(page) || 1, 1)

  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .select(SELECT_PROFILE)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
  ])

  return {
    users: users.map(sanitizeUser),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  }
}

/**
 * Player search for building a squad roster. Available to any signed-in user
 * (unlike the admin-only user list) but returns only profile fields, never
 * credentials.
 *
 * Scoped to the caller's own world: players on the caller's teams, plus accounts
 * created under the caller's own tenant. Without this the endpoint leaked every
 * user in the database to anyone signed in, across all accounts. `excludeUserId`
 * keeps the caller out of their own results.
 */
export async function searchPlayers({
  search,
  excludeUserId,
  teamIds = [],
  tenantId = null,
  limit = 30,
} = {}) {
  // Visibility = players on the caller's teams, plus accounts created under the
  // caller's own tenant. Without this the endpoint leaked every user in the
  // database to anyone signed in, across all accounts.
  const visibility = []
  if (teamIds.length > 0) {
    const memberIds = await memberUserIdsForTeams(teamIds)
    if (memberIds.length > 0) visibility.push({ _id: { $in: memberIds } })
  }
  if (tenantId) visibility.push({ tenantId })
  // Nothing visible yet (new account, no teams): return nothing rather than
  // falling through to an unscoped query.
  if (visibility.length === 0) return []

  const filter = { $or: visibility }
  if (excludeUserId) {
    filter._id = { $ne: excludeUserId }
  }
  if (search && search.trim()) {
    const term = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    filter.$and = [
      {
        $or: [
          { name: { $regex: term, $options: 'i' } },
          { email: { $regex: term, $options: 'i' } },
        ],
      },
    ]
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 50)

  const users = await User.find(filter)
    .select(SELECT_PROFILE)
    .sort({ name: 1 })
    .limit(safeLimit)
    .lean()

  return users.map(sanitizeUser)
}

/**
 * The user ids of every active member on the given teams. Turns team ids into
 * the people who can see them, so the player directory can be scoped by squad
 * without loading whole Membership documents into the query.
 */
export async function memberUserIdsForTeams(teamIds) {
  if (!teamIds?.length) return []
  const memberships = await Membership.find({
    teamId: { $in: teamIds },
    status: 'active',
  })
    .select('userId')
    .lean()
  return [...new Set(memberships.map((m) => String(m.userId)))]
}

/**
 * Admin-created account (typically a player added to a squad by an organiser).
 * The password is hashed here so admins never handle plaintext beyond the
 * request itself, and the new account can sign in immediately.
 */
export async function createUser({
  name,
  email,
  password,
  role = 'player',
  tenantId = null,
}) {
  const existing = await User.findOne({ email }).select('+password')
  if (existing?.password) {
    throw ApiError.conflict('An account already exists for this email')
  }

  const hashed = await bcrypt.hash(password, 10)

  // Reuse a passwordless stub (e.g. left over from a team invite) if present.
  // The new account is stamped with the organiser's tenant so it shows up in
  // their directory, but never with a different account's.
  const user = existing
    ? await User.findByIdAndUpdate(
        existing._id,
        { $set: { name, password: hashed, role, ...(tenantId ? { tenantId } : {}) } },
        { new: true },
      )
    : await User.create({ name, email, password: hashed, role, tenantId: tenantId ?? null })

  return sanitizeUser(user)
}

/**
 * Admin edit of another account's identity fields. Email is checked against
 * other documents so the unique index can't blow up with a raw duplicate key.
 * The caller must share a tenant with the target, or be on one of its teams.
 */
export async function adminUpdateUser(userId, updates, { tenantId = null, memberIds = [] } = {}) {
  const target = await User.findById(userId).select('_id tenantId').lean()
  if (!target) throw ApiError.notFound('User not found')

  if (!isVisibleToAccount(target, { tenantId, memberIds })) {
    throw ApiError.notFound('User not found')
  }

  const allowed = {}
  if (updates.name !== undefined) allowed.name = updates.name
  if (updates.role !== undefined) allowed.role = updates.role
  if (updates.email !== undefined) {
    const clash = await User.findOne({ email: updates.email, _id: { $ne: userId } })
      .select('_id')
      .lean()
    if (clash) throw ApiError.conflict('Another account already uses this email')
    allowed.email = updates.email
  }

  const updated = await User.findByIdAndUpdate(userId, { $set: allowed }, { new: true })
    .select(SELECT_PROFILE)
    .lean()

  return sanitizeUser(updated)
}

export async function updateUserRoleById(userId, role) {
  const user = await User.findByIdAndUpdate(userId, { $set: { role } }, { new: true })
    .select(SELECT_PROFILE)
    .lean()

  return user ? sanitizeUser(user) : null
}

export default {
  sanitizeUser,
  getUserById,
  updateUserById,
  listUsers,
  searchPlayers,
  memberUserIdsForTeams,
  createUser,
  adminUpdateUser,
  updateUserRoleById,
}