import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchUsers, updateUserRole } from '../api'
import { getErrorMessage } from '../../../lib/axios'
import { formatDate } from '../../../utils/formatDate'
import { selectUser } from '../../../app/store'
import { credentialsSet } from '../../../app/store'
import { useDebounce } from '../../../hooks/useDebounce'
import { useToast } from '../../../components/ToastContext'

const ROLES = ['player', 'scorer', 'admin']
const PAGE_SIZE = 20

function UsersSkeleton() {
  return (
    <div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="g-skel" />
      ))}
    </div>
  )
}

export default function UsersAdminPage() {
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  const currentUser = useSelector(selectUser)
  const { showToast } = useToast()

  const [searchInput, setSearchInput] = useState('')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)
  const search = useDebounce(searchInput, 350)

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['users', search, role, page],
    queryFn: () =>
      fetchUsers({
        search: search || undefined,
        role: role || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    placeholderData: (prev) => prev,
  })

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }) => updateUserRole(userId, role),
    onSuccess: (res) => {
      const updatedUser = res?.data?.data
      queryClient.invalidateQueries({ queryKey: ['users'] })
      if (updatedUser && String(updatedUser.id) === String(currentUser?.id)) {
        dispatch(credentialsSet({ user: updatedUser }))
      }
      showToast('Role updated')
    },
    onError: (err) => {
      showToast(getErrorMessage(err, 'Could not update role'), 'error')
    },
  })

  const users = data?.data ?? []
  const pagination = data?.pagination ?? { page: 1, totalPages: 1, total: 0 }

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.totalPages) return
    setPage(nextPage)
  }

  return (
    <div className="g-screen">
      <div className="g-hello">
        <small>Admin</small>
        <h1>
          Manage <em>users</em>
        </h1>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={searchInput}
          onChange={(event) => {
            setSearchInput(event.target.value)
            setPage(1)
          }}
          placeholder="Search by name or email…"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white sm:max-w-xs"
        />
        <select
          value={role}
          onChange={(event) => {
            setRole(event.target.value)
            setPage(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <span className="ml-auto text-sm text-slate-400 dark:text-slate-500">
          {pagination.total.toLocaleString()} users
        </span>
      </div>

      {isLoading && !data ? (
        <UsersSkeleton />
      ) : error ? (
        <div className="g-alert g-alert-error">
          {getErrorMessage(error, 'Failed to load users')}
        </div>
      ) : (
        <div className={`g-panel g-table-wrap${isFetching ? ' g-fetching' : ''}`} style={{ marginTop: 0 }}>
          <table className="g-table">
            <thead>
              <tr>
                <th>User</th>
                <th className="g-num">Joined</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <p style={{ fontWeight: 800 }}>{user.name ?? 'Player'}</p>
                    <p className="g-note">{user.email}</p>
                  </td>
                  <td className="g-num g-note">{formatDate(user.createdAt)}</td>
                  <td>
                    <div className="g-row-between">
                      <select
                        value={user.role}
                        onChange={(event) =>
                          roleMutation.mutate({ userId: user.id, role: event.target.value })
                        }
                        disabled={
                          roleMutation.isPending &&
                          roleMutation.variables?.userId === user.id
                        }
                        className="g-select"
                        style={{ minHeight: 40, width: 'auto' }}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      {user.id === currentUser?.id && <span className="g-note">(you)</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <p className="g-note" style={{ padding: '16px 0' }}>No users match your filters.</p>}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <nav className="g-btn-row" style={{ marginTop: 16 }}>
          <button
            type="button"
            className="g-btn g-btn-outline g-btn-sm"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
          >
            Prev
          </button>
          <span className="g-note" style={{ alignSelf: 'center' }}>
            Page {page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            className="g-btn g-btn-outline g-btn-sm"
            onClick={() => goToPage(page + 1)}
            disabled={page >= pagination.totalPages}
          >
            Next
          </button>
        </nav>
      )}
    </div>
  )
}