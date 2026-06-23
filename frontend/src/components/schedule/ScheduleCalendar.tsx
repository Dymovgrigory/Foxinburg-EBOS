import type { ScheduleOccurrence } from '../../types'
import {
  parseISO,
  formatTime,
  formatDateLong,
  getDayName,
  getDayNumber,
  getHoursRange,
  getWeekDays,
  getMonthGrid,
  groupByDay,
  isSameDay,
  statusVariant,
  statusLabel,
} from './utils'
import { Badge } from '../ui'

export type CalendarView = 'week' | 'day' | 'month' | 'agenda'

interface Props {
  view: CalendarView
  currentDate: Date
  occurrences: ScheduleOccurrence[]
  groups: Record<number, string>
  teachers: Record<number, string>
  minHour?: number
  maxHour?: number
  onSelect: (occ: ScheduleOccurrence) => void
}

const SLOT_HEIGHT = 60 // px за час

export default function ScheduleCalendar({
  view,
  currentDate,
  occurrences,
  groups,
  teachers,
  minHour = 7,
  maxHour = 22,
  onSelect,
}: Props) {
  if (view === 'agenda') return <AgendaView occurrences={occurrences} groups={groups} teachers={teachers} onSelect={onSelect} />
  if (view === 'month') return <MonthView currentDate={currentDate} occurrences={occurrences} groups={groups} onSelect={onSelect} />
  if (view === 'day') return <WeekDayView isDay currentDate={currentDate} occurrences={occurrences} groups={groups} teachers={teachers} minHour={minHour} maxHour={maxHour} onSelect={onSelect} />
  return <WeekDayView currentDate={currentDate} occurrences={occurrences} groups={groups} teachers={teachers} minHour={minHour} maxHour={maxHour} onSelect={onSelect} />
}

