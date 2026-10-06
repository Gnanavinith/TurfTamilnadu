import { Navigate, Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectToken } from '../app/store'

export default function ProtectedRoute({ children }) {
  const token = useSelector(selectToken)

  if (!token) {
    return <Navigate to="/" replace state={{ auth: true, mode: 'signin' }} />
  }

  return children ?? <Outlet />
}
