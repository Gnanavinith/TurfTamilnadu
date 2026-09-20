const RANK_CARD = ['text-amber-500', 'text-slate-400', 'text-orange-400']

function TeamRow({ entry, rank }) {
  const winner = rank === 1
  return (
    <tr className="border-t border-slate-100 dark:border-slate-800">
      <td className="py-2.5 pr-2">
        <span className={`font-bold ${RANK_CARD[rank - 1] ?? 'text-slate-400 dark:text-slate-500'}`}>
          {rank}
        </span>
      </td>
      <td className="py-2.5 pr-2">
        <p className="font-medium">
          {entry.team?.name ?? 'Unknown'}
          {winner && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              Winner
            </span>
          )}
        </p>
        <p className="text-xs text-slate-400">{entry.team?.city ?? ''}</p>
      </td>
      <td className="py-2.5 pr-2 text-right text-slate-500 dark:text-slate-400">{entry.matchesPlayed}</td>
      <td className="py-2.5 pr-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">
        {entry.matchesWon}
      </td>
      <td className="py-2.5 pr-2 text-right text-slate-500 dark:text-slate-400">{entry.matchesLost}</td>
      <td className="py-2.5 pr-2 text-right text-slate-500 dark:text-slate-400">{entry.tied ?? 0}</td>
      <td className="py-2.5 pr-2 text-right text-slate-500 dark:text-slate-400">
        {entry.runsScored ?? 0}
      </td>
      <td className="py-2.5 pr-2 text-right text-slate-500 dark:text-slate-400">
        {entry.runsConceded ?? 0}
      </td>
      <td className="py-2.5 pr-2 text-right font-semibold">{entry.points ?? 0}</td>
      <td className="py-2.5 text-right text-slate-500 dark:text-slate-400">
        {entry.rating != null ? `${entry.rating}%` : '—'}
      </td>
    </tr>
  )
}

export default function Top10Table({ entries = [] }) {
  if (entries.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
        No completed matches yet — play a match to build the standings.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="text-xs text-slate-400 dark:text-slate-500">
            <th className="pb-2 pr-2 font-medium">#</th>
            <th className="pb-2 pr-2 font-medium">Team</th>
            <th className="pb-2 pr-2 text-right font-medium">Pld</th>
            <th className="pb-2 pr-2 text-right font-medium">W</th>
            <th className="pb-2 pr-2 text-right font-medium">L</th>
            <th className="pb-2 pr-2 text-right font-medium">T</th>
            <th className="pb-2 pr-2 text-right font-medium">For</th>
            <th className="pb-2 pr-2 text-right font-medium">Against</th>
            <th className="pb-2 pr-2 text-right font-medium">Pts</th>
            <th className="pb-2 text-right font-medium">Rating</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <TeamRow key={entry.team?._id ?? entry.teamId ?? index} entry={entry} rank={index + 1} />
          ))}
        </tbody>
      </table>
    </div>
  )
}