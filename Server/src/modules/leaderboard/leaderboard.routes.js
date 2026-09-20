import { Router } from 'express'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { getLeaderboard } from './leaderboard.service.js'

const router = Router()

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const leaderboard = await getLeaderboard(10)
    res.json({ success: true, data: leaderboard })
  }),
)

export default router