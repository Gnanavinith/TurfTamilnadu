import Modal from '../../../components/Modal'

const EXTRA_RUN_OPTIONS = [1, 2, 3, 4, 6]
const BYE_OPTIONS = [1, 2, 3, 4, 5]

/**
 * Extras always add at least one run, so the scorer has to say whether runs
 * were also scored. Wides are a single tap because they can't carry batter
 * runs; no-balls, byes and leg-byes open this sheet.
 */
export default function ExtrasModal({
  open,
  onClose,
  onDeliver,
  busy,
  kind = 'no_ball',
  title,
  description,
  hint,
}) {
  const options = kind === 'no_ball' ? EXTRA_RUN_OPTIONS : BYE_OPTIONS

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <button type="button" className="g-btn g-btn-outline g-btn-sm" onClick={onClose}>
          Cancel
        </button>
      }
    >
      <p className="g-note" style={{ marginTop: 0 }}>
        {description}
      </p>

      {kind === 'no_ball' && (
        <button
          type="button"
          className="g-btn g-btn-block"
          style={{ marginBottom: 16 }}
          onClick={() => onDeliver(0)}
          disabled={busy}
        >
          No-ball only · +1 extra
        </button>
      )}

      <span className="g-label">Runs added</span>
      <div className="g-pad" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
        {options.map((value) => (
          <button
            key={value}
            type="button"
            className="g-bx"
            disabled={busy}
            onClick={() => onDeliver(value)}
          >
            {value}
          </button>
        ))}
      </div>

      {hint && <p className="g-hint">{hint}</p>}
    </Modal>
  )
}
