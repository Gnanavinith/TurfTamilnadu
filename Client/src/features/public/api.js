import http from '../../lib/axios'

export function fetchPublicMatches(params) {
  return http.get('/public/matches', { params }).then((res) => res.data)
}

export function fetchPublicMatch(matchId) {
  return http.get(`/public/matches/${matchId}`).then((res) => res.data)
}

export function fetchPublicLeaderboard() {
  return http.get('/public/leaderboard').then((res) => res.data)
}

export function fetchPublicTeams() {
  return http.get('/public/teams').then((res) => res.data)
}

export function fetchPublicTeam(teamId) {
  return http.get(`/public/teams/${teamId}`).then((res) => res.data)
}
