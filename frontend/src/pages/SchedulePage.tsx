import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import api from '../services/api'
import { useToast, Button, Card, Badge, Input, Loader, EmptyState, Table, Thead, Th, Tbody, Tr, Td } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'

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

const recurrenceLabels: Record<string, string> = {
  none: 'Без повторения',
  daily: 'Ежедневно',
  weekly: 'Еженедельно',
  monthly: 'Ежемесячно',
}

const statusMeta: Record<string, { label: string; variant: Parameters<typeof Badge>[0]['variant'] }> = {
  scheduled: { label: 'Запланировано', variant: 'info' },
  confirmed: { label: 'Подтверждено', variant: 'success' },
  cancelled: { label: 'Отменено', variant: 'error' },
}

function formatDateTime(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function SchedulePage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const isTeacher = user?.role === 'teacher'
  const isStudent = user?.role === 'student'
  const canManage = !isTeacher && !isStudent
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [groupFilter, setGroupFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
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
    try {
      const params = isTeacher || isStudent ? { teacher_id: user?.id } : {}
      const [schedulesRes, groupsRes] = await Promise.all([
        api.get('/schedules', { params }),
        api.get('/groups/my'),
      ])
      setSchedules(schedulesRes.data.data || [])
      setGroups(groupsRes.data.data || [])
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка загрузки расписания', 'error')
    } finally {
      setLoading(false)
    }

    if (canManage) {
      try {
        const usersRes = await api.get('/users')
        const allUsers: Teacher[] = usersRes.data.data || []
        setTeachers(allUsers.filter((u) => u.role === 'teacher'))
      } catch {
        setTeachers([])
      }
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filtered = useMemo(() => {
    let list = [...schedules]
    if (groupFilter) list = list.filter((s) => s.group_id === Number(groupFilter))
    if (search) list = list.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()))
    return list.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  }, [schedules, groupFilter, search])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.group_id || !form.teacher_id || !form.start_time || !form.end_time) {
      showToast('Заполните обязательные поля', 'warning')
      return
    }
    setSubmitting(true)
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
      showToast('Занятие создано', 'success')
      await fetchData()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка создания занятия', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-fox-light">
      <Header title="Расписание" subtitle={`Занятий: ${filtered.length}`} icon="📅" />

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <Card>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-fox-dark">Список занятий</h2>
              <p className="text-xs text-gray-500 mt-0.5">{filtered.length} из {schedules.length}</p>
            </div>
            {canManage && (
              <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'secondary' : 'primary'} leftIcon={showForm ? '✕' : '+'}>
                {showForm ? 'Отмена' : 'Новое занятие'}
              </Button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-5">
            <Input
              placeholder="Поиск по названию"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-fox-gold/50 focus:border-fox-gold bg-white"
            >
              <option value="">Все группы</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        </Card>

        {showForm && (
          <Card>
            <h3 className="text-base font-bold text-fox-dark mb-4">Новое занятие</h3>
            <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-4">
              <Input
                required
                placeholder="Название занятия"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <select
                required
                value={form.group_id}
                onChange={(e) => setForm({ ...form, group_id: e.target.value })}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-fox-gold/50 focus:border-fox-gold bg-white"
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
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-fox-gold/50 focus:border-fox-gold bg-white"
              >
                <option value="">Преподаватель</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <Input
                placeholder="Аудитория / ссылка"
                value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
              />
              <Input
                required
                type="datetime-local"
                label="Начало"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              />
              <Input
                required
                type="datetime-local"
                label="Окончание"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              />
              <select
                value={form.recurrence}
                onChange={(e) => setForm({ ...form, recurrence: e.target.value })}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-fox-gold/50 focus:border-fox-gold bg-white"
              >
                {Object.entries(recurrenceLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <Input
                type="datetime-local"
                label="Повторять до"
                value={form.recurrence_end}
                onChange={(e) => setForm({ ...form, recurrence_end: e.target.value })}
              />
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-fox-gold/50 focus:border-fox-gold bg-white"
              >
                <option value="scheduled">Запланировано</option>
                <option value="confirmed">Подтверждено</option>
                <option value="cancelled">Отменено</option>
              </select>
              <div className="md:col-span-2">
                <textarea
                  placeholder="Описание"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-fox-gold/50 focus:border-fox-gold"
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" loading={submitting} className="w-full">
                  Создать занятие
                </Button>
              </div>
            </form>
          </Card>
        )}

        {loading ? (
          <Loader text="Загрузка расписания..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="📅"
            title="Нет занятий"
            description={search || groupFilter ? 'Попробуй сбросить фильтры.' : canManage ? 'Создай первое занятие в расписании.' : 'Занятия пока не запланированы.'}
            actionLabel={canManage && !search && !groupFilter ? 'Новое занятие' : undefined}
            onAction={canManage && !search && !groupFilter ? () => setShowForm(true) : undefined}
          />
        ) : (
          <Card padding="none">
            <Table>
              <Thead>
                <tr>
                  <Th>Название</Th>
                  <Th>Группа</Th>
                  <Th>Преподаватель</Th>
                  <Th>Начало</Th>
                  <Th>Окончание</Th>
                  <Th>Аудитория</Th>
                  <Th>Повторение</Th>
                  <Th>Статус</Th>
                </tr>
              </Thead>
              <Tbody>
                {filtered.map((s) => {
                  const meta = statusMeta[s.status] || { label: s.status, variant: 'default' as const }
                  return (
                    <Tr key={s.id}>
                      <Td className="font-medium text-fox-dark">{s.title}</Td>
                      <Td>{groups.find((g) => g.id === s.group_id)?.name || '—'}</Td>
                      <Td>{teachers.find((t) => t.id === s.teacher_id)?.name || '—'}</Td>
                      <Td className="whitespace-nowrap">{formatDateTime(s.start_time)}</Td>
                      <Td className="whitespace-nowrap">{formatDateTime(s.end_time)}</Td>
                      <Td>{s.room || '—'}</Td>
                      <Td>{recurrenceLabels[s.recurrence] || s.recurrence}</Td>
                      <Td><Badge variant={meta.variant}>{meta.label}</Badge></Td>
                    </Tr>
                  )
                })}
              </Tbody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  )
}
