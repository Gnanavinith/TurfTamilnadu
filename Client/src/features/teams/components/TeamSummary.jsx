function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 text-center dark:bg-slate-800/60">
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className="block text-lg font-bold text-slate-700 dark:text-slate-100">{value}</span>
    </div>
  )
}

/**
 * Headline record for a team: played / won / lost / win% across the top, then
 * runs scored and wickets taken. Reads straight off `teamSummary` computed
 * server-side from the team's innings.
 */
export default function TeamSummary({ summary, rosterSize = 0 }) {
  const played = summary?.played ?? 0
  const won = summary?.won ?? 0
  const lost = summary?.lost ?? 0
  const winPct = summary?.winPct ?? 0

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
        {rosterSize} {rosterSize === 1 ? 'player' : 'players'} on roster
      </p>

      <div className="grid grid-cols-4 gap-2">
        <Stat label="Played" value={played} />
        <Stat label="Wins" value={won} />
        <Stat label="Losses" value={lost} />
        <Stat label="Win %" value={`${winPct}%`} />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <Stat label="Total runs scored" value={summary?.runsScored ?? 0} />
        <Stat label="Wickets taken" value={summary?.wicketsTaken ?? 0} />
      </div>
    </div>
  )
}