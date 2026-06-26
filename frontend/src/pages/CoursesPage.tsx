import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast, Button, Card, Badge, Modal, Input, Select, Textarea, EmptyState, Loader, PageShell } from '../components/ui'
import { LuBookOpen, LuChevronUp, LuChevronDown } from 'react-icons/lu'

interface Lesson {
  id: number
  title: string
  lesson_type: string
  duration_minutes: number
  order_index: number
  is_active: boolean
}

interface Module {
  id: number
  title: string
  description?: string
  order_index: number
  lessons: Lesson[]
}

interface Course {
  id: number
  title: string
  description?: string
  short_description?: string
  type: string
  status: string
  passing_score: number
  is_sequential: boolean
  certificate_enabled: boolean
  modules: Module[]
  created_at: string
}

const statusMeta: Record<string, { label: string; variant: Parameters<typeof Badge>[0]['variant'] }> = {
  draft: { label: 'Черновик', variant: 'default' },
  published: { label: 'Опубликован', variant: 'success' },
  active: { label: 'Активен', variant: 'success' },
  archived: { label: 'Архив', variant: 'default' },
}

export default function CoursesPage() {
  const { showToast } = useToast()
  const { user } = useAuth()
  const canManage = ['owner', 'super_admin', 'admin', 'methodist'].includes(user?.role || '')
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    short_description: '',
    type: 'academy',
    passing_score: 70,
    is_sequential: true,
    certificate_enabled: true,
  })

  const fetchCourses = async () => {
    setLoading(true)
    try {
      const res = await api.get('/courses')
      setCourses(res.data.data || [])
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка загрузки курсов', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCourses()
  }, [])

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
        (c.short_description || '').toLowerCase().includes(search.toLowerCase())
      const matchesType = typeFilter ? c.type === typeFilter : true
      return matchesSearch && matchesType
    })
  }, [courses, search, typeFilter])

  const uniqueTypes = useMemo(() => Array.from(new Set(courses.map((c) => c.type))), [courses])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/courses', form)
      setShowForm(false)
      setForm({ title: '', description: '', short_description: '', type: 'academy', passing_score: 70, is_sequential: true, certificate_enabled: true })
      showToast('Курс создан', 'success')
      await fetchCourses()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка создания курса', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageShell>
      <Header title="Курсы" subtitle="Управление учебными программами" icon={<LuBookOpen />} />

      <div className="p-4 md:p-6 w-full space-y-6">
        <div className="relative overflow-hidden rounded-card p-6 md:p-8 border border-fox-border/60 bg-white shadow-fox-lg">
          <div
            className="absolute top-0 right-0 w-64 h-64 pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage: 'url(/brand/swirl-2.png)',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'top right',
            }}
          />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-fox-purple mb-2">Учебные курсы</h2>
              <p className="text-fox-gray">{filteredCourses.length} из {courses.length} курсов</p>
            </div>
            {canManage && (
              <Button onClick={() => setShowForm(true)} leftIcon={<span className="text-lg leading-none">+</span>}>Новый курс</Button>
            )}
          </div>
        </div>

        <Card>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Поиск по названию или описанию"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-sm"
            />
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="sm:max-w-xs"
            >
              <option value="">Все типы</option>
              {uniqueTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>
        </Card>

        {loading ? (
          <Loader text="Загрузка курсов..." />
        ) : filteredCourses.length === 0 ? (
          <EmptyState
            icon={<LuBookOpen />}
            title="Курсы не найдены"
            description={search || typeFilter ? 'Попробуй изменить фильтры поиска.' : 'Создай первый курс, чтобы начать обучение.'}
            actionLabel={canManage && !search && !typeFilter ? 'Создать курс' : undefined}
            onAction={canManage && !search && !typeFilter ? () => setShowForm(true) : undefined}
          />
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredCourses.map((course) => {
              const meta = statusMeta[course.status] || { label: course.status, variant: 'default' as const }
              const isExpanded = expanded === course.id
              return (
                <Card key={course.id} hover className="flex flex-col">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="text-lg font-bold text-fox-dark leading-tight">{course.title}</h3>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </div>
                  <p className="text-sm text-fox-gray mb-4 line-clamp-2">{course.short_description || course.description || 'Без описания'}</p>

                  <div className="flex flex-wrap gap-2 mb-5">
                    <Badge variant="purple">{course.type}</Badge>
                    <Badge variant="default">Проходной: {course.passing_score}%</Badge>
                    <Badge variant="default">Модулей: {course.modules.length}</Badge>
                  </div>

                  <div className="mt-auto pt-4 border-t border-fox-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpanded(isExpanded ? null : course.id)}
                      rightIcon={isExpanded ? <LuChevronUp size={14} /> : <LuChevronDown size={14} />}
                    >
                      {isExpanded ? 'Скрыть модули' : 'Показать модули'}
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-3 animate-in fade-in duration-200">
                      {course.modules.length === 0 ? (
                        <p className="text-sm text-fox-gray/70">В курсе пока нет модулей</p>
                      ) : (
                        course.modules.map((m) => (
                          <div key={m.id} className="bg-fox-light rounded-xl p-3 border border-fox-border/30">
                            <div className="font-semibold text-sm text-fox-dark">{m.title}</div>
                            {m.lessons.length > 0 && (
                              <ul className="mt-2 space-y-1">
                                {m.lessons.map((l) => (
                                  <li key={l.id} className="text-xs text-fox-gray flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-fox-purple" />
                                    {l.title} ({l.duration_minutes} мин)
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Новый курс"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Отмена
            </Button>
            <Button type="submit" form="course-form" loading={submitting}>
              Создать
            </Button>
          </>
        }
      >
        <form id="course-form" onSubmit={handleSubmit} className="grid gap-4">
          <Input
            label="Название курса"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Input
            label="Краткое описание"
            value={form.short_description}
            onChange={(e) => setForm({ ...form, short_description: e.target.value })}
          />
          <Textarea
            label="Полное описание"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Проходной балл"
              type="number"
              value={form.passing_score}
              onChange={(e) => setForm({ ...form, passing_score: Number(e.target.value) })}
            />
            <Select
              label="Тип курса"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="academy">Academy</option>
              <option value="world">World</option>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm text-fox-graphite">
            <input
              type="checkbox"
              checked={form.is_sequential}
              onChange={(e) => setForm({ ...form, is_sequential: e.target.checked })}
              className="rounded border-fox-border text-fox-purple focus:ring-fox-gold"
            />
            Последовательное прохождение
          </label>
          <label className="flex items-center gap-2 text-sm text-fox-graphite">
            <input
              type="checkbox"
              checked={form.certificate_enabled}
              onChange={(e) => setForm({ ...form, certificate_enabled: e.target.checked })}
              className="rounded border-fox-border text-fox-purple focus:ring-fox-gold"
            />
            Выдавать сертификат
          </label>
        </form>
      </Modal>
    </PageShell>
  )
}
