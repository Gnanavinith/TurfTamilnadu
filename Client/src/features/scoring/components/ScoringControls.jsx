/** Shown while a wicket or extras sheet is open, so the pad stays visible. */
export default function ScoringControls({
  onRun,
  onWicket,
  onExtra,
  onUndo,
  disabled,
  undoDisabled,
  busy,
}) {
  return (
    <div className="g-panel" id="scoring-board">
      <div className="g-panel-head">
        Scoring controls
        <button
          type="button"
          className="g-ghost g-ghost-sm"
          onClick={onUndo}
          // Undo stays live while the pad is locked: after a wicket the dismissed
          // batsman's slot reopens, so the pad is disabled exactly when an undo is
          // most needed.
          disabled={undoDisabled || busy}
        >
          Undo last ball
        </button>
      </div>

      {/* The delivery pad stays hidden until the crease is fully staffed. */}
      {disabled ? (
        <div className="g-alert g-alert-warn" style={{ marginTop: 12 }}>
          Assign the striker, the non-striker and the bowler to start scoring. Use the
          CHANGE buttons on the At the crease cards.
        </div>
      ) : (
        <>
          <div className="g-pad">
        <button type="button" onClick={() => onRun(0)} disabled={disabled || busy}>
          <span aria-hidden="true">•</span>
          <small>Dot</small>
        </button>
        <button type="button" onClick={() => onRun(1)} disabled={disabled || busy}>
          1
          <small>1 run</small>
        </button>
        <button type="button" onClick={() => onRun(2)} disabled={disabled || busy}>
          2
          <small>2 runs</small>
        </button>
        <button type="button" onClick={() => onRun(3)} disabled={disabled || busy}>
          3
          <small>3 runs</small>
        </button>

        <button
          type="button"
          className="g-b4"
          onClick={() => onRun(4)}
          disabled={disabled || busy}
        >
          4
          <small>Boundary</small>
        </button>
        <button
          type="button"
          className="g-b6"
          onClick={() => onRun(6)}
          disabled={disabled || busy}
        >
          6
          <small>Maximum</small>
        </button>
        <button
          type="button"
          className="g-bw"
          onClick={onWicket}
          disabled={disabled || busy}
          style={{ gridColumn: 'span 2' }}
        >
          W
          <small>Wicket</small>
        </button>
      </div>

      <div className="g-pad-foot">
        <button
          type="button"
          className="g-ghost"
          onClick={() => onExtra('wide')}
          disabled={disabled || busy}
        >
          Wide
          <small className="g-ghost-note">+1 extra</small>
        </button>
        <button
          type="button"
          className="g-ghost"
          onClick={() => onExtra('no_ball')}
          disabled={disabled || busy}
        >
          No ball
          <small className="g-ghost-note">+1 extra + runs</small>
        </button>
      </div>

      <div className="g-pad-foot">
        <button
          type="button"
          className="g-ghost"
          onClick={() => onExtra('bye')}
          disabled={disabled || busy}
        >
          Byes
          <small className="g-ghost-note">Runs past the bat</small>
        </button>
        <button
          type="button"
          className="g-ghost"
          onClick={() => onExtra('leg_bye')}
          disabled={disabled || busy}
        >
Leg byes
            <small className="g-ghost-note">Off the body</small>
          </button>
        </div>
        </>
      )}

      {busy && (
        <p className="g-note" style={{ marginTop: 10 }}>
          Saving the delivery…
        </p>
      )}
    </div>
  )
}
