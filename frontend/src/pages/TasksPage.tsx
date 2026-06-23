import { useCallback, useEffect, useMemo, useState } from 'react'
import { getErrorMessage } from '../utils/error'
import Header from '../components/Header'
import { useToast, Button, Card, Badge, Modal, Input, Select, Textarea, Loader, EmptyState, PageShell, Tabs } from '../components/ui'
import { tasksApi, usersApi } from '../api'
import type { Task, User } from '../types'
import { LuListChecks, LuPlus, LuPencil, LuTrash2, LuCheck, LuSearch, LuX } from 'react-icons/lu'

const TABS = [
  { id: 'overdue', label: 'Просроченные' },
  { id: 'planned', label: 'Запланированные' },
  { id: 'completed', label: 'Выполненные' },
]

const STATUS_META: Record<string, { label: string; variant: Parameters<typeof Badge>[0]['variant'] }> = {
  planned: { label: 'Запланирована', variant: 'warning' },
  completed: { label: 'Выполнена', variant: 'success' },
  overdue: { label: 'Просрочена', variant: 'error' },
}

export default function TasksPage() {
  const { showToast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('planned')

  const [search, setSearch] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [creatorFilter, setCreatorFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [showFilters, setShowFilters] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<Task>>({
    title: '',
    description: '',
    type: '',
    assignee_id: undefined,
    contact_id: undefined,
    due_date: '',
    status: 'planned',
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [tasksRes, usersRes] = await Promise.all([
        tasksApi.list(),
        usersApi.list().catch(() => []),
      ])
      setTasks(tasksRes)
      setUsers(usersRes)
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка загрузки задач'), 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const now = new Date().toISOString()

  const enrichedTasks = useMemo(() => {
    return tasks.map((t) => {
      if (t.status === 'planned' && t.due_date && t.due_date < now) {
        return { ...t, status: 'overdue' as const }
      }
      return t
    })
  }, [tasks, now])

  const filtered = useMemo(() => {
    let list = enrichedTasks.filter((t) => t.status === activeTab)
    if (search) list = list.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()) || (t.description || '').toLowerCase().includes(search.toLowerCase()))
    if (assigneeFilter) list = list.filter((t) => t.assignee_id === Number(assigneeFilter))
    if (creatorFilter) list = list.filter((t) => t.creator_id === Number(creatorFilter))
    if (typeFilter) list = list.filter((t) => t.type === typeFilter)
    if (dateFrom) list = list.filter((t) => !t.due_date || t.due_date >= new Date(dateFrom).toISOString())
    if (dateTo) list = list.filter((t) => !t.due_date || t.due_date <= new Date(dateTo).toISOString())
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [enrichedTasks, activeTab, search, assigneeFilter, creatorFilter, typeFilter, dateFrom, dateTo])

  const uniqueTypes = useMemo(() => Array.from(new Set(tasks.map((t) => t.type).filter((t): t is string => !!t))), [tasks])

  const resetForm = () => {
    setForm({ title: '', description: '', type: '', assignee_id: undefined, contact_id: undefined, due_date: '', status: 'planned' })
    setEditingTask(null)
  }

  const openCreate = () => {
    resetForm()
    setModalOpen(true)
  }

  const openEdit = (task: Task) => {
    setEditingTask(task)
    setForm({
      title: task.title,
      description: task.description || '',
      type: task.type || '',
      assignee_id: task.assignee_id || undefined,
      contact_id: task.contact_id || undefined,
      due_date: task.due_date ? formatForInput(task.due_date) : '',
      status: task.status,
    })
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title) {
      showToast('Укажите название задачи', 'warning')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        assignee_id: form.assignee_id ? Number(form.assignee_id) : null,
        contact_id: form.contact_id ? Number(form.contact_id) : null,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      }
      if (editingTask) {
        await tasksApi.update(editingTask.id, payload)
        showToast('Задача обновлена', 'success')
      } else {
        await tasksApi.create(payload)
        showToast('Задача создана', 'success')
      }
      setModalOpen(false)
      resetForm()
      await fetchData()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка сохранения задачи'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (task: Task) => {
    if (!confirm('Удалить задачу?')) return
    try {
      await tasksApi.delete(task.id)
      showToast('Задача удалена', 'success')
      await fetchData()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка удаления'), 'error')
    }
  }

  const handleComplete = async (task: Task) => {
    try {
      await tasksApi.update(task.id, { status: 'completed' })
      showToast('Задача выполнена', 'success')
      await fetchData()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка обновления'), 'error')
    }
  }

  const resetFilters = () => {
    setSearch('')
    setAssigneeFilter('')
    setCreatorFilter('')
    setTypeFilter('')
    setDateFrom('')
    setDateTo('')
  }

  return (
    <PageShell>
      <Header title="Задачи" subtitle="Мои задачи и поручения" icon={<LuListChecks />} />

      <div className="p-4 md:p-6 w-full space-y-6">
        <div className="relative overflow-hidden rounded-card p-6 md:p-8 border border-fox-border/60 bg-white shadow-fox-lg">
          <div
            className="absolute top-0 right-0 w-64 h-64 pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage: 'url(/brand/blob.png)',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'top right',
            }}
          />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-fox-purple mb-2">Задачи</h2>
              <p className="text-fox-gray">{filtered.length} в выбранном разделе</p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setShowFilters(!showFilters)} leftIcon={<LuSearch size={16} />}>
                Фильтры
              </Button>
              <Button onClick={openCreate} leftIcon={<LuPlus size={16} />}>Добавить задачу</Button>
            </div>
          </div>
        </div>

        <Card>
          <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
        </Card>

        {showFilters && (
          <Card>
            <div className="grid md:grid-cols-4 gap-4">
              <Input placeholder="Поиск по тексту..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <Select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
                <option value="">Все ответственные</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </Select>
              <Select value={creatorFilter} onChange={(e) => setCreatorFilter(e.target.value)}>
                <option value="">Все постановщики</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </Select>
              <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="">Все типы</option>
                {uniqueTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
              <Input type="date" label="Дата с" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              <Input type="date" label="Дата до" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              <div className="md:col-span-2 flex items-end">
                <Button variant="ghost" onClick={resetFilters} leftIcon={<LuX size={16} />}>Сбросить фильтры</Button>
              </div>
            </div>
          </Card>
        )}

        {loading ? (
          <Loader text="Загрузка задач..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<LuListChecks />}
            title="Задач не найдено"
            description="Создайте первую задачу или измените фильтры."
            actionLabel="Добавить задачу"
            onAction={openCreate}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((task) => {
              const meta = STATUS_META[task.status] || { label: task.status, variant: 'default' as const }
              return (
                <Card key={task.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                      {task.type && <Badge variant="default" size="sm">{task.type}</Badge>}
                      {task.due_date && (
                        <span className="text-xs text-fox-gray">
                          до {new Date(task.due_date).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-fox-dark">{task.title}</h3>
                    {task.description && <p className="text-sm text-fox-gray mt-1">{task.description}</p>}
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-fox-gray">
                      {task.assignee_name && <span>Ответственный: {task.assignee_name}</span>}
                      {task.creator_name && <span>Постановщик: {task.creator_name}</span>}
                      {task.contact_name && <span>Контакт: {task.contact_name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {task.status !== 'completed' && (
                      <Button size="sm" variant="secondary" leftIcon={<LuCheck size={14} />} onClick={() => handleComplete(task)}>
                        Выполнить
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" leftIcon={<LuPencil size={14} />} onClick={() => openEdit(task)} />
                    <Button size="sm" variant="ghost" className="text-fox-error hover:text-fox-error" leftIcon={<LuTrash2 size={14} />} onClick={() => handleDelete(task)} />
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); resetForm() }}
        title={editingTask ? 'Редактировать задачу' : 'Новая задача'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setModalOpen(false); resetForm() }}>Отмена</Button>
            <Button type="submit" form="task-form" loading={saving}>Сохранить</Button>
          </>
        }
      >
        <form id="task-form" onSubmit={handleSave} className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input label="Название" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Textarea label="Описание" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
          <Input label="Тип" value={form.type || ''} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          <Select label="Статус" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Task['status'] })}>
            <option value="planned">Запланирована</option>
            <option value="completed">Выполнена</option>
          </Select>
          <Select label="Ответственный" value={form.assignee_id ?? ''} onChange={(e) => setForm({ ...form, assignee_id: e.target.value ? Number(e.target.value) : undefined })}>
            <option value="">Не назначен</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </Select>
          <Select label="Контакт" value={form.contact_id ?? ''} onChange={(e) => setForm({ ...form, contact_id: e.target.value ? Number(e.target.value) : undefined })}>
            <option value="">Не указан</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </Select>
          <Input type="datetime-local" label="Срок" value={form.due_date || ''} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
        </form>
      </Modal>
    </PageShell>
  )
}

function formatForInput(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
