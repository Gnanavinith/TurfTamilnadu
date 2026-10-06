import http from '../../lib/axios'

export function createTeam(payload) {
  return http.post('/teams', payload)
}

/** Player directory for picking squad members (profile fields only). */
export function searchPlayers(params) {
  return http.get('/users/players', { params }).then((res) => res.data)
}

export function fetchMyTeams() {
  return http.get('/teams').then((res) => res.data)
}

export function fetchTeam(teamId) {
  return http.get(`/teams/${teamId}`).then((res) => res.data)
}

export function updateTeam(teamId, payload) {
  return http.patch(`/teams/${teamId}`, payload)
}

export function inviteMember(teamId, payload) {
  return http.post(`/teams/${teamId}/invites`, payload)
}

export function getInvite(token) {
  return http.get(`/teams/invites/${token}`).then((res) => res.data)
}

export function acceptInvite(token) {
  return http.post('/teams/invites/accept', { token }).then((res) => res.data)
}

export function removeMember(teamId, memberId) {
  return http.delete(`/teams/${teamId}/members/${memberId}`)
}

export function updateMember(teamId, memberId, payload) {
  return http.patch(`/teams/${teamId}/members/${memberId}`, payload).then((res) => res.data)
}