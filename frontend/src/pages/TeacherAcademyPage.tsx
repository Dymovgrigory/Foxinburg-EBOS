import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import AcademyContentViewer from '../components/AcademyContentViewer'

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

const statusMeta: Record<string, { label: string; icon: string; color: string }> = {
  completed: { label: 'Завершён', icon: '✅', color: 'bg-green-100 text-green-700' },
  available: { label: 'Доступен', icon: '🔓', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'В процессе', icon: '📖', color: 'bg-amber-100 text-amber-700' },
  locked: { label: 'Заблокирован', icon: '🔒', color: 'bg-gray-100 text-gray-500' },
}

export default function TeacherAcademyPage() {
  const { user } = useAuth()
  const isMethodist = ['methodist', 'admin', 'owner', 'super_admin'].includes(user?.role || '')

  const [course, setCourse] = useState<Course | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [activeModuleId, setActiveModuleId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [completing, setCompleting] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const fetchCourse = async () => {
    try {
      const res = await api.get('/teacher-academy/course')
      setCourse(res.data.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось загрузить курс')
    }
  }

  const fetchProgress = async () => {
    try {
      const res = await api.get('/teacher-academy/progress')
      setProgress(res.data.data)
    } catch (err: any) {
      if (err.response?.status !== 404) {
        setError(err.response?.data?.message || 'Не удалось загрузить прогресс')
      }
    }
  }

  const loadAll = async () => {
    setLoading(true)
    setError('')
    await Promise.all([fetchCourse(), fetchProgress()])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  // Автовыбор активного модуля
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

  const handleSync = async () => {
    setSyncing(true)
    setError('')
    setMessage('')
    try {
      const res = await api.post('/teacher-academy/sync')
      setCourse(res.data.data)
      setMessage(res.data.message)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка синхронизации')
    } finally {
      setSyncing(false)
    }
  }

  const handleComplete = async (moduleId: number) => {
    setCompleting(moduleId)
    setError('')
    setMessage('')
    try {
      const res = await api.post(`/teacher-academy/modules/${moduleId}/complete`)
      setMessage(res.data.message)
      await fetchProgress()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка завершения модуля')
    } finally {
      setCompleting(null)
    }
  }

  const moduleStatus = (moduleId: number) => {
    if (!progress) return isMethodist ? 'available' : 'locked'
    const pm = progress.modules.find((m) => m.id === moduleId)
    return pm?.status || 'locked'
  }

  const canOpenModule = (moduleId: number) => {
    return isMethodist || moduleStatus(moduleId) !== 'locked'
  }

  const activeModule = useMemo(
    () => course?.modules.find((m) => m.id === activeModuleId),
    [course, activeModuleId]
  )

  const completedCount = useMemo(
    () => progress?.modules.filter((m) => m.status === 'completed').length || 0,
    [progress]
  )
  const totalCount = course?.modules.length || 0

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB]">
        <Header title="Академия педагогов" subtitle="Обучение и сертификация преподавателей" icon="🎓" />
        <div className="p-6 max-w-6xl mx-auto">
          <div className="p-12 text-center text-gray-400">Загрузка курса...</div>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-[#F8F9FB]">
        <Header title="Академия педагогов" subtitle="Обучение и сертификация преподавателей" icon="🎓" />
        <div className="p-6 max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
            <div className="text-4xl mb-4">📭</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Курс не найден</h3>
            <p className="mb-6">Материалы Академии педагогов ещё не импортированы.</p>
            {isMethodist && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="px-6 py-2.5 bg-[#7C5CFC] hover:bg-[#6B4FD6] disabled:opacity-60 text-white text-sm font-medium rounded-xl transition"
              >
                {syncing ? 'Синхронизация...' : 'Синхронизировать с Яндекс.Диском'}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const notEnrolled = !progress && !isMethodist

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header title="Академия педагогов" subtitle="Обучение и сертификация преподавателей" icon="🎓" />

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">{error}</div>
        )}
        {message && (
          <div className="p-4 bg-green-50 text-green-700 rounded-xl text-sm border border-green-100">{message}</div>
        )}

        {/* Hero card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#7C5CFC] to-[#E85D4C] text-white p-6 md:p-8 shadow-lg">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">{course.title}</h2>
              <p className="text-white/80 mt-1 max-w-2xl">{course.description || 'Курс повышения квалификации преподавателей FOXINBURG'}</p>
              {course.last_sync_at && (
                <p className="text-xs text-white/60 mt-3">
                  Последняя синхронизация: {new Date(course.last_sync_at).toLocaleString('ru-RU')}
                </p>
              )}
            </div>
            {isMethodist && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="self-start md:self-center px-5 py-2.5 bg-white/20 hover:bg-white/30 disabled:opacity-60 text-white text-sm font-semibold rounded-xl backdrop-blur transition"
              >
                {syncing ? 'Синхронизация...' : '↻ Синхронизировать'}
              </button>
            )}
          </div>
          <div className="absolute -right-10 -bottom-16 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
        </div>

        {progress && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-5">
            <div className="relative w-14 h-14 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path className="text-gray-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                <path
                  className="text-[#E85D4C]"
                  strokeDasharray={`${progress.progress_percent}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">{progress.progress_percent}%</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Общий прогресс</p>
              <p className="text-xs text-gray-400">
                {completedCount} из {totalCount} модулей завершено
              </p>
            </div>
          </div>
        )}

        {notEnrolled ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Вы не зачислены на курс</h3>
            <p>Обратитесь к методисту, чтобы получить доступ к материалам Академии педагогов.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Sidebar modules */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden lg:sticky lg:top-6">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-bold text-gray-900">Модули курса</h3>
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
                        isActive ? 'bg-[#7C5CFC]/5' : 'hover:bg-gray-50',
                        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
                      ].join(' ')}
                    >
                      <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium truncate ${isActive ? 'text-[#7C5CFC]' : 'text-gray-800'}`}>
                          {module.title}
                        </p>
                        <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${meta.color}`}>
                          <span>{meta.icon}</span>
                          {meta.label}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Content */}
            <div className="lg:col-span-2 space-y-6">
              {activeModule ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                    <div>
                      <span className="inline-block px-2.5 py-0.5 mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#7C5CFC] bg-[#7C5CFC]/10 rounded-md">
                        Модуль {activeModule.order_index + 1}
                      </span>
                      <h3 className="text-xl font-bold text-gray-900">{activeModule.title}</h3>
                    </div>
                    {progress && moduleStatus(activeModule.id) !== 'locked' && moduleStatus(activeModule.id) !== 'completed' && (
                      <button
                        onClick={() => handleComplete(activeModule.id)}
                        disabled={completing === activeModule.id}
                        className="self-start px-5 py-2.5 bg-[#4CAF7E] hover:bg-[#3D9A6A] disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition shadow-sm"
                      >
                        {completing === activeModule.id ? 'Завершение...' : '✓ Завершить модуль'}
                      </button>
                    )}
                    {progress && moduleStatus(activeModule.id) === 'completed' && (
                      <span className="self-start px-4 py-2 text-sm font-semibold text-green-700 bg-green-50 rounded-xl">✅ Модуль завершён</span>
                    )}
                  </div>

                  <div className="space-y-6">
                    {activeModule.lessons[0]?.contents.length ? (
                      activeModule.lessons[0].contents.map((content) => (
                        <div key={content.id}>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="w-2 h-2 rounded-full bg-[#7C5CFC]" />
                            <h4 className="text-sm font-semibold text-gray-800">{content.title || 'Материал'}</h4>
                            <span className="ml-auto text-[10px] uppercase tracking-wide text-gray-400 font-medium">
                              {content.content_type}
                            </span>
                          </div>
                          <AcademyContentViewer content={content} watermark={user?.email || user?.name || 'FOXINBURG'} />
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl">
                        В модуле пока нет материалов.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
                  Выберите модуль из списка слева
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
