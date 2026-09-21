import { useState } from 'react'
import Modal from '../../../components/Modal'
import { WICKET_TYPES } from '../../../utils/constants'

const WICKET_LABELS = {
  bowled: 'Bowled',
  caught: 'Caught',
  lbw: 'LBW',
  run_out: 'Run out',
  stumped: 'Stumped',
  hit_wicket: 'Hit wicket',
  retired: 'Retired',
}

export default function WicketModal({
  open,
  onClose,
  onConfirm,
  busy,
  players = [],
  defaultBatterId = '',
}) {
  const [type, setType] = useState('bowled')
  const [outBatterId, setOutBatterId] = useState(defaultBatterId)

  const handleConfirm = () => {
    onConfirm(type, outBatterId)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Wicket"
      footer={
        <>
          <button type="button" className="g-btn g-btn-outline g-btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="g-btn g-btn-danger g-btn-sm"
            onClick={handleConfirm}
            disabled={!outBatterId || busy}
          >
            {busy ? 'Saving…' : 'Out'}
          </button>
        </>
      }
    >
      <div className="g-choices">
        {WICKET_TYPES.map((wicket) => (
          <button
            key={wicket}
            type="button"
            onClick={() => setType(wicket)}
            className={`g-choice${type === wicket ? ' is-on' : ''}`}
          >
            {WICKET_LABELS[wicket] ?? wicket.replace('_', ' ')}
          </button>
        ))}
      </div>

      <label className="g-field" style={{ marginTop: 16 }}>
        <span className="g-label">Who is out?</span>
        <select
          value={outBatterId}
          onChange={(event) => setOutBatterId(event.target.value)}
          className="g-select"
        >
          <option value="">Select the out player</option>
          {players.map((player) => (
            <option key={player.id ?? player.userId} value={player.id ?? player.userId}>
              {player.name ?? player.email}
            </option>
          ))}
        </select>
      </label>

      <div className="g-alert g-alert-warn">
        {type === 'run_out'
          ? 'Pick the out batter (striker or non-striker) and add the runs completed in the Run Pad before confirming.'
          : 'Defaults to the striker. Switch if a different player was out.'}
      </div>
    </Modal>
  )
}