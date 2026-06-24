import { useEffect, useState } from 'react'
import { getErrorMessage } from '../utils/error'
import { useToast, Loader, PageShell } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { dashboardApi } from '../api'
import AdminDashboard from '../components/dashboard/AdminDashboard'
import ManagerDashboard from '../components/dashboard/ManagerDashboard'
import ParentDashboard from '../components/dashboard/ParentDashboard'
import TeacherDashboardPage from './TeacherDashboardPage'
import StudentDashboardPage from './StudentDashboardPage'
import MethodistDashboardPage from './MethodistDashboardPage'

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { showToast } = useToast()
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading || !user) return

    const fetchSummary = async () => {
      setLoading(true)
      try {
        const data = await dashboardApi.summary()
        setSummary(data)
      } catch (err: unknown) {
        showToast(getErrorMessage(err, 'Ошибка загрузки дашборда'), 'error')
      } finally {
        setLoading(false)
      }
    }

    fetchSummary()
  }, [user, authLoading, showToast])

  if (authLoading || loading) {
    return (
      <PageShell>
        <div className="p-4 md:p-6">
          <Loader text="Загрузка дашборда..." />
        </div>
      </PageShell>
    )
  }

  const role = user?.role

  if (role === 'teacher') {
    return <TeacherDashboardPage />
  }

  if (role === 'student') {
    return <StudentDashboardPage />
  }

  if (role === 'methodist') {
    return <MethodistDashboardPage />
  }

  if (role === 'manager') {
    return <ManagerDashboard data={summary || {}} />
  }

  if (role === 'parent' || role === 'guest') {
    return <ParentDashboard />
  }

  // owner, super_admin, admin
  return <AdminDashboard data={summary || {}} />
}
