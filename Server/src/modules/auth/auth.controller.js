import { asyncHandler } from '../../utils/asyncHandler.js'
import {
  serviceRegister,
  serviceLogin,
  serviceRefresh,
  serviceLogout,
} from './auth.service.js'

export const register = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body
  const { user, accessToken, refreshToken } = await serviceRegister({
    email,
    password,
    name,
  })
  res.status(201).json({ success: true, data: { user, accessToken, refreshToken } })
})

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  const { user, accessToken, refreshToken } = await serviceLogin({ email, password })
  res.json({ success: true, data: { user, accessToken, refreshToken } })
})

export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body
  const data = await serviceRefresh(refreshToken)
  res.json({ success: true, data })
})

export const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body
  await serviceLogout(refreshToken)
  res.json({ success: true, data: { message: 'Logged out' } })
})

export default { register, login, refresh, logout }