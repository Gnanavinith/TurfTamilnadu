import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useQuery } from '@tanstack/react-query'
import { fetchMatches } from '../api'
import { getErrorMessage } from '../../../lib/axios'
import { selectUser } from '../../../app/store'
import { MATCH_STATUS, STATUS_LABELS } from '../../../utils/constants'
import { formatOvers } from '../../../utils/formatOvers'
import { teamColor, teamCode } from '../../../utils/teamColor'
import MatchCard from '../components/MatchCard'

const FILTERS = [
  { key: '', label: 'All' },
  { key: MATCH_STATUS.LIVE, label: 'Live' },
  { key: MATCH_STATUS.SCHEDULED, label: 'Upcoming' },
  { key: MATCH_STATUS.COMPLETED, label: 'Completed' },
]

function LiveHero({ match, canScore }) {
  const s = match.score ?? {}
  const batting =
    match.teamA?.id === s.battingTeamId ? match.teamA : match.teamB
  const bowling =
    match.teamA?.id === s.battingTeamId ? match.teamB : match.teamA
  const need = s.target != null ? s.target - (s.runs ?? 0) : null
  const ballsLeft =
    s.target != null ? Math.max(match.overs * 6 - (s.balls ?? 0), 0) : 0
  const progress =
    s.target != null
      ? Math.min(100, ((s.runs ?? 0) / s.target) * 100)
      : Math.min(100, ((s.balls ?? 0) / (match.overs * 6)) * 100)

  return (
    <div className="g-hero">
      <div className="g-hero-top">
        <span className="g-live">
          <i aria-hidden="true" />
          Live
        </span>
        <span className="g-hero-meta">
          {match.overs} overs{match.venue ? ` · ${match.venue}` : ''}
        </span>
      </div>

      <div className="g-hero-bat">
        <span className="g-tb" style={{ '--c': teamColor(batting) }} aria-hidden="true">
          {teamCode(batting)}
        </span>
        <div className="g-hero-name">
          {batting?.name ?? 'Batting'}
          <small>Batting now</small>
        </div>
      </div>

      <div className="g-hero-score">
        <span className="g-big">
          {s.runs ?? 0}/{s.wickets ?? 0}
        </span>
        <small>{formatOvers(s.balls ?? 0)} ov</small>
      </div>

      <div className="g-hero-opp">
        {bowling?.name ?? 'Bowling'}
        {s.firstInningsRuns != null
          ? ` ${s.firstInningsRuns}/${s.firstInningsWickets ?? 0}`
          : ''}
      </div>

      {need != null && (
        <div className={`g-need${need <= 0 ? ' g-win' : ''}`}>
          {need > 0
            ? `Need ${need} from ${ballsLeft} balls`
            : 'Target reached'}
        </div>
      )}

      <div className="g-bar">
        <i style={{ width: `${progress}%` }} />
      </div>

      <Link to={canScore ? `/scoring/${match.id}` : `/live/${match.id}`} className="g-hero-cta">
        {canScore ? 'Score this match' : 'Watch this match'}
      </Link>
    </div>
  )
}

function MatchesSkeleton() {
  return (
    <div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="g-skel" />
      ))}
    </div>
  )
}

export default function MatchList() {
  const [status, setStatus] = useState('')
  const user = useSelector(selectUser)
  const canScore = ['scorer', 'admin'].includes(user?.role)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['matches', status],
    queryFn: () => fetchMatches({ status: status || undefined }),
  })

  const matches = data?.data ?? []
  const liveMatch = matches.find((match) => match.status === MATCH_STATUS.LIVE)

  const header = (
    <div className="g-hello">
      <small>Your fixtures</small>
      <h1>
        Matches, <em>live</em>
      </h1>
    </div>
  )

  if (error) {
    return (
      <div className="g-screen">
        {header}
        <div className="g-alert g-alert-error">
          {getErrorMessage(error, 'Failed to load matches')}
        </div>
        <div className="g-btn-row" style={{ marginTop: 14 }}>
          <button type="button" className="g-btn g-btn-outline" onClick={refetch}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="g-screen">
      {header}

      {isLoading ? (
        <MatchesSkeleton />
      ) : (
        <>
          {liveMatch && <LiveHero match={liveMatch} canScore={canScore} />}

          <div className="g-sec-head">
            <h2>All matches</h2>
            <Link to="/matches/create" className="g-note">
              New match
            </Link>
          </div>

          <div className="g-seg" role="tablist" aria-label="Match filter">
            {FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                role="tab"
                aria-selected={status === filter.key}
                onClick={() => setStatus(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {matches.length === 0 ? (
            <div className="g-empty">
              <p>
                {status
                  ? `No ${STATUS_LABELS[status]?.toLowerCase() ?? ''} matches.`
                  : 'No matches yet.'}
              </p>
              <small>Set up a fixture, pick teams, and start scoring.</small>
              <Link to="/matches/create" className="g-btn">
                Create your first match
              </Link>
            </div>
          ) : (
            matches.map((match, i) => (
              <MatchCard key={match.id} match={match} index={i} />
            ))
          )}
        </>
      )}
    </div>
  )
}
