import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import api from '../services/api'
import { useToast, Card, Loader, EmptyState, Badge, Input, Button } from '../components/ui'
import { LuLibrary } from 'react-icons/lu'

interface LibraryFile {
  id: number
  original_name: string
  public_url?: string
  mime_type?: string
  size_bytes?: number
  entity_type?: string
  created_at: string
}

const typeLabels: Record<string, string> = {
  lesson: 'Урок',
  homework: 'Домашнее задание',
  course: 'Курс',
  user: 'Профиль',
}

function formatSize(bytes?: number) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function LibraryPage() {
  const { showToast } = useToast()
  const [files, setFiles] = useState<LibraryFile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const fetchFiles = async () => {
    setLoading(true)
    try {
      const res = await api.get('/files')
      setFiles(res.data.data || [])
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка загрузки файлов', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

  const filtered = useMemo(() => {
    let list = [...files]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((f) => f.original_name.toLowerCase().includes(q))
    }
    if (typeFilter) {
      list = list.filter((f) => f.entity_type === typeFilter)
    }
    return list
  }, [files, search, typeFilter])

  const types = useMemo(() => Array.from(new Set(files.map((f) => f.entity_type).filter((t): t is string => Boolean(t)))), [files])

  if (loading) {
    return (
      <div className="min-h-screen bg-fox-light">
        <Header title="Библиотека" subtitle="Материалы и файлы" icon={<LuLibrary />} />
        <div className="p-6 max-w-7xl mx-auto">
          <Loader text="Загрузка файлов..." />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-fox-light">
      <Header title="Библиотека" subtitle={`${filtered.length} материалов`} icon={<LuLibrary />} />
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <Card>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Поиск по названию"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2.5 border border-fox-border rounded-xl text-sm text-fox-graphite focus:outline-none focus:ring-2 focus:ring-fox-gold/50 focus:border-fox-gold bg-white"
            >
              <option value="">Все типы</option>
              {types.map((t) => (
                <option key={t} value={t}>{typeLabels[t] || t}</option>
              ))}
            </select>
          </div>
        </Card>

        {filtered.length === 0 ? (
          <EmptyState icon={<LuLibrary />} title="Нет файлов" description="В библиотеке пока нет загруженных материалов." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((f) => (
              <Card key={f.id} className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-fox-dark break-all">{f.original_name}</p>
                  {f.entity_type ? <Badge variant="default">{typeLabels[f.entity_type] || f.entity_type}</Badge> : null}
                </div>
                <div className="text-sm text-fox-gray space-y-1">
                  <p>Размер: {formatSize(f.size_bytes)}</p>
                  <p>Загружено: {new Date(f.created_at).toLocaleDateString('ru-RU')}</p>
                </div>
                {f.public_url && (
                  <Button size="sm" variant="secondary" onClick={() => window.open(f.public_url, '_blank')}>
                    Открыть
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
