import type { ScheduleOccurrence } from '../../types'

export function parseISO(iso: string): Date {
  return new Date(iso)
}

export function formatTime(iso: string): string {
  const d = parseISO(iso)
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(iso: string): string {
  const d = parseISO(iso)
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
}

export function formatDateLong(iso: string): string {
  const d = parseISO(iso)
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', weekday: 'short' })
}

export function getDayName(date: Date): string {
  return date.toLocaleDateString('ru-RU', { weekday: 'short' })
}

export function getDayNumber(date: Date): number {
  return date.getDate()
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function startOfWeek(date: Date): Date {
  const result = new Date(date)
  const day = result.getDay() // 0 = Sun
  const diff = result.getDate() - day + (day === 0 ? -6 : 1)
  result.setDate(diff)
  result.setHours(0, 0, 0, 0)
  return result
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export function diffMinutes(startIso: string, endIso: string): number {
  return (parseISO(endIso).getTime() - parseISO(startIso).getTime()) / (1000 * 60)
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function getHoursRange(minHour: number, maxHour: number): number[] {
  const hours: number[] = []
  for (let h = minHour; h <= maxHour; h++) hours.push(h)
  return hours
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

export function getMonthGrid(weekStart: Date): Date[] {
  const start = startOfMonth(weekStart)
  const end = endOfMonth(weekStart)
  const gridStart = startOfWeek(start)
  const days: Date[] = []
  let current = new Date(gridStart)
  while (current <= end || days.length % 7 !== 0) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
    if (current > end && days.length % 7 === 0) break
  }
  return days
}

export function sortOccurrences(list: ScheduleOccurrence[]): ScheduleOccurrence[] {
  return [...list].sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime())
}

export function groupByDay(list: ScheduleOccurrence[]): Record<string, ScheduleOccurrence[]> {
  const map: Record<string, ScheduleOccurrence[]> = {}
  sortOccurrences(list).forEach((occ) => {
    const key = parseISO(occ.start_time).toDateString()
    if (!map[key]) map[key] = []
    map[key].push(occ)
  })
  return map
}

export function statusVariant(status: string): 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple' {
  const map: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'> = {
    scheduled: 'info',
    confirmed: 'success',
    cancelled: 'error',
    completed: 'default',
  }
  return map[status] || 'default'
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    scheduled: 'Запланировано',
    confirmed: 'Подтверждено',
    cancelled: 'Отменено',
    completed: 'Проведено',
  }
  return map[status] || status
}

export function recurrenceLabel(recurrence?: string | null): string {
  const map: Record<string, string> = {
    none: 'Без повторения',
    daily: 'Ежедневно',
    weekly: 'Еженедельно',
    monthly: 'Ежемесячно',
  }
  return map[recurrence || 'none'] || recurrence || '—'
}
