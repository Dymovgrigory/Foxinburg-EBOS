import { useEffect, useMemo, useState } from 'react'
import { getErrorMessage } from '../utils/error'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { useToast, Card, Badge, Loader, Button } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { schedulesApi, homeworksApi, progressApi, coursesApi, notificationsApi } from '../api'
import type { Schedule, Homework, LessonProgress, Course } from '../types'
import { LuBookOpen, LuNotebookPen, LuCircleCheck, LuBell, LuHouse } from 'react-icons/lu'
import StudentHero from '../components/student/StudentHero'
import StudentStatCard from '../components/student/StudentStatCard'

export default function StudentDashboardPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [homeworks, setHomeworks] = useState<Homework[]>([])
  const [progress, setProgress] = useState<LessonProgress[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [schedulesRes, homeworksRes, progressRes, coursesRes, countRes] = await Promise.all([
        user?.group_id ? schedulesApi.list({ group_id: user.group_id }) : Promise.resolve([]),
        homeworksApi.list().catch(() => []),
        progressApi.list().catch(() => []),
        coursesApi.list().catch(() => []),
        notificationsApi.unreadCount().catch(() => ({ count: 0 })),
      ])
      setSchedules(schedulesRes)
      setHomeworks(homeworksRes)
      setProgress(progressRes)
      setCourses(coursesRes)
      setUnreadCount(countRes.count)
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка загрузки дашборда'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user?.group_id])

  const upcomingLessons = useMemo(() => {
    const now = new Date().toISOString()
    return schedules
      .filter((s) => s.start_time >= now)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .slice(0, 5)
  }, [schedules])

  const pendingHomeworks = useMemo(
    () => homeworks.filter((h) => h.status === 'assigned' || h.status === 'in_progress').slice(0, 5),
    [homeworks]
  )

  const completedLessons = useMemo(
    () => progress.filter((p) => p.status === 'completed').length,
    [progress]
  )

  const totalLessons = useMemo(
    () => courses.reduce((sum, c) => sum + c.modules.reduce((mSum, m) => mSum + m.lessons.length, 0), 0),
    [courses]
  )

  return (
    <div className="student-world min-h-screen">
      <Header title="Главная" icon={<LuHouse />} />

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {loading ? (
          <Loader text="Загрузка дашборда..." />
        ) : (
          <>
            <StudentHero
              name={user?.name}
              completedLessons={completedLessons}
              totalLessons={totalLessons}
              pendingHomeworks={pendingHomeworks.length}
              upcomingLessons={upcomingLessons.length}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StudentStatCard
                icon={<LuBookOpen />}
                value={courses.length}
                label="Доступно курсов"
                color="purple"
                onClick={() => navigate('/my-courses')}
              />
              <StudentStatCard
                icon={<LuNotebookPen />}
                value={homeworks.length}
                label="Домашних заданий"
                color="gold"
                onClick={() => navigate('/homeworks')}
              />
              <StudentStatCard
                icon={<LuCircleCheck />}
                value={completedLessons}
                label="Уроков завершено"
                color="graphite"
                onClick={() => navigate('/progress')}
              />
              <StudentStatCard
                icon={<LuBell />}
                value={unreadCount}
                label="Уведомлений"
                color="outline"
                onClick={() => navigate('/notifications')}
              />
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
                    <p className="text-sm text-fox-gray/70">Нет ближайших занятий</p>
                  ) : (
                    upcomingLessons.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-4 bg-fox-light rounded-xl border border-fox-border/30"
                      >
                        <div>
                          <div className="font-medium text-fox-dark">{s.title}</div>
                          <div className="text-xs text-fox-gray">{s.room || 'Онлайн'}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-fox-purple">
                            {formatTime(s.start_time)}
                          </div>
                          <div className="text-xs text-fox-gray">{formatDate(s.start_time)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-fox-dark">Домашние задания</h3>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/homeworks')}>
                    Все задания →
                  </Button>
                </div>
                <div className="space-y-3">
                  {pendingHomeworks.length === 0 ? (
                    <p className="text-sm text-fox-gray/70">Нет активных заданий</p>
                  ) : (
                    pendingHomeworks.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between p-4 bg-fox-light rounded-xl border border-fox-border/30"
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
              <h3 className="text-lg font-bold text-fox-dark mb-4">Мой прогресс</h3>
              <div className="space-y-4">
                {courses.slice(0, 3).map((course) => {
                  const courseProgress = getCourseProgress(course, progress)
                  return (
                    <div key={course.id}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-fox-graphite">{course.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-fox-dark">{courseProgress}%</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/courses/${course.id}/learn`)}
                          >
                            Учиться →
                          </Button>
                        </div>
                      </div>
                      <div className="h-2 bg-fox-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-fox-purple rounded-full"
                          style={{ width: `${courseProgress}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
                {courses.length === 0 && <p className="text-sm text-fox-gray/70">Курсы пока не назначены</p>}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

function getCourseProgress(course: Course, progress: LessonProgress[]) {
  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0)
  if (totalLessons === 0) return 0
  const completed = progress.filter((p) => p.status === 'completed').length
  return Math.min(100, Math.round((completed / totalLessons) * 100))
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
