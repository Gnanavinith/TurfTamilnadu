import { Navigate, Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectUser, selectToken } from '../app/store'

export default function RoleRoute({ roles, children }) {
  const token = useSelector(selectToken)
  const user = useSelector(selectUser)

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return children ?? <Outlet />
}