import { useEffect, useState } from 'react'
import { getErrorMessage } from '../utils/error'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { useToast, Button, Card, Badge, Loader, EmptyState } from '../components/ui'
import { notificationsApi } from '../api'
import type { NotificationItem } from '../types'

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
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const [list, count] = await Promise.all([notificationsApi.list(), notificationsApi.unreadCount()])
      setNotifications(list)
      setUnreadCount(count.count)
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка загрузки уведомлений'), 'error')
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
      await notificationsApi.markRead(id)
      await fetchNotifications()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка'), 'error')
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead()
      await fetchNotifications()
      showToast('Все уведомления прочитаны', 'success')
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка'), 'error')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await notificationsApi.delete(id)
      await fetchNotifications()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка'), 'error')
    }
  }

  const handleNavigate = (n: NotificationItem) => {
    if (n.link) {
      window.open(n.link, '_blank')
    } else if (n.entity_type && n.entity_id) {
      if (n.entity_type === 'schedule') navigate('/calendar')
      else if (n.entity_type === 'chat') navigate('/chats')
      else if (n.entity_type === 'homework') navigate('/homeworks')
    }
  }

  return (
    <div className="min-h-screen bg-fox-light">
      <Header title="Уведомления" subtitle={`Непрочитанных: ${unreadCount}`} icon="🔔" />

      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-fox-dark">Все уведомления</h2>
              <p className="text-xs text-gray-500 mt-0.5">{notifications.length} записей</p>
            </div>
            {unreadCount > 0 && (
              <Button variant="secondary" size="sm" onClick={handleMarkAllRead}>
                Прочитать все
              </Button>
            )}
          </div>

          {loading ? (
            <Loader text="Загрузка уведомлений..." />
          ) : notifications.length === 0 ? (
            <EmptyState icon="🔔" title="Нет уведомлений" description="Здесь будут появляться важные события." />
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={[
                    'p-4 rounded-xl border transition flex items-start gap-4',
                    n.is_read
                      ? 'bg-white border-fox-border/50'
                      : 'bg-fox-purple/5 border-fox-purple/20',
                  ].join(' ')}
                >
                  <div className={['w-2 h-2 mt-2 rounded-full flex-shrink-0', n.is_read ? 'bg-gray-300' : 'bg-fox-purple'].join(' ')} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant={typeVariant(n.type)} size="sm">{typeLabel(n.type)}</Badge>
                      <span className="text-xs text-gray-400">{formatTime(n.created_at)}</span>
                    </div>
                    <h3 className="text-sm font-bold text-fox-dark">{n.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                    {(n.link || n.entity_type) && (
                      <Button variant="ghost" size="sm" className="mt-2" onClick={() => handleNavigate(n)}>
                        Перейти →
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!n.is_read && (
                      <Button variant="ghost" size="sm" onClick={() => handleMarkRead(n.id)}>
                        Прочитать
                      </Button>
                    )}
                    <Button variant="danger" size="sm" onClick={() => handleDelete(n.id)}>
                      Удалить
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function typeVariant(type: string): Parameters<typeof Badge>[0]['variant'] {
  const map: Record<string, Parameters<typeof Badge>[0]['variant']> = {
    system: 'purple',
    schedule: 'info',
    chat: 'success',
    homework: 'warning',
    payment: 'error',
    achievement: 'default',
    event: 'default',
  }
  return map[type] || 'default'
}
