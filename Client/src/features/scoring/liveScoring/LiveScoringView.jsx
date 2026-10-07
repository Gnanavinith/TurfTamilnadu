import { useMemo, useState } from 'react'
import {
  RefreshCw,
  AlertTriangle,
  ArrowLeftRight,
  Heart,
  ArrowLeft,
  Check,
  HeartPulse,
} from 'lucide-react'
import { MATCH_STATUS } from '../../../utils/constants'
import {
  availableBatterIds,
  ballsForInnings,
  battingXI,
  bowlingXI,
  createPlayerHelpers,
  economy,
  getBallBadgeStyles,
  groupIntoOvers,
  ovStr,
  rr,
  sr,
  unavailableBatterIds,
} from './helpers'
import WicketModal from './WicketModal'
import NoBallRunsModal from './NoBallRunsModal'
import ScoringControls from './ScoringControls'
import MatchSummaryCard from './MatchSummaryCard'
import { OverLogs, LiveBattingScorecard, LiveBowlingScorecard } from './LiveScorecard'
import './liveScoring.css'

/**
 * The live scoring surface.
 *
 * `isAdmin` splits the two audiences: the scorer gets every control, while a
 * spectator gets the same read-only picture with the crease panels replaced by
 * a "scorer is updating" placeholder.
 */
