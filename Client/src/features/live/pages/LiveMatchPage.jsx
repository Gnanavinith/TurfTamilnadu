import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { getErrorMessage } from '../../../lib/axios'
import { useLiveMatch } from '../hooks/useLiveMatch'
import { startMatch, endMatch } from '../../matches/api'
import { selectUser } from '../../../app/store'
import { MATCH_STATUS } from '../../../utils/constants'
import { formatDate, formatTime } from '../../../utils/formatDate'
import ConfirmDialog from '../../../components/ConfirmDialog'
import { useToast } from '../../../components/ToastContext'
import Scoreboard from '../components/Scoreboard'
import OverTimeline from '../components/OverTimeline'
import Scorecard from '../components/Scorecard'

export default function LiveMatchPage() {
  const { matchId } = useParams()
  const { match, isLoading, error, refetch } = useLiveMatch(matchId)
  const user = useSelector(selectUser)
  const { showToast } = useToast()
  const [starting, setStarting] = useState(false)
  const [ending, setEnding] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [actionError, setActionError] = useState('')

  const canScore = ['scorer', 'admin'].includes(user?.role)

  if (isLoading) {
    return (
      <div className="g-screen">
        <div className="g-skel" />
        <div className="g-skel" />
        <div className="g-skel" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="g-screen">
        <div className="g-alert g-alert-error">{getErrorMessage(error, 'Match not found')}</div>
        <div className="g-btn-row" style={{ marginTop: 14 }}>
          <Link to="/" className="g-btn g-btn-outline">
            Back to matches
          </Link>
        </div>
      </div>
    )
  }

  if (!match) return null

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

  const handleEnd = async () => {
    setActionError('')
    setConfirmEnd(false)
    setEnding(true)
    try {
      await endMatch(match.id)
      await refetch()
      showToast('Match ended')
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not end the match'))
    } finally {
      setEnding(false)
    }
  }

  return (
    <div className="g-screen">
      <div className="g-hello">
        <small>
          {formatDate(match.scheduledAt)} · {formatTime(match.scheduledAt)}
          {match.venue ? ` · ${match.venue}` : ''}
        </small>
        <h1>
          {match.teamA?.name ?? 'Team A'} <em>vs</em> {match.teamB?.name ?? 'Team B'}
        </h1>
      </div>

      <div className="g-btn-row" style={{ marginBottom: 14 }}>
        {canScore && match.status === MATCH_STATUS.SCHEDULED && (
          <button
            type="button"
            className="g-btn"
            onClick={handleStart}
            disabled={starting}
          >
            {starting ? 'Starting…' : 'Start match'}
          </button>
        )}
        {canScore && match.status === MATCH_STATUS.LIVE && (
          <Link to={`/scoring/${match.id}`} className="g-btn">
            Score match
          </Link>
        )}
        {canScore &&
          ![MATCH_STATUS.COMPLETED, MATCH_STATUS.ABANDONED].includes(match.status) && (
            <button
              type="button"
              className="g-btn g-btn-danger"
              onClick={() => setConfirmEnd(true)}
            >
              End match
            </button>
          )}
        <button type="button" className="g-btn g-btn-ghost" onClick={() => refetch()}>
          Refresh
        </button>
      </div>

      {actionError && <div className="g-alert g-alert-error">{actionError}</div>}

      <Scoreboard match={match} />

      {overCount > 0 && (
        <div className="g-panel">
          <div className="g-panel-head">Over by over</div>
          <OverTimeline overs={match.oversTimeline} />
        </div>
      )}

      <div className="g-sec-head">
        <h2>Scorecard</h2>
      </div>
      <Scorecard match={match} />

      <ConfirmDialog
        open={confirmEnd}
        title="End this match?"
        message="This marks the match as abandoned with no result. No points are awarded and it can't be undone."
        confirmLabel="End match"
        busy={ending}
        onConfirm={handleEnd}
        onClose={() => setConfirmEnd(false)}
      />
    </div>
  )
}
