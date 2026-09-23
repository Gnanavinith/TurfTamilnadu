import axios from 'axios'
import { store, credentialsSet, credentialsCleared } from '../app/store'

const API_URL = import.meta.env.VITE_API_URL ?? '/api'

const http = axios.create({
  baseURL: API_URL,
  timeout: 15_000,
})

http.interceptors.request.use((config) => {
  const token = store.getState().auth.token
  const isAuthEndpoint = /^\/auth\//.test(config.url ?? '')
  if (token && !isAuthEndpoint) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshing = null

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const status = error.response?.status
    const hasToken = Boolean(store.getState().auth.token)

    if (status === 401 && hasToken && original && !original._retry) {
      original._retry = true
      try {
        refreshing = refreshing ?? refreshSession()
        const { data } = await refreshing
        refreshing = null
        store.dispatch(
          credentialsSet({
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
            user: data.data.user ?? store.getState().auth.user,
          }),
        )
        original.headers.Authorization = `Bearer ${data.data.accessToken}`
        return http(original)
      } catch {
        refreshing = null
        store.dispatch(credentialsCleared())
        return Promise.reject(error)
      }
    }

    if (status === 401) {
      store.dispatch(credentialsCleared())
    }
    return Promise.reject(error)
  },
)

function refreshSession() {
  const refreshToken = store.getState().auth.refreshToken
  if (!refreshToken) {
    return Promise.reject(new Error('No refresh token'))
  }
  // Plain axios: bypass this instance's interceptors to avoid retry loops.
  return axios.post(`${API_URL}/auth/refresh`, { refreshToken })
}

export function getErrorMessage(error, fallback = 'Something went wrong') {
  return error?.response?.data?.message ?? error?.message ?? fallback
}

export default http