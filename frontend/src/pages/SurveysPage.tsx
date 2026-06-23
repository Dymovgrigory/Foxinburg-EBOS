import { useEffect, useState } from 'react'
import Header from '../components/Header'
import { surveysApi } from '../api'
import {
  useToast,
  Button,
  Card,
  Input,
  Select,
  Textarea,
  Badge,
  Modal,
  ModalFooterActions,
  Loader,
  EmptyState,
} from '../components/ui'
import { getErrorMessage } from '../utils/error'
import type { Survey, SurveyQuestion } from '../types'
import {
  LuClipboardList,
  LuPlus,
  LuPencil,
  LuTrash2,
  LuChartBarBig,
  LuEye,
} from 'react-icons/lu'

const ROLES = [
  { id: 'owner', label: 'Владелец' },
  { id: 'super_admin', label: 'Супер-админ' },
  { id: 'admin', label: 'Администратор' },
  { id: 'methodist', label: 'Методист' },
  { id: 'teacher', label: 'Педагог' },
  { id: 'manager', label: 'Менеджер' },
  { id: 'student', label: 'Ученик' },
  { id: 'parent', label: 'Родитель' },
]

const QUESTION_TYPES = [
  { id: 'single', label: 'Один вариант' },
  { id: 'text', label: 'Текст' },
  { id: 'rating', label: 'Оценка' },
]

