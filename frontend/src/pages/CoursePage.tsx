import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

interface Lesson {
  id: number
  title: string
  description?: string
  lesson_type: string
  order_index: number
  duration_minutes: number
  is_active: boolean
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
  status: string
  is_sequential: boolean
  modules: Module[]
}

export default function CoursePage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set())
  const [message, setMessage] = useState('')

  const isStudent = user?.role === 'student'

  const fetchCourse = () => {
    setLoading(true)
    api
      .get(`/courses/${id}`)
      .then((res) => {
        const data = res.data.data ?? res.data
        setCourse(data)
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Ошибка загрузки курса')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchCourse()
  }, [id])

  const completeLesson = async (lessonId: number) => {
    setMessage('')
    setError('')
    try {
      const res = await api.post(`/lessons/${lessonId}/complete`)
      setCompletedIds((prev) => new Set(prev).add(lessonId))
      setMessage(res.data.message || 'Урок завершён')
      // Обновляем курс, чтобы открыть следующий урок
      fetchCourse()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось завершить урок')
    }
  }

  if (loading) return <div className="p-8">Загрузка...</div>
  if (error && !course) return <div className="p-8 text-red-600">{error}</div>
  if (!course) return <div className="p-8">Курс не найден</div>

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-fox-purple mb-2">{course.title}</h1>
      <p className="text-gray-600 mb-6">{course.description}</p>

      {message && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">{message}</div>}
      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}

      <div className="space-y-6">
        {course.modules.map((module) => (
          <div key={module.id} className="fox-card">
            <h2 className="text-xl font-bold text-fox-purple mb-4">{module.title}</h2>
            <div className="space-y-3">
              {module.lessons.map((lesson) => {
                const isCompleted = completedIds.has(lesson.id)
                return (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between p-4 bg-fox-light rounded-lg border border-fox-border"
                  >
                    <div>
                      <div className="font-semibold text-fox-purple">
                        {lesson.order_index}. {lesson.title}
                      </div>
                      <div className="text-sm text-gray-500 capitalize">
                        {lesson.lesson_type} · {lesson.duration_minutes} мин
                      </div>
                    </div>
                    {isStudent && (
                      <button
                        onClick={() => completeLesson(lesson.id)}
                        disabled={isCompleted}
                        className={[
                          'px-3 py-2 rounded-lg text-sm font-medium transition',
                          isCompleted
                            ? 'bg-green-100 text-green-700 cursor-default'
                            : 'bg-fox-purple text-fox-gold hover:bg-opacity-90',
                        ].join(' ')}
                      >
                        {isCompleted ? '✓ Пройден' : 'Завершить'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
