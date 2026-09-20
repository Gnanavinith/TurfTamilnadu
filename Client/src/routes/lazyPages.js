import { lazy } from 'react'

export const LoginPage = lazy(() => import('../features/auth/pages/LoginPage'))
export const InvitePage = lazy(() => import('../features/teams/pages/InvitePage'))
export const MyTeams = lazy(() => import('../features/teams/pages/MyTeams'))
export const TeamDetail = lazy(() => import('../features/teams/pages/TeamDetail'))
export const CreateMatch = lazy(() => import('../features/matches/pages/CreateMatch'))
export const MatchList = lazy(() => import('../features/matches/pages/MatchList'))
export const ScorerPage = lazy(() => import('../features/scoring/pages/ScorerPage'))
export const LiveMatchPage = lazy(() => import('../features/live/pages/LiveMatchPage'))
export const LeaderboardPage = lazy(() => import('../features/leaderboard/pages/LeaderboardPage'))
export const UsersAdminPage = lazy(() => import('../features/users/pages/UsersAdminPage'))