function AgendaView({
  occurrences,
  groups,
  teachers,
  onSelect,
}: Pick<Props, 'occurrences' | 'groups' | 'teachers' | 'onSelect'>) {
  if (occurrences.length === 0) {
    return (
      <div className="text-center py-12 text-fox-gray">
        <p>Нет занятий за выбранный период.</p>
      </div>
    )
  }

  const byDay = groupByDay(occurrences)
  return (
    <div className="space-y-6">
      {Object.entries(byDay).map(([dayKey, list]) => (
        <div key={dayKey}>
          <h4 className="text-sm font-bold text-fox-purple mb-3">{formatDateLong(list[0].start_time)}</h4>
          <div className="space-y-2">
            {list.map((occ) => (
              <button
                key={`${occ.schedule_id}-${occ.start_time}`}
                onClick={() => onSelect(occ)}
                className="w-full text-left flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-xl border border-fox-border bg-white hover:shadow-fox transition"
              >
                <div className="text-sm font-semibold text-fox-dark whitespace-nowrap">
                  {formatTime(occ.start_time)} – {formatTime(occ.end_time)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-fox-dark truncate">{occ.title}</div>
                  <div className="text-xs text-fox-gray truncate">
                    {groups[occ.group_id || 0] || '—'} · {teachers[occ.teacher_id || 0] || '—'} · {occ.room || '—'}
                  </div>
                </div>
                <Badge variant={statusVariant(occ.status)}>{statusLabel(occ.status)}</Badge>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function MonthView({
  currentDate,
  occurrences,
  groups,
  onSelect,
}: Pick<Props, 'currentDate' | 'occurrences' | 'groups' | 'onSelect'>) {
  const days = getMonthGrid(currentDate)
  const byDay = groupByDay(occurrences)

  return (
    <div className="grid grid-cols-7 gap-2">
      {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
        <div key={d} className="text-center text-xs font-bold text-fox-gray py-2">
          {d}
        </div>
      ))}
      {days.map((day) => {
        const key = day.toDateString()
        const list = byDay[key] || []
        const isCurrentMonth = day.getMonth() === currentDate.getMonth()
        return (
          <div
            key={key}
            className={[
              'min-h-[120px] rounded-xl border p-2 transition',
              isCurrentMonth ? 'bg-white border-fox-border' : 'bg-fox-light/50 border-fox-border/40',
            ].join(' ')}
          >
            <div className={['text-xs font-bold mb-1', isCurrentMonth ? 'text-fox-dark' : 'text-fox-gray/60'].join(' ')}>
              {getDayNumber(day)}
            </div>
            <div className="space-y-1">
              {list.slice(0, 3).map((occ) => (
                <button
                  key={`${occ.schedule_id}-${occ.start_time}`}
                  onClick={() => onSelect(occ)}
                  className="w-full text-left text-[10px] leading-tight px-1.5 py-1 rounded-md truncate"
                  style={{ backgroundColor: occ.color || '#F5ED75', color: '#3A2953' }}
                  title={occ.title}
                >
                  {formatTime(occ.start_time)} {groups[occ.group_id || 0] || occ.title}
                </button>
              ))}
              {list.length > 3 && (
                <div className="text-[10px] text-fox-gray pl-1">+{list.length - 3}</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function WeekDayView({
  isDay,
  currentDate,
  occurrences,
  groups,
  teachers,
  minHour,
  maxHour,
  onSelect,
}: Pick<Props, 'currentDate' | 'occurrences' | 'groups' | 'teachers' | 'minHour' | 'maxHour' | 'onSelect'> & {
  isDay?: boolean
}) {
  const days = isDay ? [new Date(currentDate)] : getWeekDays(startOfWeek(currentDate))
  const hours = getHoursRange(minHour || 7, maxHour || 22)
  const totalHeight = hours.length * SLOT_HEIGHT

  const eventsForDay = (day: Date) =>
    occurrences.filter((occ) => isSameDay(parseISO(occ.start_time), day))

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Header */}
        <div className="grid" style={{ gridTemplateColumns: `48px repeat(${days.length}, minmax(0, 1fr))` }}>
          <div className="h-12"></div>
          {days.map((day) => (
            <div key={day.toISOString()} className="h-12 flex flex-col items-center justify-center border-b border-fox-border">
              <span className="text-xs text-fox-gray uppercase">{getDayName(day)}</span>
              <span className={['text-lg font-bold leading-none', isSameDay(day, new Date()) ? 'text-fox-purple' : 'text-fox-dark'].join(' ')}>
                {getDayNumber(day)}
              </span>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid relative" style={{ gridTemplateColumns: `48px repeat(${days.length}, minmax(0, 1fr))` }}>
          {/* Time labels */}
          <div className="relative" style={{ height: totalHeight }}>
            {hours.map((h, idx) => (
              <div
                key={h}
                className="absolute right-1 text-[10px] text-fox-gray -translate-y-1/2"
                style={{ top: idx * SLOT_HEIGHT }}
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Columns */}
          {days.map((day) => (
            <DayColumn
              key={day.toISOString()}
              hours={hours}
              events={eventsForDay(day)}
              groups={groups}
              teachers={teachers}
              totalHeight={totalHeight}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function DayColumn({
  hours,
  events,
  groups,
  teachers,
  totalHeight,
  onSelect,
}: {
  hours: number[]
  events: ScheduleOccurrence[]
  groups: Record<number, string>
  teachers: Record<number, string>
  totalHeight: number
  onSelect: (occ: ScheduleOccurrence) => void
}) {
  const overlappingGroups = computeOverlapGroups(events)

  return (
    <div className="relative border-l border-fox-border/60" style={{ height: totalHeight }}>
      {/* Horizontal grid lines */}
      {hours.map((_, idx) => (
        <div
          key={idx}
          className="absolute left-0 right-0 border-b border-fox-border/30"
          style={{ top: idx * SLOT_HEIGHT }}
        />
      ))}

      {overlappingGroups.map((group) =>
        group.map((occ, idx) => {
          const start = parseISO(occ.start_time)
          const end = parseISO(occ.end_time)
          const startMinutes = start.getHours() * 60 + start.getMinutes() - hours[0] * 60
          const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60)
          const top = (startMinutes / 60) * SLOT_HEIGHT
          const height = (durationMinutes / 60) * SLOT_HEIGHT
          const width = group.length > 1 ? `${100 / group.length}%` : 'calc(100% - 8px)'
          const left = group.length > 1 ? `${(idx / group.length) * 100}%` : '4px'

          return (
            <button
              key={`${occ.schedule_id}-${occ.start_time}`}
              onClick={() => onSelect(occ)}
              className="absolute rounded-lg px-2 py-1 text-left overflow-hidden border shadow-sm hover:shadow-md transition hover:brightness-95"
              style={{
                top: Math.max(top, 0),
                height: Math.max(height, 20),
                width,
                left,
                backgroundColor: occ.color || '#F5ED75',
                color: '#3A2953',
                borderColor: 'rgba(58,41,83,0.08)',
              }}
              title={occ.title}
            >
              <div className="text-[10px] font-bold leading-tight truncate">{formatTime(occ.start_time)} {groups[occ.group_id || 0] || occ.title}</div>
              <div className="text-[10px] leading-tight truncate opacity-90">{teachers[occ.teacher_id || 0] || ''}</div>
              {height > 36 && (
                <div className="text-[9px] leading-tight truncate opacity-80">{occ.room || ''}</div>
              )}
            </button>
          )
        })
      )}
    </div>
  )
}

function computeOverlapGroups(events: ScheduleOccurrence[]): ScheduleOccurrence[][] {
  if (events.length === 0) return []
  const sorted = [...events].sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime())
  const groups: ScheduleOccurrence[][] = []
  let currentGroup: ScheduleOccurrence[] = []
  let groupEnd = 0

  for (const ev of sorted) {
    const start = parseISO(ev.start_time).getTime()
    const end = parseISO(ev.end_time).getTime()
    if (currentGroup.length === 0 || start < groupEnd) {
      currentGroup.push(ev)
      groupEnd = Math.max(groupEnd, end)
    } else {
      groups.push(currentGroup)
      currentGroup = [ev]
      groupEnd = end
    }
  }
  if (currentGroup.length) groups.push(currentGroup)
  return groups
}

function startOfWeek(date: Date): Date {
  const result = new Date(date)
  const day = result.getDay()
  const diff = result.getDate() - day + (day === 0 ? -6 : 1)
  result.setDate(diff)
  result.setHours(0, 0, 0, 0)
  return result
}
