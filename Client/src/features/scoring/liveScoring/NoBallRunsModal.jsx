import { motion } from 'motion/react'
import './liveScoring.css'

/**
 * A no-ball always concedes the one penalty run, on top of anything the batter
 * hit off it — so this is a two-step choice rather than a single button.
 */
export default function NoBallRunsModal({ onDeliverBall, onClose }) {
  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 p-4 backdrop-blur-xs">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="modal-content w-full max-w-sm space-y-4 rounded-3xl border border-neutral-200 bg-white p-6 text-left shadow-2xl"
      >
        <div>
          <h3 className="text-lg font-black text-neutral-950">No-Ball Delivery</h3>
          <p className="mt-1 text-xs text-neutral-500">
            A no-ball always adds +1 extra run. Did the batter also score runs?
          </p>
        </div>

        <div className="space-y-2">
          <div className="text-[10px] font-black tracking-wider text-neutral-400 uppercase">
            No-ball only (no batter runs)
          </div>
          <button
            type="button"
            onClick={() => {
              onDeliverBall('Nb')
              onClose()
            }}
            className="w-full rounded-xl border border-amber-200 bg-amber-50 py-3 text-center transition active:scale-95"
          >
            <div className="text-lg font-black text-amber-700">Nb</div>
            <div className="mt-0.5 text-[9px] font-bold text-amber-600">+1 EXTRA ONLY</div>
          </button>
        </div>

        <div className="space-y-2">
          <div className="text-[10px] font-black tracking-wider text-neutral-400 uppercase">
            No-ball + Batter runs scored
          </div>
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {[1, 2, 3, 4, 6].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  onDeliverBall(`Nb+${n}`)
                  onClose()
                }}
                className="rounded-xl border border-amber-200 bg-white py-3 text-center shadow-xs transition hover:bg-amber-50 active:scale-95"
              >
                <div className="font-mono text-lg font-black text-amber-800">{n}</div>
                <div className="text-[8px] font-bold text-amber-600">+Nb</div>
              </button>
            ))}
          </div>
          <div className="text-[10px] font-medium text-neutral-400">
            Total = 1 (no-ball extra) + batter's runs
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl border border-neutral-200 py-2.5 text-xs font-bold text-neutral-500 transition hover:bg-neutral-50"
        >
          Cancel
        </button>
      </motion.div>
    </div>
  )
}