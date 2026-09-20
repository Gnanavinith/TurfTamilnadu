import { configureStore, createSlice } from '@reduxjs/toolkit'
import { createSelector } from '@reduxjs/toolkit'

const TOKEN_KEY = 'turf.token'
const REFRESH_KEY = 'turf.refreshToken'
const USER_KEY = 'turf.user'

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null')
  } catch {
    return null
  }
}

const initialState = {
  token: localStorage.getItem(TOKEN_KEY) ?? null,
  refreshToken: localStorage.getItem(REFRESH_KEY) ?? null,
  user: readStoredUser(),
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    credentialsSet(state, action) {
      state.token = action.payload.token ?? action.payload.accessToken ?? state.token
      state.refreshToken = action.payload.refreshToken ?? state.refreshToken
      state.user = action.payload.user ?? state.user
    },
    credentialsCleared(state) {
      state.token = null
      state.refreshToken = null
      state.user = null
    },
  },
})

export const { credentialsSet, credentialsCleared } = authSlice.actions

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
  },
})

store.subscribe(() => {
  const { token, refreshToken, user } = store.getState().auth
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
  if (refreshToken) {
    localStorage.setItem(REFRESH_KEY, refreshToken)
  } else {
    localStorage.removeItem(REFRESH_KEY)
  }
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(USER_KEY)
  }
})

export const selectAuth = (state) => state.auth
export const selectToken = createSelector(selectAuth, (auth) => auth.token)
export const selectRefreshToken = createSelector(selectAuth, (auth) => auth.refreshToken)
export const selectUser = createSelector(selectAuth, (auth) => auth.user)

export default store