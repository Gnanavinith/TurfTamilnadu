import Button from '../../../components/Button'

const RUNS = [0, 1, 2, 3, 4, 6]

export default function RunPad({ onRun }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Runs
      </h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {RUNS.map((run) => (
          <Button
            key={run}
            onClick={() => onRun(run)}
            size="lg"
            variant={run === 4 || run === 6 ? 'secondary' : 'outline'}
            className={`text-lg font-bold ${
              run === 6 ? '!bg-yellow-500 !text-black hover:!bg-yellow-400' : ''
            }`}
          >
            {run}
          </Button>
        ))}
      </div>
    </div>
  )
}