import { useState } from 'react'
import { useSelector } from 'react-redux'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createUser, updateUser } from '../../users/api'
import { useDebounce } from '../../../hooks/useDebounce'
import { useToast } from '../../../components/ToastContext'
import { getErrorMessage } from '../../../lib/axios'
import { selectUser } from '../../../app/store'
import { useAuthPrompt } from '../../auth/hooks/useAuthPrompt'
import { fetchPlayers } from '../api'

const ROLES = ['player', 'scorer', 'admin']
const EMPTY_FORM = { name: '', email: '', password: '', role: 'player' }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateForm(form) {
  const errors = {}
  if (form.name.trim().length < 2) errors.name = 'Enter at least 2 characters'
  if (!EMAIL_RE.test(form.email.trim())) errors.email = 'Enter a valid email'
  if (form.password && form.password.length < 8) {
    errors.password = 'At least 8 characters'
  }
  return errors
}

function usePlayerMutation({ onDone }) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const onError = (err) => showToast(getErrorMessage(err, 'Could not save player'), 'error')

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['players'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      showToast(`${res?.data?.name ?? 'Player'} added`)
      onDone()
    },
    onError,
  })

  const editMutation = useMutation({
    mutationFn: ({ userId, payload }) => updateUser(userId, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['players'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      showToast(`${res?.data?.name ?? 'Player'} updated`)
      onDone()
    },
    onError,
  })

  return { createMutation, editMutation, isPending: createMutation.isPending || editMutation.isPending }
}

function PlayerFields({ form, errors, update, showPassword }) {
  return (
    <>
      <label className="g-field">
        <span className="g-label">Name</span>
        <input
          className={`g-input${errors.name ? ' g-invalid' : ''}`}
          value={form.name}
          onChange={update('name')}
          placeholder="Ravi Sharma"
          autoFocus
        />
        {errors.name && <span className="g-error-text">{errors.name}</span>}
      </label>

      <label className="g-field">
        <span className="g-label">Email</span>
        <input
          type="email"
          className={`g-input${errors.email ? ' g-invalid' : ''}`}
          value={form.email}
          onChange={update('email')}
          placeholder="ravi@example.com"
        />
        {errors.email && <span className="g-error-text">{errors.email}</span>}
      </label>

      {showPassword && (
        <label className="g-field">
          <span className="g-label">Temporary password</span>
          <input
            type="text"
            className={`g-input${errors.password ? ' g-invalid' : ''}`}
            value={form.password}
            onChange={update('password')}
            placeholder="At least 8 characters"
          />
          {errors.password ? (
            <span className="g-error-text">{errors.password}</span>
          ) : (
            <span className="g-hint">Share this with the player so they can sign in.</span>
          )}
        </label>
      )}

      <label className="g-field">
        <span className="g-label">Role</span>
        <select className="g-select" value={form.role} onChange={update('role')}>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </label>
    </>
  )
}

function CreatePlayerForm({ onDone }) {
  const { createMutation, isPending } = usePlayerMutation({ onDone })
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  const update = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }))

  const handleSubmit = (event) => {
    event.preventDefault()
    const next = validateForm(form)
    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }
    setErrors({})
    createMutation.mutate({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      role: form.role,
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <PlayerFields
        form={form}
        errors={errors}
        update={update}
        showPassword
      />
      <div className="g-btn-row">
        <button type="button" className="g-btn g-btn-outline" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="g-btn" disabled={isPending}>
          {isPending ? 'Adding…' : 'Add player'}
        </button>
      </div>
    </form>
  )
}

