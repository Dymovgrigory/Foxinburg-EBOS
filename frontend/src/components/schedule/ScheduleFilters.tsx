import { Input, Select } from '../ui'

export interface FilterState {
  branchId: string
  room: string
  teacherId: string
  groupId: string
  status: string
  search: string
}

interface Props {
  filters: FilterState
  onChange: (filters: FilterState) => void
  branches: { id: number; name: string }[]
  rooms: string[]
  teachers: { id: number; name: string }[]
  groups: { id: number; name: string }[]
}

export default function ScheduleFilters({ filters, onChange, branches, rooms, teachers, groups }: Props) {
  const update = (key: keyof FilterState, value: string) => onChange({ ...filters, [key]: value })

  return (
    <div className="flex flex-col xl:flex-row gap-3">
      <Input
        placeholder="Поиск по названию или группе"
        value={filters.search}
        onChange={(e) => update('search', e.target.value)}
        className="xl:max-w-xs"
      />
      <div className="flex flex-col sm:flex-row gap-3 flex-1">
        <Select value={filters.branchId} onChange={(e) => update('branchId', e.target.value)}>
          <option value="">Все филиалы</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
        <Select value={filters.room} onChange={(e) => update('room', e.target.value)}>
          <option value="">Все аудитории</option>
          {rooms.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        <Select value={filters.teacherId} onChange={(e) => update('teacherId', e.target.value)}>
          <option value="">Все преподаватели</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
        <Select value={filters.groupId} onChange={(e) => update('groupId', e.target.value)}>
          <option value="">Все группы</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
        <Select value={filters.status} onChange={(e) => update('status', e.target.value)}>
          <option value="">Все статусы</option>
          <option value="scheduled">Запланировано</option>
          <option value="confirmed">Подтверждено</option>
          <option value="completed">Проведено</option>
          <option value="cancelled">Отменено</option>
        </Select>
      </div>
    </div>
  )
}
