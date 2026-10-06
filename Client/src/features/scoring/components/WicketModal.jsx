import { useState } from 'react'
import Modal from '../../../components/Modal'
import { FIELDER_WICKETS, WICKET_LABELS } from '../cricket'

const WICKET_CHOICES = Object.entries(WICKET_LABELS)
const RUN_OUT_OPTIONS = [0, 1, 2, 3]

/**
 * Record a wicket: who was out, how it happened, and — for a catch, stumping or
 * run out — which fielder is credited.
 */
export default function WicketModal({
  open,
  onClose,
  onConfirm,
  busy,
  striker,
  nonStriker,
  bowler,
  fielders = [],
  defaultBatterId = '',
}) {
  const [type, setType] = useState('bowled')
  const [outBatterId, setOutBatterId] = useState(defaultBatterId)
  const [fielderId, setFielderId] = useState('')
  const [runOutRuns, setRunOutRuns] = useState(0)

  const needsFielder = FIELDER_WICKETS.has(type)
  const needsRuns = type === 'run_out'

  const pickType = (next) => {
    setType(next)
    // The fielder only applies to certain dismissals.
    if (!FIELDER_WICKETS.has(next)) setFielderId('')
    if (next !== 'run_out') setRunOutRuns(0)
  }

  const handleConfirm = () => {
    onConfirm({
      wicketType: type,
      outBatterId,
      fielderId: needsFielder ? fielderId : undefined,
      batterRuns: needsRuns ? runOutRuns : 0,
    })
  }

  const creasedIds = [striker, nonStriker].filter(Boolean)
  const canConfirm = Boolean(outBatterId) && (!needsFielder || Boolean(fielderId))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record wicket"
      footer={
        <>
          <button type="button" className="g-btn g-btn-outline g-btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="g-btn g-btn-danger g-btn-sm"
            onClick={handleConfirm}
            disabled={!canConfirm || busy}
          >
            {busy ? 'Saving…' : 'Confirm wicket'}
          </button>
        </>
      }
    >
      {creasedIds.length > 1 && (
        <>
          <span className="g-label">Who is out?</span>
          <div className="g-choices" style={{ marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => setOutBatterId(striker)}
              className={`g-choice${outBatterId === striker ? ' is-on' : ''}`}
            >
              Striker
            </button>
            <button
              type="button"
              onClick={() => setOutBatterId(nonStriker)}
              className={`g-choice${outBatterId === nonStriker ? ' is-on' : ''}`}
            >
              Non-striker
            </button>
          </div>
        </>
      )}

      <span className="g-label">How did it happen?</span>
      <div className="g-choices">
        {WICKET_CHOICES.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => pickType(value)}
            className={`g-choice${type === value ? ' is-on' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {type !== 'run_out' && (
        <div className="g-alert g-alert-info" style={{ marginTop: 14 }}>
          Credited to {bowler?.name ?? 'the bowler'}
          {['caught', 'stumped', 'bowled', 'lbw', 'hit_wicket'].includes(type) &&
            ' · counts towards their wickets'}
        </div>
      )}

      {needsFielder && (
        <label className="g-field" style={{ marginTop: 14, marginBottom: 0 }}>
          <span className="g-label">
            {type === 'caught' ? 'Who caught it?' : type === 'stumped' ? 'Who stumped?' : 'Who was involved?'}
          </span>
          <select
            value={fielderId}
            onChange={(event) => setFielderId(event.target.value)}
            className="g-select"
          >
            <option value="">Select fielder</option>
            {fielders.map((player) => (
              <option key={player.id ?? player.userId} value={player.id ?? player.userId}>
                {player.name ?? player.email}
              </option>
            ))}
          </select>
        </label>
      )}

      {needsRuns && (
        <div style={{ marginTop: 14 }}>
          <span className="g-label">Runs completed on this ball</span>
          <div className="g-choices" style={{ marginTop: 8 }}>
            {RUN_OUT_OPTIONS.map((runs) => (
              <button
                key={runs}
                type="button"
                onClick={() => setRunOutRuns(runs)}
                className={`g-choice${runOutRuns === runs ? ' is-on' : ''}`}
              >
                {runs}
              </button>
            ))}
          </div>
          <p className="g-hint">
            A run out does not credit the bowler, so the runs stay with the batter.
          </p>
        </div>
      )}
    </Modal>
  )
}
