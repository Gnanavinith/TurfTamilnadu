import { useState } from 'react'
import { useSelector } from 'react-redux'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchUsers, updateUserRole } from '../api'
import { getErrorMessage } from '../../../lib/axios'
import { formatDate } from '../../../utils/formatDate'
import { selectUser } from '../../../app/store'
import Loader from '../../../components/Loader'

const ROLES = ['player', 'scorer', 'admin']

export default function UsersAdminPage() {
  const queryClient = useQueryClient()
  const currentUser = useSelector(selectUser)
  const [errorMessage, setErrorMessage] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  })

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }) => updateUserRole(userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    onError: (err) => setErrorMessage(getErrorMessage(err, 'Could not update role')),
  })

  if (isLoading) return <Loader label="Loading users…" />

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-6 text-center dark:bg-red-900/30">
        <p className="text-sm text-red-600 dark:text-red-400">
          {getErrorMessage(error, 'Failed to load users')}
        </p>
      </div>
    )
  }

  const users = data?.data ?? []

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-xl font-bold">Manage users</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Assign scorer or admin roles. Users must sign in again after their role changes.
        </p>
      </header>

      {errorMessage && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
          {errorMessage}
        </p>
      )}

      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-700 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Joined</th>
              <th className="px-4 py-3 font-medium">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    {user.name ?? '—'}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{user.email}</p>
                </td>
                <td className="hidden px-4 py-3 text-sm text-slate-500 sm:table-cell dark:text-slate-400">
                  {formatDate(user.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={user.role}
                      onChange={(event) => roleMutation.mutate({ userId: user.id, role: event.target.value })}
                      disabled={roleMutation.isPending && roleMutation.variables?.userId === user.id}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-emerald-500 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                    {user.id === currentUser?.id && (
                      <span className="text-xs text-slate-400">(you)</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-slate-400">No users yet.</p>
        )}
      </section>
    </div>
  )
}