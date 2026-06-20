import { useEffect, useState } from 'react'
import Header from '../components/Header'
import api from '../services/api'

interface Group {
  id: number
  name: string
}

interface Teacher {
  id: number
  name: string
  email: string
  role: string
}

interface Schedule {
  id: number
  title: string
  description?: string
  group_id: number
  teacher_id: number
  branch_id?: number
  course_id?: number
  lesson_id?: number
  room?: string
  start_time: string
  end_time: string
  recurrence: string
  recurrence_end?: string
  status: string
  created_at: string
  updated_at: string
}

function formatDateTime(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [groupFilter, setGroupFilter] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    group_id: '',
    teacher_id: '',
    room: '',
    start_time: '',
    end_time: '',
    recurrence: 'none',
    recurrence_end: '',
    status: 'scheduled',
  })

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const [schedulesRes, groupsRes] = await Promise.all([
        api.get('/schedules'),
        api.get('/groups'),
      ])
      setSchedules(schedulesRes.data.data || [])
      setGroups(groupsRes.data.data || [])
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }

    api.get('/users')
      .then((res) => {
        const allUsers: Teacher[] = res.data.data || []
        setTeachers(allUsers.filter((u) => u.role === 'teacher'))
      })
      .catch(() => {
        setTeachers([])
      })
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.group_id || !form.teacher_id || !form.start_time || !form.end_time) return
    try {
      await api.post('/schedules', {
        title: form.title,
        description: form.description || null,
        group_id: Number(form.group_id),
        teacher_id: Number(form.teacher_id),
        room: form.room || null,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        recurrence: form.recurrence,
        recurrence_end: form.recurrence_end ? new Date(form.recurrence_end).toISOString() : null,
        status: form.status,
      })
      setShowForm(false)
      setForm({
        title: '',
        description: '',
        group_id: '',
        teacher_id: '',
        room: '',
        start_time: '',
        end_time: '',
        recurrence: 'none',
        recurrence_end: '',
        status: 'scheduled',
      })
      await fetchData()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка создания занятия')
    }
  }

  const filtered = groupFilter
    ? schedules.filter((s) => s.group_id === Number(groupFilter))
    : schedules

  const sorted = [...filtered].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header title="Расписание" subtitle={`Занятий: ${sorted.length}`} icon="📅" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900">Список занятий</h2>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C] text-sm"
            >
              <option value="">Все группы</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-[#E85D4C] hover:bg-[#D14F40] text-white text-sm font-medium rounded-xl transition"
          >
            {showForm ? 'Отмена' : '+ Новое занятие'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 grid md:grid-cols-3 gap-4">
            <input
              required
              placeholder="Название занятия"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]"
            />
            <select
              required
              value={form.group_id}
              onChange={(e) => setForm({ ...form, group_id: e.target.value })}
              className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]"
            >
              <option value="">Группа</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <select
              required
              value={form.teacher_id}
              onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
              className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]"
            >
              <option value="">Преподаватель</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <input
              placeholder="Аудитория / ссылка"
              value={form.room}
              onChange={(e) => setForm({ ...form, room: e.target.value })}
              className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]"
            />
            <input
              required
              type="datetime-local"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]"
            />
            <input
              required
              type="datetime-local"
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]"
            />
            <select
              value={form.recurrence}
              onChange={(e) => setForm({ ...form, recurrence: e.target.value })}
              className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]"
            >
              <option value="none">Без повторения</option>
              <option value="daily">Ежедневно</option>
              <option value="weekly">Еженедельно</option>
              <option value="monthly">Ежемесячно</option>
            </select>
            <input
              type="datetime-local"
              value={form.recurrence_end}
              onChange={(e) => setForm({ ...form, recurrence_end: e.target.value })}
              className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]"
            />
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]"
            >
              <option value="scheduled">Запланировано</option>
              <option value="confirmed">Подтверждено</option>
              <option value="cancelled">Отменено</option>
            </select>
            <input
              placeholder="Описание"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="md:col-span-2 px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]"
            />
            <button type="submit" className="px-4 py-2 bg-[#7C5CFC] hover:bg-[#6B4FD6] text-white rounded-xl font-medium">
              Создать занятие
            </button>
          </form>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Название</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Группа</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Преподаватель</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Начало</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Окончание</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Аудитория</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Загрузка...</td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Нет занятий</td></tr>
              ) : sorted.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{s.title}</td>
                  <td className="px-6 py-4 text-gray-700">{groups.find((g) => g.id === s.group_id)?.name || '—'}</td>
                  <td className="px-6 py-4 text-gray-700">{teachers.find((t) => t.id === s.teacher_id)?.name || '—'}</td>
                  <td className="px-6 py-4 text-gray-600 text-sm">{formatDateTime(s.start_time)}</td>
                  <td className="px-6 py-4 text-gray-600 text-sm">{formatDateTime(s.end_time)}</td>
                  <td className="px-6 py-4 text-gray-700 text-sm">{s.room || '—'}</td>
                  <td className="px-6 py-4 text-sm">
                    {s.status === 'cancelled' ? (
                      <span className="text-red-500">Отменено</span>
                    ) : s.status === 'confirmed' ? (
                      <span className="text-green-600">Подтверждено</span>
                    ) : (
                      <span className="text-blue-600">Запланировано</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
