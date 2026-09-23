import { useState } from 'react'
import Button from '../../../components/Button'
import { XI_SIZE } from '../../../utils/constants'

/* ---------- One selectable player row ---------- */

function PlayerRow({ player, picked, order, onToggle }) {
  const id = player.id ?? player.userId
  const name = player.name ?? player.email ?? 'Player'
  const initial = name.charAt(0).toUpperCase()
  const isAdmin = player.role === 'admin'

  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors active:scale-[0.98] ${
        picked
          ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/30'
          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          picked
            ? 'bg-emerald-600 text-white'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
        }`}
      >
        {picked ? order : initial}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-slate-900 dark:text-slate-50">
          {name}
        </span>
        {isAdmin && (
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Team admin</span>
        )}
      </span>

      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
          picked
            ? 'border-emerald-600 bg-emerald-600 text-white'
            : 'border-slate-300 dark:border-slate-600'
        }`}
        aria-hidden="true"
      >
        {picked && (
          <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
            <path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </button>
  )
}

/* ---------- One team's full squad list ---------- */

function SquadList({ team, selected, onToggle }) {
  const players = Array.isArray(team?.squad)
    ? team.squad
    : Array.isArray(team?.members)
      ? team.members
      : []

  if (players.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-800 dark:text-slate-500">
        No squad listed for this team.
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {players.map((player) => {
        const id = player.id ?? player.userId
        const idx = selected.indexOf(id)
        return (
          <li key={id}>
            <PlayerRow
              player={player}
              picked={idx !== -1}
              order={idx + 1}
              onToggle={onToggle}
            />
          </li>
        )
      })}
    </ul>
  )
}

/* ---------- Main component ---------- */

export default function PlayingXI({ teams, value, onChange }) {
  const teamA = teams.find((t) => t.id === value.teamAId)
  const teamB = teams.find((t) => t.id === value.teamBId)
  const [active, setActive] = useState('A')

  const countA = (value.teamAXI ?? []).length
  const countB = (value.teamBXI ?? []).length
  const canSubmit = countA >= 1 && countB >= 1

  const toggle = (teamKey, playerId) => {
    const current = value[teamKey] ?? []
    const next = current.includes(playerId)
      ? current.filter((id) => id !== playerId)
      : current.length >= XI_SIZE
        ? current
        : [...current, playerId]
    onChange({ ...value, [teamKey]: next })
  }

  const tabs = [
    { key: 'A', label: teamA?.name ?? 'Team A', count: countA },
    { key: 'B', label: teamB?.name ?? 'Team B', count: countB },
  ]

  return (
    <div className="pb-24">
      {/* Team switcher */}
      <div className="flex gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
              active === tab.key
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-50'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <span className="truncate">{tab.label}</span>
            <span
              className={`ml-1.5 tabular-nums ${
                active === tab.key ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
              }`}
            >
              {tab.count}/{XI_SIZE}
            </span>
          </button>
        ))}
      </div>

      {/* Active team's list */}
      <div className="mt-4">
        {active === 'A' ? (
          <SquadList team={teamA} selected={value.teamAXI ?? []} onToggle={(id) => toggle('teamAXI', id)} />
        ) : (
          <SquadList team={teamB} selected={value.teamBXI ?? []} onToggle={(id) => toggle('teamBXI', id)} />
        )}
      </div>

      {/* Confirm bar: sits above the app's bottom tab bar, matched to the 430px shell */}
      <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom,0px))] z-30 mx-auto w-[min(100%,430px)] rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-6px_20px_-10px_rgba(0,0,0,0.25)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex items-center gap-3">
          <p className="flex-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {teamA?.name ?? 'Team A'} {countA}/{XI_SIZE} · {teamB?.name ?? 'Team B'} {countB}/{XI_SIZE}
            <br />
            Pick at least 1 per side, up to {XI_SIZE}.
          </p>
          <Button
            disabled={!canSubmit}
            className="shrink-0"
            onClick={() => onChange({ ...value, xiDone: true })}
          >
            Confirm XI
          </Button>
        </div>
      </div>
    </div>
  )
}