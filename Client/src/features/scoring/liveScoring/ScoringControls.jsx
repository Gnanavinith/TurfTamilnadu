import { useState } from 'react'
import { Undo, ChevronDown, ChevronUp } from 'lucide-react'
import './liveScoring.css'

const DOT_AND_SINGLES = [
  { val: '0', label: 'dot' },
  { val: '1', label: '1 run' },
  { val: '2', label: '2 runs' },
  { val: '3', label: '3 runs' },
]

/**
 * The delivery pad. Purely presentational: every button reports a scoring-pad
 * outcome token and the caller decides what to do with it.
 */
export default function ScoringControls({
  onDeliverBall,
  onUndoLastBall,
  onShowWicketModal,
  onShowNoBallModal,
  disabled = false,
}) {
  const [showExtrasPanel, setShowExtrasPanel] = useState(false)

  return (
    <div id="scoring-board" className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
          Scoring controls
        </span>
        <button
          type="button"
          onClick={onUndoLastBall}
          disabled={disabled}
          className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50/40 disabled:opacity-50"
        >
          <Undo size={12} />
          Undo Last Ball
        </button>
      </div>

      {/* Numbers grid */}
      <div className="grid grid-cols-4 gap-2.5">
        {DOT_AND_SINGLES.map((run) => (
          <button
            key={run.val}
            type="button"
            onClick={() => onDeliverBall(run.val)}
            disabled={disabled}
            aria-label={run.label}
            className="scoring-btn min-h-[64px] rounded-2xl border border-neutral-200 bg-white py-3 text-center shadow-xs transition hover:border-emerald-500 focus:outline-none focus-visible:border-emerald-500"
          >
            <div className="font-mono text-2xl leading-none font-black tabular-nums text-neutral-900">
              {run.val === '0' ? '•' : run.val}
            </div>
            <div className="mt-1 text-[9px] font-bold tracking-wider text-neutral-400 uppercase">
              {run.label}
            </div>
          </button>
        ))}
      </div>

      {/* Actions grid */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={() => onDeliverBall('4')}
          disabled={disabled}
          className="scoring-btn rounded-2xl border border-emerald-100 bg-emerald-50 py-3 text-center shadow-xs transition hover:bg-emerald-100/50 focus:outline-none"
        >
          <div className="text-2xl font-black text-emerald-700">4</div>
          <div className="mt-0.5 text-[9px] font-bold tracking-wider text-emerald-600 uppercase">
            Boundary
          </div>
        </button>

        <button
          type="button"
          onClick={() => onDeliverBall('6')}
          disabled={disabled}
          className="scoring-btn rounded-2xl border border-purple-100 bg-purple-50 py-3 text-center shadow-xs transition hover:bg-purple-100/50 focus:outline-none"
        >
          <div className="text-2xl font-black text-purple-700">6</div>
          <div className="mt-0.5 text-[9px] font-bold tracking-wider text-purple-600 uppercase">
            Maximum
          </div>
        </button>

        <button
          type="button"
          onClick={onShowWicketModal}
          disabled={disabled}
          className="scoring-btn rounded-2xl border border-red-100 bg-red-50 py-3 text-center shadow-xs transition hover:bg-red-100/50 focus:outline-none"
        >
          <div className="text-2xl font-black text-red-600">W</div>
          <div className="mt-0.5 text-[9px] font-bold tracking-wider text-red-500 uppercase">
            Wicket
          </div>
        </button>
      </div>

      {/* Extras: Wide & No-Ball */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => onDeliverBall('Wd')}
          disabled={disabled}
          className="scoring-btn rounded-2xl border border-amber-100 bg-amber-50 py-3 text-center shadow-xs transition hover:bg-amber-100/50 focus:outline-none"
        >
          <div className="text-lg font-black text-amber-700">WIDE</div>
          <div className="mt-0.5 text-[9px] font-bold tracking-wider text-amber-600 uppercase">
            +1 extra · no ball count
          </div>
        </button>

        <button
          type="button"
          onClick={onShowNoBallModal}
          disabled={disabled}
          className="scoring-btn rounded-2xl border border-amber-100 bg-amber-50 py-3 text-center shadow-xs transition hover:bg-amber-100/50 focus:outline-none"
        >
          <div className="text-lg font-black text-amber-700">NO BALL</div>
          <div className="mt-0.5 text-[9px] font-bold tracking-wider text-amber-600 uppercase">
            +1 extra · select runs
          </div>
        </button>
      </div>

      {/* Extended Extras Toggle */}
      <button
        type="button"
        onClick={() => setShowExtrasPanel(!showExtrasPanel)}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white py-2 text-xs font-bold text-neutral-500 transition hover:bg-neutral-50"
      >
        {showExtrasPanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {showExtrasPanel ? 'Hide' : 'Show'} Byes & Leg Byes
      </button>

      {/* Byes & Leg Byes Panel */}
      {showExtrasPanel && (
        <div className="animate-fadeIn space-y-2.5">
          <ExtrasGroup
            heading="Bye (ball missed bat — runs to extras)"
            buttonLabel="Bye"
            disabled={disabled}
            onPick={(n) => onDeliverBall(`B${n}`)}
          />

          <ExtrasGroup
            heading="Leg Bye (off body — runs to extras)"
            buttonLabel="Leg Bye"
            disabled={disabled}
            onPick={(n) => onDeliverBall(`Lb${n}`)}
          />
        </div>
      )}
    </div>
  )
}

function ExtrasGroup({ heading, buttonLabel, onPick, disabled }) {
  return (
    <div className="space-y-2 rounded-2xl border border-sky-100 bg-sky-50/30 p-3">
      <div className="text-[10px] font-black tracking-wider text-sky-700 uppercase">
        {heading}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPick(n)}
            disabled={disabled}
            className="scoring-btn rounded-xl border border-sky-200 bg-white py-2.5 text-center shadow-xs transition hover:bg-sky-50 focus:outline-none"
          >
            <div className="font-mono text-lg font-black text-sky-700">{n}</div>
            <div className="mt-0.5 text-[8px] font-bold text-sky-500 uppercase">{buttonLabel}</div>
          </button>
        ))}
      </div>
    </div>
  )
}