import { useEffect, useState } from 'react'
import Header from '../components/Header'
import api from '../services/api'

interface Lesson {
  id: number
  title: string
  lesson_type: string
  duration_minutes: number
  order_index: number
  is_active: boolean
}

interface Module {
  id: number
  title: string
  description?: string
  order_index: number
  lessons: Lesson[]
}

interface Course {
  id: number
  title: string
  description?: string
  short_description?: string
  type: string
  status: string
  passing_score: number
  is_sequential: boolean
  certificate_enabled: boolean
  modules: Module[]
  created_at: string
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    short_description: '',
    type: 'academy',
    passing_score: 70,
    is_sequential: true,
    certificate_enabled: true,
  })

  const fetchCourses = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/courses')
      setCourses(res.data.data || [])
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка загрузки курсов')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCourses()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/courses', form)
      setShowForm(false)
      setForm({ title: '', description: '', short_description: '', type: 'academy', passing_score: 70, is_sequential: true, certificate_enabled: true })
      await fetchCourses()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка создания курса')
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header title="Курсы" subtitle="Управление учебными программами" icon="📚" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Все курсы</h2>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-[#E85D4C] hover:bg-[#D14F40] text-white text-sm font-medium rounded-xl transition">
            {showForm ? 'Отмена' : '+ Новый курс'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 grid md:grid-cols-2 gap-4">
            <input required placeholder="Название курса" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]" />
            <input placeholder="Краткое описание" value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]" />
            <textarea placeholder="Полное описание" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="md:col-span-2 px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]" rows={3} />
            <input type="number" placeholder="Проходной балл" value={form.passing_score} onChange={(e) => setForm({ ...form, passing_score: Number(e.target.value) })} className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]" />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]">
              <option value="academy">Academy</option>
              <option value="world">World</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.is_sequential} onChange={(e) => setForm({ ...form, is_sequential: e.target.checked })} /> Последовательное прохождение
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.certificate_enabled} onChange={(e) => setForm({ ...form, certificate_enabled: e.target.checked })} /> Сертификат
            </label>
            <button type="submit" className="md:col-span-2 px-4 py-2 bg-[#7C5CFC] hover:bg-[#6B4FD6] text-white rounded-xl font-medium">Создать курс</button>
          </form>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">Загрузка...</div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Нет курсов</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {courses.map((course) => (
              <div key={course.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{course.title}</h3>
                    <StatusBadge status={course.status} />
                  </div>
                  <p className="text-sm text-gray-500 mb-4">{course.short_description || course.description || 'Без описания'}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-4">
                    <span className="px-2 py-1 bg-gray-100 rounded-lg">{course.type}</span>
                    <span className="px-2 py-1 bg-gray-100 rounded-lg">Проходной: {course.passing_score}%</span>
                    <span className="px-2 py-1 bg-gray-100 rounded-lg">Модулей: {course.modules.length}</span>
                  </div>
                  <button onClick={() => setExpanded(expanded === course.id ? null : course.id)} className="text-sm text-[#E85D4C] font-medium hover:underline">
                    {expanded === course.id ? 'Скрыть модули' : 'Показать модули'}
                  </button>
                </div>
                {expanded === course.id && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
                    {course.modules.length === 0 ? (
                      <p className="text-sm text-gray-400">Нет модулей</p>
                    ) : course.modules.map((m) => (
                      <div key={m.id} className="bg-white rounded-xl p-3 border border-gray-100">
                        <div className="font-medium text-sm text-gray-900">{m.title}</div>
                        {m.lessons.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {m.lessons.map((l) => (
                              <li key={l.id} className="text-xs text-gray-600 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#7C5CFC]" />
                                {l.title} ({l.duration_minutes} мин)
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    active: 'bg-green-100 text-green-700',
    archived: 'bg-red-100 text-red-700',
  }
  return <span className={['px-2 py-1 rounded-full text-xs font-medium', styles[status] || 'bg-gray-100 text-gray-700'].join(' ')}>{status}</span>
}
