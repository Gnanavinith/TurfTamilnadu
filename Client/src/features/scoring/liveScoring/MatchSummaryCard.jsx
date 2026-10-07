import { Award } from 'lucide-react'
import { MATCH_STATUS } from '../../../utils/constants'

function teamName(match, id) {
  if (id == null) return null
  if (String(match.teamA?.id) === String(id)) return match.teamA?.name
  if (String(match.teamB?.id) === String(id)) return match.teamB?.name
  return null
}

function resultText(match) {
  if (match.status === MATCH_STATUS.ABANDONED) return 'No result'
  const winner = teamName(match, match.result?.winnerTeamId)
  if (!winner) return 'No result'
  return match.result?.margin ? `${winner} won by ${match.result.margin}` : `${winner} won`
}

/**
 * The closing screen for a finished match.
 *
 * Series standings are deliberately absent — the match model carries no series
 * id, so there is nothing to aggregate.
 */
export default function MatchSummaryCard({ match, onExit }) {
  return (
    <div className="animate-fadeIn space-y-4 rounded-3xl border border-emerald-200 bg-emerald-50/50 p-6 text-center shadow-sm">
      <Award size={48} className="mx-auto text-emerald-600" />
      <div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black tracking-wider text-emerald-700 uppercase">
          Match Complete
        </span>
        <h3 className="mt-3 text-2xl font-black text-neutral-900">{resultText(match)}</h3>
      </div>

      <button
        type="button"
        onClick={onExit}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-neutral-800 active:scale-95"
      >
        Exit Scorecard
      </button>
    </div>
  )
}