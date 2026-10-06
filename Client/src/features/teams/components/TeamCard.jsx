import { Link } from 'react-router-dom'
import { formatDate } from '../../../utils/formatDate'
import { teamColor } from '../../../utils/teamColor'

const padNumber = (value) => String(value).padStart(2, '0')

function Record({ label, value, highlight = false }) {
  return (
    <div className={`g-tcard-stat${highlight ? ' is-highlight' : ''}`}>
      <small>{label}</small>
      <strong className="num">{value}</strong>
    </div>
  )
}

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
  const roleLabel = team.role ? (isAdmin ? 'Admin' : 'Player') : null

  const summary = team.teamSummary
  const squad = Array.isArray(team.squad) ? team.squad : []

  return (
    <Link to={`/teams/${team.id}`} className="g-match" style={{ '--i': index }}>
      <div className="g-match-team">
        <span className="g-tb" style={{ '--c': teamColor(team) }} aria-hidden="true">
          {initial}
        </span>
        <div className="g-info">
          <b>{team.name}</b>
          <span>
            {members} {members === 1 ? 'member' : 'members'}
            {roleLabel ? ` · ${roleLabel}` : ''}
          </span>
        </div>
        {team.shortName && team.shortName !== team.name && (
          <span className="g-pill">{team.shortName}</span>
        )}
      </div>

      {summary && (
        <>
          <div className="g-tcard-record">
            <Record label="Played" value={summary.played} />
            <Record label="Wins" value={summary.won} />
            <Record label="Losses" value={summary.lost} />
            <Record label="Win %" value={`${summary.winPct}%`} highlight={summary.winPct > 0} />
          </div>

          <div className="g-tcard-lines">
            <span>
              Total runs scored <b className="num">{summary.runsScored}</b>
            </span>
            <span>
              Wickets taken <b className="num">{summary.wicketsTaken}</b>
            </span>
          </div>
        </>
      )}

      {squad.length > 0 && (
        <div className="g-tcard-squad">
          {squad.map((player, i) => (
            <span key={`${player.jerseyNumber ?? 'x'}-${player.name ?? i}`} className="g-squad-chip">
              {player.jerseyNumber ? `#${padNumber(player.jerseyNumber)}` : '#—'}
              <b>{player.name ?? 'Player'}</b>
            </span>
          ))}
        </div>
      )}

      <div className="g-match-foot">
        <span>
          {adminName ? `Led by ${adminName}` : team.role ? 'No admin yet' : 'Open squad'}
        </span>
        <span>Created {formatDate(team.createdAt)}</span>
      </div>
    </Link>
  )
}
