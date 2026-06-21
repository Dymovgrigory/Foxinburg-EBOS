import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Card, Button, Loader } from '../components/ui'

interface DashboardStats {
  courses_count: number
  groups_count: number
  students_count: number
  pending_homeworks_count: number
}

const widgets = [
  { key: 'courses_count', label: 'Курсы', icon: '📚', path: '/courses', color: 'bg-fox-purple/10 text-fox-purple' },
  { key: 'groups_count', label: 'Группы', icon: '👥', path: '/employee-groups', color: 'bg-fox-gold/20 text-fox-dark' },
  { key: 'students_count', label: 'Ученики', icon: '🎓', path: '/students', color: 'bg-green-100 text-green-700' },
  { key: 'pending_homeworks_count', label: 'ДЗ на проверку', icon: '📝', path: '/homeworks', color: 'bg-orange-100 text-orange-700' },
]

export default function MethodistDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/methodists/dashboard')
      .then((res) => setStats(res.data.data))
      .catch(() => setStats({ courses_count: 0, groups_count: 0, students_count: 0, pending_homeworks_count: 0 }))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-fox-light">
        <Header title="Дашборд методиста" subtitle="Обзор учебного процесса" icon="📊" />
        <div className="p-6 max-w-6xl mx-auto">
          <Loader text="Загрузка статистики..." />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-fox-light">
      <Header
        title="Дашборд методиста"
        subtitle={`Добро пожаловать, ${user?.name || user?.email || 'методист'}!`}
        icon="📊"
      />

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {widgets.map((widget) => (
            <Card key={widget.key} className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${widget.color}`}>
                {widget.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-fox-dark">
                  {stats?.[widget.key as keyof DashboardStats] ?? 0}
                </p>
                <p className="text-xs text-gray-500">{widget.label}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="space-y-3">
            <h3 className="font-bold text-fox-dark">Быстрые действия</h3>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => navigate('/courses')}>Курсы</Button>
              <Button variant="secondary" onClick={() => navigate('/academy')}>
                Академия
              </Button>
              <Button variant="secondary" onClick={() => navigate('/homeworks')}>
                Проверка ДЗ
              </Button>
              <Button variant="secondary" onClick={() => navigate('/employee-groups')}>
                Группы
              </Button>
              <Button variant="secondary" onClick={() => navigate('/students')}>
                Ученики
              </Button>
            </div>
          </Card>

          <Card className="space-y-3">
            <h3 className="font-bold text-fox-dark">Академия педагогов</h3>
            <p className="text-sm text-gray-500">
              Обучение и сертификация преподавателей. Синхронизируйте материалы с Яндекс.Диска.
            </p>
            <Button onClick={() => navigate('/academy')}>Открыть Академию</Button>
          </Card>

          <Card className="space-y-3">
            <h3 className="font-bold text-fox-dark">Проверка домашних заданий</h3>
            <p className="text-sm text-gray-500">
              {stats?.pending_homeworks_count
                ? `${stats.pending_homeworks_count} заданий ожидают проверки`
                : 'Нет заданий на проверке'}
            </p>
            <Button variant="secondary" onClick={() => navigate('/homeworks')}>
              Перейти к ДЗ
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
