import { teamColor, teamCode } from '../../../utils/teamColor'

/**
 * The scorer's primary read: both innings side by side, with the one in play
 * highlighted, plus the extras split and the chase equation when it's set.
 */
export default function InningsSummary({ match }) {
  const innings = Array.isArray(match?.innings) ? match.innings : []
  if (innings.length === 0) return null

  const liveId = match.currentInnings?.id ?? null
  const maxOvers = match.currentInnings?.overs ?? match.overs ?? 0
  const chase = match.chase

  return (
    <div className="g-panel" style={{ marginTop: 0 }}>
      <div className="g-panel-head">
        Innings
        <span>{maxOvers} overs a side</span>
      </div>

      <div className="g-score-grid">
        {innings.map((inning) => {
          const isLive = inning.id === liveId
          const team = inning.battingTeam ?? {}
          const score = inning.score ?? {}
          const balls = score.balls ?? 0
          const rr = balls ? (((score.runs ?? 0) / balls) * 6).toFixed(2) : '0.00'

          return (
            <div key={inning.id} className={`g-team-card${isLive ? ' g-bat' : ''}`}>
              <div className="g-row-between">
                <span
                  className="g-tb g-tb-sm"
                  style={{ '--c': teamColor(team) }}
                  aria-hidden="true"
                >
                  {teamCode(team)}
                </span>
                {isLive ? (
                  <span className="g-badge g-badge-live">Bat</span>
                ) : (
                  <span className="g-badge g-badge-done">Done</span>
                )}
              </div>
              <b>{team.name ?? 'Team'}</b>
              <div className="g-sc">
                {score.runs ?? 0}/{score.wickets ?? 0}
              </div>
              <small className="g-note">
                {Math.floor(balls / 6)}.{balls % 6} ov · RR {rr}
              </small>
            </div>
          )
        })}
      </div>

      {match.extras && (
        <div className="g-extras-strip">
          <span>Extras</span>
          <span className="g-mini-pills">
            <span className="g-mini-pill">Wd {match.extras.wide ?? 0}</span>
            <span className="g-mini-pill">Nb {match.extras.noBall ?? 0}</span>
            <span className="g-mini-pill">B {match.extras.bye ?? 0}</span>
            <span className="g-mini-pill">Lb {match.extras.legBye ?? 0}</span>
          </span>
        </div>
      )}

      {chase && <ChaseCard chase={chase} />}
    </div>
  )
}

function ChaseCard({ chase }) {
  const state = chase.needed <= 0 ? 'win' : chase.ballsRemaining <= 0 ? 'lose' : ''
  const label =
    chase.needed <= 0
      ? 'Target reached'
      : chase.ballsRemaining <= 0
        ? 'Out of balls'
        : `Need ${chase.needed} from ${chase.ballsRemaining} balls`

  return (
    <div className={`g-need g-need-box${state ? ` g-${state}` : ''}`}>
      <div className="g-row-between">
        <span>{label}</span>
        <span>Target {chase.target}</span>
      </div>
      {chase.requiredRunRate != null && chase.needed > 0 && (
        <small>Req. RR {chase.requiredRunRate.toFixed(2)}</small>
      )}
    </div>
  )
}
