import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import api from '../services/api'

interface Notification {
  id: number
  user_id: number
  title: string
  message: string
  type: string
  link?: string
  entity_type?: string
  entity_id?: number
  is_read: boolean
  read_at?: string
  created_at: string
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function typeLabel(type: string) {
  const map: Record<string, string> = {
    system: 'Система',
    schedule: 'Расписание',
    chat: 'Чат',
    homework: 'Домашка',
    payment: 'Оплата',
    achievement: 'Достижение',
    event: 'Событие',
  }
  return map[type] || type
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const fetchNotifications = async () => {
    setLoading(true)
    setError('')
    try {
      const [listRes, countRes] = await Promise.all([
        api.get('/notifications'),
        api.get('/notifications/unread-count'),
      ])
      setNotifications(listRes.data.data || [])
      setUnreadCount(countRes.data.data?.count || 0)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleMarkRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      await fetchNotifications()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка')
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all')
      await fetchNotifications()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/notifications/${id}`)
      await fetchNotifications()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка')
    }
  }

  const handleNavigate = (n: Notification) => {
    if (n.link) {
      window.open(n.link, '_blank')
    } else if (n.entity_type && n.entity_id) {
      if (n.entity_type === 'schedule') navigate('/calendar')
      else if (n.entity_type === 'chat') navigate('/community')
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header title="Уведомления" subtitle={`Непрочитанных: ${unreadCount}`} icon="🔔" />

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Все уведомления</h2>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-4 py-2 bg-[#7C5CFC] hover:bg-[#6B4FD6] text-white text-sm font-medium rounded-xl transition"
            >
              Прочитать все
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Загрузка...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Нет уведомлений</div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={[
                  'p-5 flex items-start gap-4 hover:bg-gray-50 transition',
                  n.is_read ? 'bg-white' : 'bg-[#E85D4C]/5',
                ].join(' ')}
              >
                <div className={[
                  'w-2 h-2 mt-2 rounded-full flex-shrink-0',
                  n.is_read ? 'bg-gray-300' : 'bg-[#E85D4C]',
                ].join(' ')} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-[#E85D4C] uppercase">{typeLabel(n.type)}</span>
                    <span className="text-xs text-gray-400">{formatTime(n.created_at)}</span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">{n.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                  {(n.link || n.entity_type) && (
                    <button
                      onClick={() => handleNavigate(n)}
                      className="mt-2 text-sm text-[#7C5CFC] hover:underline"
                    >
                      Перейти
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="px-3 py-1.5 text-xs font-medium text-[#7C5CFC] bg-[#7C5CFC]/10 rounded-lg hover:bg-[#7C5CFC]/20 transition"
                    >
                      Прочитать
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