export default function LiveScoringView({
  match,
  isAdmin = false,
  onDeliverBall,
  onUndoLastBall,
  onSwapBatsmen,
  onRetireHurt,
  onSelectStriker,
  onSelectNonStriker,
  onSelectBowler,
  onReplaceBatsman,
  onRecallRetired,
  onExit,
}) {
  const [showRetireConfirm, setShowRetireConfirm] = useState(false)
  const [changingBatsmanType, setChangingBatsmanType] = useState(null)
  const [changingBowler, setChangingBowler] = useState(false)
  const [showWicketModal, setShowWicketModal] = useState(false)
  const [showNoBallRunsModal, setShowNoBallRunsModal] = useState(false)

  const inn = match?.currentInnings ?? null

  // Both squads, so jersey numbers and names resolve from one place.
  const helpers = useMemo(
    () => createPlayerHelpers([...(battingXI(match, inn) ?? []), ...(bowlingXI(match, inn) ?? [])]),
    [match, inn],
  )
  const { getPlayerName, getJerseyLabel } = helpers

  // Over logs are per-innings, so drop the other innings' deliveries first.
  const overHistory = useMemo(
    () => (inn ? groupIntoOvers(ballsForInnings(match, inn, match.oversTimeline)) : []),
    [match, inn],
  )

  if (!match) return null

  const isComplete =
    match.status === MATCH_STATUS.COMPLETED || match.status === MATCH_STATUS.ABANDONED

  if (!inn) {
    return (
      <div className="space-y-4">
        <ExitBar isAdmin={isAdmin} onExit={onExit} isComplete={false} />
        <MatchTitle match={match} />
        {!isComplete && (
          <div className="animate-fadeIn rounded-2xl border border-dashed border-neutral-200 bg-white p-6 text-center">
            <span className="mb-3 inline-flex rounded-full bg-emerald-50 p-3 text-emerald-500">
              <RefreshCw size={24} className="animate-spin text-emerald-600" />
            </span>
            <h4 className="text-sm font-black text-neutral-900">No innings in progress</h4>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-neutral-500">
              Start the match to begin scoring.
            </p>
          </div>
        )}
        {isComplete && <MatchSummaryCard match={match} onExit={onExit} />}
      </div>
    )
  }

  const { strikerId, nonStrikerId, bowlerId, previousBowlerId } = inn

  const availBatPlayerIds = availableBatterIds(match, inn)
  const unavailableBatIds = unavailableBatterIds(inn)
  const bowlXI = bowlingXI(match, inn)
  const retiredHurtIds = (inn.retiredHurt ?? []).map((player) => String(player.id))

  const needsStriker = !strikerId
  const needsNonStriker = !nonStrikerId
  const needsBowler = !bowlerId
  const previousBowler = previousBowlerId ?? null

  // With everyone else gone, the batter on strike carries the bat through alone.
  const isLastManStanding =
    needsNonStriker &&
    Boolean(strikerId) &&
    availBatPlayerIds.filter((id) => !unavailableBatIds.includes(id) && id !== String(strikerId))
      .length === 0

  const canScore = Boolean(strikerId) && Boolean(bowlerId)

  const strikerData = (inn.batting ?? []).find((e) => String(e.userId) === String(strikerId))
  const nonStrikerData = (inn.batting ?? []).find((e) => String(e.userId) === String(nonStrikerId))
  const bowlerData = (inn.bowling ?? []).find((e) => String(e.userId) === String(bowlerId))

  const extras = inn.extrasBreakdown ?? {}
  const totalExtras =
    (extras.wide ?? 0) + (extras.noBall ?? 0) + (extras.bye ?? 0) + (extras.legBye ?? 0)

  const maxOvers = inn.overs ?? match.overs ?? 0
  const chase = match.chase
  const target = inn.target ?? null
  const neededRuns = chase?.needed ?? null
  const ballsRemaining = chase?.ballsRemaining ?? match.ballsRemaining ?? null

  const handleDeliverBall = (outcome, wicketDetail) => {
    onDeliverBall(outcome, wicketDetail)
    // A wicket doesn't move the page, so the new batsman panel stays in view.
    if (outcome !== 'W') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleWicketSubmit = (
    wicketType,
    bowlerId_,
    helperId,
    outPlayerId,
    runOutRuns,
  ) => {
    handleDeliverBall('W', {
      type: wicketType,
      bowlerId: bowlerId_,
      helperId,
      outPlayerId,
      runOutRuns,
    })
    setShowWicketModal(false)
  }

  return (
    <div id="live-scoring-view" className="space-y-4">
      {/* Top action bar */}
      <ExitBar isAdmin={isAdmin} onExit={onExit} isComplete={isComplete} />

      {/* Match title header */}
      <MatchTitle match={match} />

      {/* Quick Score Summary */}
      <div className="grid grid-cols-2 gap-3">
        {(match.innings ?? []).map((inning) => {
          const inningScore = inning.score ?? {}
          const inningBalls = inningScore.balls ?? 0
          const isActive = inning.id === inn.id && !isComplete

          return (
            <div
              key={inning.id}
              className={`min-w-0 rounded-2xl border p-4 text-center transition-all ${
                isActive
                  ? 'border-emerald-300 bg-emerald-50/50 shadow-xs'
                  : 'border-neutral-100 bg-white'
              }`}
            >
              <div
                className={`truncate text-[10px] font-black tracking-wider uppercase ${
                  isActive ? 'text-emerald-700' : 'text-neutral-400'
                }`}
              >
                {inning.battingTeam?.name ?? 'Team'}
              </div>
              <div className="mt-1 font-mono text-2xl leading-none font-black tabular-nums text-neutral-900">
                {inningScore.runs ?? 0}
                <span className="text-lg text-red-500">/{inningScore.wickets ?? 0}</span>
              </div>
              <div className="mt-1 font-mono text-xs font-medium tabular-nums text-neutral-500">
                {ovStr(inningBalls)} / {inning.overs ?? maxOvers} ov
              </div>
              <div className="mt-1 text-[10px] font-semibold text-neutral-400 uppercase">
                RR: {rr(inningScore.runs ?? 0, inningBalls)}
              </div>
            </div>
          )
        })}
      </div>

      {/* Extras Summary Bar */}
      {totalExtras > 0 && !isComplete && (
        <div className="flex items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50/50 px-4 py-2 text-[11px] font-semibold text-neutral-500">
          <span className="font-bold text-neutral-700">
            Extras: <span className="font-mono text-neutral-900">{totalExtras}</span>
          </span>
          <div className="flex gap-3 font-mono tabular-nums">
            {extras.wide > 0 && (
              <span>
                Wd <strong className="text-neutral-800">{extras.wide}</strong>
              </span>
            )}
            {extras.noBall > 0 && (
              <span>
                Nb <strong className="text-neutral-800">{extras.noBall}</strong>
              </span>
            )}
            {extras.bye > 0 && (
              <span>
                B <strong className="text-neutral-800">{extras.bye}</strong>
              </span>
            )}
            {extras.legBye > 0 && (
              <span>
                Lb <strong className="text-neutral-800">{extras.legBye}</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Second Innings Target */}
      {target && !isComplete && neededRuns !== null && ballsRemaining !== null && (
        <div className="space-y-1 rounded-2xl border border-amber-200 bg-amber-50/50 px-4 py-3 text-center">
          <div className="text-sm font-bold text-amber-900">
            {inn.battingTeam?.name} needs{' '}
            <span className="font-mono text-lg font-black text-amber-700">{neededRuns}</span> runs
            off <span className="font-mono text-lg font-black text-amber-700">{ballsRemaining}</span>{' '}
            balls
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] font-bold text-amber-800">
            <span>
              Target: <strong className="font-mono">{target}</strong>
            </span>
            <span>
              Req. RR:{' '}
              <strong className="font-mono">
                {ballsRemaining > 0 ? ((neededRuns / ballsRemaining) * 6).toFixed(2) : '—'}
              </strong>
            </span>
          </div>
        </div>
      )}

      {/* Current Over ball tracker */}
      {(match.thisOver ?? []).length > 0 && !isComplete && (
        <div className="space-y-2 rounded-2xl border border-neutral-100 bg-white p-4">
          <div className="text-[10px] font-black tracking-wider text-neutral-400 uppercase">
            Current Over
          </div>
          <div className="flex flex-wrap gap-2">
            {match.thisOver.map((ball, i) => (
              <span
                key={i}
                className={`ball-badge flex h-8 min-w-8 flex-shrink-0 items-center justify-center rounded-lg px-1 font-mono text-xs font-bold tabular-nums ${getBallBadgeStyles(ball.token)}`}
              >
                {ball.token}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Batters crease information panel */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black tracking-wider text-neutral-400 uppercase">
            At the Crease
          </h3>
          {isAdmin ? (
            <div className="flex gap-2">
              {strikerId && nonStrikerId && (
                <button
                  type="button"
                  onClick={onSwapBatsmen}
                  className="inline-flex min-h-[44px] touch-manipulation items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-bold whitespace-nowrap text-neutral-600 select-none hover:bg-neutral-50"
                >
                  <ArrowLeftRight size={12} className="flex-shrink-0" />
                  Swap Strike
                </button>
              )}
              {(strikerId || nonStrikerId) && (
                <button
                  type="button"
                  onClick={() => setShowRetireConfirm(!showRetireConfirm)}
                  className="inline-flex min-h-[44px] touch-manipulation items-center gap-1 rounded-lg border border-red-200 bg-red-50/50 px-2.5 py-1.5 text-xs font-bold whitespace-nowrap text-red-700 select-none hover:bg-red-50"
                >
                  <Heart size={12} className="flex-shrink-0" />
                  Retire Hurt
                </button>
              )}
            </div>
          ) : (
            <span className="inline-flex animate-pulse items-center gap-1 rounded-full border border-emerald-200/50 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-600">
              <span className="h-1 w-1 rounded-full bg-emerald-500" />
              Live Viewer Mode
            </span>
          )}
        </div>

        {/* Retire hurt selection */}
        {showRetireConfirm && (
          <div className="animate-fadeIn space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
            <div className="text-xs font-bold tracking-wide text-amber-900 uppercase">
              Select batsman to retire hurt:
            </div>
            <div className="flex flex-wrap gap-2">
              {[strikerId, nonStrikerId]
                .filter(Boolean)
                .map((pid) => (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => {
                      onRetireHurt(pid)
                      setShowRetireConfirm(false)
                    }}
                    className="flex min-h-[44px] max-w-full touch-manipulation items-center gap-1.5 truncate rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 shadow-xs transition select-none hover:bg-amber-100 active:scale-95"
                  >
                    <HeartPulse size={12} className="flex-shrink-0" />
                    {getPlayerName(pid)}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Change batsman helper menu */}
        {changingBatsmanType && (
          <div className="animate-fadeIn space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
            <div className="flex items-center justify-between">
              <div className="text-xs font-black tracking-wider text-emerald-900 uppercase">
                Change {changingBatsmanType === 'striker' ? 'Striker' : 'Non-Striker'}
              </div>
              <button
                type="button"
                onClick={() => setChangingBatsmanType(null)}
                className="text-[10px] font-bold text-neutral-500 uppercase hover:text-neutral-900"
              >
                Cancel
              </button>
            </div>
            <div className="text-xs text-emerald-800">
              Select a player to replace{' '}
              {getPlayerName(changingBatsmanType === 'striker' ? strikerId : nonStrikerId)}:
            </div>
            <div className="flex flex-wrap gap-2">
              {replaceOptions().map((pid) => (
                <button
                  key={pid}
                  type="button"
                  onClick={() => {
                    onReplaceBatsman(changingBatsmanType, pid)
                    setChangingBatsmanType(null)
                  }}
                  className="inline-flex min-h-[44px] max-w-full touch-manipulation items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-neutral-900 shadow-xs transition select-none hover:border-emerald-500 hover:bg-emerald-50 active:scale-95"
                >
                  <span className="flex-shrink-0 font-mono text-[10px] font-black text-emerald-600">
                    {getJerseyLabel(pid)}
                  </span>
                  <span className="truncate">{getPlayerName(pid)}</span>
                </button>
              ))}
              {replaceOptions().length === 0 && (
                <div className="text-xs font-medium text-neutral-500">
                  No other available batsmen in the squad.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Change bowler helper menu */}
        {changingBowler && (
          <div className="animate-fadeIn space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm">
            <div className="flex items-center justify-between">
              <div className="text-xs font-black tracking-wider text-blue-900 uppercase">
                Change Bowler
              </div>
              <button
                type="button"
                onClick={() => setChangingBowler(false)}
                className="text-[10px] font-bold text-neutral-500 uppercase hover:text-neutral-900"
              >
                Cancel
              </button>
            </div>
            <div className="text-xs text-blue-800">
              Select a player to replace {bowlerId ? getPlayerName(bowlerId) : 'the bowler'}:
            </div>
            <div className="flex flex-wrap gap-2">
              {bowlXI
                .filter((player) => String(player.id) !== String(bowlerId))
                .map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => {
                      onSelectBowler(player.id)
                      setChangingBowler(false)
                    }}
                    className="inline-flex min-h-[44px] max-w-full touch-manipulation items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-bold text-neutral-900 shadow-xs transition select-none hover:border-blue-500 hover:bg-blue-50 active:scale-95"
                  >
                    <span className="flex-shrink-0 font-mono text-[10px] font-black text-blue-600">
                      {getJerseyLabel(player.id)}
                    </span>
                    <span className="truncate">{getPlayerName(player.id)}</span>
                  </button>
                ))}
              {bowlXI.filter((player) => String(player.id) !== String(bowlerId)).length === 0 && (
                <div className="text-xs font-medium text-neutral-500">
                  No other available bowlers in the squad.
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <CreaseCard
            label="Striker ●"
            playerId={strikerId}
            data={strikerData}
            tone="emerald"
            changeLabel="Change"
            onChange={() => {
              setChangingBatsmanType('striker')
              setShowRetireConfirm(false)
            }}
            getPlayerName={getPlayerName}
          />

          <CreaseCard
            label="Non-Striker"
            playerId={nonStrikerId}
            data={nonStrikerData}
            tone={isLastManStanding ? 'amber' : 'neutral'}
            changeLabel="Change"
            onChange={() => {
              setChangingBatsmanType('nonStriker')
              setShowRetireConfirm(false)
            }}
            getPlayerName={getPlayerName}
          />
        </div>
      </div>

      {/* Bowler Details Panel */}
      <div className="space-y-1.5">
        <h3 className="text-[10px] font-black tracking-wider text-neutral-400 uppercase">
          Current Bowler
        </h3>
        <div
          className={`flex items-center justify-between rounded-2xl border p-4 ${
            bowlerId ? 'border-neutral-100 bg-white' : 'border-dashed border-red-200 bg-red-50/30'
          }`}
        >
          {bowlerId ? (
            <>
              <div className="mr-4 min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-blue-500 px-1.5 py-0.5 font-mono text-[8px] font-black text-neutral-950 uppercase">
                    Active Bowler ●
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setChangingBowler(true)}
                      className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider text-blue-700 uppercase transition hover:bg-blue-200 hover:text-blue-950"
                    >
                      Change
                    </button>
                  )}
                </div>
                <h4 className="mt-1.5 truncate leading-tight font-extrabold text-neutral-950">
                  {getPlayerName(bowlerId)}
                </h4>
                <p className="mt-0.5 font-mono text-[11px] font-semibold tabular-nums text-neutral-500">
                  {ovStr(bowlerData?.balls ?? 0)} overs · {bowlerData?.runs ?? 0} runs ·{' '}
                  {bowlerData?.wickets ?? 0} wickets
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-[10px] font-black tracking-wider text-neutral-400 uppercase">
                  Economy
                </div>
                <div className="mt-1 font-mono text-lg leading-none font-black tabular-nums text-neutral-900">
                  {economy(bowlerData?.runs ?? 0, bowlerData?.balls ?? 0)}
                </div>
              </div>
            </>
          ) : (
            <div className="w-full py-1 text-center">
              <span className="text-xs font-bold text-red-700">Bowler Required!</span>
              <div className="mt-0.5 text-[11px] text-red-500">
                Select a bowler from squad to initiate next over.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selection Panels */}
      {!isComplete && (
        <div className="space-y-3">
          {isAdmin ? (
            <>
              {needsStriker && !isLastManStanding && (
                <PlayerPicker
                  tone="emerald"
                  heading="Assign New Striker"
                  players={availBatPlayerIds.filter((id) => id !== String(nonStrikerId))}
                  getPlayerName={getPlayerName}
                  getJerseyLabel={getJerseyLabel}
                  onPick={onSelectStriker}
                />
              )}

              {needsNonStriker && !isLastManStanding && !needsStriker && (
                <PlayerPicker
                  tone="blue"
                  heading="Assign Non-Striker"
                  players={availBatPlayerIds.filter((id) => id !== String(strikerId))}
                  getPlayerName={getPlayerName}
                  getJerseyLabel={getJerseyLabel}
                  onPick={onSelectNonStriker}
                />
              )}

              {needsBowler && !needsStriker && (
                <BowlerPicker
                  squad={bowlXI}
                  previousBowler={previousBowler}
                  getPlayerName={getPlayerName}
                  getJerseyLabel={getJerseyLabel}
                  onPick={onSelectBowler}
                />
              )}

              {retiredHurtIds.length > 0 && (needsStriker || needsNonStriker) && (
                <div className="animate-slideUp space-y-3 rounded-3xl border border-amber-200 bg-amber-50/10 p-5">
                  <h4 className="text-xs font-black tracking-widest text-amber-800 uppercase">
                    Recall Retired Hurt Batter
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {retiredHurtIds
                      .filter((id) => id !== String(strikerId) && id !== String(nonStrikerId))
                      .map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => onRecallRetired(id)}
                          className="inline-flex min-h-[44px] max-w-full touch-manipulation items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-xs font-bold text-neutral-900 shadow-xs transition select-none hover:border-amber-500 active:scale-95"
                        >
                          <span className="truncate">
                            <HeartPulse size={11} className="-mt-0.5 mr-1 inline-flex text-amber-600" />
                            {getPlayerName(id)}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            (needsStriker || needsNonStriker || needsBowler) && (
              <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-6 text-center">
                <span className="mb-3 inline-flex rounded-full bg-emerald-50 p-3 text-emerald-500">
                  <RefreshCw size={24} className="animate-spin text-emerald-600" />
                </span>
                <h4 className="text-sm font-black text-neutral-900">
                  Scorer is updating the field...
                </h4>
                <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-neutral-500">
                  Waiting for the scorer to assign the next batter/bowler. The scorecard updates
                  live in real-time.
                </p>
              </div>
            )
          )}
        </div>
      )}

      {/* Primary Scoring Control Buttons */}
      {canScore && !isComplete && isAdmin && (
        <ScoringControls
          onDeliverBall={handleDeliverBall}
          onUndoLastBall={onUndoLastBall}
          onShowWicketModal={() => setShowWicketModal(true)}
          onShowNoBallModal={() => setShowNoBallRunsModal(true)}
        />
      )}

      {/* Finished Match Summary Card */}
      {isComplete && <MatchSummaryCard match={match} onExit={onExit} />}

      {/* Over Logs */}
      <OverLogs overHistory={overHistory} />

      {/* Live Scorecards */}
      <LiveBattingScorecard
        batting={inn.batting ?? []}
        striker={strikerId}
        nonStriker={nonStrikerId}
        extras={extras}
        helpers={helpers}
      />
      <LiveBowlingScorecard bowling={inn.bowling ?? []} bowler={bowlerId} helpers={helpers} />

      {/* Modals */}
      {showWicketModal && (
        <WicketModal
          bowler={bowlerId}
          striker={strikerId}
          nonStriker={nonStrikerId}
          fieldingPlayers={bowlXI}
          helpers={helpers}
          onSubmit={handleWicketSubmit}
          onClose={() => setShowWicketModal(false)}
        />
      )}

      {showNoBallRunsModal && (
        <NoBallRunsModal
          onDeliverBall={handleDeliverBall}
          onClose={() => setShowNoBallRunsModal(false)}
        />
      )}

      {/* Viewer Footer */}
      {!isAdmin && (
        <div className="mt-6 border-t border-neutral-100/60 pt-6 pb-2 text-center text-xs font-semibold tracking-wide text-neutral-400">
          Live score · updates in real time
        </div>
      )}
    </div>
  )

  /** Batter candidates for the open "Change striker / non-striker" menu. */
  function replaceOptions() {
    const otherEnd = changingBatsmanType === 'striker' ? nonStrikerId : strikerId
    return availBatPlayerIds.filter(
      (id) => !unavailableBatIds.includes(id) && id !== String(otherEnd),
    )
  }
}

/* -------------------------------------------------------------------------- */
/* Pieces                                                                     */
/* -------------------------------------------------------------------------- */

function ExitBar({ isAdmin, onExit, isComplete }) {
  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={onExit}
        className="inline-flex min-h-[44px] touch-manipulation items-center gap-1.5 py-2 text-sm font-bold text-neutral-500 select-none hover:text-neutral-900"
      >
        <ArrowLeft size={14} />
        {isAdmin ? 'Save & Exit' : 'Back to Home'}
      </button>
      <div className="flex items-center gap-2">
        {isComplete ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            <Check size={12} />
            Finished
          </span>
        ) : (
          <span className="inline-flex animate-pulse items-center gap-1 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
            Scoring Live
          </span>
        )}
      </div>
    </div>
  )
}

function MatchTitle({ match }) {
  return (
    <div className="text-center">
      <h2 className="px-2 text-lg leading-tight font-black break-words text-neutral-950">
        {match.teamA?.name} <span className="mx-1 font-semibold text-neutral-400">VS</span>{' '}
        {match.teamB?.name}
      </h2>
    </div>
  )
}

/** Striker / non-striker card: identity, current figures, and a Change control. */
function CreaseCard({ label, playerId, data, tone, changeLabel, onChange, getPlayerName }) {
  const empty =
    tone === 'amber'
      ? {
          border: 'border-amber-200 bg-amber-50/30',
          title: 'Last Man Standing',
          hint: 'Batter is scoring solo.',
          titleClass: 'text-amber-800',
          hintClass: 'text-amber-600',
        }
      : {
          border: 'border-dashed border-red-200 bg-red-50/30',
          title: 'Wicket Fallen!',
          hint: 'Select the next batsman from squad.',
          titleClass: 'text-red-700',
          hintClass: 'text-red-500',
        }

  const filled =
    tone === 'emerald'
      ? {
          border: 'border-emerald-300 bg-emerald-50/30',
          chip: 'bg-emerald-500 text-neutral-950',
          change: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:text-emerald-950',
        }
      : {
          border: 'border-neutral-100 bg-white',
          chip: 'bg-neutral-100 text-neutral-500',
          change: 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900',
        }

  return (
    <div
      className={`min-w-0 rounded-2xl border p-4 transition-all ${playerId ? filled.border : empty.border}`}
    >
      {playerId ? (
        <div>
          <div className="flex items-center justify-between">
            <span
              className={`rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase ${filled.chip}`}
            >
              {label}
            </span>
            <button
              type="button"
              onClick={onChange}
              className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider uppercase transition ${filled.change}`}
            >
              {changeLabel}
            </button>
          </div>
          <div className="mt-2 truncate font-extrabold text-neutral-900">
            {getPlayerName(playerId)}
          </div>
          <div className="mt-1 font-mono text-3xl leading-none font-black tabular-nums text-neutral-900">
            {data?.runs ?? 0}
            <span className="ml-1 font-mono text-sm font-normal font-semibold text-neutral-500">
              ({data?.balls ?? 0}b)
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] font-bold tabular-nums text-neutral-500">
            <span>4s: {data?.fours ?? 0}</span>
            <span>6s: {data?.sixes ?? 0}</span>
            <span>SR: {sr(data?.runs ?? 0, data?.balls ?? 0)}</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col justify-center py-2 text-center">
          <span className={`text-xs font-bold ${empty.titleClass}`}>{empty.title}</span>
          <div className={`mt-1 text-[11px] ${empty.hintClass}`}>{empty.hint}</div>
        </div>
      )}
    </div>
  )
}

/** Inline chip list used to fill an empty batting slot. */
function PlayerPicker({ tone, heading, players, getPlayerName, getJerseyLabel, onPick }) {
  const styles = {
    emerald: {
      wrap: 'border-emerald-200 bg-emerald-50/20',
      head: 'text-emerald-800',
      chip: 'border-emerald-200 hover:border-emerald-500',
      jersey: 'text-emerald-600',
    },
    blue: {
      wrap: 'border-blue-200 bg-blue-50/10',
      head: 'text-blue-800',
      chip: 'border-blue-200 hover:border-blue-500',
      jersey: 'text-blue-600',
    },
  }[tone]

  return (
    <div className={`animate-slideUp space-y-3 rounded-3xl border p-5 ${styles.wrap}`}>
      <h4 className={`text-xs font-black tracking-widest uppercase ${styles.head}`}>{heading}</h4>
      <div className="flex flex-wrap gap-2">
        {players.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onPick(id)}
            className={`inline-flex min-h-[44px] max-w-full touch-manipulation items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-xs font-bold text-neutral-900 shadow-xs transition select-none active:scale-95 ${styles.chip}`}
          >
            <span className={`flex-shrink-0 font-mono text-xs font-black ${styles.jersey}`}>
              {getJerseyLabel(id)}
            </span>
            <span className="truncate">{getPlayerName(id)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Bowler picker for a new over.
 *
 * A bowler cannot bowl two consecutive overs, so the previous one is excluded —
 * but if that leaves nobody, the scorer is offered an explicit override rather
 * than a dead end.
 */
function BowlerPicker({ squad, previousBowler, getPlayerName, getJerseyLabel, onPick }) {
  const options = squad.filter(
    (player) => String(player.id) !== String(previousBowler),
  )
  const noAlternative = options.length === 0 && Boolean(previousBowler)

  return (
    <div className="animate-slideUp space-y-3 rounded-3xl border border-purple-200 bg-purple-50/10 p-5">
      <h4 className="text-xs font-black tracking-widest text-purple-800 uppercase">
        Select Bowler for Next Over
      </h4>
      {previousBowler && !noAlternative && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200/50 bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-800">
          <AlertTriangle size={12} className="flex-shrink-0" />
          <span>{getPlayerName(previousBowler)} can't bowl consecutive overs (cricket rule)</span>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map((player) => (
          <button
            key={player.id}
            type="button"
            onClick={() => onPick(player.id)}
            className="inline-flex min-h-[44px] max-w-full touch-manipulation items-center gap-2 rounded-xl border border-purple-200 bg-white px-4 py-2.5 text-xs font-bold text-neutral-900 shadow-xs transition select-none hover:border-purple-500 active:scale-95"
          >
            <span className="flex-shrink-0 font-mono text-xs font-black text-purple-600">
              {getJerseyLabel(player.id)}
            </span>
            <span className="truncate">{getPlayerName(player.id)}</span>
          </button>
        ))}
        {noAlternative && (
          <div className="w-full space-y-2">
            <div className="text-xs font-medium text-amber-700">
              No other bowlers available. You may override:
            </div>
            <button
              type="button"
              onClick={() => onPick(previousBowler)}
              className="inline-flex min-h-[44px] max-w-full touch-manipulation items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-900 shadow-xs transition select-none hover:border-amber-500 active:scale-95"
            >
              <span className="flex-shrink-0 font-mono text-xs font-black text-amber-600">
                {getJerseyLabel(previousBowler)}
              </span>
              <span className="truncate">{getPlayerName(previousBowler)} (override)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}