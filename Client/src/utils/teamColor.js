const PALETTE = [
  '#ff6a1a',
  '#2f6bff',
  '#7c5cff',
  '#0ea5a4',
  '#e11d48',
  '#16a34a',
  '#a855f7',
  '#f59e0b',
  '#ef4444',
  '#3b82f6',
]

export function hashString(value = '') {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function teamColor(team) {
  const key = team?.id ?? team?.name ?? team?.shortName ?? ''
  return PALETTE[hashString(String(key)) % PALETTE.length]
}

export function teamCode(team) {
  if (team?.shortName) return team.shortName.slice(0, 3).toUpperCase()
  const name = team?.name ?? ''
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase() || '??'
}
