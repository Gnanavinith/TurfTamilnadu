import { STATUS_LABELS, MATCH_STATUS } from '../../../utils/constants'
import { formatOvers, formatRunRate, formatScore } from '../../../utils/formatOvers'

function TeamScore({ team, innings, isBatting }) {
  return (
    <div
      className={`rounded-xl p-4 ${isBatting ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-slate-50 dark:bg-slate-800/60'}`}
    >
      <p className="truncate text-sm font-semibold">
        {team?.name ?? 'Team'}
        {isBatting && (
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Bat
          </span>
        )}
      </p>
      <p className="mt-1 text-2xl font-bold">
        {innings?.score ? formatScore(innings.score.runs ?? 0, innings.score.wickets ?? 0) : '–'}
      </p>
      <p className="text-xs text-slate-400 dark:text-slate-500">
        {innings?.score
          ? `${formatOvers(innings.score.balls ?? 0)} ov · RR ${formatRunRate(innings.score.runs ?? 0, innings.score.balls ?? 0)}`
          : 'Yet to bat'}
      </p>
    </div>
  )
}

export default function Scoreboard({ match }) {
  if (!match) return null

  const { teamA, teamB, status, target } = match
  const innings = Array.isArray(match.innings) ? match.innings : []

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            status === MATCH_STATUS.LIVE
              ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
              : status === MATCH_STATUS.COMPLETED
                ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
          }`}
        >
          {STATUS_LABELS[status] ?? status}
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {match.overs} overs
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
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
        <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-center text-sm font-medium dark:bg-slate-800">
          Target: {target}
        </p>
      )}

      {match.venue && (
        <p className="mt-3 text-center text-xs text-slate-400 dark:text-slate-500">
          {match.venue}
        </p>
      )}
    </div>
  )
}