export default function SurveysPage() {
  const { showToast } = useToast()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Survey | null>(null)
  const [resultsOpen, setResultsOpen] = useState(false)
  const [results, setResults] = useState<unknown>(null)
  const [resultsLoading, setResultsLoading] = useState(false)

  const [form, setForm] = useState<Partial<Survey>>({
    title: '',
    description: '',
    is_active: false,
    anonymous: true,
    target_roles: [],
    questions: [],
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchSurveys = async () => {
    setLoading(true)
    try {
      const data = await surveysApi.list()
      setSurveys(data)
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка загрузки'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSurveys()
  }, [])

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      is_active: false,
      anonymous: true,
      target_roles: [],
      questions: [],
    })
  }

  const openCreate = () => {
    setEditing(null)
    resetForm()
    setModalOpen(true)
  }

  const openEdit = (survey: Survey) => {
    setEditing(survey)
    setForm({
      title: survey.title,
      description: survey.description,
      is_active: survey.is_active,
      anonymous: survey.anonymous,
      target_roles: survey.target_roles || [],
      questions: survey.questions ? [...survey.questions] : [],
    })
    setModalOpen(true)
  }

  const toggleRole = (role: string) => {
    setForm((prev) => {
      const roles = new Set(prev.target_roles || [])
      if (roles.has(role)) roles.delete(role)
      else roles.add(role)
      return { ...prev, target_roles: Array.from(roles) }
    })
  }

  const addQuestion = () => {
    setForm((prev) => ({
      ...prev,
      questions: [
        ...(prev.questions || []),
        { text: '', type: 'single', options: [], order: (prev.questions || []).length },
      ],
    }))
  }

  const updateQuestion = (idx: number, patch: Partial<SurveyQuestion>) => {
    setForm((prev) => ({
      ...prev,
      questions: (prev.questions || []).map((q, i) => (i === idx ? { ...q, ...patch } : q)),
    }))
  }

  const removeQuestion = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      questions: (prev.questions || []).filter((_, i) => i !== idx),
    }))
  }

  const handleSubmit = async () => {
    if (!form.title?.trim()) {
      showToast('Укажите название опроса', 'error')
      return
    }
    if (!form.questions || form.questions.length === 0) {
      showToast('Добавьте хотя бы один вопрос', 'error')
      return
    }
    for (const q of form.questions) {
      if (!q.text.trim()) {
        showToast('Все вопросы должны содержать текст', 'error')
        return
      }
    }
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        questions: form.questions.map((q, i) => ({ ...q, order: i })),
      }
      if (editing) {
        await surveysApi.update(editing.id, payload)
        showToast('Опрос обновлен', 'success')
      } else {
        await surveysApi.create(payload)
        showToast('Опрос создан', 'success')
      }
      setModalOpen(false)
      await fetchSurveys()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка сохранения'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить опрос?')) return
    try {
      await surveysApi.delete(id)
      showToast('Опрос удален', 'success')
      await fetchSurveys()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка удаления'), 'error')
    }
  }

  const openResults = async (survey: Survey) => {
    setEditing(survey)
    setResultsLoading(true)
    setResultsOpen(true)
    try {
      const data = await surveysApi.results(survey.id)
      setResults(data)
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка загрузки результатов'), 'error')
    } finally {
      setResultsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-fox-light">
      <Header title="Опросы в приложении" icon={<LuClipboardList />} />

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <Card>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-fox-dark">Опросы</h2>
              <p className="text-xs text-fox-gray mt-0.5">{surveys.length} опросов</p>
            </div>
            <Button onClick={openCreate} leftIcon={<LuPlus size={18} />}>
              Создать опрос
            </Button>
          </div>
        </Card>

        {loading ? (
          <Loader text="Загрузка опросов..." />
        ) : surveys.length === 0 ? (
          <EmptyState
            icon={<LuClipboardList />}
            title="Нет опросов"
            description="Создайте первый опрос для пользователей приложения."
            actionLabel="Создать опрос"
            onAction={openCreate}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {surveys.map((s) => (
              <Card key={s.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-fox-dark">{s.title}</h3>
                    <p className="text-xs text-fox-gray mt-1 line-clamp-2">{s.description || 'Без описания'}</p>
                  </div>
                  {s.is_active ? <Badge variant="success">Активен</Badge> : <Badge variant="default">Неактивен</Badge>}
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-fox-gray">
                  <span>Вопросов: {s.questions?.length || 0}</span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <LuChartBarBig size={12} />
                    Ответов: {(s as unknown as { responses_count: number }).responses_count || 0}
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(s)} leftIcon={<LuPencil size={14} />}>
                    Редактировать
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openResults(s)} leftIcon={<LuEye size={14} />}>
                    Результаты
                  </Button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-2 text-fox-gray hover:text-fox-error hover:bg-fox-error/10 rounded-lg transition ml-auto"
                    title="Удалить"
                  >
                    <LuTrash2 size={16} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Редактировать опрос' : 'Новый опрос'}
        size="lg"
        footer={
          <ModalFooterActions
            onCancel={() => setModalOpen(false)}
            onConfirm={handleSubmit}
            loading={submitting}
            confirmText={editing ? 'Сохранить' : 'Создать'}
          />
        }
      >
        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          <Input
            label="Название"
            value={form.title || ''}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Textarea
            label="Описание"
            value={form.description || ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
          />
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-fox-graphite cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(form.is_active)}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="rounded border-fox-border text-fox-purple focus:ring-fox-purple"
              />
              Активен
            </label>
            <label className="flex items-center gap-2 text-sm text-fox-graphite cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(form.anonymous)}
                onChange={(e) => setForm({ ...form, anonymous: e.target.checked })}
                className="rounded border-fox-border text-fox-purple focus:ring-fox-purple"
              />
              Анонимный
            </label>
          </div>
          <div>
            <div className="text-sm font-semibold text-fox-graphite mb-2">Целевые роли</div>
            <div className="flex flex-wrap gap-3">
              {ROLES.map((role) => (
                <label key={role.id} className="flex items-center gap-1.5 text-sm text-fox-graphite cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(form.target_roles || []).includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                    className="rounded border-fox-border text-fox-purple focus:ring-fox-purple"
                  />
                  {role.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-fox-graphite">Вопросы</div>
              <Button type="button" size="sm" variant="secondary" onClick={addQuestion} leftIcon={<LuPlus size={14} />}>
                Добавить вопрос
              </Button>
            </div>
            <div className="space-y-3">
              {(form.questions || []).map((q, idx) => (
                <div key={idx} className="p-3 border border-fox-border rounded-xl bg-fox-light/30">
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Текст вопроса"
                      value={q.text}
                      onChange={(e) => updateQuestion(idx, { text: e.target.value })}
                    />
                    <Select
                      value={q.type}
                      onChange={(e) => updateQuestion(idx, { type: e.target.value as SurveyQuestion['type'] })}
                    >
                      {QUESTION_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {q.type === 'single' && (
                    <Input
                      placeholder="Варианты через запятую"
                      value={(q.options || []).join(', ')}
                      onChange={(e) =>
                        updateQuestion(idx, {
                          options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean),
                        })
                      }
                      className="mb-2"
                    />
                  )}
                  <button
                    onClick={() => removeQuestion(idx)}
                    className="text-xs text-fox-error hover:underline"
                  >
                    Удалить вопрос
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Results modal */}
      <Modal
        isOpen={resultsOpen}
        onClose={() => setResultsOpen(false)}
        title={`Результаты: ${editing?.title || ''}`}
        size="lg"
      >
        {resultsLoading ? (
          <Loader text="Загрузка результатов..." />
        ) : results && typeof results === 'object' ? (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="text-sm text-fox-gray">
              Всего ответов: <span className="font-semibold text-fox-purple">{(results as { total_responses: number }).total_responses}</span>
            </div>
            {((results as { statistics: { question: string; type: string; counts: Record<string, number> }[] }).statistics || []).map((stat, idx) => (
              <Card key={idx}>
                <div className="font-medium text-fox-dark mb-2">{stat.question}</div>
                {Object.keys(stat.counts).length === 0 ? (
                  <div className="text-sm text-fox-gray">Нет ответов</div>
                ) : (
                  <div className="space-y-1">
                    {Object.entries(stat.counts).map(([value, count]) => (
                      <div key={value} className="flex justify-between text-sm">
                        <span className="text-fox-graphite">{value}</span>
                        <Badge variant="purple">{count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={<LuChartBarBig />} title="Нет данных" description="Результаты недоступны" />
        )}
      </Modal>
    </div>
  )
}
