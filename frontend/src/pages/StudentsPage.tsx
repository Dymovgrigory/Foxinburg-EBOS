import { useEffect, useState } from 'react'
import Header from '../components/Header'
import api from '../services/api'

interface Student {
  id: number
  name: string
  email: string
  role: string
  group_id?: number
  is_active: boolean
}

interface Group {
  id: number
  name: string
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', group_id: '' })

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const [usersRes, groupsRes] = await Promise.all([api.get('/users'), api.get('/groups')])
      const allUsers: Student[] = usersRes.data.data || []
      setStudents(allUsers.filter((u) => u.role === 'student'))
      setGroups(groupsRes.data.data || [])
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/users', {
        name: form.name,
        email: form.email,
        password: form.password,
        role: 'student',
        plan: 'FREE',
        target_language: 'ru',
        group_id: form.group_id ? Number(form.group_id) : null,
      })
      setShowForm(false)
      setForm({ name: '', email: '', password: '', group_id: '' })
      await fetchData()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка создания ученика')
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header title="Ученики" subtitle={`Всего: ${students.length}`} icon="🎓" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Список учеников</h2>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-[#E85D4C] hover:bg-[#D14F40] text-white text-sm font-medium rounded-xl transition">
            {showForm ? 'Отмена' : '+ Добавить ученика'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 grid md:grid-cols-4 gap-4">
            <input required placeholder="Имя" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]" />
            <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]" />
            <input required type="password" placeholder="Пароль" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]" />
            <select value={form.group_id} onChange={(e) => setForm({ ...form, group_id: e.target.value })} className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]">
              <option value="">Без группы</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <button type="submit" className="md:col-span-4 px-4 py-2 bg-[#7C5CFC] hover:bg-[#6B4FD6] text-white rounded-xl font-medium">Создать ученика</button>
          </form>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Имя</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Группа</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">Загрузка...</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">Нет учеников</td></tr>
              ) : students.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{s.name}</td>
                  <td className="px-6 py-4 text-gray-600">{s.email}</td>
                  <td className="px-6 py-4 text-gray-700">{groups.find((g) => g.id === s.group_id)?.name || '—'}</td>
                  <td className="px-6 py-4">
                    {s.is_active ? <span className="text-green-600 text-sm">Активен</span> : <span className="text-gray-400 text-sm">Неактивен</span>}
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
