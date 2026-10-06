import { buildBallView, overRuns } from '../cricket'

function BallChip({ ball }) {
  return (
    <span className={`g-ball ${ball.tone}`} title={ball.title} aria-label={ball.title}>
      {ball.token}
    </span>
  )
}

/**
 * Ball-by-ball, over by over — newest over first, which is how a scorer or a
 * spectator actually reads it during a chase.
 */
export default function OverLogs({ overs = [], reverse = true }) {
  if (overs.length === 0) {
    return <p className="g-empty-note">No balls bowled yet.</p>
  }

  const rows = overs.map((over, i) => ({ over, number: i + 1 }))
  if (reverse) rows.reverse()

  return (
    <div className="g-stack">
      {rows.map(({ over, number }) => (
        <div key={number} className="g-over-row">
          <span className="g-rk">O{number}</span>
          <div className="g-chips">
            {over.map((ball, bi) => (
              <BallChip key={`${number}-${bi}`} ball={buildBallView(ball)} />
            ))}
          </div>
          <span className="g-over-runs">{overRuns(over)}</span>
        </div>
      ))}
    </div>
  )
}
