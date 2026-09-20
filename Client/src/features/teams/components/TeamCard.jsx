import { Link } from 'react-router-dom'
import { formatDate } from '../../../utils/formatDate'

export default function TeamCard({ team }) {
  const members =
    typeof team.members === 'number' ? team.members : Array.isArray(team.members) ? team.members.length : 0

  return (
    <Link
      to={`/teams/${team.id}`}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-lg font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
          {team.name?.charAt(0)?.toUpperCase() ?? 'T'}
        </div>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          {members} members
        </span>
      </div>
      <h3 className="mt-3 text-base font-semibold group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
        {team.name}
      </h3>
      {team.createdAt && (
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Created {formatDate(team.createdAt)}
        </p>
      )}
    </Link>
  )
}