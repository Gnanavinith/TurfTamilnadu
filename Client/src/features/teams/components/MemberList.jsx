import { SPECIALTY_LABELS, DESIGNATION_LABELS } from '../constants'

const DESIGNATION_BADGE = {
  captain: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  vice_captain: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400',
}

export default function MemberList({ members = [], onProfile, renderActions }) {
  if (members.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
        No members yet. Invite someone to join the squad.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {members.map((member) => {
        const name = member.name ?? member.email ?? 'Unknown'
        const designation = member.designation ?? null
        return (
          <li
            key={member.id ?? member.userId}
            className={`flex items-center justify-between gap-3 py-3 ${onProfile ? 'cursor-pointer' : ''}`}
            onClick={onProfile ? () => onProfile(member) : undefined}
            role={onProfile ? 'button' : undefined}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300"
                style={member.avatarColor ? { backgroundColor: member.avatarColor, color: '#fff' } : undefined}
              >
                {name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <span className="truncate">{name}</span>
                  {designation && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${DESIGNATION_BADGE[designation] ?? DESIGNATION_BADGE.captain}`}>
                      {DESIGNATION_LABELS[designation]}
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                  {SPECIALTY_LABELS[member.specialty] ??
                    (member.role === 'admin' ? 'Admin' : 'Member')}
                  {member.role === 'admin' && SPECIALTY_LABELS[member.specialty] ? ' · Admin' : ''}
                </p>
              </div>
            </div>
            {renderActions?.(member)}
          </li>
        )
      })}
    </ul>
  )
}