function EditPlayerForm({ player, onDone }) {
  const { editMutation, isPending } = usePlayerMutation({ onDone })
  const [form, setForm] = useState({
    name: player.name ?? '',
    email: player.email ?? '',
    role: player.role ?? 'player',
  })
  const [errors, setErrors] = useState({})

  const update = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }))

  const handleSubmit = (event) => {
    event.preventDefault()
    const next = validateForm(form)
    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }
    setErrors({})
    editMutation.mutate({
      userId: player.id,
      payload: { name: form.name.trim(), email: form.email.trim(), role: form.role },
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <PlayerFields form={form} errors={errors} update={update} />
      <div className="g-btn-row">
        <button type="button" className="g-btn g-btn-outline" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="g-btn" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

export default function PlayersPage() {
  const currentUser = useSelector(selectUser)
  const [searchInput, setSearchInput] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const search = useDebounce(searchInput, 300)
  const isAdmin = currentUser?.role === 'admin'

  const { isAuthenticated, promptAuth } = useAuthPrompt()

  // The directory is tenant-scoped server-side, so it only exists once signed
  // in. Don't fire the query otherwise — it would just 401 and paint an error
  // on a page the nav only offers to members.
  const { data, isFetching, error, refetch } = useQuery({
    queryKey: ['players', search],
    queryFn: () => fetchPlayers({ search: search || undefined, limit: 50 }),
    refetchInterval: 60_000,
    enabled: isAuthenticated,
  })

  const players = data?.data ?? []

  const header = (
    <div className="g-hello">
      <small>Directory</small>
      <h1>
        <em>Players</em>
      </h1>
    </div>
  )

  return (
    <div className="g-screen">
      {header}

      <input
        className="g-search"
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        placeholder="Search by name or email"
        aria-label="Search players"
      />

      {isAdmin && (
        <div className="g-btn-row" style={{ marginBottom: 14 }}>
          <button
            type="button"
            className="g-btn g-btn-outline g-btn-block"
            onClick={() => {
              setCreating((prev) => !prev)
              setEditingId(null)
            }}
          >
            {creating ? 'Close form' : 'Add player'}
          </button>
        </div>
      )}

      {creating && isAdmin && (
        <div className="g-panel" style={{ marginTop: 0, marginBottom: 16 }}>
          <div className="g-panel-head">
            New player
            <span>Admin only</span>
          </div>
          <CreatePlayerForm
            onDone={() => {
              setCreating(false)
              setEditingId(null)
            }}
          />
        </div>
      )}

      {!isAuthenticated ? (
        // Signed out: no directory to show, and no player data is public.
        <div className="g-empty">
          <p>Sign in to see your players.</p>
          <small>Player lists belong to an account. Sign in to manage your squads.</small>
          <button
            type="button"
            className="g-btn"
            onClick={() => promptAuth('signin')}
          >
            Sign in
          </button>
        </div>
      ) : error ? (
        <>
          <div className="g-alert g-alert-error">{getErrorMessage(error, 'Failed to load players')}</div>
          <div className="g-btn-row" style={{ marginTop: 14 }}>
            <button type="button" className="g-btn g-btn-outline" onClick={refetch}>
              Retry
            </button>
          </div>
        </>
      ) : isFetching && players.length === 0 ? (
        <div>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="g-skel" style={{ height: 64 }} />
          ))}
        </div>
      ) : players.length === 0 ? (
        <div className="g-empty">
          <p>{search ? 'No players match that search.' : 'No players yet.'}</p>
          <small>
            {search
              ? 'Try a different name or email.'
              : 'Add your first player, then pick them into a team with a jersey number.'}
          </small>
        </div>
      ) : (
        <div style={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity 0.2s' }}>
          {players.map((player) => {
            const name = player.name ?? player.email
            const isEditing = editingId === String(player.id)
            return (
              <div key={player.id}>
                <div className="g-player-row">
                  <div className="g-avatar">{name.charAt(0).toUpperCase()}</div>
                  <div className="g-player-meta">
                    <strong>{name}</strong>
                    <small>{player.email}</small>
                  </div>
                  <span
                    className={`g-badge g-badge-xs${player.role === 'admin' ? ' g-badge-warn' : ''}`}
                  >
                    {player.role}
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      className="g-icon-btn g-player-edit"
                      aria-label={`Edit ${name}`}
                      aria-expanded={isEditing}
                      onClick={() => {
                        setCreating(false)
                        setEditingId(isEditing ? null : String(player.id))
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M4 20h4l10-10-4-4L4 16v4z" />
                        <path d="M13.5 6.5l4 4" />
                      </svg>
                    </button>
                  )}
                </div>

                {isEditing && (
                  <div className="g-panel g-player-edit-form">
                    <EditPlayerForm
                      player={player}
                      onDone={() => setEditingId(null)}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}