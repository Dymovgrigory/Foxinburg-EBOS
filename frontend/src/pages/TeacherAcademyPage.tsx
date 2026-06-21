import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import AcademyContentViewer from '../components/AcademyContentViewer'
import { useToast, Button, Card, Badge, Loader, EmptyState } from '../components/ui'

interface LessonContent {
  id: number
  content_type: string
  title?: string
  file_url?: string
  external_url?: string
}

interface Lesson {
  id: number
  title: string
  contents: LessonContent[]
}

interface Module {
  id: number
  title: string
  order_index: number
  lessons: Lesson[]
}

interface Course {
  id: number
  title: string
  description?: string
  modules: Module[]
  last_sync_at?: string
}

interface ProgressModule {
  id: number
  title: string
  order_index: number
  status: string
  lesson_id?: number
}

interface Progress {
  enrollment_id: number
  status: string
  progress_percent: number
  modules: ProgressModule[]
}

const statusMeta: Record<string, { label: string; variant: Parameters<typeof Badge>[0]['variant']; icon: string }> = {
  completed: { label: 'Завершён', variant: 'success', icon: '✅' },
  available: { label: 'Доступен', variant: 'info', icon: '🔓' },
  in_progress: { label: 'В процессе', variant: 'warning', icon: '📖' },
  locked: { label: 'Заблокирован', variant: 'default', icon: '🔒' },
}

