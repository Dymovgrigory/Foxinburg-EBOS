import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import api from '../services/api'
import { useToast, Button, Card, Badge, Input, Loader, EmptyState, Table, Thead, Th, Tbody, Tr, Td } from '../components/ui'
import { LuGraduationCap, LuX } from 'react-icons/lu'

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
  const { showToast } = useToast()
  const [students, setStudents] = useState<Student[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', group_id: '' })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [usersRes, groupsRes] = await Promise.all([api.get('/users'), api.get('/groups')])
      const allUsers: Student[] = usersRes.data.data || []
      setStudents(allUsers.filter((u) => u.role === 'student'))
      setGroups(groupsRes.data.data || [])
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка загрузки', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filtered = useMemo(() => {
    if (!search) return students
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase())
    )
  }, [students, search])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
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
      showToast('Ученик добавлен', 'success')
      await fetchData()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка создания ученика', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-fox-light">
      <Header title="Ученики" subtitle={`Всего: ${filtered.length}`} icon={<LuGraduationCap />} />

      <div className="p-4 md:p-6 w-full space-y-6">
        <Card>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-fox-dark">Список учеников</h2>
              <p className="text-xs text-fox-gray mt-0.5">{filtered.length} из {students.length}</p>
            </div>
            <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'secondary' : 'primary'} leftIcon={showForm ? <LuX /> : '+'}>
              {showForm ? 'Отмена' : 'Добавить ученика'}
            </Button>
          </div>

          <div className="mt-5 max-w-sm">
            <Input
              placeholder="Поиск по имени или email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </Card>

        {showForm && (
          <Card>
            <h3 className="text-base font-bold text-fox-dark mb-4">Новый ученик</h3>
            <form onSubmit={handleSubmit} className="grid md:grid-cols-4 gap-4">
              <Input required placeholder="Имя" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input required type="password" placeholder="Пароль" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <select
                value={form.group_id}
                onChange={(e) => setForm({ ...form, group_id: e.target.value })}
                className="px-4 py-2.5 border border-fox-border rounded-xl text-sm text-fox-graphite focus:outline-none focus:ring-2 focus:ring-fox-gold/50 focus:border-fox-gold bg-white"
              >
                <option value="">Без группы</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <div className="md:col-span-4">
                <Button type="submit" loading={submitting}>Создать ученика</Button>
              </div>
            </form>
          </Card>
        )}

        {loading ? (
          <Loader text="Загрузка учеников..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<LuGraduationCap />}
            title="Ученики не найдены"
            description={search ? 'Попробуй изменить поиск.' : 'Добавь первого ученика, чтобы начать.'}
            actionLabel={!search ? 'Добавить ученика' : undefined}
            onAction={!search ? () => setShowForm(true) : undefined}
          />
        ) : (
          <Card padding="none">
            <Table>
              <Thead>
                <tr>
                  <Th>Имя</Th>
                  <Th>Email</Th>
                  <Th>Группа</Th>
                  <Th>Статус</Th>
                </tr>
              </Thead>
              <Tbody>
                {filtered.map((s) => (
                  <Tr key={s.id}>
                    <Td className="font-medium text-fox-dark">{s.name}</Td>
                    <Td>{s.email}</Td>
                    <Td>{groups.find((g) => g.id === s.group_id)?.name || '—'}</Td>
                    <Td>
                      {s.is_active ? (
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
