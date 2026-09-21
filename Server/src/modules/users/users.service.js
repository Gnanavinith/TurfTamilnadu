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

export async function listUsers({ search, role, page = 1, limit = 20 } = {}) {
  const filter = {}
  if (role) filter.role = role
  if (search && search.trim()) {
    const term = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    filter.$or = [
      { name: { $regex: term, $options: 'i' } },
      { email: { $regex: term, $options: 'i' } },
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

export async function updateUserRoleById(userId, role) {
  const user = await User.findByIdAndUpdate(userId, { $set: { role } }, { new: true })
    .select(SELECT_PROFILE)
    .lean()

  return user ? sanitizeUser(user) : null
}

export default { sanitizeUser, getUserById, updateUserById, listUsers, updateUserRoleById }