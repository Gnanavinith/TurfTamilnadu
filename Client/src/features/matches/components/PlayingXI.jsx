import Button from '../../../components/Button'
import { XI_SIZE } from '../../../utils/constants'

function SquadPicker({ label, team, selected = [], onToggle }) {
  const players = Array.isArray(team?.squad)
    ? team.squad
    : Array.isArray(team?.members)
      ? team.members
      : []

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">{label}</h3>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {selected.length}/{XI_SIZE}
        </span>
      </div>
      {players.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">
          No squad listed for this team.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {players.map((player) => {
            const id = player.id ?? player.userId
            const isPicked = selected.includes(id)
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onToggle(id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    isPicked
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-md border text-xs ${
                      isPicked
                        ? 'border-emerald-500 bg-emerald-600 text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {isPicked ? '✓' : ''}
                  </span>
                  <span className="flex-1">{player.name ?? player.email}</span>
                  {player.role && (
                    <span className="text-xs text-slate-400">
                      {player.role.replace('_', ' ')}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default function PlayingXI({ teams, value, onChange }) {
  const teamA = teams.find((t) => t.id === value.teamAId)
  const teamB = teams.find((t) => t.id === value.teamBId)

  const toggle = (teamKey, playerId) => {
    const current = value[teamKey] ?? []
    const next = current.includes(playerId)
      ? current.filter((id) => id !== playerId)
      : [...current, playerId]
    onChange({ ...value, [teamKey]: next.slice(0, XI_SIZE) })
  }

  const canSubmit =
    (value.teamAXI ?? []).length >= 1 && (value.teamBXI ?? []).length >= 1

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        <SquadPicker
          label={teamA?.name ?? 'Team A'}
          team={teamA}
          selected={value.teamAXI ?? []}
          onToggle={(id) => toggle('teamAXI', id)}
        />
        <SquadPicker
          label={teamB?.name ?? 'Team B'}
          team={teamB}
          selected={value.teamBXI ?? []}
          onToggle={(id) => toggle('teamBXI', id)}
        />
      </div>
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Pick up to {XI_SIZE} players per squad (at least 1 each).
        </p>
        <Button disabled={!canSubmit} onClick={() => onChange({ ...value, xiDone: true })}>
          Confirm Playing XI
        </Button>
      </div>
    </div>
  )
}