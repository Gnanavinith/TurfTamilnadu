import { useState } from 'react'
import { formatDate } from '../../../utils/formatDate'

const TABS = [
  { key: 'batting', label: 'Batting' },
  { key: 'bowling', label: 'Bowling' },
]

const fmt = (value, fallback = '—') => (value ?? fallback)

function Avatar({ name, email }) {
  const initial = (name ?? email ?? '?').charAt(0).toUpperCase()
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      {initial}
    </div>
  )
}

function HistoryRow({ row }) {
  const batting = row.batting
  const bowling = row.bowling
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
      <div className="flex items-baseline gap-2">
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {formatDate(row.date)}
        </span>
        <span className="text-sm font-medium">
          vs {row.opponent}
        </span>
      </div>
      <div className="flex items-baseline gap-4 text-sm">
        {batting && bat(batting)}
        {bowling && bowl(bowling)}
        {!batting && !bowling && <span className="text-xs text-slate-400">—</span>}
      </div>
    </li>
  )
}

function bat({ runs, balls, fours, sixes, out }) {
  const marker = out ? '' : '*'
  return (
    <span className="tabular-nums">
      <strong>{runs}</strong>
      {marker} <span className="text-slate-400">({balls ?? 0})</span>
      {fours > 0 && <span className="text-xs text-slate-400"> {fours}x4</span>}
      {sixes > 0 && <span className="text-xs text-slate-400"> {sixes}x6</span>}
    </span>
  )
}

function bowl({ wickets, runs, balls }) {
  const overs = formatOvers(balls ?? 0)
  return (
    <span className="tabular-nums">
      <strong>{wickets}</strong>/{runs} <span className="text-slate-400">({overs})</span>
    </span>
  )
}

function formatOvers(totalBalls) {
  const balls = Number.isFinite(totalBalls) ? totalBalls : 0
  return `${Math.floor(balls / 6)}.${balls % 6}`
}

export default function TeamStats({ squad, stats = {}, history = {} }) {
  const [tab, setTab] = useState('batting')
  const [openId, setOpenId] = useState(null)

  const members = squad.map((m) => {
    const key = String(m.id)
    const record = stats[key]
    let batting
    let bowling
    if (record) {
      batting = { ...record.batting, id: key, name: m.name, email: m.email }
      bowling = { ...record.bowling, id: key, name: m.name, email: m.email }
    }
    return { member: m, batting, bowling }
  })

  const isBattingTab = tab === 'batting'
  const shown = members
    .filter((m) => (isBattingTab ? m.batting : m.bowling))
    .sort((a, b) => {
      const x = isBattingTab ? a.batting : a.bowling
      const y = isBattingTab ? b.batting : b.bowling
      if (isBattingTab) {
        if (x.runs !== y.runs) return y.runs - x.runs
        return x.balls - y.balls
      }
      if (x.wickets !== y.wickets) return y.wickets - x.wickets
      return y.runs - x.runs || x.balls - y.balls
    })

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Player stats
        </h2>
        <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTab(t.key)
                setOpenId(null)
              }}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                tab === t.key
                  ? 'bg-white text-emerald-700 shadow-sm dark:bg-slate-900 dark:text-emerald-300'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
          No {tab === 'batting' ? 'batting' : 'bowling'} stats yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="text-xs text-slate-400 dark:text-slate-500">
                <th className="pb-2 pr-2 font-medium">Player</th>
                {isBattingTab ? (
                  <>
                    <th className="pb-2 pr-2 text-right font-medium">Inns</th>
                    <th className="pb-2 pr-2 text-right font-medium">Runs</th>
                    <th className="pb-2 pr-2 text-right font-medium">Balls</th>
                    <th className="pb-2 pr-2 text-right font-medium">SR</th>
                    <th className="pb-2 pr-2 text-right font-medium">4s</th>
                    <th className="pb-2 pr-2 text-right font-medium">6s</th>
                    <th className="pb-2 text-right font-medium">Avg</th>
                  </>
                ) : (
                  <>
                    <th className="pb-2 pr-2 text-right font-medium">Inns</th>
                    <th className="pb-2 pr-2 text-right font-medium">Overs</th>
                    <th className="pb-2 pr-2 text-right font-medium">Runs</th>
                    <th className="pb-2 pr-2 text-right font-medium">Wkts</th>
                    <th className="pb-2 pr-2 text-right font-medium">Mdns</th>
                    <th className="pb-2 pr-2 text-right font-medium">Econ</th>
                    <th className="pb-2 text-right font-medium">Avg</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {shown.map(({ member, batting, bowling }) => {
                const key = String(member.id)
                const entry = isBattingTab ? batting : bowling
                const expanded = openId === key
                return (
                  <HistoryGroup
                    key={key}
                    member={member}
                    entry={entry}
                    tab={tab}
                    expanded={expanded}
                    records={history[key] ?? []}
                    onToggle={() => setOpenId(expanded ? null : key)}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
        Tap a player to see their match history.
      </p>
    </section>
  )
}

function HistoryGroup({ member, entry, tab, expanded, records, onToggle }) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
      >
        <td className="py-2.5 pr-2">
          <div className="flex items-center gap-2">
            <Avatar name={member.name} email={member.email} />
            <span className="font-medium">{member.name ?? member.email}</span>
          </div>
        </td>
        {tab === 'batting' ? (
          <>
            <td className="py-2.5 pr-2 text-right tabular-nums">{entry.innings}</td>
            <td className="py-2.5 pr-2 text-right font-semibold tabular-nums">{entry.runs}</td>
            <td className="py-2.5 pr-2 text-right tabular-nums">{entry.balls}</td>
            <td className="py-2.5 pr-2 text-right tabular-nums">{fmt(entry.strikeRate)}</td>
            <td className="py-2.5 pr-2 text-right tabular-nums">{entry.fours}</td>
            <td className="py-2.5 pr-2 text-right tabular-nums">{entry.sixes}</td>
            <td className="py-2.5 text-right tabular-nums">{fmt(entry.average)}</td>
          </>
        ) : (
          <>
            <td className="py-2.5 pr-2 text-right tabular-nums">{entry.innings}</td>
            <td className="py-2.5 pr-2 text-right tabular-nums">{entry.overs}</td>
            <td className="py-2.5 pr-2 text-right tabular-nums">{entry.runs}</td>
            <td className="py-2.5 pr-2 text-right font-semibold tabular-nums">{entry.wickets}</td>
            <td className="py-2.5 pr-2 text-right tabular-nums">{entry.maidens}</td>
            <td className="py-2.5 pr-2 text-right tabular-nums">{fmt(entry.economy)}</td>
            <td className="py-2.5 text-right tabular-nums">{fmt(entry.average)}</td>
          </>
        )}
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} className="bg-slate-50 px-4 py-2 dark:bg-slate-800/40">
            {records.length === 0 ? (
              <p className="py-2 text-center text-xs text-slate-400">No matches yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {records.map((row) => (
                  <HistoryRow key={row.matchId} row={row} />
                ))}
              </ul>
            )}
          </td>
        </tr>
      )}
    </>
  )
}