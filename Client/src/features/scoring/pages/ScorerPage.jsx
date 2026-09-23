import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useScorer } from '../hooks/useScorer'
import { useLiveMatch } from '../../live/hooks/useLiveMatch'
import { useGullyFeedback } from '../../gully/feedback'
import { getErrorMessage } from '../../../lib/axios'
import { formatOvers, formatRunRate, formatScore } from '../../../utils/formatOvers'
import WicketModal from '../components/WicketModal'

const PAD = [
  { key: '0', label: '0', run: 0 },
  { key: '1', label: '1', run: 1 },
  { key: '2', label: '2', run: 2 },
  { key: '3', label: '3', run: 3 },
  { key: '4', label: '4', run: 4, cls: 'g-b4' },
  { key: '6', label: '6', run: 6, cls: 'g-b6' },
  { key: 'wd', label: 'Wd', cls: 'g-bx', extra: { kind: 'wide', runs: 1 } },
  { key: 'nb', label: 'Nb', cls: 'g-bx', extra: { kind: 'no_ball', runs: 1 } },
  { key: 'bye', label: 'Bye', cls: 'g-bx', extra: { kind: 'bye', runs: 1 } },
  { key: 'lb', label: 'LB', cls: 'g-bx', extra: { kind: 'leg_bye', runs: 1 } },
  { key: 'w', label: 'OUT', cls: 'g-bw', span: true },
]

