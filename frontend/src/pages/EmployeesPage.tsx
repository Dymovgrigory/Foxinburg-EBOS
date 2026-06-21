import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import api from '../services/api'
import { useToast, Button, Card, Badge, Input, Loader, EmptyState, Table, Thead, Th, Tbody, Tr, Td } from '../components/ui'

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

const roleVariants: Record<string, Parameters<typeof Badge>[0]['variant']> = {
  owner: 'error',
  super_admin: 'purple',
  admin: 'info',
  manager: 'warning',
  methodist: 'warning',
  teacher: 'success',
  student: 'default',
  parent: 'default',
  guest: 'default',
}

export default function EmployeesPage() {
  const { showToast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student', plan: 'FREE', target_language: 'ru' })

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await api.get('/users')
      setUsers(res.data.data ?? [])
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка загрузки', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const filtered = useMemo(() => {
    let list = filter === 'all' ? users : users.filter((u) => u.role === filter)
    if (search) {
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase())
      )
    }
    return list
  }, [filter, users, search])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/users', form)
      setShowForm(false)
      setForm({ name: '', email: '', password: '', role: 'student', plan: 'FREE', target_language: 'ru' })
      showToast('Пользователь создан', 'success')
      await fetchUsers()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка создания пользователя', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-fox-light">
      <Header title="Сотрудники" subtitle={`Всего: ${filtered.length}`} icon="👥" />

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <Card>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-fox-dark">Список пользователей</h2>
              <p className="text-xs text-gray-500 mt-0.5">{filtered.length} из {users.length}</p>
            </div>
            <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'secondary' : 'primary'} leftIcon={showForm ? '✕' : '+'}>
              {showForm ? 'Отмена' : 'Добавить пользователя'}
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-5">
            <Input
              placeholder="Поиск по имени или email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-sm"
            />
            <div className="flex flex-wrap gap-2">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={[
                    'px-3 py-1.5 rounded-full text-xs font-semibold transition border',
                    filter === f.key
                      ? 'bg-fox-purple text-white border-fox-purple shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-fox-purple hover:text-fox-purple',
                  ].join(' ')}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {showForm && (
          <Card>
            <h3 className="text-base font-bold text-fox-dark mb-4">Новый пользователь</h3>
            <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-4">
              <Input required placeholder="Имя" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input required type="password" placeholder="Пароль" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-fox-gold/50 focus:border-fox-gold bg-white"
              >
                {filters.filter((f) => f.key !== 'all').map((f) => (
                  <option key={f.key} value={f.key}>{f.label}</option>
                ))}
              </select>
              <select
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-fox-gold/50 focus:border-fox-gold bg-white"
              >
                <option value="FREE">FREE</option>
                <option value="PREMIUM">PREMIUM</option>
              </select>
              <select
                value={form.target_language}
                onChange={(e) => setForm({ ...form, target_language: e.target.value })}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-fox-gold/50 focus:border-fox-gold bg-white"
              >
                <option value="ru">Русский</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
              </select>
              <div className="md:col-span-3">
                <Button type="submit" loading={submitting}>Создать пользователя</Button>
              </div>
            </form>
          </Card>
        )}

        {loading ? (
          <Loader text="Загрузка пользователей..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="👥"
            title="Пользователи не найдены"
            description={search || filter !== 'all' ? 'Попробуй изменить фильтры.' : 'Добавь первого пользователя.'}
            actionLabel={!search && filter === 'all' ? 'Добавить пользователя' : undefined}
            onAction={!search && filter === 'all' ? () => setShowForm(true) : undefined}
          />
        ) : (
          <Card padding="none">
            <Table>
              <Thead>
                <tr>
                  <Th>Имя</Th>
                  <Th>Email</Th>
                  <Th>Роль</Th>
                  <Th>Статус</Th>
                </tr>
              </Thead>
              <Tbody>
                {filtered.map((u) => (
                  <Tr key={u.id}>
                    <Td className="font-medium text-fox-dark">{u.name}</Td>
                    <Td>{u.email}</Td>
                    <Td>
                      <Badge variant={roleVariants[u.role] || 'default'}>{roleLabel(u.role)}</Badge>
                    </Td>
                    <Td>
                      {u.is_active ? (
                        <Badge variant="success">Активен</Badge>
                      ) : (
                        <Badge variant="default">Неактивен</Badge>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Card>
        )}
      </div>
    </div>
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
