import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoading || !user) return
    if (['owner', 'super_admin', 'admin'].includes(user.role)) {
      navigate('/system-center', { replace: true })
    } else if (user.role === 'teacher') {
      navigate('/teacher-dashboard', { replace: true })
    } else if (user.role === 'student') {
      navigate('/student-dashboard', { replace: true })
    } else if (user.role === 'methodist') {
      navigate('/methodist-dashboard', { replace: true })
    } else {
      navigate('/system-center', { replace: true })
    }
  }, [user, isLoading, navigate])

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--fox-light)' }}
    >
      <div className="font-semibold" style={{ color: 'var(--fox-error)' }}>
        Загрузка...
      </div>
    </div>
  )
}
