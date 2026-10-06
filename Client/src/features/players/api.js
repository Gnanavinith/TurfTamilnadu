import http from '../../lib/axios'

/**
 * Player directory. Backed by the signed-in `/users/players` search, which
 * returns profile fields only.
 */
export function fetchPlayers(params) {
  return http.get('/users/players', { params }).then((res) => res.data)
}