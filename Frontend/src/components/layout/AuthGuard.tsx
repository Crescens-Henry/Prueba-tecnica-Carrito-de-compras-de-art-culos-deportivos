import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppSelector } from '../../store/hooks'

export default function AuthGuard() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const token = useAppSelector((s: any) => s.auth.token)
  const location = useLocation()
  // Sincronizar el token de Redux a localStorage si falta (p.ej., después de limpiar storage)
  try {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (token && !stored) {
      localStorage.setItem('auth_token', token)
    }
  } catch { /* ignore */ }
  if (!token) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
