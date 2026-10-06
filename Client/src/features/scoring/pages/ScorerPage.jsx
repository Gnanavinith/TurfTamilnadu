import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getErrorMessage } from '../../../lib/axios'
import { useLiveMatch } from '../../live/hooks/useLiveMatch'
import { useScorer } from '../hooks/useScorer'
import { useGullyFeedback } from '../../gully/feedback'
import { MATCH_STATUS } from '../../../utils/constants'
import AtTheCrease from '../components/AtTheCrease'
import ExtrasModal from '../components/ExtrasModal'
import InningsSummary from '../components/InningsSummary'
import MatchSummary from '../components/MatchSummary'
import OverLogs from '../components/OverLogs'
import PlayerPickerModal from '../components/PlayerPickerModal'
import ScoringControls from '../components/ScoringControls'
import ScorecardTables from '../components/ScorecardTables'
import WicketModal from '../components/WicketModal'

const EXTRA_SHEETS = {
  no_ball: {
    title: 'No ball',
    description: 'A no-ball always adds one extra run. Did the batter score any runs off it?',
    hint: 'Runs off a no-ball count for the batter but not as a legal ball.',
  },
  bye: {
    title: 'Byes',
    description: 'Runs past the bat to the keeper. They go to extras, not the batter.',
    hint: 'Byes count as a legal ball and do not cost the bowler a run.',
  },
  leg_bye: {
    title: 'Leg byes',
    description: 'Runs scored off the body. They go to extras, not the batter.',
    hint: 'Leg byes count as a legal ball and do not cost the bowler a run.',
  },
}

function PageSkeleton() {
  return (
    <div className="g-screen">
      <div className="g-skel" />
      <div className="g-skel" />
      <div className="g-skel" />
    </div>
  )
}

function nameLookup(match) {
  const map = new Map()
  for (const side of ['teamA', 'teamB']) {
    const team = match?.[side]
    if (team) map.set(String(team.id), team.name)
  }
  return (id) => map.get(String(id)) ?? 'Team'
}

