import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchPublicMatches, fetchPublicLeaderboard } from '../api'
import { MATCH_STATUS } from '../../../utils/constants'
import { getErrorMessage } from '../../../lib/axios'
import Button from '../../../components/Button'
import Skeleton from '../../../components/Skeleton'
import MatchCard from '../../matches/components/MatchCard'
import Top10Table from '../../leaderboard/components/Top10Table'

function HomeHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/home" className="flex items-center gap-2 font-bold text-emerald-600">
          <img src="/throw.png" alt="Turf logo" className="h-8 w-8 rounded object-contain" />
          Turf
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/login">
            <Button variant="outline">Sign in</Button>
          </Link>
          <Link to="/onboarding">
            <Button>Get started</Button>
          </Link>
        </div>
      </div>
    </header>
  )
}

function LiveSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function PublicHomePage() {
  const liveQuery = useQuery({
    queryKey: ['public', 'matches', 'live'],
    queryFn: () => fetchPublicMatches({ status: MATCH_STATUS.LIVE }),
    refetchInterval: 30_000,
  })

  const upcomingQuery = useQuery({
    queryKey: ['public', 'matches', 'upcoming'],
    queryFn: () => fetchPublicMatches({ status: MATCH_STATUS.SCHEDULED }),
  })

  const leaderboardQuery = useQuery({
    queryKey: ['public', 'leaderboard'],
    queryFn: fetchPublicLeaderboard,
    refetchInterval: 60_000,
  })

  const liveMatches = liveQuery.data?.data ?? []
  const upcomingMatches = (upcomingQuery.data?.data ?? []).slice(0, 3)
  const entries = leaderboardQuery.data?.data ?? []

  return (
    <div className="flex min-h-screen flex-col">
      <HomeHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <section className="mb-10 max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight">
            Score turf cricket matches, live.
          </h1>
          <p className="mt-2 text-lg text-slate-500 dark:text-slate-400">
            Turf keeps your league's scores, standings and player stats in one
            place — score a match from any phone, share the link, and watch it
            update ball by ball.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/login">
              <Button size="lg">Sign in to score</Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">
                Jump in as a player
              </Button>
            </Link>
          </div>
        </section>

        <section className="mb-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <span className="h-2 w-2 rounded-full bg-red-500">
                <span className="block h-full w-full animate-ping rounded-full bg-red-500" />
              </span>
              Live matches
            </h2>
            <Link to="/login" className="text-sm text-emerald-600 hover:underline">
              Follow live →
            </Link>
          </div>
          {liveQuery.isLoading ? (
            <LiveSkeleton />
          ) : liveQuery.error ? (
            <p className="rounded-xl bg-red-50 p-6 text-center text-sm text-red-600 dark:bg-red-900/30">
              {getErrorMessage(liveQuery.error, 'Could not load live matches')}
            </p>
          ) : liveMatches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 py-12 text-center dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400">
                No matches are live right now.
              </p>
              <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
                Check back when a match starts, or catch an upcoming fixture below.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {liveMatches.map((match) => (
                <MatchCard key={match.id} match={match} linkTo="/login" />
              ))}
            </div>
          )}
        </section>

        {upcomingMatches.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-4 text-lg font-semibold">Coming up</h2>
            <div className="space-y-3">
              {upcomingMatches.map((match) => (
                <MatchCard key={match.id} match={match} linkTo="/login" />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Top 10 teams</h2>
            <Link to="/login" className="text-sm text-emerald-600 hover:underline">
              See the full standings →
            </Link>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {leaderboardQuery.isLoading ? (
              <div className="space-y-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : (
              <Top10Table entries={entries} />
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
        Turf · turf cricket scoring
      </footer>
    </div>
  )
}