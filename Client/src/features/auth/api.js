import http from '../../lib/axios'

export function signIn({ email, password }) {
  return http.post('/auth/login', { email, password })
}

export function signUp({ name, email, password }) {
  return http.post('/auth/register', { name, email, password })
}

export function refreshSession(refreshToken) {
  return http.post('/auth/refresh', { refreshToken })
}

export function fetchMe() {
  return http.get('/users/me')
}