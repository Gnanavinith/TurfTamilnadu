import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDebounce } from '../../../hooks/useDebounce'
import { searchPlayers } from '../api'
import { useAuth } from '../../auth/hooks/useAuth'
import { SPECIALTY_LABELS, SPECIALTY_OPTIONS, MAX_JERSEY_NUMBER } from '../constants'

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white'
const labelClass = 'mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300'

/** Shirt numbers are typed as text so a half-finished entry stays editable. */
function isValidJersey(raw) {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) return true
  const parsed = Number(trimmed)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= MAX_JERSEY_NUMBER
}

function jerseyOf(raw) {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed || !isValidJersey(trimmed)) return null
  return Number(trimmed)
}

/**
 * Squad picker shared by create-team and edit-team. Players are chosen from
 * existing accounts: search the directory, tap to add, then set a shirt number
 * and role. The signed-in user is always in the squad and can't be removed.
 */
export default function TeamForm({
  value,
  onChange,
  submitLabel = 'Create team',
  busy = false,
  submit,
  secondaryAction,
}) {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const { data, isFetching } = useQuery({
    queryKey: ['players', debouncedSearch],
    queryFn: () => searchPlayers({ search: debouncedSearch || undefined }),
    enabled: Boolean(user?.id),
  })

  // Roster entries keyed by userId, so a player appears exactly once.
  // `players` is a fresh array each render, so memoise on its contents.
  const selected = useMemo(() => value.players ?? [], [value.players])
  const selectedIds = useMemo(
    () => new Set(selected.map((player) => String(player.userId))),
    [selected],
  )
  const candidates = (data?.data ?? []).filter((player) => !selectedIds.has(String(player.id)))

  // Jersey numbers already taken in this squad, so the list can flag clashes.
  const takenNumbers = useMemo(
    () =>
      new Map(
        selected
          .filter((player) => isValidJersey(player.jerseyNumber) && jerseyOf(player.jerseyNumber))
          .map((player) => [jerseyOf(player.jerseyNumber), String(player.userId)]),
      ),
    [selected],
  )

  const updatePlayer = (userId, patch) => {
    onChange({
      ...value,
      players: selected.map((player) =>
        String(player.userId) === String(userId) ? { ...player, ...patch } : player,
      ),
    })
  }

  const addPlayer = (player) => {
    onChange({
      ...value,
      players: [
        ...selected,
        {
          userId: String(player.id),
          name: player.name ?? player.email,
          specialty: '',
          jerseyNumber: null,
        },
      ],
    })
  }

  const removePlayer = (userId) => {
    onChange({
      ...value,
      players: selected.filter((player) => String(player.userId) !== String(userId)),
    })
  }

  useEffect(() => {
    // Seed the creator as the first, locked roster entry.
    if (!user?.id) return
    if (selected.some((player) => String(player.userId) === String(user.id))) return
    onChange({
      ...value,
      players: [
        {
          userId: String(user.id),
          name: user.name ?? user.email,
          specialty: '',
          jerseyNumber: null,
          isOwner: true,
        },
        ...selected,
      ],
    })
    // Only seed once per user identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const nameValid = (value.name ?? '').trim().length >= 2
  const jerseysValid = selected.every((player) => isValidJersey(player.jerseyNumber))

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (!nameValid || !jerseysValid) return
        submit()
      }}
      className="space-y-4"
    >
      <label className="block">
        <span className={labelClass}>Team name</span>
        <input
          value={value.name ?? ''}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
          placeholder="e.g. Royapuram Rockers"
          required
          minLength={2}
          className={inputClass}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>
            Short name <span className="font-normal text-slate-400">(optional)</span>
          </span>
          <input
            value={value.shortName ?? ''}
            onChange={(event) => onChange({ ...value, shortName: event.target.value })}
            placeholder="e.g. RCB"
            autoCapitalize="characters"
            maxLength={12}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className={labelClass}>
            City <span className="font-normal text-slate-400">(optional)</span>
          </span>
          <input
            value={value.city ?? ''}
            onChange={(event) => onChange({ ...value, city: event.target.value })}
            placeholder="e.g. Chennai"
            autoCapitalize="words"
            className={inputClass}
          />
        </label>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className={labelClass}>Select squad players</span>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {selected.length} selected
          </span>
        </div>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or email"
          className={inputClass}
        />

        {candidates.length > 0 && (
          <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
            {candidates.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => addPlayer(player)}
                className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                    {player.name ?? player.email}
                  </span>
                  <span className="block truncate text-xs text-slate-400">{player.email}</span>
                </span>
                <span className="shrink-0 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Add
                </span>
              </button>
            ))}
          </div>
        )}

        {isFetching && (
          <p className="mt-2 text-xs text-slate-400">Searching…</p>
        )}
        {!isFetching && debouncedSearch && candidates.length === 0 && (
          <p className="mt-2 text-xs text-slate-400">
            No other players found for “{debouncedSearch}”.
          </p>
        )}
      </div>

      {selected.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
          {selected.map((player) => {
            const name = player.name ?? 'Player'
            const jersey = player.jerseyNumber
            const clash =
              isValidJersey(jersey) && jerseyOf(jersey)
                ? takenNumbers.get(jerseyOf(jersey)) !== String(player.userId)
                : false
            const isSelf = player.isOwner || String(player.userId) === String(user?.id)
            return (
              <li key={player.userId} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                    {name}
                    {isSelf && (
                      <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        You
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {SPECIALTY_LABELS[player.specialty] ?? 'Role not set'}
                  </p>
                </div>

                <select
                  value={player.specialty ?? ''}
                  onChange={(event) =>
                    updatePlayer(player.userId, { specialty: event.target.value })
                  }
                  aria-label={`Role for ${name}`}
                  className="shrink-0 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  {SPECIALTY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.value ? option.label : 'Role: not set'}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={MAX_JERSEY_NUMBER}
                  value={jersey ?? ''}
                  onChange={(event) =>
                    updatePlayer(player.userId, {
                      jerseyNumber: event.target.value === '' ? null : event.target.value,
                    })
                  }
                  placeholder="#"
                  aria-label={`Shirt number for ${name}`}
                  className={`w-16 shrink-0 rounded-lg border bg-white px-2 py-1 text-center text-xs outline-none focus:border-emerald-500 dark:bg-slate-800 dark:text-white ${
                    !isValidJersey(jersey) || clash
                      ? 'border-red-400 dark:border-red-500'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                />

                {!isSelf && (
                  <button
                    type="button"
                    onClick={() => removePlayer(player.userId)}
                    aria-label={`Remove ${name}`}
                    className="shrink-0 px-1 text-sm font-medium text-red-500 hover:text-red-600"
                  >
                    ✕
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {secondaryAction}
        <button
          type="submit"
          className="g-btn"
          disabled={busy || !nameValid || !jerseysValid}
        >
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}