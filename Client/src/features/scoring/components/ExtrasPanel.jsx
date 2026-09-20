import Button from '../../../components/Button'

const EXTRA_BUTTONS = [
  { key: 'wide', label: '+1 Wd', runs: 1, kind: 'wide' },
  { key: 'noball', label: '+1 Nb', runs: 1, kind: 'no_ball' },
  { key: 'bye', label: 'Bye', runs: 1, kind: 'bye' },
  { key: 'legbye', label: 'Leg Bye', runs: 1, kind: 'leg_bye' },
]

export default function ExtrasPanel({ onExtra }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Extras
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {EXTRA_BUTTONS.map((extra) => (
          <Button
            key={extra.key}
            variant="outline"
            onClick={() => onExtra(extra)}
          >
            {extra.label}
          </Button>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
        Tap again to add multiple extra runs on the same ball.
      </p>
    </div>
  )
}