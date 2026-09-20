import { User } from './user.model.js'

const SELECT_PROFILE = '_id email name role avatarUrl createdAt'

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

export async function listUsers() {
  const users = await User.find().select(SELECT_PROFILE).sort({ createdAt: -1 }).lean()
  return users.map(sanitizeUser)
}

export async function updateUserRoleById(userId, role) {
  const user = await User.findByIdAndUpdate(userId, { $set: { role } }, { new: true })
    .select(SELECT_PROFILE)
    .lean()

  return user ? sanitizeUser(user) : null
}

export default { sanitizeUser, getUserById, updateUserById, listUsers, updateUserRoleById }