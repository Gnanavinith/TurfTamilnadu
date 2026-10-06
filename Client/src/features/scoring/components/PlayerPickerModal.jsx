import Modal from '../../../components/Modal'

/**
 * A single sheet for every "pick a player" decision the scorer has to make:
 * a new batter after a wicket, the next bowler, or recalling a retired batter.
 * Keeping them in one component means the empty states read the same way.
 */
export default function PlayerPickerModal({
  open,
  onClose,
  onPick,
  title,
  description,
  players = [],
  busy,
  emptyNote,
  // Ids that cannot hold this slot: the other end's holder, who already occupies
  // the crease. Greyed out rather than hidden, so the admin sees the full XI.
  disabledIds = [],
}) {
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

      {players.length === 0 ? (
        <p className="g-empty-note">{emptyNote ?? 'Nobody available.'}</p>
      ) : (
        <div className="g-pick-grid">
          {players.map((player) => {
            const id = player.id ?? player.userId
            return (
              <button
                key={id}
                type="button"
                className="g-choice"
                disabled={busy || disabledIds.includes(String(id))}
                onClick={() => onPick(id)}
              >
                {player.jerseyNumber ? (
                  <span className="g-chip-no" aria-hidden="true">
                    {player.jerseyNumber}
                  </span>
                ) : null}
                {player.name ?? player.email}
                {player.roleLabel ? <small>{player.roleLabel}</small> : null}
              </button>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
