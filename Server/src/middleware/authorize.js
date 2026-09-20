import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { Membership } from '../modules/teams/membership.model.js'
import { Match } from '../modules/matches/match.model.js'

export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Requires role: ${roles.join(' or ')}`))
    }
    return next()
  }

export const canScore = (req, _res, next) => {
  if (!req.user || !['scorer', 'admin'].includes(req.user.role)) {
    return next(ApiError.forbidden('Scorer access required'))
  }
  return next()
}

export const isTeamAdmin = asyncHandler(async (req, _res, next) => {
  const { teamId } = req.params
  const membership = await Membership.findOne({
    teamId,
    userId: req.user._id,
    role: 'admin',
    status: 'active',
  }).lean()

  if (!membership) {
    throw ApiError.forbidden('Team admin access required')
  }
  next()
})

export const canManageMatch = asyncHandler(async (req, _res, next) => {
  const matchId = req.params.matchId ?? req.params.id
  const match = await Match.findById(matchId)

  if (!match) {
    throw ApiError.notFound('Match not found')
  }

  if (req.user.role === 'admin') {
    req.match = match
    return next()
  }

  const memberships = await Membership.find({
    userId: req.user._id,
    role: 'admin',
    status: 'active',
  })
    .select('teamId')
    .lean()

  const adminTeamIds = new Set(memberships.map((m) => String(m.teamId)))
  const involved = [match.teamAId, match.teamBId].some((id) =>
    adminTeamIds.has(String(id)),
  )
  const isCreator =
    match.createdBy && String(match.createdBy) === String(req.user._id)

  if (!involved && !isCreator) {
    throw ApiError.forbidden('Cannot manage this match')
  }

  req.match = match
  next()
})

export default { requireRole, isTeamAdmin, canScore, canManageMatch }