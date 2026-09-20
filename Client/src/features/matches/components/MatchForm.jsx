import { OVER_OPTIONS } from '../../../utils/constants'

export default function MatchForm({ teams, value, onChange }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
          Team A (home)
        </span>
        <select
          value={value.teamAId ?? ''}
          onChange={(event) => onChange({ ...value, teamAId: event.target.value })}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        >
          <option value="">Select team A</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
          Team B (away)
        </span>
        <select
          value={value.teamBId ?? ''}
          onChange={(event) => onChange({ ...value, teamBId: event.target.value })}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        >
          <option value="">Select team B</option>
          {teams
            .filter((team) => team.id !== value.teamAId)
            .map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
          Overs per innings
        </span>
        <select
          value={value.overs ?? ''}
          onChange={(event) => onChange({ ...value, overs: Number(event.target.value) })}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        >
          <option value="">Select overs</option>
          {OVER_OPTIONS.map((overs) => (
            <option key={overs} value={overs}>
              {overs} overs
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
          Scheduled date &amp; time
        </span>
        <input
          type="datetime-local"
          value={value.scheduledAt ?? ''}
          onChange={(event) => onChange({ ...value, scheduledAt: event.target.value })}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
      </label>
    </div>
  )
}