import { economy, strikeRate } from '../cricket'

function PlayerRow({
  label,
  player,
  lines,
  tone = '',
  marker,
  className = '',
  changeLabel,
  onChange,
  changeDisabled,
}) {
  return (
    <div className={`g-crease-row${tone ? ` ${tone}` : ''}${className ? ` ${className}` : ''}`}>
      <div className="g-crease-head">
        <span className="g-badge g-badge-done">{label}</span>
        {marker && <span className="g-live-dot" aria-hidden="true" />}
        <b>{player?.name ?? player?.email ?? 'Not selected'}</b>
        {onChange && (
          <button
            type="button"
            className="g-ghost g-ghost-sm g-crease-change"
            onClick={onChange}
            disabled={changeDisabled}
          >
            {changeLabel}
          </button>
        )}
      </div>
      {player ? (
        lines?.(player)
      ) : (
        <small className="g-note">Select the next batsman from squad</small>
      )}
    </div>
  )
}

/**
 * Who is at the crease and who has the ball, with the figures that matter for
 * the next delivery. Every row that the scorer is allowed to change carries its
 * own action buttons.
 */
export default function AtTheCrease({
  innings,
  nameOf,
  battingXI = [],
  bowlingXI = [],
  editable = false,
  onSwap,
  onChangeStriker,
  onChangeNonStriker,
  onChangeBowler,
  onRetire,
  swapPending,
}) {
  if (!innings) return null

  const batting = innings.batting ?? []
  const bowling = innings.bowling ?? []

  // The crease is held by ids on the innings, but the batting/bowling ledgers
  // only gain rows once a ball is bowled. Resolve the name from the playing XI
  // and merge in the ledger figures, so a fresh innings still shows its openers.
  const resolve = (id, xi, entries) => {
    if (!id) return null
    const person = xi.find((p) => String(p.id) === String(id)) ?? null
    const entry = entries.find((e) => String(e.userId) === String(id)) ?? null
    if (!person && !entry) return null
    return {
      ...person,
      ...entry,
      id: String(id),
      name: person?.name ?? entry?.name ?? null,
    }
  }

  const striker = resolve(innings.strikerId, battingXI, batting)
  const nonStriker = resolve(innings.nonStrikerId, battingXI, batting)
  const bowler = resolve(innings.bowlerId, bowlingXI, bowling)
  const previousBowler = resolve(innings.previousBowlerId, bowlingXI, bowling)

  const needsStriker = !striker
  const needsBowler = !bowler

  return (
    <div className="g-panel">
      <div className="g-panel-head">
        At the crease
        <span>{innings.lastManStanding ? 'Last man standing' : nameOf(innings.bowlingTeamId)}</span>
      </div>

      <div className="g-crease-grid">
        <PlayerRow
          label="Striker"
          player={striker}
          tone={needsStriker ? 'is-empty' : 'is-striker'}
          marker={Boolean(striker)}
          changeLabel={striker ? 'Change' : 'Assign'}
          onChange={editable ? onChangeStriker : undefined}
          changeDisabled={swapPending}
        lines={(p) => (
          <div className="g-figures">
            <span>
              <strong>
                {p.runs ?? 0}
                <small>({p.balls ?? 0})</small>
              </strong>
              runs
            </span>
            <span>
              <strong>{p.fours ?? 0}</strong> 4s
            </span>
            <span>
              <strong>{p.sixes ?? 0}</strong> 6s
            </span>
            <span>
              <strong>{strikeRate(p)}</strong> SR
            </span>
          </div>
        )}
      />

      <PlayerRow
          label="Non-striker"
          player={nonStriker}
          tone={!nonStriker ? 'is-empty' : ''}
          changeLabel={nonStriker ? 'Change' : 'Assign'}
          onChange={editable ? onChangeNonStriker : undefined}
          changeDisabled={swapPending}
        lines={(p) => (
          <div className="g-figures">
            <span>
              <strong>
                {p.runs ?? 0}
                <small>({p.balls ?? 0})</small>
              </strong>
              runs
            </span>
            <span>
              <strong>{p.fours ?? 0}</strong> 4s
            </span>
            <span>
              <strong>{p.sixes ?? 0}</strong> 6s
            </span>
            <span>
              <strong>{strikeRate(p)}</strong> SR
            </span>
          </div>
        )}
      />

      {/* Bowler takes the full second row, aligned under the two batters. */}
        <PlayerRow
          label="Bowler"
          player={bowler}
          className="g-crease-bowler"
          tone={needsBowler ? 'is-empty' : 'is-bowler'}
          changeLabel={bowler ? 'Change' : 'Assign'}
          onChange={editable ? onChangeBowler : undefined}
          changeDisabled={swapPending}
        lines={(p) => (
          <div className="g-figures">
            <span>
              <strong>
                {Math.floor((p.balls ?? 0) / 6)}.{(p.balls ?? 0) % 6}
              </strong>
              overs
            </span>
            <span>
              <strong>{p.runs ?? 0}</strong> runs
            </span>
            <span>
              <strong>{p.wickets ?? 0}</strong> wkts
            </span>
            <span>
              <strong>{economy(p)}</strong> econ
            </span>
          </div>
        )}
      />
      </div>

      {needsBowler && (
        <small className="g-note g-note-block">Bowler Required — select who is bowling.</small>
      )}

      {previousBowler && needsBowler && (
        <div className="g-alert g-alert-warn" style={{ marginTop: 12 }}>
          {previousBowler.name ?? 'That bowler'} bowled the last over — a different bowler must
          start this one.
        </div>
      )}

      {editable && (
        <div className="g-crease-actions">
          {striker && nonStriker && (
            <button
              type="button"
              className="g-btn g-btn-outline g-btn-sm"
              onClick={onSwap}
              disabled={swapPending}
            >
              Swap strike
            </button>
          )}
          {/* Each card carries its own CHANGE control in the corner. */}
          {(striker || nonStriker) && (
            <button
              type="button"
              className="g-btn g-btn-outline g-btn-sm"
              onClick={onRetire}
              disabled={swapPending}
            >
              Retire hurt
            </button>
          )}
        </div>
      )}
    </div>
  )
}
