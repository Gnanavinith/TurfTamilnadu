import { useQuery } from '@tanstack/react-query'
import { fetchLeaderboard } from '../api'
import { getErrorMessage } from '../../../lib/axios'
import Loader from '../../../components/Loader'
import Top10Table from '../components/Top10Table'

export default function LeaderboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: fetchLeaderboard,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  if (isLoading) return <Loader label="Loading leaderboard…" />

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-6 text-center dark:bg-red-900/30">
        <p className="text-sm text-red-600 dark:text-red-400">
          {getErrorMessage(error, 'Failed to load leaderboard')}
        </p>
      </div>
    )
  }

  const entries = data?.data?.entries ?? data?.data ?? []

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-xl font-bold">Team Standings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Winning teams ranked by points and rating
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <Top10Table entries={entries} />
      </section>
    </div>
  )
}