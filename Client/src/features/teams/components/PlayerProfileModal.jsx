import Modal from '../../../components/Modal'
import { formatOvers } from '../../../utils/formatOvers'
import { formatDate } from '../../../utils/formatDate'
import { SPECIALTY_LABELS, DESIGNATION_LABELS } from '../constants'

function Stat({ label, value, highlight = false }) {
  return (
    <div className={`g-stat${highlight ? ' g-stat-highlight' : ''}`}>
      <small>{label}</small>
      <strong className="num">{value ?? '—'}</strong>
    </div>
  )
}

function buildSummary(rows) {
  const matches = new Set(rows.map((row) => row.matchId)).size
  const best = rows.reduce(
    (acc, row) => {
      if (!row.batting) return acc
      if (!acc || (row.batting.runs ?? 0) > (acc.runs ?? 0)) {
        return { runs: row.batting.runs, notOut: !row.batting.out, balls: row.batting.balls, opponent: row.opponent, date: row.date }
      }
      return acc
    },
    null,
  )
  const bestBowling = rows.reduce(
    (acc, row) => {
      if (!row.bowling) return acc
      const wkts = row.bowling.wickets ?? 0
      if (!acc || wkts > acc.wickets || (wkts === acc.wickets && (row.bowling.runs ?? 0) < (acc.runs ?? Infinity))) {
        return { wickets: wkts, runs: row.bowling.runs, opponent: row.opponent, date: row.date }
      }
      return acc
    },
    null,
  )
  return { matches, best, bestBowling }
}

export default function PlayerProfileModal({ open, onClose, member, stats, history }) {
  const record = member?.id ? stats?.[member.id] : null
  const batting = record?.batting
  const bowling = record?.bowling
  const rows = member?.id ? history?.[member.id] ?? [] : []
  const name = member?.name ?? member?.email ?? 'Player'

  const summary = buildSummary(rows)

  return (
    <Modal open={open} onClose={onClose} title="Player profile">
      <div className="g-profile-header">
        <div
          className="g-avatar g-avatar-lg"
          style={member?.avatarColor ? { backgroundColor: member.avatarColor, color: '#fff' } : undefined}
        >
          {name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="g-profile-name">
            {name}
            {member?.designation && (
              <span className="g-badge g-badge-warn g-badge-xs">
                {DESIGNATION_LABELS[member.designation]}
              </span>
            )}
          </p>
          <p className="g-note">
            {member?.email ? `${member.email} · ` : ''}
            {SPECIALTY_LABELS[member?.specialty] || 'Player'}
            {member?.role === 'admin' ? ' · Admin' : ''}
            {member?.joinedAt ? ` · joined ${formatDate(member.joinedAt)}` : ''}
          </p>
        </div>
      </div>

      {(batting?.innings || 0) + (bowling?.innings || 0) === 0 && rows.length === 0 ? (
        <p className="g-empty g-empty-sm">
          No match appearances yet. Once they play, their profile fills in here.
        </p>
      ) : (
        <div className="space-y-5">
          <section>
            <h3 className="g-subhead">
              Batting
            </h3>
            <div className="g-stat-grid">
              <Stat label="Matches" value={summary.matches || batting?.innings || 0} />
              <Stat label="Inns" value={batting?.innings ?? 0} />
              <Stat label="Runs" value={batting?.runs ?? 0} highlight />
              <Stat
                label="Best"
                value={summary.best ? `${summary.best.runs}${summary.best.notOut ? '*' : ''}` : '—'}
              />
              <Stat label="Avg" value={batting?.average != null ? batting.average.toFixed?.(1) ?? batting.average : '—'} />
              <Stat label="SR" value={batting?.strikeRate != null ? Math.round(batting.strikeRate) : '—'} />
            </div>
            {summary.best && (
              <p className="g-note" style={{ marginTop: 8 }}>
                Best: {summary.best.runs}
                {summary.best.notOut ? '*' : ''} vs {summary.best.opponent} ({formatDate(summary.best.date)})
              </p>
            )}
          </section>

          <section>
            <h3 className="g-subhead">
              Bowling
            </h3>
            <div className="g-stat-grid">
              <Stat label="Matches" value={summary.matches || bowling?.innings || 0} />
              <Stat label="Inns" value={bowling?.innings ?? 0} />
              <Stat label="Overs" value={bowling?.overs ?? (bowling?.balls ? formatOvers(bowling.balls) : '—')} />
              <Stat label="Runs" value={bowling?.runs ?? 0} />
              <Stat label="Wkts" value={bowling?.wickets ?? 0} highlight />
              <Stat label="Econ" value={bowling?.economy != null ? bowling.economy.toFixed?.(1) ?? bowling.economy : '—'} />
            </div>
            {summary.bestBowling && (summary.bestBowling.wickets ?? 0) > 0 && (
              <p className="g-note" style={{ marginTop: 8 }}>
                Best: {summary.bestBowling.wickets}/{summary.bestBowling.runs} vs {summary.bestBowling.opponent} (
                {formatDate(summary.bestBowling.date)})
              </p>
            )}
          </section>

          <section>
            <h3 className="g-subhead">
              Recent matches
            </h3>
            {rows.length === 0 ? (
              <p className="g-note" style={{ padding: '16px 0', textAlign: 'center' }}>
                No matches yet.
              </p>
            ) : (
              <ul className="g-profile-history">
                {rows.slice(0, 5).map((row) => (
                  <li key={row.matchId} className="g-profile-history-row">
                    <span className="g-note">
                      {formatDate(row.date)} vs {row.opponent}
                    </span>
                    <span>
                      {row.batting && (
                        <span className="tabular-nums">
                          {row.batting.runs}
                          {row.batting.out ? '' : '*'}({row.batting.balls ?? 0})
                        </span>
                      )}
                      {row.batting && row.bowling && <span className="g-dim"> · </span>}
                      {row.bowling && (
                        <span className="tabular-nums">
                          {row.bowling.wickets ?? 0}/{row.bowling.runs ?? 0}
                        </span>
                      )}
                      {!row.batting && !row.bowling && <span className="g-note">—</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Modal>
  )
}