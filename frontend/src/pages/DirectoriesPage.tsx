import { useEffect, useState } from 'react'
import Header from '../components/Header'
import { directoriesApi } from '../api'
import {
  useToast,
  Button,
  Card,
  Input,
  Tabs,
  Badge,
  Loader,
} from '../components/ui'
import { getErrorMessage } from '../utils/error'
import type { Directory } from '../types'
import {
  LuBookOpen,
  LuCoins,
  LuTag,
  LuMegaphone,
  LuUserCog,
  LuPlus,
  LuPencil,
  LuTrash2,
} from 'react-icons/lu'

const TABS = [
  { id: 'expense_income', label: 'Типы расходов/доходов', icon: <LuCoins /> },
  { id: 'levels', label: 'Уровни', icon: <LuUserCog /> },
  { id: 'tags', label: 'Теги', icon: <LuTag /> },
  { id: 'sources', label: 'Рекламные источники', icon: <LuMegaphone /> },
  { id: 'student_fields', label: 'Поля для учеников', icon: <LuUserCog /> },
]

const KIND_LABELS: Record<string, string> = {
  expense_type: 'Типы расходов',
  income_type: 'Типы доходов',
  level: 'Уровни',
  tag: 'Теги',
  advertising_source: 'Рекламные источники',
  student_field: 'Поля для учеников',
}

export default function DirectoriesPage() {
  const [activeTab, setActiveTab] = useState('expense_income')

  return (
    <div className="min-h-screen bg-fox-light">
      <Header title="Справочники" icon={<LuBookOpen />} />
      <div className="p-4 md:p-6 w-full space-y-6">
        <Card>
          <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
        </Card>

        {activeTab === 'expense_income' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DirectoryPanel kind="expense_type" />
            <DirectoryPanel kind="income_type" />
          </div>
        )}
        {activeTab === 'levels' && <DirectoryPanel kind="level" />}
        {activeTab === 'tags' && <DirectoryPanel kind="tag" />}
        {activeTab === 'sources' && <DirectoryPanel kind="advertising_source" />}
        {activeTab === 'student_fields' && <DirectoryPanel kind="student_field" />}
      </div>
    </div>
  )
}

function DirectoryPanel({ kind }: { kind: string }) {
  const { showToast } = useToast()
  const [items, setItems] = useState<Directory[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [editing, setEditing] = useState<Directory | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetch = async () => {
    setLoading(true)
    try {
      const data = await directoriesApi.list(kind)
      setItems(data)
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка загрузки'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetch()
  }, [kind])

  const handleSubmit = async () => {
    if (!input.trim()) return
    setSubmitting(true)
    try {
      if (editing) {
        await directoriesApi.update(editing.id, { name: input.trim() })
        showToast('Запись обновлена', 'success')
      } else {
        await directoriesApi.create({ kind, name: input.trim(), is_active: true, sort_order: 0 })
        showToast('Запись добавлена', 'success')
      }
      setInput('')
      setEditing(null)
      await fetch()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка сохранения'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActive = async (item: Directory) => {
    try {
      await directoriesApi.update(item.id, { is_active: !item.is_active })
      await fetch()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка обновления'), 'error')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить запись?')) return
    try {
      await directoriesApi.delete(id)
      showToast('Запись удалена', 'success')
      await fetch()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка удаления'), 'error')
    }
  }

  const startEdit = (item: Directory) => {
    setEditing(item)
    setInput(item.name)
  }

  const cancelEdit = () => {
    setEditing(null)
    setInput('')
  }

  return (
    <Card>
      <h3 className="text-base font-bold text-fox-dark mb-4">
        {KIND_LABELS[kind] || kind}
      </h3>

      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Название"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit()
          }}
        />
        <Button onClick={handleSubmit} loading={submitting} leftIcon={<LuPlus size={16} />}>
          {editing ? 'Сохранить' : 'Добавить'}
        </Button>
        {editing && (
          <Button variant="ghost" onClick={cancelEdit}>
            Отмена
          </Button>
        )}
      </div>

      {loading ? (
        <Loader text="Загрузка..." />
      ) : items.length === 0 ? (
        <div className="text-sm text-fox-gray py-4 text-center">Нет записей</div>
      ) : (
        <div className="divide-y divide-fox-border/40">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-3 gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => toggleActive(item)}
                  className="text-xs"
                  title={item.is_active ? 'Активно' : 'Неактивно'}
                >
                  {item.is_active ? (
                    <Badge variant="success">Активно</Badge>
                  ) : (
                    <Badge variant="default">Неактивно</Badge>
                  )}
                </button>
                <span className="text-fox-dark font-medium truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => startEdit(item)}
                  className="p-2 text-fox-gray hover:text-fox-purple hover:bg-fox-light rounded-lg transition"
                  title="Редактировать"
                >
                  <LuPencil size={16} />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 text-fox-gray hover:text-fox-error hover:bg-fox-error/10 rounded-lg transition"
                  title="Удалить"
                >
                  <LuTrash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
