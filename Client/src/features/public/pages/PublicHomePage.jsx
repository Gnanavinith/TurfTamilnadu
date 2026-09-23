import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchPublicMatches, fetchPublicLeaderboard } from '../api'
import { MATCH_STATUS } from '../../../utils/constants'
import { getErrorMessage } from '../../../lib/axios'
import MatchCard from '../../matches/components/MatchCard'
import Top10Table from '../../leaderboard/components/Top10Table'

function PublicHeader() {
  return (
    <header className="g-topbar">
      <Link to="/home" className="g-brand">
        <span className="g-ball-icon" aria-hidden="true" />
        Turf
      </Link>
      <div className="g-top-actions">
        <Link to="/login" className="g-link g-note">
          Follow live →
        </Link>
        <Link to="/login" className="g-btn g-btn-sm">
          Sign in
        </Link>
      </div>
    </header>
  )
}

function LiveSkeleton() {
  return (
    <div className="g-stack">
      {[0, 1, 2].map((i) => (
        <div key={i} className="g-skel" />
      ))}
    </div>
  )
}

export default function PublicHomePage() {
  const liveQuery = useQuery({
    queryKey: ['public', 'matches', 'live'],
    queryFn: () => fetchPublicMatches({ status: MATCH_STATUS.LIVE }),
    refetchInterval: 30_000,
  })

  const upcomingQuery = useQuery({
    queryKey: ['public', 'matches', 'upcoming'],
    queryFn: () => fetchPublicMatches({ status: MATCH_STATUS.SCHEDULED }),
    staleTime: 60_000,
  })

  const leaderboardQuery = useQuery({
    queryKey: ['public', 'leaderboard'],
    queryFn: fetchPublicLeaderboard,
    refetchInterval: 60_000,
  })

  const liveMatches = liveQuery.data?.data ?? []
  const upcomingMatches = (upcomingQuery.data?.data ?? []).slice(0, 3)
  const entries = leaderboardQuery.data?.data ?? []

  return (
    <div className="gully g-public">
      <div className="g-app">
        <PublicHeader />

        <main className="g-main g-public-main">
          <div className="g-screen">
            <div className="g-hello">
              <small>Public feed</small>
              <h1>
                Score turf cricket matches, <em>live</em>.
              </h1>
              <p className="g-public-lede">
                Turf keeps your league&apos;s scores, standings and player stats in one place —
                score a match from any phone, share the link, and watch it update ball by ball.
              </p>
            </div>

            <div className="g-btn-row g-public-cta">
              <Link to="/login" className="g-btn">
                Sign in to score
              </Link>
              <Link to="/login" className="g-btn g-btn-outline">
                Jump in as a player
              </Link>
            </div>

            <section className="g-public-section">
              <div className="g-sec-head">
                <h2 className="g-sec-live">
                  <span className="g-live-dot" aria-hidden="true" />
                  Live matches
                </h2>
                <Link to="/login" className="g-note g-link">
                  Follow live →
                </Link>
              </div>
              {liveQuery.isLoading ? (
                <LiveSkeleton />
              ) : liveQuery.error ? (
                <div className="g-alert g-alert-error">
                  {getErrorMessage(liveQuery.error, 'Could not load live matches')}
                </div>
              ) : liveMatches.length === 0 ? (
                <div className="g-empty">
                  <p>No matches are live right now.</p>
                  <small>Check back when a match starts, or catch an upcoming fixture below.</small>
                </div>
              ) : (
                <div className="g-stack">
                  {liveMatches.map((match, i) => (
                    <MatchCard key={match.id} match={match} linkTo="/login" index={i} />
                  ))}
                </div>
              )}
            </section>

            {upcomingMatches.length > 0 && (
              <section className="g-public-section">
                <div className="g-sec-head">
                  <h2>Coming up</h2>
                </div>
                <div className="g-stack">
                  {upcomingMatches.map((match, i) => (
                    <MatchCard key={match.id} match={match} linkTo="/login" index={i} />
                  ))}
                </div>
              </section>
            )}

            <section className="g-public-section">
              <div className="g-sec-head">
                <h2>Top 10 teams</h2>
                <Link to="/login" className="g-note g-link">
                  Full standings →
                </Link>
              </div>
              {leaderboardQuery.isLoading ? (
                <div>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="g-skel" />
                  ))}
                </div>
              ) : leaderboardQuery.error ? (
                <div className="g-alert g-alert-error">
                  {getErrorMessage(leaderboardQuery.error, 'Could not load standings')}
                </div>
              ) : (
                <Top10Table entries={entries} />
              )}
            </section>
          </div>
        </main>

        <footer className="g-public-foot">Turf · turf cricket scoring</footer>
      </div>
    </div>
  )
}
