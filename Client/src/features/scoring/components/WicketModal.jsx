import { useState } from 'react'
import Modal from '../../../components/Modal'
import Button from '../../../components/Button'
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

export default function WicketModal({ open, onClose, onConfirm, busy }) {
  const [type, setType] = useState('bowled')

  const handleConfirm = () => {
    onConfirm(type)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Wicket"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} variant="danger" loading={busy}>
            Out
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-2">
        {WICKET_TYPES.map((wicket) => (
          <button
            key={wicket}
            type="button"
            onClick={() => setType(wicket)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
              type === wicket
                ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {WICKET_LABELS[wicket] ?? wicket.replace('_', ' ')}
          </button>
        ))}
      </div>
      {type === 'run_out' && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          Add the out-batter and the runs completed before confirming.
        </p>
      )}
    </Modal>
  )
}