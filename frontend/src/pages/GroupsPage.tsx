import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getErrorMessage } from '../utils/error'
import Header from '../components/Header'
import { useAuth } from '../contexts/AuthContext'
import {
  useToast,
  Button,
  Card,
  Badge,
  Input,
  Select,
  Loader,
  EmptyState,
  Tabs,
  Modal,
  Table,
  Thead,
  Th,
  Tbody,
  Tr,
  Td,
  PageShell,
} from '../components/ui'
import {
  groupsApi,
  branchesApi,
  coursesApi,
  usersApi,
  schedulesApi,
  organizationsApi,
} from '../api'
import type { Group, GroupMembership, GroupMembershipAdd, User, Branch, Course, Schedule, Organization } from '../types'
import {
  LuUsers,
  LuPlus,
  LuSearch,
  LuBuilding,
  LuUser,
  LuBookOpen,
  LuCalendar,
  LuMapPin,
  LuTrash2,
  LuPencil,
  LuGraduationCap,
  LuCreditCard,
  LuSettings,
} from 'react-icons/lu'

const STATUS_TABS = [
  { id: 'current', label: 'Текущие' },
  { id: 'planned', label: 'Запланированные' },
  { id: 'closed', label: 'Закрытые' },
]

const STUDY_TYPES = [
  { value: 'mini_group', label: 'Мини-группа' },
  { value: 'standard', label: 'Стандартная группа' },
  { value: 'individual', label: 'Индивидуальное' },
  { value: 'pair', label: 'Парное' },
  { value: 'corporate', label: 'Корпоративное' },
  { value: 'marathon', label: 'Марафон' },
  { value: 'remote', label: 'Дистанционное' },
]

const BALANCE_TYPES = [
  { value: 'lessons', label: 'Уроки' },
  { value: 'rubles', label: 'Рубли' },
]

const WEEKDAYS = [
  { value: 1, label: 'Пн' },
  { value: 2, label: 'Вт' },
  { value: 3, label: 'Ср' },
  { value: 4, label: 'Чт' },
  { value: 5, label: 'Пт' },
  { value: 6, label: 'Сб' },
  { value: 7, label: 'Вс' },
]

function formatMoney(kopecks?: number | null) {
  if (kopecks == null) return '—'
  return `${(kopecks / 100).toLocaleString('ru-RU')} ₽`
}

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ru-RU')
}

