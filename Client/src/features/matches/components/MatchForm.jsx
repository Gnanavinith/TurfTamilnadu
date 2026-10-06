import {
  OVER_OPTIONS,
  CUSTOM_OVERS,
  MIN_OVERS,
  MAX_OVERS,
  MATCH_TYPES,
  MATCH_TYPE_OPTIONS,
  START_MODES,
  START_MODE_OPTIONS,
} from '../../../utils/constants'

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white'
const labelClass = 'mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300'

export default function MatchForm({ teams, value, onChange }) {
  // The dropdown mode is tracked explicitly. Inferring it from `overs` made
  // "Custom…" unselectable: seeding the input with a preset value flipped the
  // dropdown straight back to that preset.
  const oversChoice = value.oversChoice ?? String(value.overs ?? '')
  const isCustomOvers = oversChoice === CUSTOM_OVERS

  const setOversChoice = (choice) => {
    if (choice === CUSTOM_OVERS) {
      // Carry the current number over so the input starts on a valid value.
      const current = Number(value.overs)
      onChange({
        ...value,
        oversChoice: CUSTOM_OVERS,
        overs: Number.isFinite(current) && current > 0 ? current : 10,
      })
      return
    }
    onChange({ ...value, oversChoice: choice, overs: Number(choice) })
  }

const startMode = value.startMode ?? START_MODES.SCHEDULED

  const setCustomOvers = (raw) => {
    const parsed = Number(raw)
    onChange({ ...value, overs: Number.isFinite(parsed) ? parsed : '' })
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block">
        <span className={labelClass}>Team A (home)</span>
        <select
          value={value.teamAId ?? ''}
          onChange={(event) => onChange({ ...value, teamAId: event.target.value })}
          className={inputClass}
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
        <span className={labelClass}>Team B (away)</span>
        <select
          value={value.teamBId ?? ''}
          onChange={(event) => onChange({ ...value, teamBId: event.target.value })}
          className={inputClass}
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
        <span className={labelClass}>Match type</span>
        <select
          value={value.matchType ?? MATCH_TYPES.SINGLE}
          onChange={(event) =>
            onChange({
              ...value,
              matchType: event.target.value,
              tournamentName:
                event.target.value === MATCH_TYPES.TOURNAMENT
                  ? (value.tournamentName ?? '')
                  : '',
            })
          }
          className={inputClass}
        >
          {MATCH_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={labelClass}>Overs per innings</span>
        <select
          value={oversChoice}
          onChange={(event) => setOversChoice(event.target.value)}
          className={inputClass}
        >
          {OVER_OPTIONS.map((overs) => (
            <option key={overs} value={overs}>
              {overs} overs
            </option>
          ))}
          <option value={CUSTOM_OVERS}>Custom…</option>
        </select>
      </label>

      {isCustomOvers && (
        <label className="block">
          <span className={labelClass}>Custom overs</span>
          <input
            type="number"
            inputMode="numeric"
            min={MIN_OVERS}
            max={MAX_OVERS}
            step={1}
            value={value.overs ?? ''}
            onChange={(event) => setCustomOvers(event.target.value)}
            placeholder={`${MIN_OVERS}–${MAX_OVERS}`}
            className={inputClass}
          />
        </label>
      )}

      {value.matchType === MATCH_TYPES.TOURNAMENT && (
        <label className="block">
          <span className={labelClass}>Tournament name</span>
          <input
            type="text"
            value={value.tournamentName ?? ''}
            onChange={(event) => onChange({ ...value, tournamentName: event.target.value })}
            placeholder="e.g. Tamil Nadu Premier League"
            className={inputClass}
          />
        </label>
      )}

      <div className="block">
        <span className={labelClass}>Start</span>
        <div className="grid grid-cols-2 gap-2">
          {START_MODE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={startMode === option.value}
              onClick={() =>
                onChange({
                  ...value,
                  startMode: option.value,
                  scheduledAt:
                    option.value === START_MODES.SCHEDULED
                      ? (value.scheduledAt ?? '')
                      : '',
                })
              }
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                startMode === option.value
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {startMode === START_MODES.SCHEDULED && (
        <label className="block">
          <span className={labelClass}>Scheduled date &amp; time</span>
          <input
            type="datetime-local"
            value={value.scheduledAt ?? ''}
            onChange={(event) => onChange({ ...value, scheduledAt: event.target.value })}
            className={inputClass}
          />
        </label>
      )}
    </div>
  )
}