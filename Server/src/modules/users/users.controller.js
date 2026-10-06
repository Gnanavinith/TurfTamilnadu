import { asyncHandler } from '../../utils/asyncHandler.js'
import { ApiError } from '../../utils/ApiError.js'
import {
  getUserById,
  updateUserById,
  listUsers as getUsers,
  searchPlayers as findPlayers,
  memberUserIdsForTeams,
  createUser as createUserAccount,
  adminUpdateUser,
  updateUserRoleById,
} from './users.service.js'
import { tenantIdForUser } from '../accounts/account.service.js'
import { listTeamIdsForUser } from '../teams/team.service.js'

/**
 * Everything a user-directory query is scoped by, resolved once per request:
 * the caller's account, their teams, and the players on those teams.
 */
async function requestScope(req) {
  const tenantId = req.user.tenantId ?? (await tenantIdForUser(req.user._id))
  const teamIds = await listTeamIdsForUser(req.user._id)
  const memberIds = await memberUserIdsForTeams(teamIds)
  return { tenantId, teamIds, memberIds }
}

export const getProfile = asyncHandler(async (req, res) => {
  const user = await getUserById(req.user._id)
  res.json({ success: true, data: user })
})

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await updateUserById(req.user._id, req.body)
  res.json({ success: true, data: user })
})

export const listUsers = asyncHandler(async (req, res) => {
  const { tenantId, teamIds } = await requestScope(req)
  const { users, pagination } = await getUsers({
    search: req.query.search,
    role: req.query.role,
    page: Number(req.query.page),
    limit: Number(req.query.limit),
    tenantId,
    teamIds,
  })
  res.json({ success: true, data: users, pagination })
})
export const searchPlayers = asyncHandler(async (req, res) => {
  const { tenantId, teamIds } = await requestScope(req)
  const players = await findPlayers({
    search: req.query.search,
    limit: req.query.limit ? Number(req.query.limit) : 30,
    excludeUserId: req.user._id,
    tenantId,
    teamIds,
  })
  res.json({ success: true, data: players })
})

export const createUser = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId ?? (await tenantIdForUser(req.user._id))
  const user = await createUserAccount({ ...req.body, tenantId })
  res.status(201).json({ success: true, data: user })
})

export const adminEditUser = asyncHandler(async (req, res) => {
  const { tenantId, memberIds } = await requestScope(req)
  const user = await adminUpdateUser(req.params.userId, req.body, { tenantId, memberIds })
  res.json({ success: true, data: user })
})

export const updateUserRole = asyncHandler(async (req, res) => {
  const { tenantId, memberIds } = await requestScope(req)
  const target = await adminUpdateUser(req.params.userId, {}, { tenantId, memberIds })
  const user = await updateUserRoleById(target.id, req.body.role)
  if (!user) {
    throw ApiError.notFound('User not found')
  }

  res.json({ success: true, data: user })
})

export default {
  getProfile,
  updateProfile,
  listUsers,
  searchPlayers,
  createUser,
  adminEditUser,
  updateUserRole,
}