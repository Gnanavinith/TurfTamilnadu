import { Link } from 'react-router-dom'
import { MATCH_STATUS, MATCH_TYPES, STATUS_LABELS } from '../../../utils/constants'
import { formatDate, formatTime } from '../../../utils/formatDate'
import { formatOvers, formatScore } from '../../../utils/formatOvers'
import { teamColor, teamCode } from '../../../utils/teamColor'
import { ballTone } from '../../scoring/cricket'

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

function TeamRow({ team, score, emphasis, batting, extra }) {
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
        {extra ? <span>{extra}</span> : batting ? <span>Batting now</span> : null}
      </div>
      {hasScore ? (
        <div
          className="g-match-score"
          style={{ color: emphasis ? 'var(--g-ink)' : 'var(--g-muted)' }}
        >
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

/** First-innings total shown under the batting team while a chase is on. */
function firstInningsLabel(match, team) {
  const s = match.score
  if (!s || s.battingTeamId === team.id) return null
  if (s.firstInningsRuns == null) return null
  return `${formatScore(s.firstInningsRuns, s.firstInningsWickets ?? 0)} first innings`
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
        {winner.name} won{match.result.margin ? ` by ${match.result.margin}` : ''}
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

export default function MatchCard({ match, index = 0 }) {
  const teamA = match.teamA ?? {}
  const teamB = match.teamB ?? {}
  const isLive = match.status === MATCH_STATUS.LIVE
  const isCompleted = match.status === MATCH_STATUS.COMPLETED
  const winnerId = isCompleted ? match.result?.winnerTeamId : null
  const battingId = isLive ? match.score?.battingTeamId : null
  const s = match.score
  const thisOver = match.thisOver ?? []

  const emphasisFor = (team) => {
    if (isLive) return battingId === team.id
    if (winnerId) return winnerId === team.id
    return true
  }

  const getScore = (team) => {
    if (isLive && s) {
      if (s.battingTeamId === team.id) {
        return { runs: s.runs ?? 0, wickets: s.wickets ?? 0, balls: s.balls ?? 0 }
      }
      if (s.firstInningsRuns != null) {
        return { runs: s.firstInningsRuns, wickets: s.firstInningsWickets ?? 0, balls: null }
      }
      return null
    }
    if (isCompleted) {
      const total = (match.innings ?? []).find(
        (inn) => String(inn.battingTeamId) === String(team.id),
      )?.score
      if (total) return { runs: total.runs ?? 0, wickets: total.wickets ?? 0, balls: total.balls ?? 0 }
    }
    return null
  }

  const matchup = `${teamA.name ?? 'Team A'} vs ${teamB.name ?? 'Team B'}`

  return (
    <Link
      to={`/live/${match.id}`}
      aria-label={`${matchup}, ${STATUS_LABELS[match.status] ?? match.status}`}
      className={`g-match${isLive ? ' g-live' : ''}`}
      style={{ '--i': index }}
    >
      <div className="g-match-top">
        <StatusBadge status={match.status} />
        <span className="g-note">
          {match.matchType === MATCH_TYPES.TOURNAMENT
            ? `${match.tournamentName ?? 'Tournament'} · ${match.overs} overs`
            : `${match.overs} overs`}
          {match.venue ? ` · ${match.venue}` : ''}
        </span>
      </div>

      <TeamRow
        team={teamA}
        score={getScore(teamA)}
        emphasis={emphasisFor(teamA)}
        batting={isLive && battingId === teamA.id}
        extra={isLive ? firstInningsLabel(match, teamA) : null}
      />
      <TeamRow
        team={teamB}
        score={getScore(teamB)}
        emphasis={emphasisFor(teamB)}
        batting={isLive && battingId === teamB.id}
        extra={isLive ? firstInningsLabel(match, teamB) : null}
      />

      {isLive && thisOver.length > 0 && (
        <div className="g-match-over">
          <span className="g-note">This over</span>
          <span className="g-chips">
            {thisOver.map((ball, i) => (
              <span
                key={`${ball.token}-${i}`}
                className={`g-ball ${ballTone(ball.token)}`}
                title={`${ball.token} · ${ball.runs ?? 0} runs`}
              >
                {ball.token}
              </span>
            ))}
          </span>
        </div>
      )}

      <div className="g-match-foot">
        <FooterStatus match={match} teamA={teamA} teamB={teamB} />
        {isLive && s && (
          <span className="g-mini-pills">
            <span className="g-mini-pill">RR {s.rr != null ? s.rr.toFixed(2) : '0.00'}</span>
            {s.extras > 0 && <span className="g-mini-pill">Ex {s.extras}</span>}
            {s.target != null && <span className="g-mini-pill">Target {s.target}</span>}
          </span>
        )}
        {isCompleted && <span>{formatDate(match.scheduledAt)}</span>}
      </div>
    </Link>
  )
}
