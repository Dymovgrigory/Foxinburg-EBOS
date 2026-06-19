import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

interface Lesson {
  id: number
  title: string
  lesson_type: string
  order_index: number
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
  short_description?: string
  status: string
  type: string
  modules: Module[]
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/courses')
      .then((res) => {
        const data = res.data.data ?? res.data
        setCourses(data || [])
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Ошибка загрузки курсов')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8">Загрузка...</div>
  if (error) return <div className="p-8 text-red-600">{error}</div>

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-fox-purple mb-6">📚 Курсы</h1>
      {courses.length === 0 ? (
        <div className="fox-card">Пока нет доступных курсов.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((course) => (
            <Link
              key={course.id}
              to={`/courses/${course.id}`}
              className="fox-card hover:shadow-lg transition"
            >
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-xl font-bold text-fox-purple">{course.title}</h2>
                <span className="text-xs px-2 py-1 bg-fox-border text-fox-purple rounded-full capitalize">
                  {course.status}
                </span>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                {course.short_description || course.description || 'Описание скоро появится'}
              </p>
              <div className="text-sm text-gray-500">
                Модулей: {course.modules?.length || 0} · Уроков:{' '}
                {course.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
