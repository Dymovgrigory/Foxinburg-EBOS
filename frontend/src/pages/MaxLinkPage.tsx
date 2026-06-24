import { useEffect, useState } from 'react'
import { Loader } from '../components/ui'

interface MaxWebApp {
  ready: () => void
  initData: string
  initDataUnsafe: {
    start_param?: string
    user?: { id: number; first_name?: string; last_name?: string; username?: string }
    [key: string]: any
  }
}

declare global {
  interface Window {
    WebApp?: MaxWebApp
  }
}

export default function MaxLinkPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Открываем мини-приложение MAX...')

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://st.max.ru/js/max-web-app.js'
    script.async = true
    script.onload = () => {
      const WebApp = window.WebApp
      if (!WebApp) {
        setStatus('error')
        setMessage('Не удалось загрузить MAX Bridge')
        return
      }
      WebApp.ready()
      const token = WebApp.initDataUnsafe?.start_param || ''
      const initData = WebApp.initData || ''
      linkAccount(token, initData)
    }
    script.onerror = () => {
      setStatus('error')
      setMessage('Ошибка загрузки MAX Bridge')
    }
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const linkAccount = async (token: string, initData: string) => {
    if (!token || !initData) {
      setStatus('error')
      setMessage('Не получены данные из MAX. Откройте приложение из чата с ботом.')
      return
    }
    try {
      const res = await fetch('/api/v3/max/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, init_data: initData }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setStatus('success')
        setMessage('Аккаунт MAX успешно привязан! Можете закрыть это окно.')
      } else {
        setStatus('error')
        setMessage(json.message || 'Ошибка привязки')
      }
    } catch (e) {
      setStatus('error')
      setMessage('Ошибка соединения с сервером')
    }
  }

  return (
    <div className="min-h-screen bg-fox-light flex items-center justify-center p-6">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-fox-border/30 p-8 text-center">
        {status === 'loading' && <Loader text={message} />}
        {status === 'success' && (
          <div className="text-green-600 font-medium">{message}</div>
        )}
        {status === 'error' && <div className="text-red-500 font-medium">{message}</div>}
      </div>
    </div>
  )
}
