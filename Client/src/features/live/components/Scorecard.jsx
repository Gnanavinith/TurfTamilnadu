import { formatScore } from '../../../utils/formatOvers'

function BattingTable({ batting }) {
  const batters = Array.isArray(batting) ? batting : []
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Batting
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[340px] text-left text-sm">
          <thead>
            <tr className="text-xs text-slate-400 dark:text-slate-500">
              <th className="pb-1 pr-2 font-medium">Batter</th>
            <th className="pb-1 pr-2 text-right font-medium">R</th>
            <th className="pb-1 pr-2 text-right font-medium">B</th>
            <th className="pb-1 pr-2 text-right font-medium">4s</th>
            <th className="pb-1 pr-2 text-right font-medium">6s</th>
            <th className="pb-1 text-right font-medium">SR</th>
          </tr>
        </thead>
        <tbody>
          {batters.length === 0 && (
            <tr>
              <td colSpan="6" className="py-3 text-center text-slate-400">
                No batting data
              </td>
            </tr>
          )}
          {batters.map((batter) => {
            const s = batter?.score ?? batter
            const balls = s.balls ?? 0
            return (
              <tr key={batter.id ?? batter.userId ?? batter.name} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-1.5 pr-2">
                  {batter.name ?? batter.user?.name}
                  {batter.status === 'out' && (
                    <span className="ml-1 line-through text-slate-400">
                      {batter.outDesc ?? 'out'}
                    </span>
                  )}
                </td>
                <td className="py-1.5 pr-2 text-right font-semibold">{s.runs ?? 0}</td>
                <td className="py-1.5 pr-2 text-right">{balls}</td>
                <td className="py-1.5 pr-2 text-right">{s.fours ?? 0}</td>
                <td className="py-1.5 pr-2 text-right">{s.sixes ?? 0}</td>
                <td className="py-1.5 text-right">{balls ? ((s.runs / balls) * 100).toFixed(1) : '0.0'}</td>
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
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Bowling
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[340px] text-left text-sm">
          <thead>
            <tr className="text-xs text-slate-400 dark:text-slate-500">
              <th className="pb-1 pr-2 font-medium">Bowler</th>
            <th className="pb-1 pr-2 text-right font-medium">O</th>
            <th className="pb-1 pr-2 text-right font-medium">M</th>
            <th className="pb-1 pr-2 text-right font-medium">R</th>
            <th className="pb-1 pr-2 text-right font-medium">W</th>
            <th className="pb-1 text-right font-medium">Econ</th>
          </tr>
        </thead>
        <tbody>
          {bowlers.length === 0 && (
            <tr>
              <td colSpan="6" className="py-3 text-center text-slate-400">
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
              <tr key={bowler.id ?? bowler.userId ?? bowler.name} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-1.5 pr-2">{bowler.name ?? bowler.user?.name}</td>
                <td className="py-1.5 pr-2 text-right">{`${overs}.${remain}`}</td>
                <td className="py-1.5 pr-2 text-right">{s.maidens ?? 0}</td>
                <td className="py-1.5 pr-2 text-right">{s.runs ?? 0}</td>
                <td className="py-1.5 pr-2 text-right">{s.wickets ?? 0}</td>
                <td className="py-1.5 text-right">{balls ? ((s.runs / balls) * 6).toFixed(1) : '0.0'}</td>
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
    <div className="space-y-5">
      {innings.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
          No scorecard yet.
        </p>
      )}
      {innings.map((inning, index) => {
        const team = inning.battingTeam
        return (
          <div key={inning.id ?? index} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 text-sm font-bold">
              {team?.name ?? 'Team'}
              <span className="ml-2 font-normal text-slate-400">
                {inning.score ? formatScore(inning.score.runs ?? 0, inning.score.wickets ?? 0) : ''}
              </span>
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <BattingTable batting={inning.batting} />
              <BowlingTable bowling={inning.bowling} />
            </div>
          </div>
        )
      })}
    </div>
  )
}