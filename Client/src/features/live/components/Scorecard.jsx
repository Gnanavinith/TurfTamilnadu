import { formatScore } from '../../../utils/formatOvers'

function BattingTable({ batting }) {
  const batters = Array.isArray(batting) ? batting : []
  return (
    <div className="g-panel" style={{ marginTop: 0 }}>
      <div className="g-panel-head">Batting</div>
      <div className="g-table-wrap">
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
            {batters.length === 0 && (
              <tr>
                <td colSpan="6" className="g-note">
                  No batting data
                </td>
              </tr>
            )}
            {batters.map((batter) => {
              const s = batter?.score ?? batter
              const balls = s.balls ?? 0
              return (
                <tr key={batter.id ?? batter.userId ?? batter.name}>
                  <td>
                    {batter.name ?? batter.user?.name}
                    {batter.status === 'out' && (
                      <span className="g-strike"> {batter.outDesc ?? 'out'}</span>
                    )}
                  </td>
                  <td className="g-num g-strong">{s.runs ?? 0}</td>
                  <td className="g-num">{balls}</td>
                  <td className="g-num">{s.fours ?? 0}</td>
                  <td className="g-num">{s.sixes ?? 0}</td>
                  <td className="g-num">
                    {balls ? ((s.runs / balls) * 100).toFixed(1) : '0.0'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BowlingTable({ bowling }) {
  const bowlers = Array.isArray(bowling) ? bowling : []
  return (
    <div className="g-panel" style={{ marginTop: 0 }}>
      <div className="g-panel-head">Bowling</div>
      <div className="g-table-wrap">
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
            {bowlers.length === 0 && (
              <tr>
                <td colSpan="6" className="g-note">
                  No bowling data
                </td>
              </tr>
            )}
            {bowlers.map((bowler) => {
              const s = bowler?.score ?? bowler
              const balls = s.balls ?? 0
              const overs = Math.floor(balls / 6)
              const remain = balls % 6
              return (
                <tr key={bowler.id ?? bowler.userId ?? bowler.name}>
                  <td>{bowler.name ?? bowler.user?.name}</td>
                  <td className="g-num">{`${overs}.${remain}`}</td>
                  <td className="g-num">{s.maidens ?? 0}</td>
                  <td className="g-num">{s.runs ?? 0}</td>
                  <td className="g-num g-strong">{s.wickets ?? 0}</td>
                  <td className="g-num">
                    {balls ? ((s.runs / balls) * 6).toFixed(1) : '0.0'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Scorecard({ match }) {
  if (!match) return null
  const innings = Array.isArray(match.innings) ? match.innings : []

  return (
    <div className="g-stack">
      {innings.length === 0 && <p className="g-empty-note">No scorecard yet.</p>}
      {innings.map((inning, index) => {
        const team = inning.battingTeam
        return (
          <div key={inning.id ?? index} className="g-panel" style={{ marginTop: 0 }}>
            <div className="g-panel-head">
              {team?.name ?? 'Team'}
              <span>
                {inning.score
                  ? formatScore(inning.score.runs ?? 0, inning.score.wickets ?? 0)
                  : ''}
              </span>
            </div>
            <div className="g-stack">
              <BattingTable batting={inning.batting} />
              <BowlingTable bowling={inning.bowling} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
