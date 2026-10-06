import { Router } from 'express'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { listMatches, getMatchSnapshot } from '../matches/match.service.js'
import { getLeaderboard } from '../leaderboard/leaderboard.service.js'
import { listPublicTeams, getPublicTeamDetail } from '../teams/team.service.js'

const router = Router()

router.get(
  '/matches',
  asyncHandler(async (req, res) => {
    const matches = await listMatches({ status: req.query.status })
    res.json({ success: true, data: matches })
  }),
)

router.get(
  '/matches/:matchId',
  asyncHandler(async (req, res) => {
    const match = await getMatchSnapshot(req.params.matchId)
    res.json({ success: true, data: match })
  }),
)

router.get(
  '/teams',
  asyncHandler(async (_req, res) => {
    res.json({ success: true, data: await listPublicTeams() })
  }),
)

router.get(
  '/teams/:teamId',
  asyncHandler(async (req, res) => {
    const team = await getPublicTeamDetail(req.params.teamId)
    res.json({ success: true, data: team })
  }),
)

router.get(
  '/leaderboard',
  asyncHandler(async (_req, res) => {
    res.json({ success: true, data: await getLeaderboard() })
  }),
)

export default router
