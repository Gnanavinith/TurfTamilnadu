import React from 'react';
import { motion } from 'motion/react';

interface NoBallRunsModalProps {
  onDeliverBall: (outcome: string) => void;
  onClose: () => void;
}

export default function NoBallRunsModal({ onDeliverBall, onClose }: NoBallRunsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/50 backdrop-blur-xs modal-overlay">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm bg-white rounded-3xl border border-neutral-200 p-6 shadow-2xl space-y-4 text-left modal-content"
      >
        <div>
          <h3 className="text-lg font-black text-neutral-950">No-Ball Delivery</h3>
          <p className="text-xs text-neutral-500 mt-1">A no-ball always adds +1 extra run. Did the batter also score runs?</p>
        </div>

        <div className="space-y-2">
          <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400">No-ball only (no batter runs)</div>
          <button
            onClick={() => { onDeliverBall('Nb'); onClose(); }}
            className="w-full rounded-xl border border-amber-200 bg-amber-50 py-3 text-center active:scale-95 transition"
          >
            <div className="text-lg font-black text-amber-700">Nb</div>
            <div className="text-[9px] font-bold text-amber-600 mt-0.5">+1 EXTRA ONLY</div>
          </button>
        </div>

        <div className="space-y-2">
          <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400">No-ball + Batter runs scored</div>
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {[1, 2, 3, 4, 6].map(n => (
              <button
                key={n}
                onClick={() => { onDeliverBall(`Nb+${n}`); onClose(); }}
                className="rounded-xl border border-amber-200 bg-white py-3 text-center shadow-xs active:scale-95 transition hover:bg-amber-50"
              >
                <div className="text-lg font-black text-amber-800 font-mono">{n}</div>
                <div className="text-[8px] font-bold text-amber-600">+Nb</div>
              </button>
            ))}
          </div>
          <div className="text-[10px] text-neutral-400 font-medium">Total = 1 (no-ball extra) + batter's runs</div>
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-xl border border-neutral-200 py-2.5 text-xs font-bold text-neutral-500 hover:bg-neutral-50 transition"
        >
          Cancel
        </button>
      </motion.div>
    </div>
  );
}
