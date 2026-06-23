import { useEffect, useMemo, useState } from 'react'
import { getErrorMessage } from '../utils/error'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { useToast, Card, Badge, Loader, Button, PageShell } from '../components/ui'
import StatCard from '../components/ui/StatCard'
import { useAuth } from '../contexts/AuthContext'
import { schedulesApi, homeworksApi, usersApi, notificationsApi } from '../api'
import type { Schedule, Homework, User } from '../types'
import { LuCalendar, LuNotebookPen, LuGraduationCap, LuBell, LuHouse, LuArrowRight } from 'react-icons/lu'
import { roleLabel } from '../config/navigation'

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
        usersApi.listStudents().catch(() => []),
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

  const myHomeworks = useMemo(
    () => homeworks.filter((h) => ['assigned', 'in_progress', 'submitted'].includes(h.status)).slice(0, 5),
    [homeworks]
  )

  const widgets = [
    { title: 'Ближайших занятий', value: upcomingLessons.length, icon: <LuCalendar />, variant: 'purple' as const },
    { title: 'Мои задания', value: myHomeworks.length, icon: <LuNotebookPen />, variant: 'gold' as const },
    { title: 'Учеников', value: students.length, icon: <LuGraduationCap />, variant: 'graphite' as const },
    { title: 'Уведомлений', value: unreadCount, icon: <LuBell />, variant: 'outline' as const },
  ]

  return (
    <PageShell>
      <Header title="Главная" icon={<LuHouse />} />

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {loading ? (
          <Loader text="Загрузка дашборда..." />
        ) : (
          <>
            <div className="relative overflow-hidden rounded-card p-6 md:p-8 border border-fox-border/60 bg-white shadow-fox-lg">
              <img
                src="/brand/mascot-hero.png"
                alt=""
                className="absolute -right-6 -bottom-10 w-40 h-56 object-contain opacity-15 pointer-events-none select-none"
              />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fox-gold/20 text-fox-purple text-xs font-semibold mb-3">
                  {roleLabel(user?.role)}
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-fox-purple mb-2">
                  Добро пожаловать, {user?.name}!
                </h2>
                <p className="text-fox-gray max-w-xl">
                  У вас <span className="text-fox-purple font-semibold">{myHomeworks.length}</span> активных домашних заданий
                  и <span className="text-fox-purple font-semibold">{upcomingLessons.length}</span> ближайших занятий.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {widgets.map((w) => (
                <StatCard
                  key={w.title}
                  title={w.title}
                  value={w.value}
                  icon={w.icon}
                  variant={w.variant}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card accent="purple">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-fox-dark">Ближайшие занятия</h3>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/calendar')} rightIcon={<LuArrowRight size={14} />}>
                    Календарь
                  </Button>
                </div>
                <div className="space-y-3">
                  {upcomingLessons.length === 0 ? (
                    <p className="text-sm text-fox-gray/70">Нет ближайших занятий</p>
                  ) : (
                    upcomingLessons.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-4 bg-fox-light rounded-xl border border-fox-border/40 hover:border-fox-gold/50 transition"
                      >
                        <div>
                          <div className="font-medium text-fox-dark">{s.title}</div>
                          <div className="text-xs text-fox-gray">{s.room || 'Онлайн'}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-fox-purple">{formatTime(s.start_time)}</div>
                          <div className="text-xs text-fox-gray">{formatDate(s.start_time)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card accent="gold">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-fox-dark">Мои домашние задания</h3>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/homeworks')} rightIcon={<LuArrowRight size={14} />}>
                    Все задания
                  </Button>
                </div>
                <div className="space-y-3">
                  {myHomeworks.length === 0 ? (
                    <p className="text-sm text-fox-gray/70">Нет активных заданий</p>
                  ) : (
                    myHomeworks.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between p-4 bg-fox-light rounded-xl border border-fox-border/40 hover:border-fox-gold/50 transition"
                      >
                        <div>
                          <div className="font-medium text-fox-dark">{h.title || `Задание #${h.id}`}</div>
                          <div className="text-xs text-fox-gray">{formatDate(h.created_at)}</div>
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
                <Button onClick={() => navigate('/homeworks')}>Мои ДЗ</Button>
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
    </PageShell>
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}
