import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import api from '../services/api'
import { useToast, Card, Loader, EmptyState, Badge, Input, Modal } from '../components/ui'

interface Article {
  id: number
  title: string
  content: string
  category?: string
  tags?: string
  created_at: string
}

export default function KnowledgeBasePage() {
  const { showToast } = useToast()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [selected, setSelected] = useState<Article | null>(null)

  const fetchArticles = async () => {
    setLoading(true)
    try {
      const res = await api.get('/knowledge')
      setArticles(res.data.data || [])
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка загрузки базы знаний', 'error')
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

  if (loading) {
    return (
      <div className="min-h-screen bg-fox-light">
        <Header title="База знаний" subtitle="Методические материалы" icon="🧠" />
        <div className="p-6 max-w-7xl mx-auto">
          <Loader text="Загрузка статей..." />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-fox-light">
      <Header title="База знаний" subtitle={`${filtered.length} статей`} icon="🧠" />
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <Card>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Поиск по базе знаний"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-fox-gold/50 focus:border-fox-gold bg-white"
            >
              <option value="">Все категории</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </Card>

        {filtered.length === 0 ? (
          <EmptyState icon="🧠" title="Нет статей" description="В базе знаний пока нет опубликованных материалов." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((a) => (
              <Card key={a.id} className="space-y-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(a)}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-fox-dark">{a.title}</h3>
                  {a.category && <Badge variant="default">{a.category}</Badge>}
                </div>
                <p className="text-sm text-gray-600 line-clamp-3">{a.content}</p>
                <p className="text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString('ru-RU')}</p>
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
            {selected.category && <Badge variant="default">{selected.category}</Badge>}
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{selected.content}</div>
          </div>
        )}
      </Modal>
    </div>
  )
}