export default function TeacherAcademyPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const isMethodist = ['methodist', 'admin', 'owner', 'super_admin'].includes(user?.role || '')

  const [course, setCourse] = useState<Course | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [activeModuleId, setActiveModuleId] = useState<number | null>(null)
  const [activeLessonId, setActiveLessonId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [completing, setCompleting] = useState<number | null>(null)

  const activeModule = useMemo(
    () => course?.modules.find((m) => m.id === activeModuleId),
    [course, activeModuleId]
  )

  const activeLesson = useMemo(
    () => activeModule?.lessons.find((l) => l.id === activeLessonId),
    [activeModule, activeLessonId]
  )

  const fetchCourse = async () => {
    try {
      const res = await api.get('/teacher-academy/course')
      setCourse(res.data.data)
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Не удалось загрузить курс', 'error')
    }
  }

  const fetchProgress = async () => {
    try {
      const res = await api.get('/teacher-academy/progress')
      setProgress(res.data.data)
    } catch (err: any) {
      if (err.response?.status !== 404) {
        showToast(err.response?.data?.message || 'Не удалось загрузить прогресс', 'error')
      }
    }
  }

  const loadAll = async () => {
    setLoading(true)
    await Promise.all([fetchCourse(), fetchProgress()])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    if (!course) return
    if (activeModuleId && course.modules.some((m) => m.id === activeModuleId)) return

    if (progress) {
      const firstOpen = progress.modules.find((m) => m.status !== 'locked')
      if (firstOpen) {
        setActiveModuleId(firstOpen.id)
        return
      }
    }
    if (isMethodist) {
      setActiveModuleId(course.modules[0]?.id || null)
    }
  }, [course, progress, activeModuleId, isMethodist])

  useEffect(() => {
    if (!activeModule) {
      setActiveLessonId(null)
      return
    }
    if (activeLessonId && activeModule.lessons.some((l) => l.id === activeLessonId)) return
    setActiveLessonId(activeModule.lessons[0]?.id || null)
  }, [activeModule, activeLessonId])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await api.post('/teacher-academy/sync')
      setCourse(res.data.data)
      showToast(res.data.message, 'success')
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка синхронизации', 'error')
    } finally {
      setSyncing(false)
    }
  }

  const handleComplete = async (moduleId: number) => {
    setCompleting(moduleId)
    try {
      const res = await api.post(`/teacher-academy/modules/${moduleId}/complete`)
      showToast(res.data.message, 'success')
      await fetchProgress()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка завершения модуля', 'error')
    } finally {
      setCompleting(null)
    }
  }

  const moduleStatus = (moduleId: number) => {
    if (!progress) return isMethodist ? 'available' : 'locked'
    const pm = progress.modules.find((m) => m.id === moduleId)
    return pm?.status || 'locked'
  }

  const canOpenModule = (moduleId: number) => isMethodist || moduleStatus(moduleId) !== 'locked'

  const completedCount = useMemo(
    () => progress?.modules.filter((m) => m.status === 'completed').length || 0,
    [progress]
  )
  const totalCount = course?.modules.length || 0

  if (loading) {
    return (
      <div className="min-h-screen bg-fox-light">
        <Header title="Академия педагогов" subtitle="Обучение и сертификация преподавателей" icon="🎓" />
        <div className="p-6 max-w-6xl mx-auto">
          <Loader text="Загрузка курса..." />
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-fox-light">
        <Header title="Академия педагогов" subtitle="Обучение и сертификация преподавателей" icon="🎓" />
        <div className="p-6 max-w-6xl mx-auto">
          <EmptyState
            icon="🎓"
            title="Курс не найден"
            description="Материалы Академии педагогов ещё не импортированы."
            actionLabel={isMethodist ? 'Синхронизировать' : undefined}
            onAction={isMethodist ? handleSync : undefined}
          />
        </div>
      </div>
    )
  }

  const notEnrolled = !progress && !isMethodist

  return (
    <div className="min-h-screen bg-fox-light">
      <Header title="Академия педагогов" subtitle="Обучение и сертификация преподавателей" icon="🎓" />

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {/* Hero card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-fox-purple to-fox-purple-light text-white p-6 md:p-8 shadow-lg">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">{course.title}</h2>
              <p className="text-white/80 mt-1 max-w-2xl">
                {course.description || 'Курс повышения квалификации преподавателей FOXINBURG'}
              </p>
              {course.last_sync_at && (
                <p className="text-xs text-white/60 mt-3">
                  Последняя синхронизация: {new Date(course.last_sync_at).toLocaleString('ru-RU')}
                </p>
              )}
            </div>
            {isMethodist && (
              <Button
                onClick={handleSync}
                loading={syncing}
                variant="secondary"
                className="self-start md:self-center border-white/30 text-white hover:bg-white/10"
              >
                ↻ Синхронизировать
              </Button>
            )}
          </div>
          <div className="absolute -right-10 -bottom-16 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
        </div>

        {progress && (
          <Card className="flex items-center gap-5">
            <div className="relative w-14 h-14 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path className="text-gray-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                <path
                  className="text-fox-gold"
                  strokeDasharray={`${progress.progress_percent}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-fox-dark">{progress.progress_percent}%</span>
            </div>
            <div>
              <p className="text-sm font-medium text-fox-dark">Общий прогресс</p>
              <p className="text-xs text-gray-400">{completedCount} из {totalCount} модулей завершено</p>
            </div>
          </Card>
        )}

        {notEnrolled ? (
          <EmptyState
            icon="🔒"
            title="Вы не зачислены на курс"
            description="Обратитесь к методисту, чтобы получить доступ к материалам Академии педагогов."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Sidebar modules */}
            <Card padding="none" className="lg:sticky lg:top-6 overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-bold text-fox-dark">Модули курса</h3>
                <p className="text-xs text-gray-400 mt-0.5">Открываются по порядку</p>
              </div>
              <div className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
                {course.modules.map((module, idx) => {
                  const status = moduleStatus(module.id)
                  const meta = statusMeta[status] || statusMeta.locked
                  const isActive = activeModuleId === module.id
                  const disabled = !canOpenModule(module.id)

                  return (
                    <button
                      key={module.id}
                      onClick={() => {
                        if (!disabled) setActiveModuleId(module.id)
                      }}
                      disabled={disabled}
                      className={[
                        'w-full text-left p-4 transition flex items-center gap-3',
                        isActive ? 'bg-fox-purple/5' : 'hover:bg-gray-50',
                        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
                      ].join(' ')}
                    >
                      <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium truncate ${isActive ? 'text-fox-purple' : 'text-fox-dark'}`}>
                          {module.title}
                        </p>
                        <Badge variant={meta.variant} className="mt-1">
                          {meta.icon} {meta.label}
                        </Badge>
                      </div>
                    </button>
                  )
                })}
              </div>
            </Card>

            {/* Content */}
            <div className="lg:col-span-2 space-y-6">
              {activeModule ? (
                <Card>
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                    <div>
                      <span className="inline-block px-2.5 py-0.5 mb-2 text-[10px] font-semibold uppercase tracking-wide text-fox-purple bg-fox-purple/10 rounded-md">
                        Модуль {course.modules.findIndex((m) => m.id === activeModule.id) + 1}
                      </span>
                      <h3 className="text-xl font-bold text-fox-dark">{activeModule.title}</h3>
                    </div>
                    {progress && moduleStatus(activeModule.id) !== 'locked' && moduleStatus(activeModule.id) !== 'completed' && (
                      <Button
                        onClick={() => handleComplete(activeModule.id)}
                        loading={completing === activeModule.id}
                        leftIcon="✓"
                        className="self-start"
                      >
                        Завершить модуль
                      </Button>
                    )}
                    {progress && moduleStatus(activeModule.id) === 'completed' && (
                      <span className="self-start px-4 py-2 text-sm font-semibold text-green-700 bg-green-50 rounded-xl">
                        ✅ Модуль завершён
                      </span>
                    )}
                  </div>

                  {activeModule.lessons.length > 1 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {activeModule.lessons.map((lesson) => (
                        <button
                          key={lesson.id}
                          onClick={() => setActiveLessonId(lesson.id)}
                          className={[
                            'px-3 py-1.5 text-xs font-medium rounded-lg border transition',
                            activeLessonId === lesson.id
                              ? 'bg-fox-purple text-white border-fox-purple'
                              : 'bg-white text-fox-dark border-gray-200 hover:border-fox-purple/30',
                          ].join(' ')}
                        >
                          {lesson.title}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="space-y-6">
                    {activeLesson?.contents.length ? (
                      activeLesson.contents.map((content) => (
                        <div key={content.id}>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="w-2 h-2 rounded-full bg-fox-purple" />
                            <h4 className="text-sm font-semibold text-fox-dark">{content.title || 'Материал'}</h4>
                            <span className="ml-auto text-[10px] uppercase tracking-wide text-gray-400 font-medium">
                              {content.content_type}
                            </span>
                          </div>
                          <AcademyContentViewer content={content} watermark={user?.email || user?.name || 'FOXINBURG'} />
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-gray-400 bg-fox-light rounded-xl">
                        В уроке пока нет материалов.
                      </div>
                    )}
                  </div>
                </Card>
              ) : (
                <Card className="p-12 text-center text-gray-400">
                  Выберите модуль из списка слева
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
