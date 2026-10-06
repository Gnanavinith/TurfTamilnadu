import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDebounce } from '../../../hooks/useDebounce'
import { searchPlayers, updateTeam } from '../api'
import { getErrorMessage } from '../../../lib/axios'
import { SPECIALTY_OPTIONS, MAX_JERSEY_NUMBER } from '../constants'
import Modal from '../../../components/Modal'
import { useToast } from '../../../components/ToastContext'

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white'

/**
 * Bottom action bar for the team page: add an existing player to the roster, or
 * invite someone by email to create an account. Kept out of the global tab bar
 * because it is scoped to one team rather than a top-level destination.
 */
export default function AddPlayerBar({ team, squad, isAdmin, onInvite }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [pending, setPending] = useState(null)
  const debouncedSearch = useDebounce(search, 300)
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const { data, isFetching } = useQuery({
    queryKey: ['players', debouncedSearch],
    queryFn: () => searchPlayers({ search: debouncedSearch || undefined }),
    enabled: open && Boolean(debouncedSearch),
  })

  const addMutation = useMutation({
    mutationFn: ({ userId, specialty, jerseyNumber }) =>
      updateTeam(team.id, {
        players: [
          ...(squad ?? []).map((member) => ({
            userId: String(member.id),
            specialty: member.specialty || undefined,
            jerseyNumber: member.jerseyNumber ?? null,
            role: member.role,
          })),
          {
            userId: String(userId),
            specialty: specialty || undefined,
            jerseyNumber: jerseyNumber ? Number(jerseyNumber) : null,
          },
        ],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', team.id] })
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['my-teams'] })
      setOpen(false)
      setPending(null)
      setSearch('')
      showToast('Player added')
    },
    onError: (err) => {
      showToast(getErrorMessage(err, 'Could not add player'), 'error')
    },
  })

  if (!isAdmin) return null

  const squadIds = new Set((squad ?? []).map((member) => String(member.id)))
  const candidates = (data?.data ?? []).filter((player) => !squadIds.has(String(player.id)))

  return (
    <>
      <div className="g-actionbar">
        <div className="g-actionbar-inner">
          <button
            type="button"
            className="g-btn g-btn-outline"
            onClick={onInvite}
          >
            Invite by email
          </button>
          <button type="button" className="g-btn" onClick={() => setOpen(true)}>
            Add player
          </button>
        </div>
      </div>

      {open && (
        <Modal open onClose={() => setOpen(false)} title="Add player">
          {addMutation.error && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
              {getErrorMessage(addMutation.error, 'Could not add player')}
            </p>
          )}

          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPending(null)
            }}
            placeholder="Search by name or email"
            autoFocus
            className={inputClass}
          />

          {isFetching && <p className="mt-3 text-xs text-slate-400">Searching…</p>}

          {!isFetching && debouncedSearch && candidates.length === 0 && (
            <p className="mt-3 text-xs text-slate-400">
              No players found for “{debouncedSearch}”.
            </p>
          )}

          {candidates.length > 0 && (
            <ul className="mt-3 max-h-56 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
              {candidates.map((player) => {
                const isPending = pending?.id === String(player.id)
                return (
                  <li key={player.id} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setPending(isPending ? null : { ...player })}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                          {player.name ?? player.email}
                        </span>
                        <span className="block truncate text-xs text-slate-400">
                          {player.email}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {isPending ? 'Selected' : 'Select'}
                      </span>
                    </button>

                    {isPending && (
                      <div className="flex items-center gap-2 border-t border-slate-100 px-3 py-2 dark:border-slate-800">
                        <select
                          value={pending.specialty ?? ''}
                          onChange={(event) =>
                            setPending((prev) => ({ ...prev, specialty: event.target.value }))
                          }
                          aria-label={`Role for ${player.name ?? player.email}`}
                          className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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
                          value={pending.jerseyNumber ?? ''}
                          onChange={(event) =>
                            setPending((prev) => ({
                              ...prev,
                              jerseyNumber: event.target.value === '' ? '' : event.target.value,
                            }))
                          }
                          placeholder="#"
                          aria-label={`Shirt number for ${player.name ?? player.email}`}
                          className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center text-xs outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                        />
                        <button
                          type="button"
                          className="g-btn g-btn-sm shrink-0"
                          disabled={addMutation.isPending}
                          onClick={() =>
                            addMutation.mutate({
                              userId: player.id,
                              specialty: pending.specialty,
                              jerseyNumber: pending.jerseyNumber,
                            })
                          }
                        >
                          {addMutation.isPending ? 'Adding…' : 'Add'}
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          {!debouncedSearch && (
            <p className="mt-3 text-xs text-slate-400">
              Search the player directory to add someone who already has an account. To
              create a new player account, use Invite by email.
            </p>
          )}
        </Modal>
      )}
    </>
  )
}