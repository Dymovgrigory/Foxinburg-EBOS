import { useEffect, useState } from 'react'
import { useToast, Button, Badge, Loader } from './ui'
import { authApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { LuCheck, LuMessageCircle } from 'react-icons/lu'

export default function MaxLinkSection() {
  const { user, login } = useAuth()
  const { showToast } = useToast()
  const [info, setInfo] = useState<{ bot_username: string | null; link_token: string; miniapp_url: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [linking, setLinking] = useState(false)
  const isConnected = Boolean(user?.max_user_id)

  useEffect(() => {
    authApi
      .getMaxMiniappInfo()
      .then(setInfo)
      .catch(() => {
        // Если endpoint недоступен — функция не настроена, молча игнорируем
      })
      .finally(() => setLoading(false))
  }, [])

  const handleLink = async () => {
    if (!info?.bot_username) {
      showToast('MAX-бот не настроен', 'error')
      return
    }
    setLinking(true)
    try {
      const deepLink = `https://max.ru/${info.bot_username}?startapp=${info.link_token}`
      window.open(deepLink, '_blank')
      showToast('Открыл чат с ботом MAX. Нажмите «Привязать аккаунт» в боте.', 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Ошибка при открытии MAX', 'error')
    } finally {
      setLinking(false)
    }
  }

  const handleUnlink = async () => {
    setLinking(true)
    try {
      const updated = await authApi.updateMe({ max_user_id: null })
      const token = localStorage.getItem('token') || ''
      login(updated, token)
      showToast('MAX отвязан', 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Ошибка отвязки MAX', 'error')
    } finally {
      setLinking(false)
    }
  }

  if (loading) {
    return <Loader text="Загрузка..." />
  }

  if (!info?.bot_username) {
    return (
      <div className="p-4 bg-fox-light rounded-xl border border-fox-border/30 text-sm text-fox-gray">
        Привязка MAX не настроена администратором.
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-fox-light rounded-xl border border-fox-border/30">
      <div className="space-y-1">
        <div className="font-medium text-fox-dark flex items-center gap-2">
          <LuMessageCircle className="text-[#7B61FF]" />
          MAX
        </div>
        <div className="text-xs text-fox-gray">
          {isConnected
            ? 'MAX привязан — вы будете получать мгновенные уведомления о занятиях.'
            : 'Привяжите MAX, чтобы получать мгновенные уведомления о занятиях.'}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isConnected ? (
          <>
            <Badge variant="success">
              <LuCheck size={12} /> Привязано
            </Badge>
            <Button size="sm" variant="ghost" onClick={handleUnlink} loading={linking}>
              Отвязать
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={handleLink} loading={linking}>
            Привязать MAX
          </Button>
        )}
      </div>
    </div>
  )
}
