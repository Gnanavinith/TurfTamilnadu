import http from '../../lib/axios'

export function fetchUsers() {
  return http.get('/users').then((res) => res.data)
}

export function updateUserRole(userId, role) {
  return http.patch(`/users/${userId}/role`, { role })
}