export default function ScorerPage() {
  const { matchId } = useParams()
  const { match, isLoading, error, refetch } = useLiveMatch(matchId)
  const [showWicket, setShowWicket] = useState(false)
  const [strikerId, setStrikerId] = useState('')
  const [bowlerId, setBowlerId] = useState('')
  const { burst } = useGullyFeedback()

  const { record, undo, error: scoreError } = useScorer({
    matchId,
  })

  const inning = match?.currentInnings ?? null
  const battingTeamId = inning?.battingTeamId
  const bowlingTeamId = inning?.bowlingTeamId
  const battingTeamName =
    match?.teamA?.id === battingTeamId ? match?.teamA?.name : match?.teamB?.name
  const bowlingTeamName =
    match?.teamA?.id === bowlingTeamId ? match?.teamA?.name : match?.teamB?.name

  const battingXi = useMemo(() => {
    if (!match) return []
    if (match.teamA?.id === battingTeamId) return match.playingXI?.teamA ?? []
    if (match.teamB?.id === battingTeamId) return match.playingXI?.teamB ?? []
    return []
  }, [match, battingTeamId])

  const bowlingXi = useMemo(() => {
    if (!match) return []
    if (match.teamA?.id === bowlingTeamId) return match.playingXI?.teamA ?? []
    if (match.teamB?.id === bowlingTeamId) return match.playingXI?.teamB ?? []
    return []
  }, [match, bowlingTeamId])

  const battingIds = battingXi.map((p) => p.id ?? p.userId)
  const bowlingIds = bowlingXi.map((p) => p.id ?? p.userId)

  useEffect(() => {
    if (!match) return

    const currentInnings = match.currentInnings
    const ballsBowled = currentInnings?.score?.balls ?? 0
    const overJustCompleted = ballsBowled > 0 && ballsBowled % 6 === 0

    const activeBatter = (currentInnings?.batting ?? []).find((b) => b.status === 'batting')
    const currentBowler = (currentInnings?.bowling ?? [])[0]

    setStrikerId((prev) =>
      battingIds.includes(prev) ? prev : (activeBatter?.userId ?? battingIds[0] ?? ''),
    )
    setBowlerId((prev) => {
      if (overJustCompleted) return ''
      return bowlingIds.includes(prev) ? prev : (currentBowler?.userId ?? bowlingIds[0] ?? '')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match])

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
        <div className="g-alert g-alert-error">
          {getErrorMessage(error, 'Failed to load match')}
        </div>
      </div>
    )
  }

  if (!match) return null

  const score = inning?.score
  const ballsBowled = score?.balls ?? 0
  const overJustCompleted = ballsBowled > 0 && ballsBowled % 6 === 0

  const canSend = Boolean(strikerId && bowlerId)
  const selectedBatter = battingXi.find((p) => (p.id ?? p.userId) === strikerId)
  const selectedBowler = bowlingXi.find((p) => (p.id ?? p.userId) === bowlerId)

  const handleRun = (runs) => {
    if (!canSend) return
    record.mutate({
      batterId: strikerId,
      bowlerId,
      batterRuns: runs,
      extraType: null,
      extraRuns: 0,
      wicketType: null,
    })
    if (runs === 4) burst('FOUR!', '#2f6bff')
    else if (runs === 6) burst('SIX!', '#ff6a1a')
  }

  const handleExtra = ({ kind, runs }) => {
    if (!canSend) return
    record.mutate({
      batterId: strikerId,
      bowlerId,
      batterRuns: 0,
      extraType: kind,
      extraRuns: runs,
      wicketType: null,
    })
  }

  const handleWicket = (wicketType, outBatterId) => {
    setShowWicket(false)
    if (!canSend) return
    record.mutate({
      batterId: outBatterId || strikerId,
      bowlerId,
      batterRuns: 0,
      extraType: null,
      extraRuns: 0,
      wicketType,
    })
    if (!outBatterId || outBatterId === strikerId) setStrikerId('')
    burst('WICKET!', '#e11d48')
  }

  if (match.status !== 'live') {
    return (
      <div className="g-screen">
        <div className="g-hello">
          <small>Scorer mode</small>
          <h1>
            Match not <em>live</em>
          </h1>
        </div>
        <div className="g-alert g-alert-info">
          This match is not live yet. Start it before scoring.
        </div>
      </div>
    )
  }

  if (battingIds.length === 0 || bowlingIds.length === 0) {
    return (
      <div className="g-screen">
        <div className="g-hello">
          <small>Scorer mode</small>
          <h1>
            Playing <em>XI</em> missing
          </h1>
        </div>
        <div className="g-alert g-alert-info">
          Playing XI is not set for this match.
        </div>
      </div>
    )
  }

  return (
    <div className="g-screen">
      <div className="g-hello">
        <small>Scorer mode</small>
        <h1>
          {battingTeamName ?? 'Team'} <em>batting</em>
        </h1>
      </div>

      <div className="g-mini">
        <div>
          <small>{battingTeamName ?? 'Team'}</small>
          <span className="g-big">
            {score ? formatScore(score.runs ?? 0, score.wickets ?? 0) : '0/0'}
          </span>
        </div>
        <div className="g-r">
          <small>RR {score ? formatRunRate(score.runs ?? 0, score.balls ?? 0) : '0.00'}</small>
          <span className="g-big">{formatOvers(score?.balls ?? 0)}</span>
        </div>
      </div>

      <div className="g-panel">
        <div className="g-panel-head">
          On strike
          <span>
            {bowlingTeamName ?? 'Opponent'} bowling · {match.overs} overs
          </span>
        </div>

        <label className="g-field">
          <span className="g-label">Striker</span>
          <select
            value={strikerId}
            onChange={(event) => setStrikerId(event.target.value)}
            className="g-select"
          >
            <option value="">Select striker</option>
            {battingXi.map((player) => (
              <option key={player.id ?? player.userId} value={player.id ?? player.userId}>
                {player.name ?? player.email}
              </option>
            ))}
          </select>
        </label>

        <label className="g-field" style={{ marginBottom: 0 }}>
          <span className="g-label">
            Bowler{overJustCompleted ? ' · new over, pick another bowler' : ''}
          </span>
          <select
            value={bowlerId}
            onChange={(event) => setBowlerId(event.target.value)}
            className={`g-select${overJustCompleted ? ' g-invalid' : ''}`}
          >
            <option value="">Select bowler</option>
            {bowlingXi.map((player) => (
              <option key={player.id ?? player.userId} value={player.id ?? player.userId}>
                {player.name ?? player.email}
              </option>
            ))}
          </select>
        </label>

        <p className="g-note" style={{ marginTop: 12 }}>
          {selectedBatter?.name ?? selectedBatter?.email ?? 'Pick a striker'} on strike ·{' '}
          {selectedBowler?.name ?? selectedBowler?.email ?? 'pick a bowler'} bowling.
        </p>
      </div>

      {overJustCompleted && (
        <div className="g-alert g-alert-warn">
          A bowler cannot bowl two overs in a row. Each new over starts with a different bowler.
        </div>
      )}

      {scoreError && (
        <div className="g-alert g-alert-error">
          {getErrorMessage(scoreError, 'Could not record ball')}
        </div>
      )}

      <div className="g-pad">
        {PAD.map((button) => (
          <button
            key={button.key}
            type="button"
            className={button.cls}
            disabled={!canSend || record.isPending}
            onClick={() => {
              if (button.key === 'w') setShowWicket(true)
              else if (button.extra) handleExtra(button.extra)
              else handleRun(button.run)
            }}
            style={button.span ? { gridColumn: 'span 2' } : undefined}
          >
            {button.label}
          </button>
        ))}
      </div>

      <div className="g-pad-foot">
        <button
          type="button"
          className="g-ghost"
          onClick={() => undo.mutate()}
          disabled={undo.isPending || !score?.balls}
        >
          Undo last ball
        </button>
      </div>

      <WicketModal
        key={showWicket}
        open={showWicket}
        onClose={() => setShowWicket(false)}
        onConfirm={handleWicket}
        busy={record.isPending}
        players={battingXi}
        defaultBatterId={strikerId}
      />
    </div>
  )
}
