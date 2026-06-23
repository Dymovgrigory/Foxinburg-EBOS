import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import { useToast, Button, Card, Loader, EmptyState, Tabs, PageShell } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { schedulesApi, groupsApi, usersApi, branchesApi, attendanceApi } from '../api'
import AttendanceModal from '../components/AttendanceModal'
import ScheduleCalendar, { type CalendarView } from '../components/schedule/ScheduleCalendar'
import ScheduleFilters, { type FilterState } from '../components/schedule/ScheduleFilters'
import ScheduleEventModal from '../components/schedule/ScheduleEventModal'
import ScheduleCreateModal from '../components/schedule/ScheduleCreateModal'
import { addDays, startOfWeek, formatDateLong, sortOccurrences } from '../components/schedule/utils'
import type { ScheduleOccurrence, User, Attendance, Group, Branch } from '../types'
import { LuCalendar, LuChevronLeft, LuChevronRight, LuPlus } from 'react-icons/lu'

const VIEW_TABS = [
  { id: 'week', label: 'Неделя' },
  { id: 'day', label: 'День' },
  { id: 'month', label: 'Месяц' },
  { id: 'agenda', label: 'Список' },
]

export default function SchedulePage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const isTeacher = user?.role === 'teacher'
  const isStudent = user?.role === 'student'
  const canManage = !isTeacher && !isStudent
  const canConduct = ['teacher', 'methodist', 'admin', 'super_admin', 'owner'].includes(user?.role || '')

  const [view, setView] = useState<CalendarView>('week')
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [occurrences, setOccurrences] = useState<ScheduleOccurrence[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [teachers, setTeachers] = useState<User[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [rooms, setRooms] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterState>({
    branchId: '',
    room: '',
    teacherId: '',
    groupId: '',
    status: '',
    search: '',
  })

  const [selectedOccurrence, setSelectedOccurrence] = useState<ScheduleOccurrence | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const [conductSchedule, setConductSchedule] = useState<ScheduleOccurrence | null>(null)
  const [conductStudents, setConductStudents] = useState<User[]>([])
  const [conductAttendances, setConductAttendances] = useState<Attendance[]>([])
  const [conductLoading, setConductLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [groupsRes, usersRes, branchesRes] = await Promise.all([
        canManage ? groupsApi.list({ status: 'current' }) : groupsApi.my(),
        canManage ? usersApi.list() : Promise.resolve([]),
        branchesApi.list().catch(() => []),
      ])
      setGroups(groupsRes)
      setBranches(branchesRes)
      const teacherList = (usersRes as User[]).filter((u) => u.role === 'teacher')
      setTeachers(teacherList)
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Ошибка загрузки справочников', 'error')
    }
    await fetchCalendar()
    setLoading(false)
  }

  const fetchCalendar = async () => {
    const range = getDateRange(view, currentDate)
    const params: Record<string, string | number | undefined> = {
      from_date: range.from.toISOString(),
      to_date: range.to.toISOString(),
    }
    if (filters.branchId) params.branch_id = Number(filters.branchId)
    if (filters.teacherId) params.teacher_id = Number(filters.teacherId)
    if (filters.groupId) params.group_id = Number(filters.groupId)
    if (filters.room) params.room = filters.room

    try {
      const data = await schedulesApi.calendar(params)
      setOccurrences(data)
      // Собираем уникальные аудитории из загруженных событий
      const uniqueRooms = Array.from(new Set(data.map((o) => o.room).filter(Boolean) as string[])).sort()
      setRooms(uniqueRooms)
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Ошибка загрузки календаря', 'error')
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchCalendar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, currentDate, filters.branchId, filters.teacherId, filters.groupId, filters.room])

  const filteredOccurrences = useMemo(() => {
    let list = [...occurrences]
    if (filters.status) list = list.filter((o) => o.status === filters.status)
    if (filters.search) {
      const q = filters.search.toLowerCase()
      list = list.filter(
        (o) =>
          o.title.toLowerCase().includes(q) ||
          (groups.find((g) => g.id === o.group_id)?.name || '').toLowerCase().includes(q) ||
          (teachers.find((t) => t.id === o.teacher_id)?.name || '').toLowerCase().includes(q)
      )
    }
    return sortOccurrences(list)
  }, [occurrences, filters.status, filters.search, groups, teachers])

  const groupMap = useMemo(() => {
    const map: Record<number, string> = {}
    groups.forEach((g) => (map[g.id] = g.name))
    return map
  }, [groups])

  const teacherMap = useMemo(() => {
    const map: Record<number, string> = {}
    teachers.forEach((t) => (map[t.id] = t.name))
    return map
  }, [teachers])

  const navigate = (direction: number) => {
    if (view === 'day') setCurrentDate((d) => addDays(d, direction))
    else if (view === 'week') setCurrentDate((d) => addDays(d, direction * 7))
    else if (view === 'month') setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + direction, 1))
  }

  const openConduct = async (occurrence: ScheduleOccurrence) => {
    if (!occurrence.group_id) return
    setConductSchedule(occurrence)
    setConductLoading(true)
    try {
      const [studentsRes, attendancesRes] = await Promise.all([
        usersApi.listStudents(),
        attendanceApi.listBySchedule(occurrence.schedule_id),
      ])
      const roster = (studentsRes as User[]).filter((u) => u.group_id === occurrence.group_id)
      setConductStudents(roster)
      setConductAttendances(attendancesRes)
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Ошибка загрузки данных для занятия', 'error')
    } finally {
      setConductLoading(false)
    }
  }

  return (
    <PageShell>
      <Header title="Расписание" subtitle={`Занятий: ${filteredOccurrences.length}`} icon={<LuCalendar />} />

      <div className="p-4 md:p-6 w-full space-y-6">
        <Card>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-fox-purple">{pageTitle(view, currentDate)}</h2>
              <p className="text-sm text-fox-gray mt-1">{filteredOccurrences.length} из {occurrences.length} занятий</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-white border border-fox-border rounded-button overflow-hidden">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-fox-light text-fox-graphite">
                  <LuChevronLeft />
                </button>
                <button onClick={() => setCurrentDate(new Date())} className="px-3 py-2 text-sm font-semibold text-fox-graphite hover:bg-fox-light">
                  Сегодня
                </button>
                <button onClick={() => navigate(1)} className="p-2 hover:bg-fox-light text-fox-graphite">
                  <LuChevronRight />
                </button>
              </div>
              <Tabs tabs={VIEW_TABS} activeTab={view} onChange={(id) => setView(id as CalendarView)} />
              {canManage && (
                <Button leftIcon={<LuPlus />} onClick={() => setShowCreate(true)}>
                  Новое занятие
                </Button>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <ScheduleFilters
            filters={filters}
            onChange={setFilters}
            branches={branches}
            rooms={rooms}
            teachers={teachers}
            groups={groups}
          />
        </Card>

        <Card padding="none" className="overflow-hidden">
          {loading ? (
            <Loader text="Загрузка расписания..." />
          ) : filteredOccurrences.length === 0 ? (
            <EmptyState
              icon={<LuCalendar />}
              title="Нет занятий"
              description="Попробуй изменить фильтры или создай первое занятие."
              actionLabel={canManage ? 'Новое занятие' : undefined}
              onAction={canManage ? () => setShowCreate(true) : undefined}
            />
          ) : (
            <div className="p-4">
              <ScheduleCalendar
                view={view}
                currentDate={currentDate}
                occurrences={filteredOccurrences}
                groups={groupMap}
                teachers={teacherMap}
                onSelect={setSelectedOccurrence}
              />
            </div>
          )}
        </Card>
      </div>

      <ScheduleEventModal
        isOpen={!!selectedOccurrence}
        onClose={() => setSelectedOccurrence(null)}
        occurrence={selectedOccurrence}
        groups={groups}
        teachers={teachers}
        branches={branches}
        canManage={canManage}
        onSaved={fetchCalendar}
        onConduct={canConduct ? openConduct : undefined}
      />

      <ScheduleCreateModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        initialDate={currentDate}
        groups={groups}
        teachers={teachers}
        branches={branches}
        onCreated={fetchCalendar}
      />

      <AttendanceModal
        isOpen={!!conductSchedule}
        onClose={() => {
          setConductSchedule(null)
          setConductStudents([])
          setConductAttendances([])
        }}
        schedule={
          conductSchedule
            ? ({
                ...conductSchedule,
                id: conductSchedule.schedule_id,
              } as any)
            : null
        }
        students={conductStudents}
        initialAttendances={conductAttendances}
        loading={conductLoading}
        onSaved={() => {
          fetchCalendar()
          setConductSchedule(null)
        }}
      />
    </PageShell>
  )
}

function getDateRange(view: CalendarView, currentDate: Date): { from: Date; to: Date } {
  const now = new Date(currentDate)
  if (view === 'day') {
    const from = new Date(now)
    from.setHours(0, 0, 0, 0)
    const to = new Date(now)
    to.setHours(23, 59, 59, 999)
    return { from, to }
  }
  if (view === 'week') {
    const from = startOfWeek(now)
    const to = addDays(from, 6)
    to.setHours(23, 59, 59, 999)
    return { from, to }
  }
  // month
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return { from, to }
}

function pageTitle(view: CalendarView, currentDate: Date): string {
  if (view === 'day') return formatDateLong(currentDate.toISOString())
  if (view === 'week') {
    const start = startOfWeek(currentDate)
    const end = addDays(start, 6)
    return `${formatDateLong(start.toISOString())} – ${formatDateLong(end.toISOString())}`
  }
  return currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
}
