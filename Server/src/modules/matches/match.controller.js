import { asyncHandler } from '../../utils/asyncHandler.js'
import {
  createMatch,
  listMatches,
  startMatch,
  getMatch,
} from './match.service.js'

export const createMatchHandler = asyncHandler(async (req, res) => {
  const match = await createMatch({
    ...req.body,
    createdBy: req.user._id,
  })
  res.status(201).json({ success: true, data: match })
})

export const listMatchesHandler = asyncHandler(async (req, res) => {
  const matches = await listMatches({
    userId: req.user?._id,
    status: req.query.status,
    limit: req.query.limit ? Number(req.query.limit) : 50,
  })
  res.json({ success: true, data: matches })
})

export const getMatchHandler = asyncHandler(async (req, res) => {
  const match = await getMatch(req.params.matchId)
  res.json({ success: true, data: match })
})

export const startMatchHandler = asyncHandler(async (req, res) => {
  const match = await startMatch(req.params.matchId)
  res.json({ success: true, data: match })
})

export default {
  createMatchHandler,
  listMatchesHandler,
  getMatchHandler,
  startMatchHandler,
}