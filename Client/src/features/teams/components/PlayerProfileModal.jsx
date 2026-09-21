import Modal from '../../../components/Modal'
import { formatOvers } from '../../../utils/formatOvers'
import { formatDate } from '../../../utils/formatDate'
import { SPECIALTY_LABELS, DESIGNATION_LABELS } from '../constants'

function Stat({ label, value, highlight = false }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
      <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${highlight ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
        {value ?? '—'}
      </p>
    </div>
  )
}

function buildSummary(rows) {
  const matches = new Set(rows.map((row) => row.matchId)).size
  const best = rows.reduce(
    (acc, row) => {
      if (!row.batting) return acc
      if ((row.batting.runs ?? 0) > (acc.runs ?? 0)) {
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
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300"
          style={member?.avatarColor ? { backgroundColor: member.avatarColor, color: '#fff' } : undefined}
        >
          {name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-base font-semibold">
            {name}
            {member?.designation && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                {DESIGNATION_LABELS[member.designation]}
              </span>
            )}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {member?.email ? `${member.email} · ` : ''}
            {SPECIALTY_LABELS[member?.specialty] || 'Player'}
            {member?.role === 'admin' ? ' · Admin' : ''}
            {member?.joinedAt ? ` · joined ${formatDate(member.joinedAt)}` : ''}
          </p>
        </div>
      </div>

      {(batting?.innings || 0) + (bowling?.innings || 0) === 0 && rows.length === 0 ? (
        <p className="rounded-xl bg-slate-50 py-8 text-center text-sm text-slate-400 dark:bg-slate-800/60">
          No match appearances yet. Once they play, their profile fills in here.
        </p>
      ) : (
        <div className="space-y-5">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Batting
            </h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
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
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                Best: {summary.best.runs}
                {summary.best.notOut ? '*' : ''} vs {summary.best.opponent} ({formatDate(summary.best.date)})
              </p>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Bowling
            </h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              <Stat label="Matches" value={summary.matches || bowling?.innings || 0} />
              <Stat label="Inns" value={bowling?.innings ?? 0} />
              <Stat label="Overs" value={bowling?.overs ?? (bowling?.balls ? formatOvers(bowling.balls) : '—')} />
              <Stat label="Runs" value={bowling?.runs ?? 0} />
              <Stat label="Wkts" value={bowling?.wickets ?? 0} highlight />
              <Stat label="Econ" value={bowling?.economy != null ? bowling.economy.toFixed?.(1) ?? bowling.economy : '—'} />
            </div>
            {summary.bestBowling && (summary.bestBowling.wickets ?? 0) > 0 && (
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                Best: {summary.bestBowling.wickets}/{summary.bestBowling.runs} vs {summary.bestBowling.opponent} (
                {formatDate(summary.bestBowling.date)})
              </p>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Recent matches
            </h3>
            {rows.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">No matches yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.slice(0, 5).map((row) => (
                  <li key={row.matchId} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2 text-sm">
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {formatDate(row.date)} vs {row.opponent}
                    </span>
                    <span>
                      {row.batting && (
                        <span className="tabular-nums">
                          {row.batting.runs}
                          {row.batting.out ? '' : '*'}({row.batting.balls ?? 0})
                        </span>
                      )}
                      {row.batting && row.bowling && <span className="text-slate-300"> · </span>}
                      {row.bowling && (
                        <span className="tabular-nums">
                          {row.bowling.wickets ?? 0}/{row.bowling.runs ?? 0}
                        </span>
                      )}
                      {!row.batting && !row.bowling && <span className="text-xs text-slate-400">—</span>}
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