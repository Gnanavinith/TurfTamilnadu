import { MATCH_STATUS } from '../../../utils/constants'
import { formatDate } from '../../../utils/formatDate'

function teamName(match, id) {
  if (id == null) return null
  if (String(match.teamA?.id) === String(id)) return match.teamA?.name
  if (String(match.teamB?.id) === String(id)) return match.teamB?.name
  return null
}

function resultLine(match) {
  const { winnerTeamId, margin } = match.result ?? {}
  const winner = teamName(match, winnerTeamId)
  if (!winner) return 'No result'
  return margin ? `${winner} won by ${margin}` : `${winner} won`
}

/**
 * The closing screen for a finished match: the result, and the two performances
 * that decided it.
 */
export default function MatchSummary({ match }) {
  const innings = (match.innings ?? []).filter((inn) => (inn.score?.balls ?? 0) > 0)
  if (innings.length === 0) return null

  const bestBat = innings
    .flatMap((inn) => inn.batting ?? [])
    .filter((entry) => (entry.balls ?? 0) > 0)
    .sort((a, b) => {
      if ((b.runs ?? 0) !== (a.runs ?? 0)) return (b.runs ?? 0) - (a.runs ?? 0)
      return (a.balls ?? 0) - (b.balls ?? 0)
    })[0]

  const bestBowl = innings
    .flatMap((inn) => inn.bowling ?? [])
    .filter((entry) => (entry.balls ?? 0) > 0)
    .sort((a, b) => {
      if ((b.wickets ?? 0) !== (a.wickets ?? 0)) return (b.wickets ?? 0) - (a.wickets ?? 0)
      return (a.runs ?? 0) - (b.runs ?? 0)
    })[0]

  const abandoned = match.status === MATCH_STATUS.ABANDONED

  return (
    <div className="g-panel g-summary">
      <div className="g-panel-head">
        {abandoned ? 'Match abandoned' : 'Match complete'}
        <span>{formatDate(match.scheduledAt)}</span>
      </div>

      <p className="g-summary-result">{abandoned ? 'No result' : resultLine(match)}</p>

      <div className="g-score-grid" style={{ marginTop: 14 }}>
        {bestBat && (
          <div className="g-team-card">
            <span className="g-badge g-badge-done">Top batter</span>
            <b style={{ marginTop: 8 }}>{bestBat.name ?? 'Batter'}</b>
            <div className="g-sc">
              {bestBat.runs ?? 0}
              <small>({bestBat.balls ?? 0})</small>
            </div>
            <small className="g-note">
              {bestBat.fours ?? 0} fours · {bestBat.sixes ?? 0} sixes
            </small>
          </div>
        )}
        {bestBowl && (
          <div className="g-team-card">
            <span className="g-badge g-badge-done">Best bowler</span>
            <b style={{ marginTop: 8 }}>{bestBowl.name ?? 'Bowler'}</b>
            <div className="g-sc">
              {bestBowl.wickets ?? 0}
              <small>/{bestBowl.runs ?? 0}</small>
            </div>
            <small className="g-note">
              {Math.floor((bestBowl.balls ?? 0) / 6)}.{(bestBowl.balls ?? 0) % 6} overs
            </small>
          </div>
        )}
      </div>
    </div>
  )
}
