import http from '../../lib/axios'

export function createMatch(payload) {
  return http.post('/matches', payload)
}

export function fetchMatches(params) {
  return http.get('/matches', { params }).then((res) => res.data)
}

export function fetchMatch(matchId) {
  return http.get(`/matches/${matchId}`).then((res) => res.data)
}

export function startMatch(matchId, payload) {
  return http.post(`/matches/${matchId}/start`, payload)
}

export function updateMatch(matchId, payload) {
  return http.patch(`/matches/${matchId}`, payload)
}