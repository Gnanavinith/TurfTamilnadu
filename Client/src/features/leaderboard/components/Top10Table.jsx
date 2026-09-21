import { teamColor, teamCode } from '../../../utils/teamColor'

function Podium({ entry, place, delay }) {
  const team = entry.team ?? {}
  return (
    <div className={`g-pod g-p${place}`}>
      <span className="g-tb" style={{ '--c': teamColor(team), '--d': delay }} aria-hidden="true">
        {teamCode(team)}
      </span>
      <b>{team.name ?? 'Unknown'}</b>
      <div className="g-stand" style={{ '--d': delay }}>
        {place}
      </div>
      <small>{entry.points ?? 0} pts</small>
    </div>
  )
}

function Row({ entry, rank, index }) {
  const team = entry.team ?? {}
  const record = `${entry.matchesWon ?? 0}W, ${entry.matchesLost ?? 0}L`
  const rating = entry.rating != null ? `, ${entry.rating}%` : ''
  return (
    <div className="g-lrow" style={{ '--i': index }}>
      <span className="g-rk">{rank}</span>
      <span className="g-tb g-tb-sm" style={{ '--c': teamColor(team) }} aria-hidden="true">
        {teamCode(team)}
      </span>
      <div className="g-nm">
        {team.name ?? 'Unknown'}
        <small>
          {record}
          {rating}
        </small>
      </div>
      <div className="g-pts">
        {entry.points ?? 0}
        <small>pts</small>
      </div>
    </div>
  )
}

export default function Top10Table({ entries = [] }) {
  if (entries.length === 0) {
    return (
      <div className="g-empty">
        <p>No standings yet.</p>
        <small>Play a match to build the standings.</small>
      </div>
    )
  }

  if (entries.length < 3) {
    return (
      <div>
        {entries.map((entry, index) => (
          <Row
            key={entry.team?._id ?? entry.teamId ?? index}
            entry={entry}
            rank={index + 1}
            index={index}
          />
        ))}
      </div>
    )
  }

  const [first, second, third, ...rest] = entries

  return (
    <div>
      <div className="g-podium">
        <Podium entry={second} place={2} delay="0.15s" />
        <Podium entry={first} place={1} delay="0s" />
        <Podium entry={third} place={3} delay="0.3s" />
      </div>

      <div style={{ marginTop: 8 }}>
        {rest.map((entry, index) => (
          <Row
            key={entry.team?._id ?? entry.teamId ?? index}
            entry={entry}
            rank={index + 4}
            index={index}
          />
        ))}
      </div>
    </div>
  )
}
