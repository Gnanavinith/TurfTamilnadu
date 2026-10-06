import { dismissalText, economy, strikeRate } from '../cricket'

function BattingTable({ batting, strikerId, nonStrikerId, names }) {
  const rows = Array.isArray(batting) ? batting : []
  if (rows.length === 0) {
    return <p className="g-empty-note">No batting yet.</p>
  }

  return (
    <table className="g-table">
      <thead>
        <tr>
          <th>Batter</th>
          <th className="g-num">R</th>
          <th className="g-num">B</th>
          <th className="g-num">4s</th>
          <th className="g-num">6s</th>
          <th className="g-num">SR</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((entry) => {
          const isStriker = entry.userId === strikerId
          const isNonStriker = entry.userId === nonStrikerId
          const out = dismissalText(entry)

          return (
            <tr key={String(entry.userId)} className={isStriker ? 'g-row-live' : ''}>
              <td>
                <span className="g-bat-name">
                  {isStriker && <span className="g-strike-dot" aria-hidden="true" />}
                  {isNonStriker && <span className="g-strike-dot is-dim" aria-hidden="true" />}
                  {entry.name ?? names(entry.userId)}
                </span>
                {out && <span className="g-out">{out}</span>}
              </td>
              <td className="g-num g-strong">{entry.runs ?? 0}</td>
              <td className="g-num">{entry.balls ?? 0}</td>
              <td className="g-num">{entry.fours ?? 0}</td>
              <td className="g-num">{entry.sixes ?? 0}</td>
              <td className="g-num">{strikeRate(entry)}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function BowlingTable({ bowling, bowlerId, names }) {
  const rows = Array.isArray(bowling) ? bowling : []
  if (rows.length === 0) {
    return <p className="g-empty-note">No bowling yet.</p>
  }

  return (
    <table className="g-table">
      <thead>
        <tr>
          <th>Bowler</th>
          <th className="g-num">O</th>
          <th className="g-num">M</th>
          <th className="g-num">R</th>
          <th className="g-num">W</th>
          <th className="g-num">Econ</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((entry) => (
          <tr
            key={String(entry.userId)}
            className={entry.userId === bowlerId ? 'g-row-live' : ''}
          >
            <td>
              <span className="g-bat-name">
                {entry.userId === bowlerId && (
                  <span className="g-strike-dot is-bowl" aria-hidden="true" />
                )}
                {entry.name ?? names(entry.userId)}
              </span>
            </td>
            <td className="g-num">
              {Math.floor((entry.balls ?? 0) / 6)}.{(entry.balls ?? 0) % 6}
            </td>
            <td className="g-num">{entry.maidens ?? 0}</td>
            <td className="g-num">{entry.runs ?? 0}</td>
            <td className="g-num g-strong">{entry.wickets ?? 0}</td>
            <td className="g-num">{economy(entry)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/**
 * The full scorecard for one innings. Used by both the scorer (as a running
 * card) and spectators / archived matches.
 */
export default function ScorecardTables({ innings, names }) {
  if (!innings) return null

  const extras = innings.extrasBreakdown ?? {}
  const extrasSum =
    (extras.wide ?? 0) + (extras.noBall ?? 0) + (extras.bye ?? 0) + (extras.legBye ?? 0)

  return (
    <div className="g-panel" style={{ marginTop: 0 }}>
      <div className="g-panel-head">
        {innings.battingTeam?.name ?? 'Team'}
        <span>
          {innings.score?.runs ?? 0}/{innings.score?.wickets ?? 0}
        </span>
      </div>

      <div className="g-table-wrap">
        <BattingTable
          batting={innings.batting}
          strikerId={innings.strikerId}
          nonStrikerId={innings.nonStrikerId}
          names={names}
        />
      </div>

      {extrasSum > 0 && (
        <div className="g-extra-row">
          <span>Extras</span>
          <span>
            {extrasSum} (Wd {extras.wide ?? 0}, Nb {extras.noBall ?? 0}, B {extras.bye ?? 0}, Lb{' '}
            {extras.legBye ?? 0})
          </span>
        </div>
      )}

      <div className="g-table-wrap" style={{ marginTop: 12 }}>
        <BowlingTable
          bowling={innings.bowling}
          bowlerId={innings.bowlerId}
          names={names}
        />
      </div>
    </div>
  )
}
