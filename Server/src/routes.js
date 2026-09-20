import { Router } from 'express'
import usersRoutes from './modules/users/users.routes.js'
import authRoutes from './modules/auth/auth.routes.js'
import teamRoutes from './modules/teams/team.routes.js'
import matchRoutes from './modules/matches/match.routes.js'
import leaderboardRoutes from './modules/leaderboard/leaderboard.routes.js'
import publicRoutes from './modules/public/public.routes.js'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } })
})

router.use('/users', usersRoutes)
router.use('/auth', authRoutes)
router.use('/teams', teamRoutes)
router.use('/matches', matchRoutes)
router.use('/leaderboard', leaderboardRoutes)
router.use('/public', publicRoutes)

export default router