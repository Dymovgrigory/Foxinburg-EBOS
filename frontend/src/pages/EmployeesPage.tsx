import { useEffect, useState } from 'react'
import Header from '../components/Header'
import api from '../services/api'

interface User {
  id: number
  name: string
  email: string
  role: string
  is_active: boolean
}

const filters = [
  { key: 'all', label: 'Все' },
  { key: 'owner', label: 'Владелец' },
  { key: 'super_admin', label: 'Супер-админ' },
  { key: 'admin', label: 'Администратор' },
  { key: 'manager', label: 'Менеджер' },
  { key: 'methodist', label: 'Методист' },
  { key: 'teacher', label: 'Педагог' },
  { key: 'student', label: 'Ученик' },
  { key: 'parent', label: 'Родитель' },
  { key: 'guest', label: 'Гость' },
]

export default function EmployeesPage() {
  const [users, setUsers] = useState<User[]>([])
  const [filtered, setFiltered] = useState<User[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/users')
      .then((res) => {
        const data = res.data.data ?? []
        setUsers(data)
        setFiltered(data)
      })
      .catch((err) => setError(err.response?.data?.message || 'Ошибка загрузки'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (filter === 'all') {
      setFiltered(users)
    } else {
      setFiltered(users.filter((u) => u.role === filter))
    }
  }, [filter, users])

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header title="Сотрудники" subtitle={`Всего: ${filtered.length}`} icon="👥" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={[
                'px-4 py-2 rounded-xl text-sm font-medium transition',
                filter === f.key
                  ? 'bg-[#E85D4C] text-white shadow-md shadow-[#E85D4C]/25'
                  : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50',
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Загрузка...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Имя</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Роль</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{u.name}</td>
                    <td className="px-6 py-4 text-gray-600 flex items-center gap-2">
                      <span>✉️</span> {u.email}
                    </td>
                    <td className="px-6 py-4">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-6 py-4">
                      {u.is_active ? (
                        <span className="text-green-600 text-sm">Активен</span>
                      ) : (
                        <span className="text-gray-400 text-sm">Неактивен</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    owner: 'bg-red-100 text-red-700',
    super_admin: 'bg-purple-100 text-purple-700',
    admin: 'bg-blue-100 text-blue-700',
    manager: 'bg-amber-100 text-amber-700',
    methodist: 'bg-yellow-100 text-yellow-700',
    teacher: 'bg-green-100 text-green-700',
    student: 'bg-cyan-100 text-cyan-700',
    parent: 'bg-pink-100 text-pink-700',
    guest: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={['px-3 py-1 rounded-full text-xs font-semibold', styles[role] || styles.guest].join(' ')}>
      {roleLabel(role)}
    </span>
  )
}

function roleLabel(role: string) {
  const labels: Record<string, string> = {
    owner: 'Владелец',
    super_admin: 'Супер-админ',
    admin: 'Администратор',
    manager: 'Менеджер',
    methodist: 'Методист',
    teacher: 'Педагог',
    student: 'Ученик',
    parent: 'Родитель',
    guest: 'Гость',
  }
  return labels[role] || role
}
