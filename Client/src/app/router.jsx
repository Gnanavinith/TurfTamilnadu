import { Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import GullyLayout from '../features/gully/GullyAppLayout'
import Loader from '../components/Loader'
import ProtectedRoute from '../routes/ProtectedRoute'
import RoleRoute from '../routes/RoleRoute'
import {
  OnboardingPage,
  LoginPage,
  InvitePage,
  MyTeams,
  TeamDetail,
  CreateMatch,
  MatchList,
  ScorerPage,
  LiveMatchPage,
  LeaderboardPage,
  UsersAdminPage,
  PublicHomePage,
} from '../routes/lazyPages'

const withSuspense = (element) => (
  <Suspense fallback={<Loader />}>{element}</Suspense>
)

export const router = createBrowserRouter([
  {
    path: '/home',
    element: withSuspense(<PublicHomePage />),
  },
  {
    path: '/onboarding',
    element: withSuspense(<OnboardingPage />),
  },
  {
    path: '/login',
    element: withSuspense(<LoginPage />),
  },
  {
    path: '/invite/:token',
    element: withSuspense(<InvitePage />),
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <GullyLayout />,
        children: [
          {
            index: true,
            element: withSuspense(<MatchList />),
          },
          {
            path: 'leaderboard',
            element: withSuspense(<LeaderboardPage />),
          },
          {
            path: 'live/:matchId',
            element: withSuspense(<LiveMatchPage />),
          },
          {
            path: 'teams',
            element: withSuspense(<MyTeams />),
          },
          {
            path: 'teams/:teamId',
            element: withSuspense(<TeamDetail />),
          },
          {
            path: 'matches/create',
            element: withSuspense(<CreateMatch />),
          },
          {
            element: <RoleRoute roles={['scorer', 'admin']} />,
            children: [
              {
                path: 'scoring/:matchId',
                element: withSuspense(<ScorerPage />),
              },
            ],
          },
          {
            element: <RoleRoute roles={['admin']} />,
            children: [
              {
                path: 'users',
                element: withSuspense(<UsersAdminPage />),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/home" replace />,
  },
])

export default router