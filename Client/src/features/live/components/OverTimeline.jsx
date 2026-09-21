function ballDisplay(ball) {
  const { runs, kind, wicket } = ball ?? {}
  const isWicket = Boolean(wicket)
  const isExtra = kind === 'wide' || kind === 'no_ball'

  if (isWicket) return { label: 'W', cls: 'g-ball g-w', title: wicket }
  if (isExtra) {
    return {
      label: kind === 'wide' ? 'Wd' : 'Nb',
      cls: 'g-ball g-x',
      title: kind,
    }
  }
  if (runs === 4) return { label: '4', cls: 'g-ball g-four', title: '4 runs' }
  if (runs === 6) return { label: '6', cls: 'g-ball g-six', title: '6 runs' }
  return { label: String(runs ?? 0), cls: 'g-ball', title: `${runs ?? 0} runs` }
}

function Over({ over, index }) {
  const balls = Array.isArray(over) ? over : []
  return (
    <div className="g-over-row">
      <span className="g-rk">O{index + 1}</span>
      <div className="g-chips">
        {balls.length === 0 ? (
          <span className="g-empty-note">No balls</span>
        ) : (
          balls.map((ball, ballIndex) => {
            const { label, cls, title } = ballDisplay(ball)
            return (
              <span key={ballIndex} className={cls} title={title}>
                {label}
              </span>
            )
          })
        )}
      </div>
    </div>
  )
}

export default function OverTimeline({ overs = [] }) {
  if (overs.length === 0) {
    return <p className="g-empty-note">No balls bowled yet.</p>
  }

  return (
    <div>
      {overs.map((over, index) => (
        <Over key={index} over={over} index={index} />
      ))}
    </div>
  )
}
