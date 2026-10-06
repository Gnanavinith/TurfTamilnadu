import { Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import GullyLayout from '../features/gully/GullyAppLayout'
import Loader from '../components/Loader'
import ProtectedRoute from '../routes/ProtectedRoute'
import RoleRoute from '../routes/RoleRoute'
import {
  OnboardingPage,
  InvitePage,
  MyTeams,
  TeamDetail,
  CreateMatch,
  MatchList,
  ScorerPage,
  LiveMatchPage,
  LeaderboardPage,
  UsersAdminPage,
  PlayersPage,
} from '../routes/lazyPages'

const withSuspense = (element) => (
  <Suspense fallback={<Loader />}>{element}</Suspense>
)

export const router = createBrowserRouter([
  {
    path: '/onboarding',
    element: withSuspense(<OnboardingPage />),
  },
  {
    // No login screen: /login drops you on the home page with the dialog open.
    path: '/login',
    element: <Navigate to="/" replace state={{ auth: true, mode: 'signin' }} />,
  },
  {
    path: '/home',
    element: <Navigate to="/" replace />,
  },
  {
    // Home page: the public feed for visitors, your matches once signed in.
    element: <GullyLayout />,
    children: [
      {
        index: true,
        element: withSuspense(<MatchList />),
      },
      {
        path: 'teams',
        element: withSuspense(<MyTeams />),
      },
      {
        path: 'players',
        element: withSuspense(<PlayersPage />),
      },
      {
        path: 'teams/:teamId',
        element: withSuspense(<TeamDetail />),
      },
    ],
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
            path: 'leaderboard',
            element: withSuspense(<LeaderboardPage />),
          },
          {
            path: 'live/:matchId',
            element: withSuspense(<LiveMatchPage />),
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
    element: <Navigate to="/" replace />,
  },
])

export default router
