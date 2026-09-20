import { PLAYER_ROLES } from '../../../utils/constants'

const ROLE_LABELS = {
  [PLAYER_ROLES.BATTER]: 'Batter',
  [PLAYER_ROLES.BOWLER]: 'Bowler',
  [PLAYER_ROLES.ALL_ROUNDER]: 'All-rounder',
  [PLAYER_ROLES.WICKET_KEEPER]: 'Wicket-keeper',
}

export default function MemberList({ members = [], onRemove }) {
  if (members.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
        No members yet. Invite someone to join the squad.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {members.map((member) => (
        <li
          key={member.id ?? member.userId}
          className="flex items-center justify-between gap-3 py-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {(member.name ?? member.email ?? '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium">
                {member.name ?? member.email ?? 'Unknown'}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {ROLE_LABELS[member.role] ?? member.role ?? 'Member'}
              </p>
            </div>
          </div>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(member)}
              className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
            >
              Remove
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}