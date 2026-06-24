import { useEffect, useState } from 'react'
import { Loader, Button, Input, Card } from '../components/ui'
import { useToast } from '../components/ui/Toast'
import { authApi } from '../api'
import { useAuth } from '../contexts/AuthContext'

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

type Screen = 'loading' | 'login' | 'linking' | 'success' | 'error'

export default function MaxLinkPage() {
  const { user, login, isLoading: authLoading } = useAuth()
  const { showToast } = useToast()
  const [screen, setScreen] = useState<Screen>('loading')
  const [message, setMessage] = useState('Открываем мини-приложение FOXINBURG...')
  const [initData, setInitData] = useState('')
  const [linkToken, setLinkToken] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://st.max.ru/js/max-web-app.js'
    script.async = true
    script.onload = () => {
      const WebApp = window.WebApp
      if (!WebApp) {
        setScreen('error')
        setMessage('Не удалось загрузить MAX Bridge. Откройте приложение из чата с ботом MAX.')
        return
      }
      WebApp.ready()
      const urlParams = new URLSearchParams(window.location.search)
      const token =
        WebApp.initDataUnsafe?.start_param ||
        urlParams.get('token') ||
        urlParams.get('startapp') ||
        ''
      const data = WebApp.initData || ''
      setInitData(data)
      setLinkToken(token)

      if (!data) {
        setScreen('error')
        setMessage('Данные из MAX не получены. Откройте приложение из чата с ботом.')
        return
      }

      if (token) {
        linkByToken(token, data)
      } else {
        // Без токена требуем авторизацию в приложении
        setScreen('login')
        setMessage('Войдите, чтобы привязать MAX и открыть магазин услуг.')
      }
    }
    script.onerror = () => {
      setScreen('error')
      setMessage('Ошибка загрузки MAX Bridge. Откройте приложение из чата с ботом MAX.')
    }
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [])

  // Если пользователь уже вошёл (например, обновил страницу), сразу привязываем
  useEffect(() => {
    if (!authLoading && user && initData && !linkToken && screen === 'login') {
      linkAuthenticated(initData)
    }
  }, [authLoading, user, initData, linkToken, screen])

  const linkByToken = async (token: string, data: string) => {
    setScreen('linking')
    setMessage('Привязываем ваш MAX-аккаунт...')
    try {
      const res = await fetch('/api/v3/max/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, init_data: data }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setScreen('success')
        setMessage('Аккаунт MAX успешно привязан! Можете закрыть это окно.')
      } else {
        setScreen('error')
        setMessage(json.message || 'Ошибка привязки')
      }
    } catch (e) {
      setScreen('error')
      setMessage('Ошибка соединения с сервером')
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      showToast('Введите email и пароль', 'error')
      return
    }
    setLoggingIn(true)
    try {
      const { access_token, user } = await authApi.login(email, password)
      login(user, access_token)
      showToast('Вход выполнен', 'success')
      await linkAuthenticated(initData)
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Ошибка входа', 'error')
    } finally {
      setLoggingIn(false)
    }
  }

  const linkAuthenticated = async (data: string) => {
    setScreen('linking')
    setMessage('Привязываем ваш MAX-аккаунт...')
    try {
      await authApi.linkMaxInApp({ init_data: data })
      setScreen('success')
      setMessage('MAX успешно привязан! Теперь вы можете получать уведомления и пользоваться магазином.')
    } catch (err: any) {
      setScreen('error')
      setMessage(err?.response?.data?.message || 'Ошибка привязки MAX')
    }
  }

  return (
    <div className="min-h-screen bg-fox-light flex items-center justify-center p-6">
      <Card className="max-w-sm w-full p-8 text-center">
        {screen === 'loading' && <Loader text={message} />}

        {screen === 'login' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-fox-dark">FOXINBURG</h1>
              <p className="text-sm text-fox-gray">{message}</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4 text-left">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" loading={loggingIn}>
                Войти и привязать MAX
              </Button>
            </form>
          </div>
        )}

        {screen === 'linking' && <Loader text={message} />}

        {screen === 'success' && (
          <div className="space-y-4">
            <div className="text-5xl">🦊</div>
            <div className="text-green-600 font-medium">{message}</div>
            <p className="text-sm text-fox-gray">
              Магазин услуг скоро появится прямо здесь.
            </p>
          </div>
        )}

        {screen === 'error' && (
          <div className="space-y-4">
            <div className="text-5xl">⚠️</div>
            <div className="text-red-500 font-medium">{message}</div>
          </div>
        )}
      </Card>
    </div>
  )
}
