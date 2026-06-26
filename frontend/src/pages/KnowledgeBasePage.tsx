import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../utils/error'
import {
  useToast,
  Button,
  Card,
  Loader,
  EmptyState,
  Badge,
  Input,
  Textarea,
  Modal,
  ModalFooterActions,
} from '../components/ui'
import { LuBrain, LuPlus, LuPencil, LuTrash } from 'react-icons/lu'

interface Article {
  id: number
  title: string
  content: string
  category?: string
  tags?: string
  is_published?: boolean
  created_at: string
}

const emptyForm = {
  title: '',
  content: '',
  category: '',
  tags: '',
  is_published: true,
}

export default function KnowledgeBasePage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const canManage = ['owner', 'super_admin', 'admin', 'methodist'].includes(user?.role || '')
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [selected, setSelected] = useState<Article | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Article | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const fetchArticles = async () => {
    setLoading(true)
    try {
      const res = await api.get('/knowledge')
      setArticles(res.data.data || [])
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка загрузки базы знаний'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchArticles()
  }, [])

  const categories = useMemo(
    () => Array.from(new Set(articles.map((a) => a.category).filter((c): c is string => Boolean(c)))),
    [articles]
  )

  const filtered = useMemo(() => {
    let list = [...articles]
    if (categoryFilter) list = list.filter((a) => a.category === categoryFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((a) => a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q))
    }
    return list
  }, [articles, search, categoryFilter])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  const openEdit = (article: Article) => {
    setEditing(article)
    setForm({
      title: article.title,
      content: article.content,
      category: article.category || '',
      tags: article.tags || '',
      is_published: article.is_published ?? true,
    })
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      showToast('Заполните заголовок и содержание', 'error')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category.trim() || null,
        tags: form.tags.trim() || null,
        is_published: form.is_published,
      }
      if (editing) {
        await api.patch(`/knowledge/${editing.id}`, payload)
        showToast('Статья обновлена', 'success')
      } else {
        await api.post('/knowledge', payload)
        showToast('Статья создана', 'success')
      }
      setFormOpen(false)
      await fetchArticles()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка сохранения статьи'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (article: Article) => {
    if (!confirm(`Удалить статью «${article.title}»?`)) return
    try {
      await api.delete(`/knowledge/${article.id}`)
      showToast('Статья удалена', 'success')
      if (selected?.id === article.id) setSelected(null)
      await fetchArticles()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка удаления статьи'), 'error')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-fox-light">
        <Header title="База знаний" subtitle="Методические материалы" icon={<LuBrain />} />
        <div className="p-6 w-full">
          <Loader text="Загрузка статей..." />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-fox-light">
      <Header title="База знаний" subtitle={`${filtered.length} статей`} icon={<LuBrain />} />
      <div className="p-4 md:p-6 w-full space-y-6">
        <Card>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <Input
              placeholder="Поиск по базе знаний"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 border border-fox-border rounded-xl text-sm text-fox-graphite focus:outline-none focus:ring-2 focus:ring-fox-gold/50 focus:border-fox-gold bg-white"
            >
              <option value="">Все категории</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {canManage && (
              <Button className="sm:ml-auto" leftIcon={<LuPlus size={16} />} onClick={openCreate}>
                Создать статью
              </Button>
            )}
          </div>
        </Card>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<LuBrain />}
            title="Нет статей"
            description="В базе знаний пока нет материалов."
            actionLabel={canManage ? 'Создать статью' : undefined}
            onAction={canManage ? openCreate : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((a) => (
              <Card key={a.id} className="space-y-3">
                <div
                  className="space-y-3 cursor-pointer"
                  onClick={() => setSelected(a)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-fox-dark">{a.title}</h3>
                    <div className="flex flex-col items-end gap-1">
                      {a.category && <Badge variant="default">{a.category}</Badge>}
                      {a.is_published === false && <Badge variant="warning">Черновик</Badge>}
                    </div>
                  </div>
                  <p className="text-sm text-fox-gray line-clamp-3">{a.content}</p>
                  <p className="text-xs text-fox-gray/70">{new Date(a.created_at).toLocaleDateString('ru-RU')}</p>
                </div>
                {canManage && (
                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-fox-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<LuPencil size={14} />}
                      onClick={() => openEdit(a)}
                    >
                      Редактировать
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      leftIcon={<LuTrash size={14} />}
                      onClick={() => handleDelete(a)}
                    >
                      Удалить
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title || ''}
        size="lg"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {selected.category && <Badge variant="default">{selected.category}</Badge>}
              {selected.is_published === false && <Badge variant="warning">Черновик</Badge>}
            </div>
            <div className="prose prose-sm max-w-none text-fox-graphite whitespace-pre-wrap">{selected.content}</div>
            {canManage && (
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-fox-border">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<LuPencil size={14} />}
                  onClick={() => {
                    const a = selected
                    setSelected(null)
                    openEdit(a)
                  }}
                >
                  Редактировать
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Редактировать статью' : 'Новая статья'}
        size="lg"
        footer={
          <ModalFooterActions
            onCancel={() => setFormOpen(false)}
            onConfirm={handleSave}
            confirmText={editing ? 'Сохранить' : 'Создать'}
            loading={saving}
          />
        }
      >
        <div className="space-y-4">
          <Input
            label="Заголовок"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Например, Как проводить вводный урок"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Категория"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Методика"
            />
            <Input
              label="Теги (через запятую)"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="урок, адаптация"
            />
          </div>
          <Textarea
            label="Содержание"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={10}
            placeholder="Текст статьи"
          />
          <div className="flex items-center gap-3">
            <input
              id="kb_is_published"
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
              className="w-5 h-5 rounded border-fox-border text-fox-purple focus:ring-fox-purple"
            />
            <label htmlFor="kb_is_published" className="text-sm text-fox-graphite">
              Опубликовать (видна всем пользователям)
            </label>
          </div>
        </div>
      </Modal>
    </div>
  )
}
