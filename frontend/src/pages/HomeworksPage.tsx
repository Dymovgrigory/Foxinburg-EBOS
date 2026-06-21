import { useEffect, useState } from 'react'
import Header from '../components/Header'
import api from '../services/api'
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
} from '../components/ui'

interface Homework {
  id: number
  lesson_id: number
  student_id: number
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
  pending: { label: 'Ожидает', variant: 'default' },
  submitted: { label: 'Сдано', variant: 'info' },
  reviewed: { label: 'Проверено', variant: 'success' },
  revision: { label: 'Доработка', variant: 'warning' },
  rejected: { label: 'Отклонено', variant: 'error' },
}

export default function HomeworksPage() {
  const { showToast } = useToast()
  const [homeworks, setHomeworks] = useState<Homework[]>([])
  const [reviews, setReviews] = useState<Record<number, Review[]>>({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Homework | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [review, setReview] = useState({ status: 'approved', score: '', comment: '' })

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

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    setSubmitting(true)
    try {
      await api.post(`/homeworks/${selected.id}/reviews`, {
        homework_id: selected.id,
        reviewed_by_id: 0,
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

  return (
    <div className="min-h-screen bg-fox-light">
      <Header title="Домашние задания" subtitle="Выдача и проверка ДЗ" icon="📝" />

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <Card>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-fox-dark">Список заданий</h2>
              <p className="text-xs text-gray-500 mt-0.5">{homeworks.length} заданий</p>
            </div>
            <Button onClick={() => fetchHomeworks()} variant="secondary" leftIcon="↻">
              Обновить
            </Button>
          </div>
        </Card>

        {loading ? (
          <Loader text="Загрузка заданий..." />
        ) : homeworks.length === 0 ? (
          <EmptyState
            icon="📝"
            title="Нет домашних заданий"
            description="Когда ученики сдадят задания, они появятся здесь."
          />
        ) : (
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
                      <Td><Badge variant={meta.variant}>{meta.label}</Badge></Td>
                      <Td>{h.submitted_at ? new Date(h.submitted_at).toLocaleDateString('ru-RU') : '—'}</Td>
                      <Td>{(reviews[h.id] || []).length}</Td>
                      <Td>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelected(h)
                            setReview({ status: 'approved', score: '', comment: '' })
                          }}
                        >
                          Проверить
                        </Button>
                      </Td>
                    </Tr>
                  )
                })}
              </Tbody>
            </Table>
          </Card>
        )}
      </div>

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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Решение</label>
              <div className="p-3 bg-fox-light rounded-xl text-sm text-gray-700 border border-fox-border/30 min-h-[80px]">
                {selected.content || 'Текстовое решение отсутствует'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Статус проверки</label>
              <select
                value={review.status}
                onChange={(e) => setReview({ ...review, status: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-fox-gold/50 focus:border-fox-gold bg-white"
              >
                <option value="approved">Принято</option>
                <option value="revision">На доработку</option>
                <option value="rejected">Отклонено</option>
              </select>
            </div>
            <Input
              label="Балл"
              type="number"
              placeholder="0–100"
              value={review.score}
              onChange={(e) => setReview({ ...review, score: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Комментарий</label>
              <textarea
                value={review.comment}
                onChange={(e) => setReview({ ...review, comment: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-fox-gold/50 focus:border-fox-gold"
              />
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
