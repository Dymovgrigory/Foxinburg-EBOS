import { useEffect, useState } from 'react'
import Header from '../components/Header'
import api from '../services/api'
import { homeworksApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import {
  useToast,
  Button,
  Card,
  Badge,
  Modal,
  Input,
  Loader,
  EmptyState,
  Table,
  Thead,
  Th,
  Tbody,
  Tr,
  Td,
  PageShell,
  Select,
  Textarea,
} from '../components/ui'
import { LuNotebookPen, LuPencil, LuTrash2, LuRefreshCw } from 'react-icons/lu'

interface Homework {
  id: number
  lesson_id: number
  student_id: number
  title?: string
  description?: string
  content?: string
  file_urls?: string
  status: string
  submitted_at?: string
  created_at: string
}

interface Review {
  id: number
  homework_id: number
  reviewed_by_id: number
  status: string
  score?: number
  comment?: string
  created_at: string
}

const statusMeta: Record<string, { label: string; variant: Parameters<typeof Badge>[0]['variant'] }> = {
  assigned: { label: 'Назначено', variant: 'default' },
  submitted: { label: 'Сдано', variant: 'info' },
  reviewed: { label: 'Проверено', variant: 'success' },
  revision: { label: 'Доработка', variant: 'warning' },
  rejected: { label: 'Отклонено', variant: 'error' },
}

export default function HomeworksPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [homeworks, setHomeworks] = useState<Homework[]>([])
  const [reviews, setReviews] = useState<Record<number, Review[]>>({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Homework | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [review, setReview] = useState({ status: 'approved', score: '', comment: '' })
  const [studentAnswer, setStudentAnswer] = useState('')
  const [studentFiles, setStudentFiles] = useState('')
  const [editHomework, setEditHomework] = useState<Homework | null>(null)
  const [editForm, setEditForm] = useState<Partial<Homework>>({})
  const [savingEdit, setSavingEdit] = useState(false)

  const isReviewer = ['owner', 'super_admin', 'admin', 'methodist'].includes(user?.role || '')

  const fetchHomeworks = async () => {
    setLoading(true)
    try {
      const res = await api.get('/homeworks')
      const list: Homework[] = res.data.data || []
      setHomeworks(list)
      const reviewMap: Record<number, Review[]> = {}
      await Promise.all(
        list.map(async (h) => {
          try {
            const r = await api.get(`/homeworks/${h.id}/reviews`)
            reviewMap[h.id] = r.data.data || []
          } catch {
            reviewMap[h.id] = []
          }
        })
      )
      setReviews(reviewMap)
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка загрузки заданий', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHomeworks()
  }, [])

  const submitAnswer = async (homeworkId: number) => {
    setSubmitting(true)
    try {
      await api.post(`/homeworks/${homeworkId}/submit`, {
        content: studentAnswer,
        file_urls: studentFiles,
      })
      setStudentAnswer('')
      setStudentFiles('')
      showToast('Ответ отправлен на проверку', 'success')
      await fetchHomeworks()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка отправки ответа', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    setSubmitting(true)
    try {
      await api.post(`/homeworks/${selected.id}/reviews`, {
        status: review.status,
        score: review.score ? Number(review.score) : null,
        comment: review.comment,
      })
      setSelected(null)
      setReview({ status: 'approved', score: '', comment: '' })
      showToast('Проверка сохранена', 'success')
      await fetchHomeworks()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка проверки', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (h: Homework) => {
    setEditHomework(h)
    setEditForm({
      lesson_id: h.lesson_id,
      student_id: h.student_id,
      content: h.content,
      status: h.status,
    })
  }

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editHomework) return
    setSavingEdit(true)
    try {
      await homeworksApi.update(editHomework.id, editForm)
      showToast('Задание обновлено', 'success')
      setEditHomework(null)
      await fetchHomeworks()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка обновления', 'error')
    } finally {
      setSavingEdit(false)
    }
  }

  const deleteHomework = async (id: number) => {
    if (!confirm('Удалить домашнее задание? Это также удалит историю проверок.')) return
    try {
      await homeworksApi.delete(id)
      showToast('Задание удалено', 'success')
      await fetchHomeworks()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка удаления', 'error')
    }
  }

  const renderStudentView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-fox-dark">Мои домашние задания</h2>
        {homeworks.length > 0 && (
          <p className="text-sm text-fox-gray">{homeworks.length} {homeworks.length === 1 ? 'задание' : 'задания'}</p>
        )}
      </div>
      {homeworks.length === 0 ? (
        <EmptyState icon={<LuNotebookPen />} title="Нет домашних заданий" description="Вам пока не назначены задания." />
      ) : (
        homeworks.map((h) => {
          const meta = statusMeta[h.status] || { label: h.status, variant: 'default' as const }
          const isSubmitted = h.status === 'submitted' || h.status === 'reviewed'
          return (
            <Card key={h.id} className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-fox-gray">Задание #{h.id} · Урок #{h.lesson_id}</p>
                  <p className="font-semibold text-fox-dark truncate">{h.title || 'Домашнее задание'}</p>
                  {h.description && <p className="text-sm text-fox-gray mt-1">{h.description}</p>}
                </div>
                <Badge variant={meta.variant}>{meta.label}</Badge>
              </div>

              {isSubmitted ? (
                <div className="p-3 bg-fox-light rounded-xl text-sm text-fox-graphite border border-fox-border/30">
                  {h.content || 'Текстовый ответ отсутствует'}
                </div>
              ) : (
                <div className="space-y-3">
                  <Textarea
                    label="Текст ответа"
                    value={studentAnswer}
                    onChange={(e) => setStudentAnswer(e.target.value)}
                    rows={4}
                    placeholder="Напишите ответ на задание..."
                  />
                  <Input
                    label="Ссылки на файлы (JSON-массив)"
                    placeholder='["https://example.com/file.pdf"]'
                    value={studentFiles}
                    onChange={(e) => setStudentFiles(e.target.value)}
                  />
                  <Button onClick={() => submitAnswer(h.id)} loading={submitting}>
                    Отправить на проверку
                  </Button>
                </div>
              )}

              {(reviews[h.id] || []).length > 0 && (
                <div className="border-t border-fox-border pt-4">
                  <p className="text-sm font-medium text-fox-graphite mb-2">История проверок</p>
                  <div className="space-y-2">
                    {reviews[h.id].map((r) => (
                      <div key={r.id} className="p-3 bg-fox-light rounded-xl text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={r.status === 'approved' ? 'success' : r.status === 'revision' ? 'warning' : 'error'}>
                            {statusMeta[r.status]?.label || r.status}
                          </Badge>
                          {r.score !== null && <span className="text-fox-gray">Балл: {r.score}</span>}
                        </div>
                        {r.comment && <p className="text-fox-gray">{r.comment}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )
        })
      )}
    </div>
  )

  const renderReviewerView = () => (
    <>
      <Card padding="none">
        <Table>
          <Thead>
            <tr>
              <Th>ID</Th>
              <Th>Урок</Th>
              <Th>Ученик</Th>
              <Th>Содержание</Th>
              <Th>Статус</Th>
              <Th>Сдано</Th>
              <Th>Проверки</Th>
              <Th></Th>
            </tr>
          </Thead>
          <Tbody>
            {homeworks.map((h) => {
              const meta = statusMeta[h.status] || { label: h.status, variant: 'default' as const }
              return (
                <Tr key={h.id}>
                  <Td>#{h.id}</Td>
                  <Td>{h.lesson_id}</Td>
                  <Td>{h.student_id}</Td>
                  <Td className="max-w-xs truncate">{h.content || '—'}</Td>
                  <Td>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </Td>
                  <Td>{h.submitted_at ? new Date(h.submitted_at).toLocaleDateString('ru-RU') : '—'}</Td>
                  <Td>{(reviews[h.id] || []).length}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelected(h)
                          setReview({ status: 'approved', score: '', comment: '' })
                        }}
                      >
                        Проверить
                      </Button>
                      <Button size="sm" variant="ghost" leftIcon={<LuPencil />} onClick={() => startEdit(h)} />
                      <Button size="sm" variant="ghost" className="text-fox-error hover:text-fox-error" leftIcon={<LuTrash2 />} onClick={() => deleteHomework(h.id)} />
                    </div>
                  </Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>
      </Card>

      <Modal
        isOpen={!!editHomework}
        onClose={() => setEditHomework(null)}
        title={editHomework ? `Редактирование задания #${editHomework.id}` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditHomework(null)}>Отмена</Button>
            <Button type="submit" form="edit-form" loading={savingEdit}>Сохранить</Button>
          </>
        }
      >
        {editHomework && (
          <form id="edit-form" onSubmit={saveEdit} className="space-y-4">
            <Input
              label="ID урока"
              type="number"
              value={editForm.lesson_id ?? ''}
              onChange={(e) => setEditForm({ ...editForm, lesson_id: Number(e.target.value) })}
            />
            <Input
              label="ID ученика"
              type="number"
              value={editForm.student_id ?? ''}
              onChange={(e) => setEditForm({ ...editForm, student_id: Number(e.target.value) })}
            />
            <Textarea
              label="Содержание"
              value={editForm.content || ''}
              onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
              rows={4}
            />
            <Select
              label="Статус"
              value={editForm.status || ''}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            >
              <option value="assigned">Назначено</option>
              <option value="submitted">Сдано</option>
              <option value="reviewed">Проверено</option>
              <option value="revision">Доработка</option>
              <option value="rejected">Отклонено</option>
            </Select>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Проверка задания #${selected.id}` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Отмена
            </Button>
            <Button type="submit" form="review-form" loading={submitting}>
              Сохранить
            </Button>
          </>
        }
      >
        {selected && (
          <form id="review-form" onSubmit={submitReview} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-fox-graphite mb-1.5">Решение</label>
              <div className="p-3 bg-fox-light rounded-xl text-sm text-fox-graphite border border-fox-border/30 min-h-[80px]">
                {selected.content || 'Текстовое решение отсутствует'}
              </div>
            </div>
            <Select
              label="Статус проверки"
              value={review.status}
              onChange={(e) => setReview({ ...review, status: e.target.value })}
            >
              <option value="approved">Принято</option>
              <option value="revision">На доработку</option>
              <option value="rejected">Отклонено</option>
            </Select>
            <Input
              label="Балл"
              type="number"
              placeholder="0–100"
              value={review.score}
              onChange={(e) => setReview({ ...review, score: e.target.value })}
            />
            <Textarea
              label="Комментарий"
              value={review.comment}
              onChange={(e) => setReview({ ...review, comment: e.target.value })}
              rows={3}
            />
          </form>
        )}
      </Modal>
    </>
  )

  return (
    <PageShell>
      <Header title="Домашние задания" subtitle={isReviewer ? 'Выдача и проверка ДЗ' : 'Мои домашние задания'} icon={<LuNotebookPen />} />

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
              <h2 className="text-2xl md:text-3xl font-bold text-fox-purple mb-2">
                {isReviewer ? 'Проверка заданий' : 'Мои задания'}
              </h2>
              <p className="text-fox-gray">{homeworks.length} заданий</p>
            </div>
            <Button onClick={() => fetchHomeworks()} variant="secondary" leftIcon={<LuRefreshCw size={16} />}>
              Обновить
            </Button>
          </div>
        </div>

        {loading ? (
          <Loader text="Загрузка заданий..." />
        ) : homeworks.length === 0 ? (
          <EmptyState
            icon={<LuNotebookPen />}
            title="Нет домашних заданий"
            description={isReviewer ? 'Когда ученики сдадут задания, они появятся здесь.' : 'Вам пока не назначены задания.'}
          />
        ) : isReviewer ? (
          renderReviewerView()
        ) : (
          renderStudentView()
        )}
      </div>
    </PageShell>
  )
}
