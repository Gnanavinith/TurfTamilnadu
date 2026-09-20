import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useScorer } from '../hooks/useScorer'
import { useLiveMatch } from '../../live/hooks/useLiveMatch'
import { getErrorMessage } from '../../../lib/axios'
import { formatOvers, formatScore } from '../../../utils/formatOvers'
import Loader from '../../../components/Loader'
import Button from '../../../components/Button'
import RunPad from '../components/RunPad'
import ExtrasPanel from '../components/ExtrasPanel'
import WicketModal from '../components/WicketModal'
import UndoButton from '../components/UndoButton'

export default function ScorerPage() {
  const { matchId } = useParams()
  const { match, isLoading, error, refetch } = useLiveMatch(matchId)
  const [showWicket, setShowWicket] = useState(false)
  const [strikerId, setStrikerId] = useState('')
  const [bowlerId, setBowlerId] = useState('')

  const { record, undo, error: scoreError } = useScorer({
    matchId,
    onRecorded: () => refetch(),
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
      // Enforce the game rule: a bowler can't bowl two consecutive overs.
      if (overJustCompleted) return ''
      return bowlingIds.includes(prev) ? prev : (currentBowler?.userId ?? bowlingIds[0] ?? '')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match])

  if (isLoading) return <Loader label="Loading match…" />

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-6 text-center dark:bg-red-900/30">
        <p className="text-sm text-red-600 dark:text-red-400">
          {getErrorMessage(error, 'Failed to load match')}
        </p>
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

  const handleWicket = (wicketType) => {
    setShowWicket(false)
    if (!canSend) return
    record.mutate({
      batterId: strikerId,
      bowlerId,
      batterRuns: 0,
      extraType: null,
      extraRuns: 0,
      wicketType,
    })
    setStrikerId('')
  }

  if (match.status !== 'live') {
    return (
      <div className="rounded-xl bg-slate-100 p-6 text-center dark:bg-slate-800">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          This match is not live yet — start it before scoring.
        </p>
      </div>
    )
  }

  if (battingIds.length === 0 || bowlingIds.length === 0) {
    return (
      <div className="rounded-xl bg-slate-100 p-6 text-center dark:bg-slate-800">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Playing XI is not set for this match.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">{battingTeamName ?? 'Team'} batting</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {bowlingTeamName ?? 'Opponent'} bowling · {match.overs} overs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold">
            {score ? formatScore(score.runs ?? 0, score.wickets ?? 0) : '0/0'}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            ({formatOvers(score?.balls ?? 0)}/{match.overs})
          </span>
        </div>
      </header>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-900">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
            Striker
          </span>
          <select
            value={strikerId}
            onChange={(event) => setStrikerId(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          >
            <option value="">Select striker</option>
            {battingXi.map((player) => (
              <option key={player.id ?? player.userId} value={player.id ?? player.userId}>
                {player.name ?? player.email}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
            Bowler
            {overJustCompleted && (
              <span className="ml-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                new over — pick another bowler
              </span>
            )}
          </span>
          <select
            value={bowlerId}
            onChange={(event) => setBowlerId(event.target.value)}
            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:bg-slate-800 dark:text-white ${
              overJustCompleted
                ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-400/30 dark:border-amber-500 dark:bg-amber-900/20'
                : 'border-slate-300 bg-white dark:border-slate-600'
            }`}
          >
            <option value="">Select bowler</option>
            {bowlingXi.map((player) => (
              <option key={player.id ?? player.userId} value={player.id ?? player.userId}>
                {player.name ?? player.email}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-slate-400 sm:col-span-2 dark:text-slate-500">
          {selectedBatter?.name ?? selectedBatter?.email ?? 'Pick a striker'} on strike ·
          {selectedBowler?.name ?? selectedBowler?.email ?? 'pick a bowler'} bowling.
        </p>
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 sm:col-span-2 dark:bg-emerald-900/20 dark:text-emerald-300">
          Rule: a bowler cannot bowl two overs in a row — each new over must start with a
          different bowler.
        </p>
      </section>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          disabled={!canSend}
          onClick={() => setShowWicket(true)}
          className="!border-red-300 !text-red-600 hover:!bg-red-50 dark:!border-red-900 dark:!text-red-400"
        >
          Wicket
        </Button>
        <UndoButton
          onUndo={() => undo.mutate()}
          busy={undo.isPending}
          disabled={!score?.balls}
        />
      </div>

      {scoreError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
          {getErrorMessage(scoreError, 'Could not record ball')}
        </p>
      )}

      <RunPad onRun={handleRun} />
      <ExtrasPanel onExtra={handleExtra} />

      <WicketModal
        open={showWicket}
        onClose={() => setShowWicket(false)}
        onConfirm={handleWicket}
        busy={record.isPending}
      />
    </div>
  )
}