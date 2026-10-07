import { Link, useNavigate, useParams } from 'react-router-dom'
import { getErrorMessage } from '../../../lib/axios'
import { useLiveMatch } from '../../live/hooks/useLiveMatch'
import { useScorer } from '../hooks/useScorer'
import { useGullyFeedback } from '../../gully/feedback'
import { MATCH_STATUS } from '../../../utils/constants'
import LiveScoringView from '../liveScoring/LiveScoringView'
import { outcomeToPayload } from '../liveScoring/helpers'

function PageSkeleton() {
  return (
    <div className="g-screen">
      <div className="g-skel" />
      <div className="g-skel" />
      <div className="g-skel" />
    </div>
  )
}

export default function ScorerPage() {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const { match, isLoading, error, refetch } = useLiveMatch(matchId)
  const { burst } = useGullyFeedback()

  const {
    record,
    undo,
    setBatsman,
    setBowler,
    swapStrike,
    retireHurt,
    recallRetired,
    error: scoreError,
  } = useScorer({ matchId })

  const isComplete =
    match?.status === MATCH_STATUS.COMPLETED || match?.status === MATCH_STATUS.ABANDONED

  /**
   * Every scorer action on the view is a mutation that returns the fresh match
   * snapshot, so nothing needs to refetch afterwards.
   */
  const deliver = (outcome, wicketDetail) => {
    const innings = match?.currentInnings
    const payload = outcomeToPayload(outcome, wicketDetail)

    record.mutate(
      {
        batterId: innings?.strikerId ?? undefined,
        nonStrikerId: innings?.nonStrikerId ?? undefined,
        bowlerId: innings?.bowlerId ?? undefined,
        batterRuns: 0,
        extraType: null,
        extraRuns: 0,
        wicketType: null,
        ...payload,
      },
      {
        onSuccess: () => {
          if (outcome === '4') burst('FOUR!', 'var(--g-four)')
          else if (outcome === '6') burst('SIX!', 'var(--g-six)')
          else if (outcome === 'W') burst('WICKET!', 'var(--g-wkt)')
        },
      },
    )
  }

  if (isLoading) return <PageSkeleton />

  if (error) {
    const notFound = error?.response?.status === 404
    return (
      <div className="g-screen">
        <div className="g-hello">
          <small>Scorer mode</small>
          <h1>{notFound ? 'Match not found' : 'Something went wrong'}</h1>
        </div>
        <div className="g-alert g-alert-error">
          {getErrorMessage(error, 'Failed to load match')}
          {notFound ? ' It may have been deleted or the link is incorrect.' : ' Try again shortly.'}
        </div>
        <div className="g-btn-row" style={{ marginTop: 14 }}>
          <Link to="/" className="g-btn g-btn-outline">
            Back to matches
          </Link>
        </div>
      </div>
    )
  }

  if (!match) return null

  // Only the pad and the crease panels do anything; everything else on the view
  // is presentation. Gate the whole thing on the match being scorable at all.
  const canAct = match.status === MATCH_STATUS.LIVE

  return (
    <div className="g-screen">
      {scoreError && <div className="g-alert g-alert-error">{getErrorMessage(scoreError)}</div>}

      {!canAct && !isComplete && (
        <div className="g-alert g-alert-info">
          This match is not live yet. Start it before scoring.
        </div>
      )}

      <div className="g-btn-row" style={{ marginBottom: 14 }}>
        <Link to={`/live/${match.id}`} className="g-btn g-btn-ghost">
          View scorecard
        </Link>
        <button type="button" className="g-btn g-btn-ghost" onClick={() => refetch()}>
          Refresh
        </button>
      </div>

      <LiveScoringView
        match={match}
        isAdmin
        onDeliverBall={deliver}
        onUndoLastBall={() => undo.mutate()}
        onSwapBatsmen={() => swapStrike.mutate()}
        onRetireHurt={(playerId) => retireHurt.mutate(playerId)}
        onSelectStriker={(playerId) => setBatsman.mutate({ strikerId: playerId })}
        onSelectNonStriker={(playerId) => setBatsman.mutate({ nonStrikerId: playerId })}
        onSelectBowler={(playerId) => setBowler.mutate(playerId)}
        onReplaceBatsman={(type, playerId) =>
          setBatsman.mutate(type === 'striker' ? { strikerId: playerId } : { nonStrikerId: playerId })
        }
        onRecallRetired={(playerId) => recallRetired.mutate(playerId)}
        onExit={() => (isComplete ? navigate(`/live/${match.id}`) : navigate(-1))}
      />
    </div>
  )
}