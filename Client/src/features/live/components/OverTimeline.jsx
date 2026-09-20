const BALL_LABELS = {
  W: 'W',
  wd: '+',
  nb: '+',
}

function Ball({ ball }) {
  const { runs, kind, wicket } = ball ?? {}
  const isWicket = Boolean(wicket)
  const isExtra = kind === 'wide' || kind === 'no_ball'

  let label = String(runs ?? 0)
  let cls = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
  if (isWicket) {
    label = 'W'
    cls = 'bg-red-600 text-white'
  } else if (isExtra) {
    label = BALL_LABELS[kind]
    cls = 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
  } else if (runs === 4) {
    cls = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
  } else if (runs === 6) {
    cls = 'bg-yellow-400 text-black'
  }

  return (
    <span
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${cls}`}
      title={wicket ?? kind ?? `${runs} runs`}
    >
      {label}
    </span>
  )
}

function Over({ over, index }) {
  const balls = Array.isArray(over) ? over : []
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <span className="w-8 shrink-0 text-xs font-semibold text-slate-400 dark:text-slate-500">
        O{index + 1}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {balls.length === 0 ? (
          <span className="text-xs text-slate-400">—</span>
        ) : (
          balls.map((ball, ballIndex) => <Ball key={ballIndex} ball={ball} />)
        )}
      </div>
    </div>
  )
}

export default function OverTimeline({ overs = [] }) {
  if (overs.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
        No balls bowled yet.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {overs.map((over, index) => (
        <Over key={index} over={over} index={index} />
      ))}
    </div>
  )
}