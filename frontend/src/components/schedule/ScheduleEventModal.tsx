import { useEffect, useMemo, useState } from 'react'
import { Modal, Button, Input, Select, Textarea, Badge, Loader } from '../ui'
import type { Schedule, ScheduleOccurrence, Group, User, Branch } from '../../types'
import { schedulesApi, scheduleExceptionsApi } from '../../api'
import { useToast } from '../ui'
import { formatTime, formatDate, statusLabel, statusVariant, recurrenceLabel } from './utils'
import { LuCheck, LuTrash2, LuPencil, LuX } from 'react-icons/lu'

interface Props {
  isOpen: boolean
  onClose: () => void
  occurrence: ScheduleOccurrence | null
  groups: Group[]
  teachers: User[]
  branches: Branch[]
  canManage: boolean
  onSaved: () => void
  onConduct?: (occ: ScheduleOccurrence) => void
}

const recurrenceOptions = [
  { value: 'none', label: 'Без повторения' },
  { value: 'daily', label: 'Ежедневно' },
  { value: 'weekly', label: 'Еженедельно' },
  { value: 'monthly', label: 'Ежемесячно' },
]

const statusOptions = [
  { value: 'scheduled', label: 'Запланировано' },
  { value: 'confirmed', label: 'Подтверждено' },
  { value: 'completed', label: 'Проведено' },
  { value: 'cancelled', label: 'Отменено' },
]

export default function ScheduleEventModal({
  isOpen,
  onClose,
  occurrence,
  groups,
  teachers,
  branches,
  canManage,
  onSaved,
  onConduct,
}: Props) {
  const { showToast } = useToast()
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<Partial<Schedule>>({})

  useEffect(() => {
    if (!isOpen) {
      setMode('view')
      setSchedule(null)
      setForm({})
      return
    }
    if (occurrence?.schedule_id) {
      setLoading(true)
      schedulesApi
        .get(occurrence.schedule_id)
        .then((s) => {
          setSchedule(s)
          setForm({ ...s })
        })
        .catch((err) => showToast(err?.response?.data?.message || 'Ошибка загрузки занятия', 'error'))
        .finally(() => setLoading(false))
    }
  }, [isOpen, occurrence])

  const group = useMemo(() => groups.find((g) => g.id === (schedule?.group_id || occurrence?.group_id)), [groups, schedule, occurrence])
  const teacher = useMemo(() => teachers.find((t) => t.id === (schedule?.teacher_id || occurrence?.teacher_id)), [teachers, schedule, occurrence])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!schedule) return
    setSubmitting(true)
    try {
      await schedulesApi.update(schedule.id, form)
      showToast('Занятие обновлено', 'success')
      setMode('view')
      onSaved()
      const updated = await schedulesApi.get(schedule.id)
      setSchedule(updated)
      setForm({ ...updated })
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Ошибка обновления', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!schedule || !confirm('Удалить занятие?')) return
    try {
      await schedulesApi.delete(schedule.id)
      showToast('Занятие удалено', 'success')
      onSaved()
      onClose()
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Ошибка удаления', 'error')
    }
  }

  const handleCancel = async () => {
    if (!schedule || !occurrence) return
    const isRecurring = schedule.recurrence && schedule.recurrence !== 'none'
    let scope: 'this' | 'series' | null = 'this'
    if (isRecurring) {
      const choice = confirm(
        'Отменить только это занятие?\nНажмите «ОК» — только это вхождение, «Отмена» — отменить всю серию.'
      )
      scope = choice ? 'this' : 'series'
    }
    try {
      if (scope === 'this') {
        await scheduleExceptionsApi.create(schedule.id, {
          exception_date: occurrence.occurrence_date,
          is_cancelled: true,
        })
        showToast('Занятие отменено', 'success')
      } else {
        await schedulesApi.update(schedule.id, { status: 'cancelled' })
        showToast('Серия занятий отменена', 'success')
      }
      onSaved()
      onClose()
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Ошибка отмены занятия', 'error')
    }
  }

  const handleConduct = () => {
    if (occurrence && onConduct) onConduct(occurrence)
  }

  const footer = (
    <>
      {mode === 'view' ? (
        <>
          <Button variant="ghost" onClick={onClose}>
            Закрыть
          </Button>
          {canManage && (
            <>
              <Button variant="danger" leftIcon={<LuTrash2 size={16} />} onClick={handleDelete}>
                Удалить
              </Button>
              <Button variant="danger" leftIcon={<LuX size={16} />} onClick={handleCancel}>
                {schedule?.recurrence && schedule.recurrence !== 'none' ? 'Отменить…' : 'Отменить'}
              </Button>
              <Button variant="secondary" leftIcon={<LuPencil size={16} />} onClick={() => setMode('edit')}>
                Редактировать
              </Button>
            </>
          )}
          {onConduct && occurrence?.status !== 'cancelled' && (
            <Button leftIcon={<LuCheck size={16} />} onClick={handleConduct}>
              {occurrence?.status === 'completed' ? 'Посещаемость' : 'Провести'}
            </Button>
          )}
        </>
      ) : (
        <>
          <Button variant="ghost" onClick={() => setMode('view')}>
            Отмена
          </Button>
          <Button type="submit" form="schedule-form" loading={submitting}>
            Сохранить
          </Button>
        </>
      )}
    </>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === 'view' ? occurrence?.title || 'Занятие' : 'Редактирование занятия'} footer={footer} size="lg">
      {loading ? (
        <Loader text="Загрузка..." />
      ) : mode === 'view' ? (
        <ViewBody occurrence={occurrence} schedule={schedule} group={group} teacher={teacher} branches={branches} teachers={teachers} />
      ) : (
        <EditForm form={form} setForm={setForm} groups={groups} teachers={teachers} branches={branches} onSubmit={handleSave} />
      )}
    </Modal>
  )
}

