import Button from '../../../components/Button'

export default function TossPanel({ teams, value, onChange }) {
  const teamOptions = [value.teamAId, value.teamBId].filter(Boolean)

  const toggleDecision = (choice) => {
    if (value.tossDecision === choice) onChange({ ...value, tossDecision: undefined })
    else onChange({ ...value, tossDecision: choice })
  }

  return (
    <div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
          Toss won by
        </span>
        <div className="grid grid-cols-2 gap-2">
          {teamOptions.map((teamId) => (
            <button
              key={teamId}
              type="button"
              onClick={() => onChange({ ...value, tossWinnerId: teamId })}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                value.tossWinnerId === teamId
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {teams.find((t) => t.id === teamId)?.name ?? 'Team'}
            </button>
          ))}
        </div>
      </label>

      <div className="mt-4">
        <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
          Elected to
        </span>
        <div className="grid grid-cols-2 gap-2">
          {['bat', 'bowl'].map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => toggleDecision(choice)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                value.tossDecision === choice
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {choice === 'bat' ? 'Bat first' : 'Bowl first'}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          disabled={!value.tossWinnerId || !value.tossDecision}
          onClick={() => onChange({ ...value, tossDone: true })}
        >
          Continue to Playing XI
        </Button>
      </div>
    </div>
  )
}