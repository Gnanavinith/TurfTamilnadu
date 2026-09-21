import { STATUS_LABELS, MATCH_STATUS } from '../../../utils/constants'
import { formatOvers, formatRunRate, formatScore } from '../../../utils/formatOvers'
import { teamColor, teamCode } from '../../../utils/teamColor'

function badgeClass(status) {
  if (status === MATCH_STATUS.LIVE) return 'g-badge g-badge-live'
  if (status === MATCH_STATUS.SCHEDULED) return 'g-badge g-badge-scheduled'
  if (status === MATCH_STATUS.ABANDONED) return 'g-badge g-badge-warn'
  return 'g-badge g-badge-done'
}

function TeamScore({ team, innings, isBatting }) {
  return (
    <div className={`g-team-card${isBatting ? ' g-bat' : ''}`}>
      <div className="g-row-between">
        <span className="g-tb g-tb-sm" style={{ '--c': teamColor(team) }} aria-hidden="true">
          {teamCode(team)}
        </span>
        {isBatting && <span className="g-badge g-badge-live">Bat</span>}
      </div>
      <b>{team?.name ?? 'Team'}</b>
      <div className="g-sc">
        {innings?.score ? formatScore(innings.score.runs ?? 0, innings.score.wickets ?? 0) : '0/0'}
      </div>
      <small className="g-note">
        {innings?.score
          ? `${formatOvers(innings.score.balls ?? 0)} ov · RR ${formatRunRate(
              innings.score.runs ?? 0,
              innings.score.balls ?? 0,
            )}`
          : 'Yet to bat'}
      </small>
    </div>
  )
}

export default function Scoreboard({ match }) {
  if (!match) return null

  const { teamA, teamB, status, target } = match
  const innings = Array.isArray(match.innings) ? match.innings : []

  return (
    <div className="g-panel" style={{ marginTop: 0 }}>
      <div className="g-panel-head">
        <span className={badgeClass(status)}>{STATUS_LABELS[status] ?? status}</span>
        <span>{match.overs} overs</span>
      </div>

      <div className="g-score-grid">
        <TeamScore
          team={teamA}
          innings={innings.find((inn) => inn.battingTeamId === teamA?.id)}
          isBatting={match.currentInnings?.battingTeamId === teamA?.id}
        />
        <TeamScore
          team={teamB}
          innings={innings.find((inn) => inn.battingTeamId === teamB?.id)}
          isBatting={match.currentInnings?.battingTeamId === teamB?.id}
        />
      </div>

      {target && (
        <div className="g-alert g-alert-info" style={{ textAlign: 'center' }}>
          Target {target}
        </div>
      )}

      {match.venue && (
        <p className="g-note" style={{ textAlign: 'center', marginTop: 10 }}>
          {match.venue}
        </p>
      )}
    </div>
  )
}
