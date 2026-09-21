import { Link } from 'react-router-dom'
import { formatDate } from '../../../utils/formatDate'
import { teamColor } from '../../../utils/teamColor'

export default function TeamCard({ team, index = 0 }) {
  const members =
    typeof team.members === 'number'
      ? team.members
      : Array.isArray(team.members)
        ? team.members.length
        : 0
  const isAdmin = team.role === 'admin'
  const initial = (team.shortName ?? team.name ?? 'T').charAt(0).toUpperCase()
  const adminName = Array.isArray(team.admins) ? team.admins[0]?.name : null

  return (
    <Link to={`/teams/${team.id}`} className="g-match" style={{ '--i': index }}>
      <div className="g-match-team">
        <span className="g-tb" style={{ '--c': teamColor(team) }} aria-hidden="true">
          {initial}
        </span>
        <div className="g-info">
          <b>{team.name}</b>
          <span>
            {members} {members === 1 ? 'member' : 'members'} · {isAdmin ? 'Admin' : 'Player'}
          </span>
        </div>
        {team.shortName && team.shortName !== team.name && (
          <span className="g-pill">{team.shortName}</span>
        )}
      </div>

      <div className="g-match-foot">
        <span>{adminName ? `Led by ${adminName}` : 'No admin yet'}</span>
        <span>Created {formatDate(team.createdAt)}</span>
      </div>
    </Link>
  )
}
