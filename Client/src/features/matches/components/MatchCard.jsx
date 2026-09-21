import { Link } from 'react-router-dom'
import { STATUS_LABELS, MATCH_STATUS } from '../../../utils/constants'
import { formatDate, formatTime } from '../../../utils/formatDate'
import { formatOvers, formatScore } from '../../../utils/formatOvers'
import { teamColor, teamCode } from '../../../utils/teamColor'

function StatusBadge({ status }) {
  if (status === MATCH_STATUS.LIVE) {
    return (
      <span className="g-badge g-badge-live">
        <span className="g-live-dot" />
        Live
      </span>
    )
  }
  const variant =
    status === MATCH_STATUS.SCHEDULED
      ? 'g-badge-scheduled'
      : status === MATCH_STATUS.ABANDONED
        ? 'g-badge-warn'
        : 'g-badge-done'
  return <span className={`g-badge ${variant}`}>{STATUS_LABELS[status] ?? status}</span>
}

function getTeamScore(match, team) {
  const s = match.score
  if (match.status === MATCH_STATUS.LIVE && s) {
    if (s.battingTeamId === team.id) {
      return { runs: s.runs ?? 0, wickets: s.wickets ?? 0, balls: s.balls ?? 0 }
    }
    if (s.firstInningsRuns != null) {
      return { runs: s.firstInningsRuns, wickets: s.firstInningsWickets, balls: null }
    }
    return null
  }
  return match.result?.scores?.[team.id]
}

function TeamRow({ team, score, emphasis, batting }) {
  const hasScore = score && score.runs != null
  const scoreText = hasScore
    ? score.wickets != null
      ? formatScore(score.runs, score.wickets)
      : String(score.runs)
    : null

  return (
    <div className="g-match-team">
      <span className="g-tb g-tb-sm" style={{ '--c': teamColor(team) }} aria-hidden="true">
        {teamCode(team)}
      </span>
      <div className="g-info">
        <b>{team.name ?? 'Team'}</b>
        {batting && <span>Batting now</span>}
      </div>
      {hasScore ? (
        <div className="g-match-score" style={{ color: emphasis ? 'var(--g-ink)' : 'var(--g-muted)' }}>
          {scoreText}
          {score.balls != null && <small>{formatOvers(score.balls)} ov</small>}
        </div>
      ) : (
        <div className="g-match-score g-dim">
          <small>Yet to bat</small>
        </div>
      )}
    </div>
  )
}

function FooterStatus({ match, teamA, teamB }) {
  const s = match.score

  if (match.status === MATCH_STATUS.LIVE && s) {
    if (s.target != null) {
      const need = s.target - (s.runs ?? 0)
      const ballsLeft = Math.max(match.overs * 6 - (s.balls ?? 0), 0)
      return need > 0 ? (
        <span className="g-em-red">
          Need {need} from {ballsLeft} balls
        </span>
      ) : (
        <span className="g-em-green">Target reached</span>
      )
    }
    return <span>First innings</span>
  }

  if (match.status === MATCH_STATUS.COMPLETED && match.result?.winnerTeamId) {
    const winner = match.result.winnerTeamId === teamA.id ? teamA : teamB
    return (
      <span className="g-em-green">
        {winner.name} won{match.result.margin ? ` ${match.result.margin}` : ''}
      </span>
    )
  }

  if (match.status === MATCH_STATUS.ABANDONED) {
    return <span className="g-em-amber">Match abandoned</span>
  }

  if (match.status === MATCH_STATUS.SCHEDULED) {
    return (
      <span>
        Starts {formatDate(match.scheduledAt)} at {formatTime(match.scheduledAt)}
      </span>
    )
  }

  return null
}

export default function MatchCard({ match, linkTo, index = 0 }) {
  const teamA = match.teamA ?? {}
  const teamB = match.teamB ?? {}
  const isLive = match.status === MATCH_STATUS.LIVE
  const isCompleted = match.status === MATCH_STATUS.COMPLETED
  const winnerId = isCompleted ? match.result?.winnerTeamId : null
  const battingId = isLive ? match.score?.battingTeamId : null
  const s = match.score

  const emphasisFor = (team) => {
    if (isLive) return battingId === team.id
    if (winnerId) return winnerId === team.id
    return true
  }

  const matchup = `${teamA.name ?? 'Team A'} vs ${teamB.name ?? 'Team B'}`

  return (
    <Link
      to={linkTo ?? `/live/${match.id}`}
      aria-label={`${matchup}, ${STATUS_LABELS[match.status] ?? match.status}`}
      className={`g-match${isLive ? ' g-live' : ''}`}
      style={{ '--i': index }}
    >
      <div className="g-match-top">
        <StatusBadge status={match.status} />
        <span className="g-note">
          {match.overs} overs
          {match.venue ? ` · ${match.venue}` : ''}
        </span>
      </div>

      <TeamRow
        team={teamA}
        score={getTeamScore(match, teamA)}
        emphasis={emphasisFor(teamA)}
        batting={isLive && battingId === teamA.id}
      />
      <TeamRow
        team={teamB}
        score={getTeamScore(match, teamB)}
        emphasis={emphasisFor(teamB)}
        batting={isLive && battingId === teamB.id}
      />

      <div className="g-match-foot">
        <FooterStatus match={match} teamA={teamA} teamB={teamB} />
        {isLive && s && (
          <span className="g-mini-pills">
            <span className="g-mini-pill">RR {s.rr != null ? s.rr.toFixed(2) : '0.00'}</span>
            {s.target != null && <span className="g-mini-pill">Target {s.target}</span>}
          </span>
        )}
        {isCompleted && <span>{formatDate(match.scheduledAt)}</span>}
      </div>
    </Link>
  )
}
