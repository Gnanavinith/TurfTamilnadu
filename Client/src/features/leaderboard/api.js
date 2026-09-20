import http from '../../lib/axios'

export function fetchLeaderboard() {
  return http.get('/leaderboard').then((res) => res.data)
}