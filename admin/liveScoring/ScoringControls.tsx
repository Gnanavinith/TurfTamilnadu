import React, { useState } from 'react';
import { Undo, ChevronDown, ChevronUp } from 'lucide-react';

interface ScoringControlsProps {
  onDeliverBall: (outcome: string) => void;
  onUndoLastBall: () => void;
  onShowWicketModal: () => void;
  onShowNoBallModal: () => void;
}

export default function ScoringControls({ onDeliverBall, onUndoLastBall, onShowWicketModal, onShowNoBallModal }: ScoringControlsProps) {
  const [showExtrasPanel, setShowExtrasPanel] = useState(false);

  return (
    <div id="scoring-board" className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Scoring controls</span>
        <button
          onClick={onUndoLastBall}
          className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50/40"
        >
          <Undo size={12} />
          Undo Last Ball
        </button>
      </div>

      {/* Numbers grid */}
      <div className="grid grid-cols-4 gap-2.5">
        {[
          { val: '0', label: 'dot' },
          { val: '1', label: '1 run' },
          { val: '2', label: '2 runs' },
          { val: '3', label: '3 runs' },
        ].map(r => (
          <button
            key={r.val}
            onClick={() => onDeliverBall(r.val)}
            aria-label={r.label}
            className="scoring-btn min-h-[64px] rounded-2xl border border-neutral-200 bg-white py-3 text-center shadow-xs active:scale-95 transition hover:border-emerald-500 focus:outline-none focus-visible:border-emerald-500 select-none touch-manipulation"
          >
            <div className="text-2xl font-black text-neutral-900 font-mono tabular-nums leading-none">{r.val === '0' ? '•' : r.val}</div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 mt-1">{r.label}</div>
          </button>
        ))}
      </div>

      {/* Actions grid */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          onClick={() => onDeliverBall('4')}
          className="scoring-btn rounded-2xl border border-emerald-100 bg-emerald-50 py-3 text-center shadow-xs active:scale-95 transition hover:bg-emerald-100/50 focus:outline-none"
        >
          <div className="text-2xl font-black text-emerald-700">4</div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 mt-0.5">Boundary</div>
        </button>

        <button
          onClick={() => onDeliverBall('6')}
          className="scoring-btn rounded-2xl border border-purple-100 bg-purple-50 py-3 text-center shadow-xs active:scale-95 transition hover:bg-purple-100/50 focus:outline-none"
        >
          <div className="text-2xl font-black text-purple-700">6</div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-purple-600 mt-0.5">Maximum</div>
        </button>

        <button
          onClick={onShowWicketModal}
          className="scoring-btn rounded-2xl border border-red-100 bg-red-50 py-3 text-center shadow-xs active:scale-95 transition hover:bg-red-100/50 focus:outline-none"
        >
          <div className="text-2xl font-black text-red-600">W</div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-red-500 mt-0.5">Wicket</div>
        </button>
      </div>

      {/* Extras: Wide & No-Ball */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => onDeliverBall('Wd')}
          className="scoring-btn rounded-2xl border border-amber-100 bg-amber-50 py-3 text-center shadow-xs active:scale-95 transition hover:bg-amber-100/50 focus:outline-none"
        >
          <div className="text-lg font-black text-amber-700">WIDE</div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-amber-600 mt-0.5">+1 extra · no ball count</div>
        </button>

        <button
          onClick={onShowNoBallModal}
          className="scoring-btn rounded-2xl border border-amber-100 bg-amber-50 py-3 text-center shadow-xs active:scale-95 transition hover:bg-amber-100/50 focus:outline-none"
        >
          <div className="text-lg font-black text-amber-700">NO BALL</div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-amber-600 mt-0.5">+1 extra · select runs</div>
        </button>
      </div>

      {/* Extended Extras Toggle */}
      <button
        onClick={() => setShowExtrasPanel(!showExtrasPanel)}
        className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white py-2 text-xs font-bold text-neutral-500 hover:bg-neutral-50 transition"
      >
        {showExtrasPanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {showExtrasPanel ? 'Hide' : 'Show'} Byes & Leg Byes
      </button>

      {/* Byes & Leg Byes Panel */}
      {showExtrasPanel && (
        <div className="space-y-2.5 animate-fadeIn">
          <div className="rounded-2xl border border-sky-100 bg-sky-50/30 p-3 space-y-2">
            <div className="text-[10px] font-black uppercase tracking-wider text-sky-700">Bye (ball missed bat — runs to extras)</div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(n => (
                <button
                  key={n}
                  onClick={() => onDeliverBall(`B${n}`)}
                  className="scoring-btn rounded-xl border border-sky-200 bg-white py-2.5 text-center shadow-xs active:scale-95 transition hover:bg-sky-50 focus:outline-none"
                >
                  <div className="text-lg font-black text-sky-700 font-mono">{n}</div>
                  <div className="text-[8px] font-bold uppercase text-sky-500 mt-0.5">Bye</div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-sky-100 bg-sky-50/30 p-3 space-y-2">
            <div className="text-[10px] font-black uppercase tracking-wider text-sky-700">Leg Bye (off body — runs to extras)</div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(n => (
                <button
                  key={n}
                  onClick={() => onDeliverBall(`Lb${n}`)}
                  className="scoring-btn rounded-xl border border-sky-200 bg-white py-2.5 text-center shadow-xs active:scale-95 transition hover:bg-sky-50 focus:outline-none"
                >
                  <div className="text-lg font-black text-sky-700 font-mono">{n}</div>
                  <div className="text-[8px] font-bold uppercase text-sky-500 mt-0.5">Leg Bye</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
