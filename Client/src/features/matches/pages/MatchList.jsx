import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchMatches } from '../api'
import { getErrorMessage } from '../../../lib/axios'
import { STATUS_LABELS, MATCH_STATUS } from '../../../utils/constants'
import { formatDate, formatTime } from '../../../utils/formatDate'
import Loader from '../../../components/Loader'
import Button from '../../../components/Button'

export default function MatchList() {
  const [status, setStatus] = useState('')
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['matches', status],
    queryFn: () => fetchMatches({ status: status || undefined }),
  })

  if (isLoading) return <Loader label="Loading matches…" />

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-6 text-center dark:bg-red-900/30">
        <p className="text-sm text-red-600 dark:text-red-400">
          {getErrorMessage(error, 'Failed to load matches')}
        </p>
        <Button variant="outline" onClick={refetch} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  const matches = data?.data ?? []

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Matches</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Your fixtures and live games
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          >
            <option value="">All status</option>
            {Object.values(MATCH_STATUS).map((value) => (
              <option key={value} value={value}>
                {STATUS_LABELS[value]}
              </option>
            ))}
          </select>
          <Link to="/matches/create">
            <Button>New Match</Button>
          </Link>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 py-16 text-center dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400">No matches found.</p>
          <Link to="/matches/create">
            <Button className="mt-4">Create a match</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => {
            const teamA = match.teamA
            const teamB = match.teamB
            return (
              <Link
                key={match.id}
                to={`/live/${match.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold">
                        {teamA?.name ?? 'Team A'} <span className="text-slate-400">vs</span>{' '}
                        {teamB?.name ?? 'Team B'}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          match.status === MATCH_STATUS.LIVE
                            ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
                            : match.status === MATCH_STATUS.COMPLETED
                              ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                        }`}
                      >
                        {STATUS_LABELS[match.status] ?? match.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      {match.overs} overs · {formatDate(match.scheduledAt)} at{' '}
                      {formatTime(match.scheduledAt)}
                    </p>
                    {match.status === MATCH_STATUS.COMPLETED && match.result?.winnerTeamId && (
                      <p className="mt-1 text-sm">
                        {match.teamA.id === match.result.winnerTeamId ? (
                          <>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {match.teamA.name} won
                            </span>
                            <span className="text-slate-400"> · </span>
                            <span className="text-slate-500 dark:text-slate-400">
                              {match.teamB.name} lost
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {match.teamB.name} won
                            </span>
                            <span className="text-slate-400"> · </span>
                            <span className="text-slate-500 dark:text-slate-400">
                              {match.teamA.name} lost
                            </span>
                          </>
                        )}
                        {match.result.margin && (
                          <span className="text-xs text-slate-400"> ({match.result.margin})</span>
                        )}
                      </p>
                    )}
                    {match.score?.summary && (
                      <p className="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        {match.score.summary}
                      </p>
                    )}
                  </div>
                  <span className="text-emerald-600">→</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}