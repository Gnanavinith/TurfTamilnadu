import { useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTheme } from '../../components/useTheme'
import { useAuth } from '../auth/hooks/useAuth'
import { useAuthPrompt } from '../auth/hooks/useAuthPrompt'
import AuthModal from '../auth/components/AuthModal'
import { fetchMatches } from '../matches/api'
import { fetchPublicMatches } from '../public/api'
import { MATCH_STATUS } from '../../utils/constants'
import { GullyFeedbackProvider } from './feedback'

function TabIcon({ name }) {
  if (name === 'home') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l9-8 9 8" />
        <path d="M5 10v10h14V10" />
        <path d="M10 20v-6h4v6" />
      </svg>
    )
  }
  if (name === 'players') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="7.5" r="3.4" />
        <path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5" />
      </svg>
    )
  }
  if (name === 'teams' || name === 'users') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" />
        <path d="M16 5.5a3 3 0 0 1 0 5.6M18 20c0-2.6-.9-4.4-2.4-5.4" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
      <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4" />
      <path d="M12 13v4M8 20h8" />
    </svg>
  )
}

function TickerStrip() {
  const { isAuthenticated } = useAuthPrompt()
  const { data } = useQuery({
    queryKey: ['ticker', isAuthenticated],
    queryFn: () => (isAuthenticated ? fetchMatches({}) : fetchPublicMatches({})),
    staleTime: 60_000,
    refetchInterval: 60_000,
  })

  const items = useMemo(() => {
    const matches = data?.data ?? []
    const label = (match) =>
      `${match.teamA?.name ?? 'Team A'} vs ${match.teamB?.name ?? 'Team B'}`
    const built = [
      ...matches
        .filter((match) => match.status === MATCH_STATUS.LIVE)
        .map((match) => ({ tag: 'LIVE', text: label(match) })),
      ...matches
        .filter((match) => match.status === MATCH_STATUS.SCHEDULED)
        .slice(0, 3)
        .map((match) => ({ tag: 'NEXT', text: label(match) })),
    ]
    if (built.length === 0) {
      built.push(
        { tag: 'TURF', text: 'Live ball by ball scoring' },
        { text: 'Set up a match in a couple of minutes' },
        { text: 'Top 10 standings update after every game' },
      )
    }
    return [...built, ...built]
  }, [data])

  return (
    <div className="g-ticker" aria-hidden="true">
      <div className="g-ticker-track">
        {items.map((item, i) => (
          <span key={i}>
            {item.tag ? <b>{item.tag}</b> : null}
            {item.tag ? ' ' : ''}
            {item.text}
          </span>
        ))}
      </div>
    </div>
  )
}

function GullyShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const { pathname } = location
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const { isAuthenticated, promptAuth } = useAuthPrompt()
  const [authMode, setAuthMode] = useState(null)

  // Either a guest tapped a sign-in button (route state) or a signed-in user
  // opened the dialog from the layout itself.
  const wantsAuth = Boolean(location.state?.auth)
  const authOpen = wantsAuth || authMode !== null
  const mode = wantsAuth ? (location.state?.mode ?? 'signin') : authMode

  const openAuth = (nextMode = 'signin') => {
    if (!promptAuth(nextMode)) setAuthMode(nextMode)
  }

  const switchAuthMode = (nextMode) => {
    setAuthMode(nextMode)
    if (wantsAuth) {
      navigate(pathname, {
        replace: true,
        state: { ...(location.state ?? {}), mode: nextMode },
      })
    }
  }

  const closeAuth = () => {
    setAuthMode(null)
    if (wantsAuth) navigate(pathname, { replace: true, state: {} })
  }

  const initial = (user?.name || user?.email || '?').charAt(0).toUpperCase()

  const tabs = [
    { to: '/', label: 'Matches', icon: 'home', end: true, guest: true },
    { to: '/teams', label: 'Teams', icon: 'teams', guest: true },
    { to: '/players', label: 'Players', icon: 'players' },
    { to: '/leaderboard', label: 'Top 10', icon: 'top' },
  ]
  if (user?.role === 'admin') {
    tabs.push({ to: '/users', label: 'Users', icon: 'users' })
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="gully">
      <div className="g-app">
        <header className="g-topbar">
          <Link to="/" className="g-brand">
            <span className="g-ball-icon" aria-hidden="true" />
            TURF
          </Link>
          <div className="g-top-actions">
            <button
              type="button"
              className="g-icon-btn"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              <span aria-hidden="true">◐</span>
            </button>
            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  className="g-icon-btn"
                  onClick={handleLogout}
                  aria-label="Log out"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
                    <path d="M10 16l-4-4 4-4M6 12h10" />
                  </svg>
                </button>
                <span className="g-avatar" title={user?.name ?? user?.email ?? 'Player'}>
                  {initial}
                </span>
              </>
            ) : (
              <button
                type="button"
                className="g-btn g-btn-sm"
                onClick={() => openAuth('signin')}
              >
                Sign in
              </button>
            )}
          </div>
        </header>

        <TickerStrip />

        <main className="g-main">
          <Outlet />
        </main>

        <nav className="g-tabbar" aria-label="Main">
          <div className="g-tabbar-inner">
            {tabs.map((tab) =>
              isAuthenticated || tab.guest ? (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) => `g-tab${isActive ? ' is-active' : ''}`}
                >
                  <TabIcon name={tab.icon} />
                  {tab.label}
                </NavLink>
              ) : (
                <button
                  key={tab.to}
                  type="button"
                  className="g-tab"
                  onClick={() => openAuth('signin')}
                >
                  <TabIcon name={tab.icon} />
                  {tab.label}
                </button>
              ),
            )}
          </div>
        </nav>

        {pathname !== '/matches/create' &&
          (isAuthenticated ? (
            <Link to="/matches/create" className="g-fab-btn" aria-label="Create a match">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </Link>
          ) : (
            <button
              type="button"
              className="g-fab-btn"
              aria-label="Sign in to create a match"
              onClick={() => openAuth('signin')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          ))}
      </div>

      {authOpen && (
        <AuthModal
          open
          mode={mode}
          onModeChange={switchAuthMode}
          onClose={closeAuth}
          onSuccess={closeAuth}
        />
      )}
    </div>
  )
}

export default function GullyAppLayout() {
  return (
    <GullyFeedbackProvider>
      <GullyShell />
    </GullyFeedbackProvider>
  )
}
