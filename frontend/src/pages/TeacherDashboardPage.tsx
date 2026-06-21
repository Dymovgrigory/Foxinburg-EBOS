import { useEffect, useMemo, useState } from 'react'
import { getErrorMessage } from '../utils/error'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { useToast, Card, Badge, Loader, Button } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { schedulesApi, homeworksApi, usersApi, notificationsApi } from '../api'
import type { Schedule, Homework, User } from '../types'

export default function TeacherDashboardPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [homeworks, setHomeworks] = useState<Homework[]>([])
  const [students, setStudents] = useState<User[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [schedulesRes, homeworksRes, usersRes, countRes] = await Promise.all([
        user?.id ? schedulesApi.list({ teacher_id: user.id }) : Promise.resolve([]),
        homeworksApi.list().catch(() => []),
        usersApi.list().catch(() => []),
        notificationsApi.unreadCount().catch(() => ({ count: 0 })),
      ])
      setSchedules(schedulesRes)
      setHomeworks(homeworksRes)
      setStudents(usersRes.filter((u) => u.role === 'student'))
      setUnreadCount(countRes.count)
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка загрузки дашборда'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user?.id])

  const upcomingLessons = useMemo(() => {
    const now = new Date().toISOString()
    return schedules
      .filter((s) => s.start_time >= now)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .slice(0, 5)
  }, [schedules])

  const pendingHomeworks = useMemo(
    () => homeworks.filter((h) => h.status === 'submitted' || h.status === 'in_progress').slice(0, 5),
    [homeworks]
  )

  const widgets = [
    { title: 'Ближайших занятий', value: upcomingLessons.length, icon: '📅', color: 'bg-blue-500' },
    { title: 'ДЗ на проверку', value: pendingHomeworks.length, icon: '📝', color: 'bg-amber-500' },
    { title: 'Учеников', value: students.length, icon: '🎓', color: 'bg-green-500' },
    { title: 'Уведомлений', value: unreadCount, icon: '🔔', color: 'bg-red-500' },
  ]

  return (
    <div className="min-h-screen bg-fox-light">
      <Header title="Главная" icon="🏠" />

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {loading ? (
          <Loader text="Загрузка дашборда..." />
        ) : (
          <>
            <div className="bg-gradient-to-r from-fox-purple to-fox-purple-light rounded-card p-8 text-white shadow-fox">
              <h2 className="text-2xl font-bold mb-2">Добро пожаловать, {user?.name}!</h2>
              <p className="opacity-90">
                Ваша роль: <span className="text-fox-gold font-semibold">{roleLabel(user?.role)}</span>.
                У вас {pendingHomeworks.length} домашних заданий на проверку и {upcomingLessons.length} ближайших занятий.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {widgets.map((w) => (
                <Card key={w.title} className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl text-white ${w.color}`}>
                    {w.icon}
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-fox-dark">{w.value}</div>
                    <div className="text-xs text-gray-500">{w.title}</div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-fox-dark">Ближайшие занятия</h3>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/calendar')}>
                    Календарь →
                  </Button>
                </div>
                <div className="space-y-3">
                  {upcomingLessons.length === 0 ? (
                    <p className="text-sm text-gray-400">Нет ближайших занятий</p>
                  ) : (
                    upcomingLessons.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-4 bg-fox-light rounded-xl border border-fox-border/30"
                      >
                        <div>
                          <div className="font-medium text-fox-dark">{s.title}</div>
                          <div className="text-xs text-gray-500">{s.room || 'Онлайн'}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-fox-purple">{formatTime(s.start_time)}</div>
                          <div className="text-xs text-gray-500">{formatDate(s.start_time)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-fox-dark">Проверка ДЗ</h3>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/homeworks')}>
                    Все задания →
                  </Button>
                </div>
                <div className="space-y-3">
                  {pendingHomeworks.length === 0 ? (
                    <p className="text-sm text-gray-400">Нет заданий на проверку</p>
                  ) : (
                    pendingHomeworks.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between p-4 bg-fox-light rounded-xl border border-fox-border/30"
                      >
                        <div>
                          <div className="font-medium text-fox-dark">{h.title || `Задание #${h.id}`}</div>
                          <div className="text-xs text-gray-500">{formatDate(h.created_at)}</div>
                        </div>
                        <Badge variant={homeworkStatusVariant(h.status)} size="sm">
                          {homeworkStatusLabel(h.status)}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-fox-dark">Быстрые действия</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => navigate('/homeworks')}>Проверить ДЗ</Button>
                <Button variant="secondary" onClick={() => navigate('/calendar')}>
                  Расписание
                </Button>
                <Button variant="ghost" onClick={() => navigate('/academy')}>
                  Академия педагогов
                </Button>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

function homeworkStatusVariant(status: string): Parameters<typeof Badge>[0]['variant'] {
  const map: Record<string, Parameters<typeof Badge>[0]['variant']> = {
    assigned: 'default',
    in_progress: 'warning',
    submitted: 'info',
    reviewed: 'success',
    rejected: 'error',
  }
  return map[status] || 'default'
}

function homeworkStatusLabel(status: string) {
  const map: Record<string, string> = {
    assigned: 'Назначено',
    in_progress: 'В работе',
    submitted: 'На проверке',
    reviewed: 'Проверено',
    rejected: 'На доработке',
  }
  return map[status] || status
}

function roleLabel(role?: string) {
  const labels: Record<string, string> = {
    owner: 'Владелец',
    super_admin: 'Супер-админ',
    admin: 'Администратор',
    methodist: 'Методист',
    teacher: 'Педагог',
    manager: 'Менеджер',
    student: 'Ученик',
    parent: 'Родитель',
    guest: 'Гость',
  }
  return labels[role || ''] || role
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}
