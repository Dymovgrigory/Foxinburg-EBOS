import { useEffect, useRef, useState } from 'react'
import { useToast, Button, Badge, Loader } from './ui'
import { authApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { LuCheck, LuMessageCircle } from 'react-icons/lu'

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramUser) => void
  }
}

export default function TelegramLinkSection() {
  const { user, login } = useAuth()
  const { showToast } = useToast()
  const [info, setInfo] = useState<{ bot_username: string; bot_link: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [linking, setLinking] = useState(false)
  const widgetContainerRef = useRef<HTMLDivElement>(null)
  const isConnected = Boolean(user?.telegram_chat_id)

  useEffect(() => {
    authApi
      .getTelegramInfo()
      .then(setInfo)
      .catch(() => {
        // Если endpoint недоступен — функция не настроена, молча игнорируем
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (isConnected || !info?.bot_username || !widgetContainerRef.current) return

    const container = widgetContainerRef.current
    container.innerHTML = ''

    window.onTelegramAuth = handleTelegramAuth

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', info.bot_username)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-onauth', 'onTelegramAuth')
    script.setAttribute('data-request-access', 'write')
    container.appendChild(script)

    return () => {
      window.onTelegramAuth = undefined
      if (container.contains(script)) {
        container.removeChild(script)
      }
      container.innerHTML = ''
    }
  }, [info, isConnected])

  const handleTelegramAuth = async (telegramUser: TelegramUser) => {
    setLinking(true)
    try {
      const updated = await authApi.linkTelegram({
        id: telegramUser.id,
        hash: telegramUser.hash,
        auth_date: telegramUser.auth_date,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
        username: telegramUser.username,
        photo_url: telegramUser.photo_url,
      })
      const token = localStorage.getItem('token') || ''
      login(updated, token)
      showToast('Telegram успешно привязан', 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Ошибка привязки Telegram', 'error')
    } finally {
      setLinking(false)
    }
  }

  const handleUnlink = async () => {
    setLinking(true)
    try {
      const updated = await authApi.linkTelegram({ telegram_chat_id: '' })
      const token = localStorage.getItem('token') || ''
      login(updated, token)
      showToast('Telegram отвязан', 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Ошибка отвязки Telegram', 'error')
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
        Функция привязки Telegram не настроена администратором.
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-fox-light rounded-xl border border-fox-border/30">
      <div className="space-y-1">
        <div className="font-medium text-fox-dark flex items-center gap-2">
          <LuMessageCircle className="text-[#229ED9]" />
          Telegram
        </div>
        <div className="text-xs text-fox-gray">
          {isConnected
            ? 'Telegram привязан — вы будете получать мгновенные уведомления о занятиях.'
            : 'Привяжите Telegram, чтобы получать мгновенные уведомления о занятиях.'}
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
          <div ref={widgetContainerRef} className="h-10" />
        )}
      </div>
    </div>
  )
}
