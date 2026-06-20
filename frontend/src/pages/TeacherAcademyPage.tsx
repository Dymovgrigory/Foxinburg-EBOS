import { useEffect, useState } from 'react'
import Header from '../components/Header'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

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

export default function TeacherAcademyPage() {
  const { user } = useAuth()
  const isMethodist = user?.role === 'methodist' || user?.role === 'admin' || user?.role === 'owner' || user?.role === 'super_admin'

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
      if (res.data.data?.modules?.length) {
        setActiveModuleId(res.data.data.modules[0].id)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось загрузить курс')
    }
  }

  const fetchProgress = async () => {
    try {
      const res = await api.get('/teacher-academy/progress')
      setProgress(res.data.data)
    } catch (err: any) {
      // Если не зачислен — не считаем ошибкой
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
    if (!progress) return 'locked'
    const pm = progress.modules.find((m) => m.id === moduleId)
    return pm?.status || 'locked'
  }

  const activeModule = course?.modules.find((m) => m.id === activeModuleId)

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header title="Академия педагогов" subtitle="Обучение и сертификация преподавателей" icon="🎓" />

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
        {message && <div className="p-4 bg-green-50 text-green-700 rounded-xl text-sm">{message}</div>}

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{course?.title || 'Курс не загружен'}</h2>
            {course?.last_sync_at && (
              <p className="text-xs text-gray-400">
                Последняя синхронизация: {new Date(course.last_sync_at).toLocaleString('ru-RU')}
              </p>
            )}
          </div>
          {isMethodist && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2 bg-[#7C5CFC] hover:bg-[#6B4FD6] disabled:opacity-60 text-white text-sm font-medium rounded-xl transition"
            >
              {syncing ? 'Синхронизация...' : 'Синхронизировать с Яндекс.Диском'}
            </button>
          )}
        </div>

        {progress && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Общий прогресс</span>
              <span className="text-sm font-bold text-[#E85D4C]">{progress.progress_percent}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#E85D4C] transition-all"
                style={{ width: `${progress.progress_percent}%` }}
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-gray-400">Загрузка...</div>
        ) : !course ? (
          <div className="p-8 text-center text-gray-400">
            Курс не найден. {isMethodist && 'Нажмите «Синхронизировать», чтобы импортировать материалы.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sidebar modules */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">Модули</h3>
              </div>
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {course.modules.map((module) => {
                  const status = moduleStatus(module.id)
                  const isActive = activeModuleId === module.id
                  return (
                    <button
                      key={module.id}
                      onClick={() => setActiveModuleId(module.id)}
                      className={[
                        'w-full text-left p-4 transition flex items-center justify-between',
                        isActive ? 'bg-[#E85D4C]/5' : 'hover:bg-gray-50',
                        status === 'locked' ? 'opacity-60' : '',
                      ].join(' ')}
                    >
                      <span className="text-sm font-medium text-gray-800">{module.title}</span>
                      <span className="text-xs">
                        {status === 'completed' && '✅'}
                        {status === 'available' && '🔓'}
                        {status === 'locked' && '🔒'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Content */}
            <div className="md:col-span-2 space-y-6">
              {activeModule ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">{activeModule.title}</h3>
                    {progress && moduleStatus(activeModule.id) !== 'locked' && moduleStatus(activeModule.id) !== 'completed' && (
                      <button
                        onClick={() => handleComplete(activeModule.id)}
                        disabled={completing === activeModule.id}
                        className="px-4 py-2 bg-[#4CAF7E] hover:bg-[#3D9A6A] disabled:opacity-60 text-white text-sm font-medium rounded-xl transition"
                      >
                        {completing === activeModule.id ? 'Завершение...' : 'Завершить модуль'}
                      </button>
                    )}
                    {progress && moduleStatus(activeModule.id) === 'completed' && (
                      <span className="px-3 py-1 text-xs font-medium text-green-700 bg-green-50 rounded-lg">Завершён</span>
                    )}
                  </div>

                  <div className="space-y-3">
                    {activeModule.lessons[0]?.contents.map((content) => (
                      <div
                        key={content.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{content.title || 'Материал'}</p>
                          <p className="text-xs text-gray-500 capitalize">{content.content_type}</p>
                        </div>
                        {content.file_url && (
                          <a
                            href={content.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 text-xs font-medium text-[#7C5CFC] bg-[#7C5CFC]/10 rounded-lg hover:bg-[#7C5CFC]/20 transition flex-shrink-0"
                          >
                            Открыть
                          </a>
                        )}
                      </div>
                    ))}
                    {!activeModule.lessons[0]?.contents.length && (
                      <p className="text-sm text-gray-400">В модуле пока нет материалов.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
                  Выберите модуль
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