function formatDateTime(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toDateInputValue(iso?: string | null) {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function nextWeekday(start: Date, weekday: number) {
  const d = new Date(start)
  const day = d.getDay() || 7
  const diff = weekday - day
  d.setDate(d.getDate() + (diff < 0 ? diff + 7 : diff))
  return d
}

export default function GroupsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const isTeacher = user?.role === 'teacher'
  const canManage = ['owner', 'super_admin', 'admin', 'methodist'].includes(user?.role || '')

  const [groups, setGroups] = useState<Group[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [teachers, setTeachers] = useState<User[]>([])
  const [students, setStudents] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const [statusTab, setStatusTab] = useState('current')
  const [search, setSearch] = useState('')
  const [orgFilter, setOrgFilter] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [teacherFilter, setTeacherFilter] = useState('')
  const [studyTypeFilter, setStudyTypeFilter] = useState('')

  const [searchParams] = useSearchParams()

  useEffect(() => {
    const branchId = searchParams.get('branch_id')
    if (branchId) {
      setBranchFilter(branchId)
    }
  }, [searchParams])

  const [modalOpen, setModalOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailGroup, setDetailGroup] = useState<Group | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { status: statusTab }
      if (isTeacher) {
        params.teacher_id = user?.id
      } else {
        if (branchFilter) params.branch_id = Number(branchFilter)
        if (teacherFilter) params.teacher_id = Number(teacherFilter)
        if (studyTypeFilter) params.study_type = studyTypeFilter
        if (search) params.search = search
      }

      const requests: Promise<unknown>[] = [groupsApi.list(params)]
      if (!isTeacher) {
        requests.push(branchesApi.list(), organizationsApi.list(), coursesApi.list(), usersApi.list())
      }
      requests.push(usersApi.listStudents())

      const res = await Promise.all(requests)
      setGroups(res[0] as Group[])
      if (!isTeacher) {
        setBranches(res[1] as Branch[])
        setOrgs(res[2] as Organization[])
        setCourses(res[3] as Course[])
        setTeachers(((res[4] as User[]) || []).filter((u: User) => u.role === 'teacher'))
        setStudents((res[5] as User[]) || [])
      } else {
        setStudents((res[1] as User[]) || [])
      }
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка загрузки данных'), 'error')
    } finally {
      setLoading(false)
    }
  }, [statusTab, branchFilter, teacherFilter, studyTypeFilter, search, isTeacher, user?.id, showToast])

  const branchesForSelect = useMemo(() => {
    if (!orgFilter) return branches
    return branches.filter((b) => b.organization_id === Number(orgFilter))
  }, [branches, orgFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredGroups = useMemo(() => {
    let list = groups
    if (orgFilter) {
      const allowedBranchIds = new Set(branchesForSelect.map((b) => b.id))
      list = list.filter((g) => g.branch_id != null && allowedBranchIds.has(g.branch_id))
    }
    if (isTeacher && search) {
      list = list.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
    }
    return list
  }, [groups, branchesForSelect, orgFilter, isTeacher, search])

  const openCreate = () => {
    setEditingGroup(null)
    setModalOpen(true)
  }

  const openEdit = (group: Group) => {
    setEditingGroup(group)
    setModalOpen(true)
  }

  const openDetail = (group: Group) => {
    setDetailGroup(group)
    setDetailOpen(true)
  }

  const handleSaved = () => {
    setModalOpen(false)
    setEditingGroup(null)
    fetchData()
    if (detailGroup) {
      groupsApi.get(detailGroup.id).then((g) => setDetailGroup(g))
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить группу?')) return
    try {
      await groupsApi.delete(id)
      showToast('Группа удалена', 'success')
      fetchData()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка удаления'), 'error')
    }
  }

  return (
    <PageShell>
      <Header title="Группы" subtitle="Учебные группы и расписание" icon={<LuUsers />} />

      <div className="p-4 md:p-6 w-full space-y-6">
        <div className="relative overflow-hidden rounded-card p-6 md:p-8 border border-fox-border/60 bg-white shadow-fox-lg">
          <div
            className="absolute top-0 right-0 w-64 h-64 pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage: 'url(/brand/swirl-1.png)',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'top right',
            }}
          />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-fox-purple mb-2">Учебные группы</h2>
              <p className="text-fox-gray">{filteredGroups.length} групп</p>
            </div>
            {canManage && (
              <Button onClick={openCreate} leftIcon={<LuPlus />}>
                Добавить группу
              </Button>
            )}
          </div>
        </div>

        <Card>
          <div className="flex flex-col lg:flex-row gap-3 flex-wrap">
            <Tabs tabs={STATUS_TABS} activeTab={statusTab} onChange={setStatusTab} />
            <div className="flex-1" />
            <Input
              placeholder="Поиск по названию"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<LuSearch />}
              className="lg:max-w-xs"
            />
            {!isTeacher && (
              <>
                <Select value={orgFilter} onChange={(e) => {
                  const value = e.target.value
                  setOrgFilter(value)
                  if (value && branchFilter) {
                    const branch = branches.find((b) => b.id === Number(branchFilter))
                    if (branch && branch.organization_id !== Number(value)) {
                      setBranchFilter('')
                    }
                  }
                }} className="lg:max-w-xs">
                  <option value="">Все организации</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </Select>
                <Select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="lg:max-w-xs">
                  <option value="">Все филиалы</option>
                  {branchesForSelect.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </Select>
                <Select value={teacherFilter} onChange={(e) => setTeacherFilter(e.target.value)} className="lg:max-w-xs">
                  <option value="">Все преподаватели</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
                <Select value={studyTypeFilter} onChange={(e) => setStudyTypeFilter(e.target.value)} className="lg:max-w-xs">
                  <option value="">Все типы</option>
                  {STUDY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
              </>
            )}
          </div>
        </Card>

        {loading ? (
          <Loader text="Загрузка групп..." />
        ) : filteredGroups.length === 0 ? (
          <EmptyState
            icon={<LuUsers />}
            title="Групп не найдено"
            description={search ? 'Попробуй изменить фильтры.' : 'Создай первую учебную группу.'}
            actionLabel={canManage && !search ? 'Добавить группу' : undefined}
            onAction={canManage ? openCreate : undefined}
          />
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            {filteredGroups.map((group) => (
              <Card key={group.id} hover className="flex flex-col">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <h3 className="text-lg font-bold text-fox-dark leading-tight">{group.name}</h3>
                  <Badge
                    variant={
                      group.status === 'current'
                        ? 'success'
                        : group.status === 'planned'
                          ? 'warning'
                          : 'default'
                    }
                  >
                    {group.status === 'current' ? 'Текущая' : group.status === 'planned' ? 'Запланирована' : 'Закрыта'}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm mb-5">
                  {group.course_title && (
                    <div className="flex items-center gap-2 text-fox-gray">
                      <LuBookOpen size={16} />
                      <span>{group.course_title}</span>
                    </div>
                  )}
                  {group.teacher_name && (
                    <div className="flex items-center gap-2 text-fox-gray">
                      <LuUser size={16} />
                      <span>{group.teacher_name}</span>
                    </div>
                  )}
                  {group.branch_name && (
                    <div className="flex items-center gap-2 text-fox-gray">
                      <LuBuilding size={16} />
                      <span>{group.branch_name}</span>
                    </div>
                  )}
                  {group.room && (
                    <div className="flex items-center gap-2 text-fox-gray">
                      <LuMapPin size={16} />
                      <span>Ауд. {group.room}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-fox-gray">
                    <LuGraduationCap size={16} />
                    <span>Учеников: {group.students_count ?? 0} / {group.max_students ?? 12}</span>
                  </div>
                  <div className="flex items-center gap-2 text-fox-gray">
                    <LuCalendar size={16} />
                    <span>{formatDate(group.start_date)} — {formatDate(group.end_date)}</span>
                  </div>
                </div>

                <div className="mt-auto flex items-center gap-2">
                  <Button size="sm" variant="secondary" className="flex-1" onClick={() => openDetail(group)}>
                    Открыть
                  </Button>
                  {canManage && (
                    <Button size="sm" variant="ghost" leftIcon={<LuPencil size={16} />} onClick={() => openEdit(group)} />
                  )}
                  {canManage && (
                    <Button size="sm" variant="ghost" leftIcon={<LuTrash2 size={16} />} onClick={() => handleDelete(group.id)} />
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <GroupModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        group={editingGroup}
        branches={branches}
        teachers={teachers}
        courses={courses}
        onSaved={handleSaved}
      />

      <GroupDetailModal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        group={detailGroup}
        teachers={teachers}
        students={students}
        canManage={canManage}
        onUpdated={() => {
          fetchData()
          if (detailGroup) groupsApi.get(detailGroup.id).then((g) => setDetailGroup(g))
        }}
      />
    </PageShell>
  )
}

// --- Group create/edit modal ---

interface GroupModalProps {
  isOpen: boolean
  onClose: () => void
  group: Group | null
  branches: Branch[]
  teachers: User[]
  courses: Course[]
  onSaved: () => void
}

function GroupModal({ isOpen, onClose, group, branches, teachers, courses, onSaved }: GroupModalProps) {
  const { showToast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [tab, setTab] = useState('info')
  const [form, setForm] = useState<Partial<Group>>({
    name: '',
    description: '',
    branch_id: undefined,
    teacher_id: undefined,
    course_id: undefined,
    room: '',
    study_type: 'mini_group',
    language: '',
    level: '',
    max_students: 12,
    status: 'current',
    start_date: '',
    end_date: '',
    academic_hour_minutes: 45,
    balance_type: 'lessons',
    hourly_rate: 0,
    monthly_fee: undefined,
    auto_invoices_enabled: true,
    certificates_enabled: false,
  })

  useEffect(() => {
    if (group) {
      setForm({
        ...group,
        start_date: toDateInputValue(group.start_date),
        end_date: toDateInputValue(group.end_date),
      })
    } else {
      setForm({
        name: '',
        description: '',
        branch_id: undefined,
        teacher_id: undefined,
        course_id: undefined,
        room: '',
        study_type: 'mini_group',
        language: '',
        level: '',
        max_students: 12,
        status: 'current',
        start_date: '',
        end_date: '',
        academic_hour_minutes: 45,
        balance_type: 'lessons',
        hourly_rate: 0,
        monthly_fee: undefined,
        auto_invoices_enabled: true,
        certificates_enabled: false,
      })
    }
    setTab('info')
  }, [group, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) {
      showToast('Укажите название группы', 'warning')
      return
    }
    setSubmitting(true)
    try {
      const payload: Partial<Group> = {
        ...form,
        branch_id: form.branch_id ? Number(form.branch_id) : undefined,
        teacher_id: form.teacher_id ? Number(form.teacher_id) : undefined,
        course_id: form.course_id ? Number(form.course_id) : undefined,
        max_students: Number(form.max_students),
        academic_hour_minutes: Number(form.academic_hour_minutes),
        hourly_rate: form.hourly_rate ? Math.round(Number(form.hourly_rate) * 100) : 0,
        monthly_fee: form.monthly_fee ? Math.round(Number(form.monthly_fee) * 100) : undefined,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
      }
      if (group) {
        await groupsApi.update(group.id, payload)
        showToast('Группа обновлена', 'success')
      } else {
        await groupsApi.create(payload)
        showToast('Группа создана', 'success')
      }
      onSaved()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка сохранения'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const tabs = [
    { id: 'info', label: 'Информация', icon: <LuSettings /> },
    { id: 'finance', label: 'Финансы', icon: <LuCreditCard /> },
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={group ? 'Редактировать группу' : 'Новая группа'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Отмена</Button>
          <Button type="submit" form="group-form" loading={submitting}>
            {group ? 'Сохранить' : 'Создать'}
          </Button>
        </>
      }
    >
      <form id="group-form" onSubmit={handleSubmit}>
        <Tabs tabs={tabs} activeTab={tab} onChange={setTab} />

        <div className="mt-4 space-y-4">
          {tab === 'info' && (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Название *"
                  value={form.name || ''}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
                <Input
                  label="Аудитория / кабинет"
                  value={form.room || ''}
                  onChange={(e) => setForm({ ...form, room: e.target.value })}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Select
                  label="Филиал"
                  value={form.branch_id || ''}
                  onChange={(e) => setForm({ ...form, branch_id: e.target.value ? Number(e.target.value) : undefined })}
                >
                  <option value="">—</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </Select>
                <Select
                  label="Преподаватель"
                  value={form.teacher_id || ''}
                  onChange={(e) => setForm({ ...form, teacher_id: e.target.value ? Number(e.target.value) : undefined })}
                >
                  <option value="">—</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Select
                  label="Курс / программа"
                  value={form.course_id || ''}
                  onChange={(e) => setForm({ ...form, course_id: e.target.value ? Number(e.target.value) : undefined })}
                >
                  <option value="">—</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </Select>
                <Select
                  label="Тип обучения"
                  value={form.study_type || 'mini_group'}
                  onChange={(e) => setForm({ ...form, study_type: e.target.value })}
                >
                  {STUDY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Язык"
                  value={form.language || ''}
                  onChange={(e) => setForm({ ...form, language: e.target.value })}
                />
                <Input
                  label="Уровень"
                  value={form.level || ''}
                  onChange={(e) => setForm({ ...form, level: e.target.value })}
                />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <Input
                  label="Вместимость"
                  type="number"
                  value={form.max_students || 12}
                  onChange={(e) => setForm({ ...form, max_students: Number(e.target.value) })}
                />
                <Input
                  label="Дата запуска"
                  type="date"
                  value={form.start_date as string}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
                <Input
                  label="Дата завершения"
                  type="date"
                  value={form.end_date as string}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </>
          )}

          {tab === 'finance' && (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                <Select
                  label="Тип баланса"
                  value={form.balance_type || 'lessons'}
                  onChange={(e) => setForm({ ...form, balance_type: e.target.value as 'lessons' | 'rubles' })}
                >
                  {BALANCE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
                <Input
                  label="Длительность академ. часа (мин)"
                  type="number"
                  value={form.academic_hour_minutes || 45}
                  onChange={(e) => setForm({ ...form, academic_hour_minutes: Number(e.target.value) })}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Стоимость часа для студентов (₽)"
                  type="number"
                  step="0.01"
                  value={form.hourly_rate ? (form.hourly_rate / 100).toFixed(2) : '0.00'}
                  onChange={(e) => setForm({ ...form, hourly_rate: Math.round(Number(e.target.value) * 100) })}
                />
                <Input
                  label="Ежемесячный платёж (₽)"
                  type="number"
                  step="0.01"
                  value={form.monthly_fee ? (form.monthly_fee / 100).toFixed(2) : ''}
                  onChange={(e) =>
                    setForm({ ...form, monthly_fee: e.target.value ? Math.round(Number(e.target.value) * 100) : undefined })
                  }
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-fox-border bg-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.auto_invoices_enabled}
                    onChange={(e) => setForm({ ...form, auto_invoices_enabled: e.target.checked })}
                    className="w-5 h-5 accent-fox-purple"
                  />
                  <span className="text-sm text-fox-graphite">Автоматические счета</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-xl border border-fox-border bg-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.certificates_enabled}
                    onChange={(e) => setForm({ ...form, certificates_enabled: e.target.checked })}
                    className="w-5 h-5 accent-fox-purple"
                  />
                  <span className="text-sm text-fox-graphite">Грамоты по окончании</span>
                </label>
              </div>
            </>
          )}
        </div>
      </form>
    </Modal>
  )
}

// --- Group detail modal ---

interface GroupDetailModalProps {
  isOpen: boolean
  onClose: () => void
  group: Group | null
  teachers: User[]
  students: User[]
  canManage: boolean
  onUpdated: () => void
}

function GroupDetailModal({ isOpen, onClose, group, teachers, students, canManage, onUpdated }: GroupDetailModalProps) {
  const { showToast } = useToast()
  const [tab, setTab] = useState('info')
  const [memberships, setMemberships] = useState<GroupMembership[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(false)

  const [showAddStudent, setShowAddStudent] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [newStudent, setNewStudent] = useState({ name: '', email: '', password: '', phone: '' })
  const [addModeExisting, setAddModeExisting] = useState(true)

  const [editingMembership, setEditingMembership] = useState<GroupMembership | null>(null)

  const [scheduleMode, setScheduleMode] = useState<'recurring' | 'single' | null>(null)
  const [recurring, setRecurring] = useState({
    weekdays: [] as number[],
    startTime: '09:00',
    endTime: '10:00',
    periodStart: '',
    periodEnd: '',
  })
  const [single, setSingle] = useState<Partial<Schedule>>({
    title: '',
    start_time: '',
    end_time: '',
    room: '',
    teacher_id: undefined,
  })
  const [submittingSchedule, setSubmittingSchedule] = useState(false)

  useEffect(() => {
    setTab('info')
    setShowAddStudent(false)
    setScheduleMode(null)
  }, [group?.id])

  useEffect(() => {
    if (!group || !isOpen) return
    loadDetails()
  }, [group, isOpen, tab])

  const loadDetails = async () => {
    if (!group) return
    setLoading(true)
    try {
      const [membersRes, schedulesRes] = await Promise.all([
        groupsApi.listStudents(group.id),
        schedulesApi.list({ group_id: group.id }),
      ])
      setMemberships(membersRes)
      setSchedules(schedulesRes)
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка загрузки деталей'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!group) return
    try {
      const payload: Partial<GroupMembershipAdd> = addModeExisting
        ? { student_id: selectedStudentId ? Number(selectedStudentId) : undefined }
        : {
            new_student_name: newStudent.name,
            new_student_email: newStudent.email,
            new_student_password: newStudent.password,
            new_student_phone: newStudent.phone,
          }
      await groupsApi.addStudent(group.id, payload)
      showToast('Ученик добавлен', 'success')
      setShowAddStudent(false)
      setSelectedStudentId('')
      setNewStudent({ name: '', email: '', password: '', phone: '' })
      loadDetails()
      onUpdated()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка добавления ученика'), 'error')
    }
  }

  const handleRemoveStudent = async (studentId: number) => {
    if (!group || !confirm('Удалить ученика из группы?')) return
    try {
      await groupsApi.removeStudent(group.id, studentId)
      showToast('Ученик удалён из группы', 'success')
      loadDetails()
      onUpdated()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка удаления'), 'error')
    }
  }

  const handleUpdateMembership = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!group || !editingMembership) return
    try {
      await groupsApi.updateStudent(group.id, editingMembership.student_id, {
        joined_at: editingMembership.joined_at,
        left_at: editingMembership.left_at,
        status: editingMembership.status,
        individual_hourly_rate: editingMembership.individual_hourly_rate,
        individual_lesson_count: editingMembership.individual_lesson_count,
        discount_percent: editingMembership.discount_percent,
        individual_monthly_fee: editingMembership.individual_monthly_fee,
        auto_invoices_enabled: editingMembership.auto_invoices_enabled,
      })
      showToast('Настройки обновлены', 'success')
      setEditingMembership(null)
      loadDetails()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка обновления'), 'error')
    }
  }

  const toggleWeekday = (value: number) => {
    setRecurring((prev) => ({
      ...prev,
      weekdays: prev.weekdays.includes(value)
        ? prev.weekdays.filter((v) => v !== value)
        : [...prev.weekdays, value].sort(),
    }))
  }

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!group) return
    setSubmittingSchedule(true)
    try {
      if (scheduleMode === 'recurring') {
        if (recurring.weekdays.length === 0 || !recurring.periodStart || !recurring.periodEnd) {
          showToast('Выберите дни недели и период', 'warning')
          setSubmittingSchedule(false)
          return
        }
        const periodStart = new Date(recurring.periodStart)
        const periodEnd = new Date(recurring.periodEnd)
        for (const wd of recurring.weekdays) {
          const first = nextWeekday(periodStart, wd)
          const [sh, sm] = recurring.startTime.split(':').map(Number)
          const [eh, em] = recurring.endTime.split(':').map(Number)
          const start = new Date(first)
          start.setHours(sh, sm, 0, 0)
          const end = new Date(first)
          end.setHours(eh, em, 0, 0)
          await schedulesApi.create({
            title: `${group.name} — ${WEEKDAYS.find((w) => w.value === wd)?.label}`,
            group_id: group.id,
            teacher_id: group.teacher_id,
            room: group.room,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            recurrence: 'weekly',
            recurrence_end: periodEnd.toISOString(),
            status: 'scheduled',
          })
        }
        showToast('Регулярное расписание создано', 'success')
      } else {
        if (!single.title || !single.start_time || !single.end_time) {
          showToast('Заполните название, начало и окончание', 'warning')
          setSubmittingSchedule(false)
          return
        }
        await schedulesApi.create({
          ...single,
          group_id: group.id,
          teacher_id: single.teacher_id || group.teacher_id,
          room: single.room || group.room,
          recurrence: 'none',
          status: 'scheduled',
        })
        showToast('Занятие создано', 'success')
      }
      setScheduleMode(null)
      setRecurring({ weekdays: [], startTime: '09:00', endTime: '10:00', periodStart: '', periodEnd: '' })
      setSingle({ title: '', start_time: '', end_time: '', room: '', teacher_id: undefined })
      loadDetails()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка создания расписания'), 'error')
    } finally {
      setSubmittingSchedule(false)
    }
  }

  const handleDeleteSchedule = async (id: number) => {
    if (!confirm('Удалить занятие из расписания?')) return
    try {
      await schedulesApi.delete(id)
      showToast('Занятие удалено', 'success')
      loadDetails()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка удаления'), 'error')
    }
  }

  const tabs = [
    { id: 'info', label: 'Инфо', icon: <LuSettings /> },
    { id: 'finance', label: 'Финансы', icon: <LuCreditCard /> },
    { id: 'students', label: 'Ученики', icon: <LuGraduationCap /> },
    { id: 'schedule', label: 'Расписание', icon: <LuCalendar /> },
  ]

  if (!group) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={group.name} size="lg">
      <Tabs tabs={tabs} activeTab={tab} onChange={setTab} />

      <div className="mt-4">
        {tab === 'info' && (
          <div className="space-y-3 text-sm">
            <InfoRow label="Статус" value={group.status === 'current' ? 'Текущая' : group.status === 'planned' ? 'Запланирована' : 'Закрыта'} />
            <InfoRow label="Филиал" value={group.branch_name || '—'} />
            <InfoRow label="Преподаватель" value={group.teacher_name || '—'} />
            <InfoRow label="Курс" value={group.course_title || '—'} />
            <InfoRow label="Аудитория" value={group.room || '—'} />
            <InfoRow label="Тип обучения" value={STUDY_TYPES.find((t) => t.value === group.study_type)?.label || group.study_type || '—'} />
            <InfoRow label="Язык / уровень" value={`${group.language || '—'} / ${group.level || '—'}`} />
            <InfoRow label="Вместимость" value={`${group.students_count ?? 0} / ${group.max_students ?? 12}`} />
            <InfoRow label="Период" value={`${formatDate(group.start_date)} — ${formatDate(group.end_date)}`} />
          </div>
        )}

        {tab === 'finance' && (
          <div className="space-y-3 text-sm">
            <InfoRow label="Тип баланса" value={group.balance_type === 'rubles' ? 'Рубли' : 'Уроки'} />
            <InfoRow label="Стоимость часа" value={formatMoney(group.hourly_rate)} />
            <InfoRow label="Ежемесячный платёж" value={formatMoney(group.monthly_fee)} />
            <InfoRow label="Академ. час" value={`${group.academic_hour_minutes} мин`} />
            <InfoRow label="Автосчета" value={group.auto_invoices_enabled ? 'Включены' : 'Отключены'} />
            <InfoRow label="Грамоты" value={group.certificates_enabled ? 'Включены' : 'Отключены'} />
          </div>
        )}

        {tab === 'students' && (
          <div className="space-y-4">
            {canManage && !showAddStudent && (
              <Button size="sm" leftIcon={<LuPlus />} onClick={() => setShowAddStudent(true)}>
                Добавить ученика
              </Button>
            )}

            {showAddStudent && (
              <Card className="bg-fox-light/50">
                <form onSubmit={handleAddStudent} className="space-y-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAddModeExisting(true)}
                      className={`px-3 py-1.5 text-sm rounded-lg ${addModeExisting ? 'bg-fox-gold text-fox-purple' : 'bg-white text-fox-gray'}`}
                    >
                      Существующий
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddModeExisting(false)}
                      className={`px-3 py-1.5 text-sm rounded-lg ${!addModeExisting ? 'bg-fox-gold text-fox-purple' : 'bg-white text-fox-gray'}`}
                    >
                      Новый
                    </button>
                  </div>
                  {addModeExisting ? (
                    <Select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      required
                    >
                      <option value="">Выберите ученика</option>
                      {students
                        .filter((s) => !memberships.some((m) => m.student_id === s.id && m.status === 'active'))
                        .map((s) => (
                          <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                        ))}
                    </Select>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-3">
                      <Input placeholder="Имя" value={newStudent.name} onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })} required />
                      <Input type="email" placeholder="Email" value={newStudent.email} onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })} required />
                      <Input type="password" placeholder="Пароль" value={newStudent.password} onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })} required />
                      <Input placeholder="Телефон" value={newStudent.phone} onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })} />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">Добавить</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setShowAddStudent(false)}>
                      Отмена
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {loading ? (
              <Loader text="Загрузка..." />
            ) : memberships.length === 0 ? (
              <EmptyState icon={<LuGraduationCap />} title="Нет учеников" description="Добавьте первого ученика в группу." />
            ) : (
              <div className="space-y-2">
                {memberships.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-fox-border/60"
                  >
                    <div>
                      <p className="font-medium text-fox-dark">{m.student?.name || '—'}</p>
                      <p className="text-xs text-fox-gray">{m.student?.email}</p>
                      <p className="text-xs text-fox-gray">Начало: {formatDate(m.joined_at)}</p>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" leftIcon={<LuPencil size={16} />} onClick={() => setEditingMembership(m)} />
                        {m.status === 'active' && (
                          <Button size="sm" variant="ghost" leftIcon={<LuTrash2 size={16} />} onClick={() => handleRemoveStudent(m.student_id)} />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'schedule' && (
          <div className="space-y-4">
            {canManage && !scheduleMode && (
              <div className="flex gap-2">
                <Button size="sm" leftIcon={<LuPlus />} onClick={() => setScheduleMode('recurring')}>
                  Регулярное расписание
                </Button>
                <Button size="sm" variant="secondary" leftIcon={<LuPlus />} onClick={() => setScheduleMode('single')}>
                  Одиночное занятие
                </Button>
              </div>
            )}

            {scheduleMode && (
              <Card className="bg-fox-light/50">
                <form onSubmit={handleCreateSchedule} className="space-y-4">
                  {scheduleMode === 'recurring' ? (
                    <>
                      <div>
                        <p className="text-sm font-semibold text-fox-graphite mb-2">Дни недели</p>
                        <div className="flex flex-wrap gap-2">
                          {WEEKDAYS.map((wd) => (
                            <button
                              key={wd.value}
                              type="button"
                              onClick={() => toggleWeekday(wd.value)}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                                recurring.weekdays.includes(wd.value)
                                  ? 'bg-fox-gold text-fox-purple border-fox-gold'
                                  : 'bg-white text-fox-gray border-fox-border'
                              }`}
                            >
                              {wd.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-3">
                        <Input label="Начало урока" type="time" value={recurring.startTime} onChange={(e) => setRecurring({ ...recurring, startTime: e.target.value })} required />
                        <Input label="Окончание урока" type="time" value={recurring.endTime} onChange={(e) => setRecurring({ ...recurring, endTime: e.target.value })} required />
                      </div>
                      <div className="grid md:grid-cols-2 gap-3">
                        <Input label="Период с" type="date" value={recurring.periodStart} onChange={(e) => setRecurring({ ...recurring, periodStart: e.target.value })} required />
                        <Input label="Период по" type="date" value={recurring.periodEnd} onChange={(e) => setRecurring({ ...recurring, periodEnd: e.target.value })} required />
                      </div>
                    </>
                  ) : (
                    <>
                      <Input label="Название" value={single.title || ''} onChange={(e) => setSingle({ ...single, title: e.target.value })} required />
                      <div className="grid md:grid-cols-2 gap-3">
                        <Input label="Начало" type="datetime-local" value={single.start_time || ''} onChange={(e) => setSingle({ ...single, start_time: e.target.value })} required />
                        <Input label="Окончание" type="datetime-local" value={single.end_time || ''} onChange={(e) => setSingle({ ...single, end_time: e.target.value })} required />
                      </div>
                      <div className="grid md:grid-cols-2 gap-3">
                        <Select
                          label="Преподаватель"
                          value={single.teacher_id || ''}
                          onChange={(e) => setSingle({ ...single, teacher_id: e.target.value ? Number(e.target.value) : undefined })}
                        >
                          <option value="">По умолчанию</option>
                          {teachers.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </Select>
                        <Input label="Аудитория / ссылка" value={single.room || ''} onChange={(e) => setSingle({ ...single, room: e.target.value })} />
                      </div>
                    </>
                  )}
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" loading={submittingSchedule}>Создать</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setScheduleMode(null)}>
                      Отмена
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {loading ? (
              <Loader text="Загрузка расписания..." />
            ) : schedules.length === 0 ? (
              <EmptyState icon={<LuCalendar />} title="Нет занятий" description="Добавьте расписание группы." />
            ) : (
              <Card padding="none">
                <Table>
                  <Thead>
                    <tr>
                      <Th>Название</Th>
                      <Th>Начало</Th>
                      <Th>Окончание</Th>
                      <Th>Аудитория</Th>
                      <Th>Повторение</Th>
                      {canManage && <Th>Действия</Th>}
                    </tr>
                  </Thead>
                  <Tbody>
                    {schedules.map((s) => (
                      <Tr key={s.id}>
                        <Td className="font-medium text-fox-dark">{s.title}</Td>
                        <Td className="whitespace-nowrap">{formatDateTime(s.start_time)}</Td>
                        <Td className="whitespace-nowrap">{formatDateTime(s.end_time)}</Td>
                        <Td>{s.room || '—'}</Td>
                        <Td>{s.recurrence === 'none' ? 'Одиночное' : s.recurrence === 'weekly' ? 'Еженедельно' : s.recurrence}</Td>
                        {canManage && (
                          <Td>
                            <Button size="sm" variant="ghost" leftIcon={<LuTrash2 size={16} />} onClick={() => handleDeleteSchedule(s.id)} />
                          </Td>
                        )}
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Edit membership modal */}
      <Modal
        isOpen={!!editingMembership}
        onClose={() => setEditingMembership(null)}
        title="Настройки ученика в группе"
        size="md"
      >
        {editingMembership && (
          <form onSubmit={handleUpdateMembership} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <Input label="Начало обучения" type="date" value={toDateInputValue(editingMembership.joined_at)} onChange={(e) => setEditingMembership({ ...editingMembership, joined_at: e.target.value })} />
              <Input label="Окончание обучения" type="date" value={toDateInputValue(editingMembership.left_at)} onChange={(e) => setEditingMembership({ ...editingMembership, left_at: e.target.value || null })} />
            </div>
            <Input
              label="Индивидуальная стоимость часа (₽)"
              type="number"
              step="0.01"
              value={editingMembership.individual_hourly_rate ? (editingMembership.individual_hourly_rate / 100).toFixed(2) : ''}
              onChange={(e) =>
                setEditingMembership({
                  ...editingMembership,
                  individual_hourly_rate: e.target.value ? Math.round(Number(e.target.value) * 100) : null,
                })
              }
            />
            <Input
              label="Скидка (%)"
              type="number"
              value={editingMembership.discount_percent || 0}
              onChange={(e) => setEditingMembership({ ...editingMembership, discount_percent: Number(e.target.value) })}
            />
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={editingMembership.auto_invoices_enabled}
                onChange={(e) => setEditingMembership({ ...editingMembership, auto_invoices_enabled: e.target.checked })}
                className="w-5 h-5 accent-fox-purple"
              />
              <span className="text-sm text-fox-graphite">Автоматические счета</span>
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditingMembership(null)}>Отмена</Button>
              <Button type="submit">Сохранить</Button>
            </div>
          </form>
        )}
      </Modal>
    </Modal>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-fox-border/50 last:border-0">
      <span className="text-fox-gray">{label}</span>
      <span className="font-medium text-fox-dark text-right">{value}</span>
    </div>
  )
}
