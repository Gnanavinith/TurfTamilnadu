import { useDispatch, useSelector } from 'react-redux'
import { credentialsSet, credentialsCleared, selectAuth } from '../../../app/store'

export function useAuth() {
  const dispatch = useDispatch()
  const auth = useSelector(selectAuth)

  const login = (user, token, refreshToken) =>
    dispatch(credentialsSet({ user, token, refreshToken }))

  const refresh = (accessToken, refreshToken) =>
    dispatch(credentialsSet({ accessToken, refreshToken }))

  const logout = () => dispatch(credentialsCleared())

  return {
    ...auth,
    isAuthenticated: Boolean(auth.token),
    login,
    refresh,
    logout,
  }
}

export default useAuth