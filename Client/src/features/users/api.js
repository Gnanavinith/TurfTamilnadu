import http from '../../lib/axios'

export function fetchUsers(params) {
  return http.get('/users', { params }).then((res) => res.data)
}

export function updateUserRole(userId, role) {
  return http.patch(`/users/${userId}/role`, { role })
}

export function createUser(payload) {
  return http.post('/users', payload).then((res) => res.data)
}

export function updateUser(userId, payload) {
  return http.patch(`/users/${userId}`, payload).then((res) => res.data)
}