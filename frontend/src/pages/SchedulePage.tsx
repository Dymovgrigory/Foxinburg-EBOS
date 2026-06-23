import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import api from '../services/api'
import { useToast, Button, Card, Badge, Input, Select, Textarea, Loader, EmptyState, Table, Thead, Th, Tbody, Tr, Td, PageShell } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { usersApi, attendanceApi } from '../api'
import AttendanceModal from '../components/AttendanceModal'
import type { User, Attendance } from '../types'
import { LuCalendar, LuX, LuCheck } from 'react-icons/lu'

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
  completed: { label: 'Проведено', variant: 'default' },
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

  const [conductSchedule, setConductSchedule] = useState<Schedule | null>(null)
  const [conductStudents, setConductStudents] = useState<User[]>([])
  const [conductAttendances, setConductAttendances] = useState<Attendance[]>([])
  const [conductLoading, setConductLoading] = useState(false)

  const canConduct = ['teacher', 'methodist', 'admin', 'super_admin', 'owner'].includes(user?.role || '')

  const openConduct = async (schedule: Schedule) => {
    setConductSchedule(schedule)
    setConductLoading(true)
    try {
      const [studentsRes, attendancesRes] = await Promise.all([
        usersApi.listStudents(),
        attendanceApi.listBySchedule(schedule.id),
      ])
      const roster = studentsRes.filter((u) => u.group_id === schedule.group_id)
      setConductStudents(roster)
      setConductAttendances(attendancesRes)
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка загрузки данных для занятия', 'error')
    } finally {
      setConductLoading(false)
    }
  }

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
    <PageShell>
      <Header title="Расписание" subtitle={`Занятий: ${filtered.length}`} icon={<LuCalendar />} />

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <div className="relative overflow-hidden rounded-card p-6 md:p-8 border border-fox-border/60 bg-white shadow-fox-lg">
          <div
            className="absolute top-0 right-0 w-64 h-64 pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage: 'url(/brand/wave.png)',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'top right',
            }}
          />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-fox-purple mb-2">Расписание занятий</h2>
              <p className="text-fox-gray">{filtered.length} из {schedules.length} занятий</p>
            </div>
            {canManage && (
              <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'secondary' : 'primary'} leftIcon={showForm ? <LuX /> : '+'}>
                {showForm ? 'Отмена' : 'Новое занятие'}
              </Button>
            )}
          </div>
        </div>

        <Card>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Поиск по названию"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="sm:max-w-xs"
            >
              <option value="">Все группы</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </Select>
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
              <Select
                required
                value={form.group_id}
                onChange={(e) => setForm({ ...form, group_id: e.target.value })}
              >
                <option value="">Группа</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </Select>
              <Select
                required
                value={form.teacher_id}
                onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
              >
                <option value="">Преподаватель</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
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
              <Select
                value={form.recurrence}
                onChange={(e) => setForm({ ...form, recurrence: e.target.value })}
              >
                {Object.entries(recurrenceLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </Select>
              <Input
                type="datetime-local"
                label="Повторять до"
                value={form.recurrence_end}
                onChange={(e) => setForm({ ...form, recurrence_end: e.target.value })}
              />
              <Select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="scheduled">Запланировано</option>
                <option value="confirmed">Подтверждено</option>
                <option value="cancelled">Отменено</option>
              </Select>
              <div className="md:col-span-2">
                <Textarea
                  placeholder="Описание"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
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
            icon={<LuCalendar />}
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
                  {canConduct && <Th>Действия</Th>}
                </tr>
              </Thead>
              <Tbody>
                {filtered.map((s) => {
                  const meta = statusMeta[s.status] || { label: s.status, variant: 'default' as const }
                  const isOwnLesson = s.teacher_id === user?.id
                  const showConduct = canConduct && (user?.role !== 'teacher' || isOwnLesson)
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
                      {canConduct && (
                        <Td>
                          {showConduct && s.status !== 'cancelled' ? (
                            <Button
                              size="sm"
                              variant={s.status === 'completed' ? 'secondary' : 'primary'}
                              leftIcon={<LuCheck size={14} />}
                              onClick={() => openConduct(s)}
                            >
                              {s.status === 'completed' ? 'Посещаемость' : 'Провести'}
                            </Button>
                          ) : (
                            <span className="text-xs text-fox-gray">—</span>
                          )}
                        </Td>
                      )}
                    </Tr>
                  )
                })}
              </Tbody>
            </Table>
          </Card>
        )}
      </div>

      <AttendanceModal
        isOpen={!!conductSchedule}
        onClose={() => {
          setConductSchedule(null)
          setConductStudents([])
          setConductAttendances([])
        }}
        schedule={conductSchedule}
        students={conductStudents}
        initialAttendances={conductAttendances}
        loading={conductLoading}
        onSaved={fetchData}
      />
    </PageShell>
  )
}
