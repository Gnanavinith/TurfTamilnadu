export default function Loader({ label = 'Loading…', full = false }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400 ${
        full ? 'min-h-screen' : 'py-16'
      }`}
    >
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  )
}