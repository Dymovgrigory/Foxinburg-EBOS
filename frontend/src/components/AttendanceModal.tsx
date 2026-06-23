import { useEffect, useMemo, useState } from 'react'
import { getErrorMessage } from '../utils/error'
import { useToast, Modal, Button, Textarea, Loader, EmptyState } from './ui'
import { attendanceApi, schedulesApi } from '../api'
import type { Schedule, User, Attendance } from '../types'
import { LuUsers, LuCheck } from 'react-icons/lu'

type AttendanceStatus = Attendance['status']

interface AttendanceModalProps {
  isOpen: boolean
  onClose: () => void
  schedule: Schedule | null
  occurrenceDate?: string
  students: User[]
  initialAttendances: Attendance[]
  onSaved: () => void
  loading?: boolean
}

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; short: string }[] = [
  { value: 'present', label: 'Присутствует', short: 'П' },
  { value: 'absent', label: 'Отсутствует', short: 'А' },
  { value: 'late', label: 'Опоздал', short: 'О' },
  { value: 'excused', label: 'Уважительная', short: 'У' },
]

const STATUS_META: Record<
  AttendanceStatus,
  { selectedClass: string; unselectedClass: string }
> = {
  present: {
    selectedClass: 'border-fox-success bg-fox-success/10 text-fox-success',
    unselectedClass: 'border-fox-border text-fox-gray hover:bg-fox-success/5 hover:text-fox-success',
  },
  absent: {
    selectedClass: 'border-fox-error bg-fox-error/10 text-fox-error',
    unselectedClass: 'border-fox-border text-fox-gray hover:bg-fox-error/5 hover:text-fox-error',
  },
  late: {
    selectedClass: 'border-fox-warning bg-fox-warning/10 text-fox-warning',
    unselectedClass: 'border-fox-border text-fox-gray hover:bg-fox-warning/5 hover:text-fox-warning',
  },
  excused: {
    selectedClass: 'border-fox-info bg-fox-info/10 text-fox-info',
    unselectedClass: 'border-fox-border text-fox-gray hover:bg-fox-info/5 hover:text-fox-info',
  },
}

export default function AttendanceModal({
  isOpen,
  onClose,
  schedule,
  occurrenceDate,
  students,
  initialAttendances,
  onSaved,
  loading = false,
}: AttendanceModalProps) {
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)

  const initialRecords = useMemo(() => {
    const map: Record<number, { status: AttendanceStatus; notes: string }> = {}
    students.forEach((s) => {
      const existing = initialAttendances.find((a) => a.student_id === s.id)
      map[s.id] = {
        status: existing?.status || 'present',
        notes: existing?.notes || '',
      }
    })
    return map
  }, [students, initialAttendances])

  const [records, setRecords] = useState(initialRecords)

  useEffect(() => {
    if (isOpen) {
      setRecords(initialRecords)
    }
  }, [isOpen, initialRecords])

  const setStatus = (studentId: number, status: AttendanceStatus) => {
    setRecords((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }))
  }

  const setNotes = (studentId: number, notes: string) => {
    setRecords((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], notes },
    }))
  }

  const setAll = (status: AttendanceStatus) => {
    const next: Record<number, { status: AttendanceStatus; notes: string }> = {}
    students.forEach((s) => {
      next[s.id] = { ...records[s.id], status }
    })
    setRecords(next)
  }

  const resetAll = () => {
    setRecords(initialRecords)
  }

  const handleSave = async () => {
    if (!schedule) return
    const effectiveOccurrenceDate = occurrenceDate || schedule.start_time.slice(0, 10)
    setSaving(true)
    try {
      await Promise.all(
        students.map((s) =>
          attendanceApi.mark({
            schedule_id: schedule.id,
            student_id: s.id,
            occurrence_date: effectiveOccurrenceDate,
            status: records[s.id]?.status || 'present',
            notes: records[s.id]?.notes,
          })
        )
      )

      if (schedule.status !== 'completed') {
        await schedulesApi.update(schedule.id, { status: 'completed' })
      }

      showToast('Посещаемость сохранена, занятие проведено', 'success')
      onSaved()
      onClose()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка сохранения посещаемости'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const presentCount = useMemo(
    () => students.filter((s) => records[s.id]?.status === 'present').length,
    [students, records]
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={schedule ? `Проведение занятия: ${schedule.title}` : 'Проведение занятия'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button onClick={handleSave} loading={saving} leftIcon={<LuCheck size={16} />}>
            Сохранить
          </Button>
        </>
      }
    >
      {loading ? (
        <Loader text="Загрузка данных..." />
      ) : students.length === 0 ? (
        <EmptyState
          icon={<LuUsers />}
          title="В группе нет учеников"
          description="Добавьте учеников в группу, чтобы отмечать посещаемость."
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-fox-gray">
              Присутствуют: <span className="font-semibold text-fox-purple">{presentCount}</span> / {students.length}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setAll('present')}>
                Все присутствуют
              </Button>
              <Button size="sm" variant="ghost" onClick={resetAll}>
                Сбросить
              </Button>
            </div>
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {students.map((student) => {
              const record = records[student.id] || { status: 'present', notes: '' }
              return (
                <div
                  key={student.id}
                  className="p-3 rounded-card border border-fox-border bg-white space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-fox-dark truncate">{student.name}</div>
                      <div className="text-xs text-fox-gray truncate">{student.email}</div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {STATUS_OPTIONS.map((opt) => {
                        const isSelected = record.status === opt.value
                        const meta = STATUS_META[opt.value]
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setStatus(student.id, opt.value)}
                            title={opt.label}
                            className={[
                              'w-9 h-9 rounded-lg text-sm font-semibold border transition',
                              isSelected ? meta.selectedClass : meta.unselectedClass,
                            ].join(' ')}
                          >
                            {opt.short}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <Textarea
                    placeholder="Заметка (необязательно)"
                    value={record.notes}
                    onChange={(e) => setNotes(student.id, e.target.value)}
                    rows={1}
                    className="text-sm"
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Modal>
  )
}