function ViewBody({
  occurrence,
  schedule,
  group,
  teacher,
  branches,
  teachers,
}: {
  occurrence: ScheduleOccurrence | null
  schedule: Schedule | null
  group?: Group
  teacher?: User
  branches: Branch[]
  teachers: User[]
}) {
  const branch = branches.find((b) => b.id === (schedule?.branch_id || occurrence?.branch_id))
  const replacement = teachers.find((t) => t.id === (schedule?.replacement_teacher_id || occurrence?.replacement_teacher_id))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={statusVariant(occurrence?.status || 'scheduled')}>{statusLabel(occurrence?.status || 'scheduled')}</Badge>
        {occurrence?.is_online && <Badge variant="info">Онлайн</Badge>}
        {occurrence?.recurrence && occurrence.recurrence !== 'none' && (
          <Badge variant="purple">{recurrenceLabel(occurrence.recurrence)}</Badge>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <Info label="Дата" value={formatDate(occurrence?.start_time || '')} />
        <Info label="Время" value={`${formatTime(occurrence?.start_time || '')} – ${formatTime(occurrence?.end_time || '')}`} />
        <Info label="Группа" value={group?.name || '—'} />
        <Info label="Преподаватель" value={teacher?.name || '—'} />
        {replacement && <Info label="Замена" value={replacement.name} />}
        <Info label="Аудитория / ссылка" value={occurrence?.room || '—'} />
        <Info label="Филиал" value={branch?.name || '—'} />
      </div>
      {schedule?.topic && <Info label="Тема" value={schedule.topic} />}
      {schedule?.description && <Info label="Описание" value={schedule.description} />}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-fox-gray">{label}</div>
      <div className="font-medium text-fox-dark">{value}</div>
    </div>
  )
}

function EditForm({
  form,
  setForm,
  groups,
  teachers,
  branches,
  onSubmit,
}: {
  form: Partial<Schedule>
  setForm: (f: Partial<Schedule>) => void
  groups: Group[]
  teachers: User[]
  branches: Branch[]
  onSubmit: (e: React.FormEvent) => void
}) {
  const selectedGroup = groups.find((g) => g.id === Number(form.group_id))

  const setField = <K extends keyof Schedule>(key: K, value: Schedule[K]) => {
    setForm({ ...form, [key]: value })
  }

  return (
    <form id="schedule-form" onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Input label="Название" value={form.title || ''} onChange={(e) => setField('title', e.target.value)} required />
      <Select label="Группа" value={String(form.group_id || '')} onChange={(e) => setField('group_id', Number(e.target.value))} required>
        <option value="">Выберите группу</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </Select>
      <Select label="Преподаватель" value={String(form.teacher_id || '')} onChange={(e) => setField('teacher_id', Number(e.target.value))} required>
        <option value="">Выберите преподавателя</option>
        {teachers.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </Select>
      <Select label="Замена" value={String(form.replacement_teacher_id || '')} onChange={(e) => setField('replacement_teacher_id', e.target.value ? Number(e.target.value) : null)}>
        <option value="">Без замены</option>
        {teachers.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </Select>
      <Select label="Филиал" value={String(form.branch_id || '')} onChange={(e) => setField('branch_id', e.target.value ? Number(e.target.value) : undefined)}>
        <option value="">Без филиала</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </Select>
      <Input label="Аудитория / ссылка" value={form.room || ''} onChange={(e) => setField('room', e.target.value)} />
      <Input label="Начало" type="datetime-local" value={toDatetimeLocal(form.start_time)} onChange={(e) => setField('start_time', new Date(e.target.value).toISOString())} required />
      <Input label="Окончание" type="datetime-local" value={toDatetimeLocal(form.end_time)} onChange={(e) => setField('end_time', new Date(e.target.value).toISOString())} required />
      <Select label="Повторение" value={form.recurrence || 'none'} onChange={(e) => setField('recurrence', e.target.value)}>
        {recurrenceOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      <Input label="Повторять до" type="datetime-local" value={form.recurrence_end ? toDatetimeLocal(form.recurrence_end) : ''} onChange={(e) => setField('recurrence_end', e.target.value ? new Date(e.target.value).toISOString() : null)} />
      <Select label="Статус" value={form.status || 'scheduled'} onChange={(e) => setField('status', e.target.value)}>
        {statusOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      <Input label="Цвет" type="color" value={form.color || '#F5ED75'} onChange={(e) => setField('color', e.target.value)} />
      <div className="flex items-center gap-2 md:col-span-2">
        <input
          id="is-online"
          type="checkbox"
          checked={!!form.is_online}
          onChange={(e) => setField('is_online', e.target.checked)}
          className="w-4 h-4 rounded border-fox-border text-fox-purple focus:ring-fox-purple"
        />
        <label htmlFor="is-online" className="text-sm text-fox-graphite">
          Онлайн-занятие
        </label>
      </div>
      <Input label="Тема урока" value={form.topic || ''} onChange={(e) => setField('topic', e.target.value)} />
      <div className="md:col-span-2">
        <Textarea label="Описание" value={form.description || ''} onChange={(e) => setField('description', e.target.value)} rows={3} />
      </div>
      {selectedGroup && (
        <div className="md:col-span-2 text-xs text-fox-gray bg-fox-light/60 p-3 rounded-lg">
          Группа «{selectedGroup.name}»: преподаватель по умолчанию — {selectedGroup.teacher_name || 'не указан'}, аудитория — {selectedGroup.room || '—'}, академический час — {selectedGroup.academic_hour_minutes || 45} мин.
        </div>
      )}
    </form>
  )
}

function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const offset = d.getTimezoneOffset() * 60000
  const local = new Date(d.getTime() - offset)
  return local.toISOString().slice(0, 16)
}
