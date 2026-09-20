import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { getErrorMessage } from '../../../lib/axios'
import { useLiveMatch } from '../hooks/useLiveMatch'
import { startMatch } from '../../matches/api'
import { selectUser } from '../../../app/store'
import { STATUS_LABELS, MATCH_STATUS } from '../../../utils/constants'
import { formatDate, formatTime } from '../../../utils/formatDate'
import Loader from '../../../components/Loader'
import Button from '../../../components/Button'
import Scoreboard from '../components/Scoreboard'
import OverTimeline from '../components/OverTimeline'
import Scorecard from '../components/Scorecard'

export default function LiveMatchPage() {
  const { matchId } = useParams()
  const { match, isLoading, error, refetch } = useLiveMatch(matchId)
  const user = useSelector(selectUser)
  const [starting, setStarting] = useState(false)
  const [actionError, setActionError] = useState('')

  const canScore = ['scorer', 'admin'].includes(user?.role)

  if (isLoading) return <Loader label="Loading match…" />

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-6 text-center dark:bg-red-900/30">
        <p className="text-sm text-red-600 dark:text-red-400">
          {getErrorMessage(error, 'Match not found')}
        </p>
        <Link to="/" className="mt-4 inline-block text-sm text-emerald-600 hover:underline">
          Back to matches
        </Link>
      </div>
    )
  }

  if (!match) return <Loader label="Loading match…" />

  const overCount = Array.isArray(match.oversTimeline) ? match.oversTimeline.length : 0

  const handleStart = async () => {
    setActionError('')
    setStarting(true)
    try {
      await startMatch(match.id)
      await refetch()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not start the match'))
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">
            {match.teamA?.name ?? 'Team A'} <span className="text-slate-400">vs</span>{' '}
            {match.teamB?.name ?? 'Team B'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {formatDate(match.scheduledAt)} · {formatTime(match.scheduledAt)}
            {match.venue ? ` · ${match.venue}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canScore && match.status === MATCH_STATUS.SCHEDULED && (
            <Button onClick={handleStart} loading={starting}>
              Start match
            </Button>
          )}
          {canScore && match.status === MATCH_STATUS.LIVE && (
            <Link to={`/scoring/${match.id}`}>
              <Button>Score match</Button>
            </Link>
          )}
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Refresh
          </button>
        </div>
      </header>

      {actionError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
          {actionError}
        </p>
      )}

      <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {STATUS_LABELS[match.status] ?? match.status}
      </p>

      <Scoreboard match={match} />

      {overCount > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Over by over
          </h2>
          <OverTimeline overs={match.oversTimeline} />
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Scorecard
        </h2>
        <Scorecard match={match} />
      </section>
    </div>
  )
}