export default function ScorerPage() {
  const { matchId } = useParams()
  const { match, isLoading, error, refetch } = useLiveMatch(matchId)
  const { burst } = useGullyFeedback()

  const [sheet, setSheet] = useState(null)
  const [picker, setPicker] = useState(null)
  const [showWicket, setShowWicket] = useState(false)

  const {
    record,
    undo,
    setBatsman,
    setBowler,
    swapStrike,
    retireHurt,
    recallRetired,
    error: scoreError,
    isBusy,
  } = useScorer({ matchId })

  const innings = match?.currentInnings ?? null
  const nameOf = useMemo(() => nameLookup(match), [match])

  const battingXI = useMemo(() => {
    if (!match || !innings) return []
    return String(innings.battingTeamId) === String(match.teamA?.id)
      ? (match.playingXI?.teamA ?? [])
      : (match.playingXI?.teamB ?? [])
  }, [match, innings])

  const bowlingXI = useMemo(() => {
    if (!match || !innings) return []
    return String(innings.bowlingTeamId) === String(match.teamA?.id)
      ? (match.playingXI?.teamA ?? [])
      : (match.playingXI?.teamB ?? [])
  }, [match, innings])

  const nameOfPlayer = (id) =>
    battingXI.concat(bowlingXI).find((p) => String(p.id) === String(id))?.name ?? 'Unknown'

  // The batting XI that hasn't been dismissed or retired yet. The two batters
  // already at the crease stay in this list so the scorer can correct a mistake
  // or swap ends from the picker.
  const nextBatters = useMemo(() => {
    if (!innings) return []
    const unavailable = new Set([
      ...(innings.batting ?? [])
        .filter((b) => ['out', 'retired'].includes(b.status))
        .map((b) => String(b.userId)),
      ...(innings.retiredHurt ?? []).map((p) => String(p.id)),
    ])
    return battingXI.filter((p) => !unavailable.has(String(p.id)))
  }, [innings, battingXI])

  const availableBowlers = useMemo(() => {
    if (!innings) return []
    return bowlingXI.filter((p) => String(p.id) !== String(innings.previousBowlerId))
  }, [bowlingXI, innings])

  const retiredPlayers = innings?.retiredHurt ?? []
  const canScore = innings?.strikerId && innings?.bowlerId
  const isLive = match?.status === MATCH_STATUS.LIVE

  if (isLoading) return <PageSkeleton />

  if (error) {
    const notFound = error?.response?.status === 404
    return (
      <div className="g-screen">
        <div className="g-hello">
          <small>Scorer mode</small>
          <h1>
            {notFound ? 'Match not found' : 'Something went wrong'}
          </h1>
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

  const deliver = (payload, celebrate) => {
    record.mutate(
      {
        batterId: innings.strikerId,
        nonStrikerId: innings.nonStrikerId,
        bowlerId: innings.bowlerId,
        batterRuns: 0,
        extraType: null,
        extraRuns: 0,
        wicketType: null,
        ...payload,
      },
      { onSuccess: celebrate },
    )
  }

  const handleRun = (runs) => {
    deliver({ batterRuns: runs }, () => {
      if (runs === 4) burst('FOUR!', 'var(--g-four)')
      else if (runs === 6) burst('SIX!', 'var(--g-six)')
    })
  }

  const handleExtra = (kind, runs) => {
    if (kind === 'wide') {
      deliver({ extraType: 'wide', extraRuns: runs })
      return
    }
    if (kind === 'no_ball') {
      // Runs 0 means the batter didn't score — just the one penalty run.
      deliver(
        { extraType: 'no_ball', extraRuns: 1, batterRuns: runs },
        () => runs >= 4 && burst('SIX OFF A NO-BALL!', 'var(--g-six)'),
      )
      return
    }
    deliver({ extraType: kind, extraRuns: runs })
  }

  const handleWicket = ({ wicketType, outBatterId, fielderId, batterRuns }) => {
    setShowWicket(false)
    deliver({ wicketType, outBatterId, fielderId, batterRuns }, () => burst('WICKET!', 'var(--g-wkt)'))
  }

  const openPicker = (kind) => setPicker({ kind })

  const handlePick = (playerId) => {
    if (picker?.kind === 'striker') {
      setBatsman.mutate({ strikerId: playerId })
    } else if (picker?.kind === 'nonStriker') {
      setBatsman.mutate({ nonStrikerId: playerId })
    } else if (picker?.kind === 'bowler') {
      setBowler.mutate(playerId)
    } else if (picker?.kind === 'retire') {
      retireHurt.mutate(playerId)
    } else if (picker?.kind === 'recall') {
      recallRetired.mutate(playerId)
    }
    setPicker(null)
  }

  const pickerConfig = {
    striker: {
      title: innings.strikerId ? 'Change the striker' : 'Assign the new striker',
      description: 'Select the striker from the batting squad.',
      players: nextBatters,
      emptyNote: 'No batters left in the XI.',
    },
    nonStriker: {
      title: innings.nonStrikerId ? 'Change the non-striker' : 'Assign the non-striker',
      description: 'Select the batter who stands at the other end.',
      players: nextBatters,
      emptyNote: 'No batters left in the XI.',
    },
    bowler: {
      title: innings.bowlerId ? 'Change the bowler' : 'Select the bowler for this over',
      description:
        'Pick who is bowling. The same bowler cannot bowl two overs in a row.',
      players: availableBowlers,
      emptyNote: 'No other bowler is available in this XI.',
    },
    retire: {
      title: 'Retire hurt',
      description: 'Retire a batter hurt. They keep their runs and can be recalled.',
      players: [innings?.strikerId, innings?.nonStrikerId]
        .filter(Boolean)
        .map((id) => ({ id: String(id), name: nameOfPlayer(id) })),
      emptyNote: 'Nobody at the crease to retire.',
    },
    recall: {
      title: 'Recall a retired batter',
      description: 'Bring a retired-hurt batter back into the innings.',
      players: retiredPlayers,
      emptyNote: 'Nobody has retired hurt.',
    },
  }[picker?.kind]

  const isComplete = match.status === MATCH_STATUS.COMPLETED

  return (
    <div className="g-screen">
      <div className="g-hello">
        <small>Scorer mode</small>
        <h1>
          {match.teamA?.name} <em>vs</em> {match.teamB?.name}
        </h1>
      </div>

      <div className="g-btn-row" style={{ marginBottom: 14 }}>
        <Link to={`/live/${match.id}`} className="g-btn g-btn-ghost">
          View scorecard
        </Link>
        <button type="button" className="g-btn g-btn-ghost" onClick={() => refetch()}>
          Refresh
        </button>
        {!isLive && (
          <Link to={`/live/${match.id}`} className="g-btn">
            {isComplete ? 'See the result' : 'Open the match'}
          </Link>
        )}
      </div>

      {scoreError && <div className="g-alert g-alert-error">{getErrorMessage(scoreError)}</div>}

      {!isLive && (
        <div className="g-alert g-alert-info">
          {isComplete
            ? 'This match is finished, so scoring is closed.'
            : 'This match is not live yet. Start it before scoring.'}
        </div>
      )}

      {isLive && !innings && (
        <div className="g-alert g-alert-warn">
          No innings is in progress. Start the match to begin scoring.
        </div>
      )}

      {isLive && innings && (
        <>
          <InningsSummary match={match} />

          <AtTheCrease
            innings={innings}
            nameOf={nameOf}
            battingXI={battingXI}
            bowlingXI={bowlingXI}
            editable={isLive}
            swapPending={swapStrike.isPending}
            onSwap={() => swapStrike.mutate()}
            onChangeStriker={() => openPicker('striker')}
            onChangeNonStriker={() => openPicker('nonStriker')}
            onChangeBowler={() => openPicker('bowler')}
            onRetire={() => openPicker('retire')}
          />

          {(!innings.strikerId || !innings.nonStrikerId) && (
            <div className="g-panel g-helper">
              <div className="g-panel-head">
                {innings.strikerId ? 'Assign the non-striker' : 'Assign the striker'}
                <span>{nextBatters.length} available</span>
              </div>
              {nextBatters.length === 0 ? (
                <p className="g-empty-note">
                  Everyone in the XI is out or retired. End the innings or recall a retired batter.
                </p>
              ) : (
                <div className="g-btn-row">
                  {!innings.strikerId && (
                    <button
                      type="button"
                      className="g-btn"
                      onClick={() => openPicker('striker')}
                    >
                      Pick striker
                    </button>
                  )}
                  {!innings.nonStrikerId && !innings.lastManStanding && (
                    <button
                      type="button"
                      className="g-btn"
                      onClick={() => openPicker('nonStriker')}
                    >
                      Pick non-striker
                    </button>
                  )}
                  {retiredPlayers.length > 0 && (
                    <button
                      type="button"
                      className="g-btn g-btn-outline"
                      onClick={() => openPicker('recall')}
                    >
                      Recall retired
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {!innings.bowlerId && (
            <div className="g-alert g-alert-warn">
              A new over starts with a new bowler. Pick who is bowling.
              <button
                type="button"
                className="g-btn g-btn-sm"
                style={{ marginTop: 10 }}
                onClick={() => openPicker('bowler')}
              >
                {availableBowlers.length === 0 ? 'See the squad' : 'Pick a bowler'}
              </button>
            </div>
          )}

          <ScoringControls
            disabled={!canScore || !isLive}
            busy={isBusy}
            undoDisabled={!innings.score?.balls}
            onRun={handleRun}
            onWicket={() => setShowWicket(true)}
            onExtra={(kind) => (kind === 'wide' ? handleExtra('wide', 1) : setSheet(kind))}
            onUndo={() => undo.mutate()}
          />
        </>
      )}

      {(isComplete || match.status === MATCH_STATUS.ABANDONED) && <MatchSummary match={match} />}

      {match.thisOver?.length > 0 && (
        <div className="g-panel">
          <div className="g-panel-head">
            This over
            <span>Over {(match.completedOvers ?? 0) + 1}</span>
          </div>
          <OverLogs overs={[match.thisOver]} reverse={false} />
        </div>
      )}

      {match.oversTimeline?.length > 0 && (
        <div className="g-panel">
          <div className="g-panel-head">
            Ball by ball
            <span>{match.oversTimeline.length} overs</span>
          </div>
          <OverLogs overs={match.oversTimeline} />
        </div>
      )}

      {(match.innings ?? []).map((inn) => (
        <ScorecardTables key={inn.id} innings={inn} names={nameOf} />
      ))}

      <WicketModal
        key={showWicket}
        open={showWicket}
        onClose={() => setShowWicket(false)}
        onConfirm={handleWicket}
        busy={record.isPending}
        striker={battingXI.find((p) => String(p.id) === String(innings?.strikerId))}
        nonStriker={battingXI.find((p) => String(p.id) === String(innings?.nonStrikerId))}
        bowler={bowlingXI.find((p) => String(p.id) === String(innings?.bowlerId))}
        fielders={bowlingXI}
        defaultBatterId={innings?.strikerId ?? ''}
      />

      {EXTRA_SHEETS[sheet] && (
        <ExtrasModal
          open={Boolean(sheet)}
          kind={sheet}
          busy={record.isPending}
          {...EXTRA_SHEETS[sheet]}
          onClose={() => setSheet(null)}
          onDeliver={(runs) => {
            handleExtra(sheet, runs)
            setSheet(null)
          }}
        />
      )}

      {pickerConfig && (
        <PlayerPickerModal
          open
          busy={isBusy}
          // The other end's holder can't be picked here — the same batter cannot
          // occupy both ends. The batter already on this end stays selectable so
          // the striker and non-striker can be corrected or swapped.
          disabledIds={
            picker.kind === 'striker'
              ? [innings?.nonStrikerId].filter(Boolean).map(String)
              : picker.kind === 'nonStriker'
                ? [innings?.strikerId].filter(Boolean).map(String)
                : []
          }
          {...pickerConfig}
          onClose={() => setPicker(null)}
          onPick={handlePick}
        />
      )}
    </div>
  )
}

