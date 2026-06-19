import { useEffect, useState } from 'react'
import Header from '../components/Header'
import api from '../services/api'

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

export default function HomeworksPage() {
  const [homeworks, setHomeworks] = useState<Homework[]>([])
  const [reviews, setReviews] = useState<Record<number, Review[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Homework | null>(null)
  const [review, setReview] = useState({ status: 'approved', score: '', comment: '' })

  const fetchHomeworks = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/homeworks')
      const list: Homework[] = res.data.data || []
      setHomeworks(list)
      const reviewMap: Record<number, Review[]> = {}
      await Promise.all(
        list.map(async (h) => {
          const r = await api.get(`/homeworks/${h.id}/reviews`)
          reviewMap[h.id] = r.data.data || []
        })
      )
      setReviews(reviewMap)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка загрузки заданий')
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
      await fetchHomeworks()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка проверки')
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header title="Домашние задания" subtitle="Выдача и проверка ДЗ" icon="📝" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Урок</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Ученик</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Содержание</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Статус</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Сдано</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Проверки</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-400">Загрузка...</td></tr>
              ) : homeworks.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-400">Нет заданий</td></tr>
              ) : homeworks.map((h) => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-700">{h.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{h.lesson_id}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{h.student_id}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{h.content || '—'}</td>
                  <td className="px-6 py-4"><StatusBadge status={h.status} /></td>
                  <td className="px-6 py-4 text-sm text-gray-700">{h.submitted_at ? new Date(h.submitted_at).toLocaleDateString('ru-RU') : '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{(reviews[h.id] || []).length}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => setSelected(h)} className="text-[#E85D4C] hover:underline text-sm font-medium">Проверить</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Проверка задания #{selected.id}</h3>
              <form onSubmit={submitReview} className="space-y-4">
                <select value={review.status} onChange={(e) => setReview({ ...review, status: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]">
                  <option value="approved">Принято</option>
                  <option value="revision">На доработку</option>
                  <option value="rejected">Отклонено</option>
                </select>
                <input type="number" placeholder="Балл" value={review.score} onChange={(e) => setReview({ ...review, score: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]" />
                <textarea placeholder="Комментарий" value={review.comment} onChange={(e) => setReview({ ...review, comment: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]" rows={3} />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setSelected(null)} className="flex-1 py-2 border border-gray-200 rounded-xl text-gray-700">Отмена</button>
                  <button type="submit" className="flex-1 py-2 bg-[#E85D4C] text-white rounded-xl font-medium">Сохранить</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    submitted: 'bg-blue-100 text-blue-700',
    reviewed: 'bg-green-100 text-green-700',
    revision: 'bg-orange-100 text-orange-700',
  }
  return <span className={['px-2 py-1 rounded-full text-xs font-medium', styles[status] || 'bg-gray-100 text-gray-700'].join(' ')}>{status}</span>
}
