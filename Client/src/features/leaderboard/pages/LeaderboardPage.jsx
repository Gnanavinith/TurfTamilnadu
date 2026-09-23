import { useQuery } from '@tanstack/react-query'
import { fetchLeaderboard } from '../api'
import { getErrorMessage } from '../../../lib/axios'
import Top10Table from '../components/Top10Table'

export default function LeaderboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: fetchLeaderboard,
    refetchInterval: 60_000,
  })

  const header = (
    <div className="g-hello">
      <small>Season standings</small>
      <h1>
        Top 10 <em>teams</em>
      </h1>
    </div>
  )

  if (error) {
    return (
      <div className="g-screen">
        {header}
        <div className="g-alert g-alert-error">
          {getErrorMessage(error, 'Failed to load leaderboard')}
        </div>
        <div className="g-btn-row" style={{ marginTop: 14 }}>
          <button type="button" className="g-btn g-btn-outline" onClick={refetch}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  const entries = data?.data?.entries ?? data?.data ?? []

  return (
    <div className="g-screen">
      {header}

      {isLoading ? (
        <div>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="g-skel" />
          ))}
        </div>
      ) : (
        <Top10Table entries={entries} />
      )}
    </div>
  )
}
