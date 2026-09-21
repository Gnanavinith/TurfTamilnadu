import { asyncHandler } from '../../utils/asyncHandler.js'
import { ApiError } from '../../utils/ApiError.js'
import {
  getUserById,
  updateUserById,
  listUsers as getUsers,
  updateUserRoleById,
} from './users.service.js'

export const getProfile = asyncHandler(async (req, res) => {
  const user = await getUserById(req.user._id)
  res.json({ success: true, data: user })
})

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await updateUserById(req.user._id, req.body)
  res.json({ success: true, data: user })
})

export const listUsers = asyncHandler(async (req, res) => {
  const { users, pagination } = await getUsers({
    search: req.query.search,
    role: req.query.role,
    page: Number(req.query.page),
    limit: Number(req.query.limit),
  })
  res.json({ success: true, data: users, pagination })
})

export const updateUserRole = asyncHandler(async (req, res) => {
  const user = await updateUserRoleById(req.params.userId, req.body.role)
  if (!user) {
    throw ApiError.notFound('User not found')
  }

  res.json({ success: true, data: user })
})

export default { getProfile, updateProfile, listUsers, updateUserRole }