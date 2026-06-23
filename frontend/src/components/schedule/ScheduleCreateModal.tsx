import { useEffect, useState, useMemo } from 'react'
import { Modal, Button, Input, Select, Textarea } from '../ui'
import { useToast } from '../ui'
import type { Schedule, Group, User, Branch, Course, Lesson } from '../../types'
import { schedulesApi, coursesApi } from '../../api'

interface Props {
  isOpen: boolean
  onClose: () => void
  initialDate?: Date
  groups: Group[]
  teachers: User[]
  branches: Branch[]
  onCreated: () => void
}

const recurrenceOptions = [
  { value: 'none', label: 'Без повторения' },
  { value: 'daily', label: 'Ежедневно' },
  { value: 'weekly', label: 'Еженедельно' },
  { value: 'monthly', label: 'Ежемесячно' },
]

export default function ScheduleCreateModal({ isOpen, onClose, initialDate, groups, teachers, branches, onCreated }: Props) {
  const { showToast } = useToast()
  const [submitting, setSubmitting] = useState(false)

  const defaultStart = useMemo(() => {
    const d = initialDate ? new Date(initialDate) : new Date()
    d.setMinutes(0, 0, 0)
    if (d.getHours() < 8) d.setHours(8)
    return d
  }, [initialDate])

  const defaultEnd = useMemo(() => {
    const d = new Date(defaultStart)
    d.setHours(d.getHours() + 1)
    return d
  }, [defaultStart])

  const [courses, setCourses] = useState<Course[]>([])

  useEffect(() => {
    coursesApi
      .list()
      .then(setCourses)
      .catch((err) => showToast(err?.response?.data?.message || 'Ошибка загрузки курсов', 'error'))
  }, [showToast])

  const [form, setForm] = useState<Partial<Schedule>>({
    title: '',
    group_id: undefined,
    course_id: undefined,
    lesson_id: undefined,
    teacher_id: undefined,
    branch_id: undefined,
    room: '',
    start_time: defaultStart.toISOString(),
    end_time: defaultEnd.toISOString(),
    recurrence: 'none',
    recurrence_end: null,
    status: 'scheduled',
    color: '#F5ED75',
    is_online: false,
    topic: '',
    description: '',
  })

  const selectedCourse = useMemo(() => courses.find((c) => c.id === Number(form.course_id)), [courses, form.course_id])
  const selectedLessons = useMemo<Lesson[]>(() => {
    if (!selectedCourse) return []
    return selectedCourse.modules.flatMap((m) => m.lessons || [])
  }, [selectedCourse])

  const selectedGroup = groups.find((g) => g.id === Number(form.group_id))

  const setField = <K extends keyof Schedule>(key: K, value: Schedule[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const applyGroupDefaults = (groupId: number) => {
    const group = groups.find((g) => g.id === groupId)
    if (!group) return
    setForm((prev) => ({
      ...prev,
      group_id: groupId,
      course_id: group.course_id || prev.course_id,
      lesson_id: undefined,
      teacher_id: group.teacher_id || prev.teacher_id,
      branch_id: group.branch_id || prev.branch_id,
      room: group.room || prev.room,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.group_id || !form.teacher_id || !form.start_time || !form.end_time) {
      showToast('Заполните обязательные поля', 'warning')
      return
    }
    setSubmitting(true)
    try {
      await schedulesApi.create(form)
      showToast('Занятие создано', 'success')
      onCreated()
      onClose()
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Ошибка создания', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose}>
        Отмена
      </Button>
      <Button type="submit" form="schedule-create-form" loading={submitting}>
        Создать
      </Button>
    </>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Новое занятие" footer={footer} size="lg">
      <form id="schedule-create-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Название" value={form.title || ''} onChange={(e) => setField('title', e.target.value)} required />
        <Select label="Группа" value={String(form.group_id || '')} onChange={(e) => applyGroupDefaults(Number(e.target.value))} required>
          <option value="">Выберите группу</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
        <Select label="Курс" value={String(form.course_id || '')} onChange={(e) => setForm((prev) => ({ ...prev, course_id: Number(e.target.value) || undefined, lesson_id: undefined }))}>
          <option value="">Без курса</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </Select>
        <Select label="Урок" value={String(form.lesson_id || '')} onChange={(e) => setField('lesson_id', e.target.value ? Number(e.target.value) : undefined)}>
          <option value="">Без урока</option>
          {selectedLessons.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
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
          <option value="scheduled">Запланировано</option>
          <option value="confirmed">Подтверждено</option>
          <option value="cancelled">Отменено</option>
        </Select>
        <Input label="Цвет" type="color" value={form.color || '#F5ED75'} onChange={(e) => setField('color', e.target.value)} />
        <div className="flex items-center gap-2 md:col-span-2">
          <input
            id="create-is-online"
            type="checkbox"
            checked={!!form.is_online}
            onChange={(e) => setField('is_online', e.target.checked)}
            className="w-4 h-4 rounded border-fox-border text-fox-purple focus:ring-fox-purple"
          />
          <label htmlFor="create-is-online" className="text-sm text-fox-graphite">
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
    </Modal>
  )
}

function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const offset = d.getTimezoneOffset() * 60000
  const local = new Date(d.getTime() - offset)
  return local.toISOString().slice(0, 16)
}
