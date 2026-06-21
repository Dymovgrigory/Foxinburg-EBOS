import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface RoleProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
  fallback?: string
}

export default function RoleProtectedRoute({
  children,
  allowedRoles,
  fallback = '/dashboard',
}: RoleProtectedRouteProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-fox-light">
        <div className="text-fox-purple font-semibold">Загрузка...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={fallback} replace />
  }

  return <>{children}</>
}

export const ROLE_ACCESS: Record<string, string[]> = {
  '/system-center': ['owner', 'super_admin', 'admin', 'manager'],
  '/finance': ['owner', 'super_admin', 'admin', 'manager'],
  '/analytics': ['owner', 'super_admin', 'admin', 'manager'],
  '/crm': ['owner', 'super_admin', 'admin', 'manager'],
  '/employees': ['owner', 'super_admin', 'admin'],
  '/branches': ['owner', 'super_admin', 'admin'],
  '/students': ['owner', 'super_admin', 'admin', 'manager', 'teacher', 'methodist'],
  '/courses': ['owner', 'super_admin', 'admin', 'methodist', 'teacher', 'guest'],
  '/calendar': ['owner', 'super_admin', 'admin', 'manager', 'teacher', 'student'],
  '/homeworks': ['owner', 'super_admin', 'admin', 'methodist', 'teacher', 'student'],
  '/academy': ['owner', 'super_admin', 'admin', 'methodist', 'teacher'],
  '/course-builder': ['owner', 'super_admin', 'admin', 'methodist'],
  '/teacher-dashboard': ['teacher'],
  '/student-dashboard': ['student'],
  '/methodist-dashboard': ['methodist'],
}

export function allowedRolesForPath(path: string): string[] | undefined {
  return ROLE_ACCESS[path]
}
