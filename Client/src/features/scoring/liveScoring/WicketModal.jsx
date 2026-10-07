import { useState } from 'react'
import { motion } from 'motion/react'
import { WICKET_TYPES, FIELDER_WICKETS, WICKET_KEYS } from './helpers'
import './liveScoring.css'

const RUN_OUT_OPTIONS = [0, 1, 2, 3]

/**
 * Record a dismissal: who was out, how it happened, and — for a catch, a
 * stumping or a run out — which fielder is credited alongside the bowler.
 */
export default function WicketModal({
  bowler,
  striker,
  nonStriker,
  fieldingPlayers = [],
  helpers,
  onSubmit,
  onClose,
}) {
  const { getPlayerName, getJerseyLabel } = helpers
  const [wicketType, setWicketType] = useState('Bowled')
  const [fielderId, setFielderId] = useState('')
  const [outPlayerId, setOutPlayerId] = useState(striker || '')
  const [runOutRuns, setRunOutRuns] = useState(0)

  const storedType = WICKET_KEYS[wicketType]
  const needsFielder = FIELDER_WICKETS.has(storedType)
  const needsRuns = storedType === 'run_out'

  const pickType = (type) => {
    setWicketType(type)
    // The fielder only applies to certain dismissals, and completed runs only to
    // a run out — clear the ones that no longer apply so they can't be sent.
    if (!FIELDER_WICKETS.has(WICKET_KEYS[type])) setFielderId('')
    if (WICKET_KEYS[type] !== 'run_out') setRunOutRuns(0)
  }

  const handleSubmit = () => {
    onSubmit(
      wicketType,
      bowler || undefined,
      needsFielder ? fielderId || undefined : undefined,
      outPlayerId || striker || undefined,
      needsRuns ? runOutRuns : undefined,
    )
  }

  const fielderPrompt =
    wicketType === 'Caught'
      ? 'Who caught it?'
      : wicketType === 'Stumped'
        ? 'Who stumped it?'
        : 'Who threw/assisted?'

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 p-4 backdrop-blur-xs">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="modal-content w-full max-w-sm space-y-4 rounded-3xl border border-neutral-200 bg-white p-6 text-left shadow-2xl"
      >
        <div>
          <h3 className="text-lg font-black text-neutral-950">Record Wicket</h3>
          <p className="mt-1 text-xs text-neutral-500">
            Specify how the wicket fell and who contributed.
          </p>
        </div>

        {/* Out Batter selection */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-black tracking-wider text-neutral-400 uppercase">
            Who is Out?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {striker && (
              <button
                type="button"
                onClick={() => setOutPlayerId(striker)}
                className={`rounded-xl border p-2.5 text-center text-xs font-bold transition ${
                  outPlayerId === striker
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-neutral-200 text-neutral-800 hover:bg-neutral-50'
                }`}
              >
                Striker: {getPlayerName(striker)}
              </button>
            )}
            {nonStriker && (
              <button
                type="button"
                onClick={() => setOutPlayerId(nonStriker)}
                className={`rounded-xl border p-2.5 text-center text-xs font-bold transition ${
                  outPlayerId === nonStriker
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-neutral-200 text-neutral-800 hover:bg-neutral-50'
                }`}
              >
                Non-Striker: {getPlayerName(nonStriker)}
              </button>
            )}
          </div>
        </div>

        {/* Wicket Type selection */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-black tracking-wider text-neutral-400 uppercase">
            Wicket Type
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {WICKET_TYPES.map((type) => (
              <button
                type="button"
                key={type}
                onClick={() => pickType(type)}
                className={`rounded-xl border py-2 text-center text-[11px] font-black transition ${
                  wicketType === type
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Bowler Name (Read-Only Info) */}
        {wicketType !== 'Run Out' && bowler && (
          <div className="flex items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50 p-2.5 text-xs">
            <span className="font-semibold text-neutral-500">Wicket Credited To:</span>
            <span className="font-extrabold text-neutral-800">{getPlayerName(bowler)}</span>
          </div>
        )}

        {/* Helper Fielder Dropdown */}
        {needsFielder && (
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black tracking-wider text-neutral-400 uppercase">
              {fielderPrompt} (Fielder)
            </label>
            <select
              value={fielderId}
              onChange={(event) => setFielderId(event.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">-- Select Fielder --</option>
              {fieldingPlayers.map((player) => (
                <option key={player.id} value={player.id}>
                  {getJerseyLabel(player.id)} {getPlayerName(player.id)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Completed Runs for Run Out */}
        {needsRuns && (
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black tracking-wider text-neutral-400 uppercase">
              Completed runs on this ball before run out:
            </label>
            <div className="flex gap-2">
              {RUN_OUT_OPTIONS.map((num) => (
                <button
                  type="button"
                  key={num}
                  onClick={() => setRunOutRuns(num)}
                  className={`flex-1 rounded-xl border py-2 text-center text-xs font-bold transition ${
                    runOutRuns === num
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  {num} {num === 1 ? 'Run' : 'Runs'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-xs font-bold text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={needsFielder && !fielderId}
            className="flex-1 rounded-xl bg-red-500 py-2.5 text-xs font-bold text-white transition hover:bg-red-600 active:scale-95 disabled:opacity-50"
          >
            Confirm Wicket
          </button>
        </div>
      </motion.div>
    </div>
  )
}