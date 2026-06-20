import { useState, useCallback } from 'react'
import api from '../services/api'
import { useAuth, User } from '../contexts/AuthContext'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authName, setAuthName] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const handleAuthSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setAuthError('')
      setAuthLoading(true)
      try {
        let response
        if (isLogin) {
          const params = new URLSearchParams()
          params.append('username', authEmail)
          params.append('password', authPassword)
          response = await api.post('/auth/login', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          })
        } else {
          response = await api.post('/auth/register', {
            email: authEmail,
            password: authPassword,
            name: authName,
          })
        }
        const payload = response.data.data ?? response.data
        const token = payload.access_token
        const user: User = payload.user
        if (!token || !user) throw new Error('Некорректный ответ сервера')
        login(user, token)
        window.location.href = '/system-center'
      } catch (err: any) {
        const msg =
          err.response?.data?.message ||
          err.response?.data?.detail ||
          err.message ||
          'Ошибка авторизации'
        setAuthError(msg)
      } finally {
        setAuthLoading(false)
      }
    },
    [isLogin, authEmail, authPassword, authName, login]
  )

  const toggleMode = useCallback(() => {
    setIsLogin((prev) => !prev)
    setAuthError('')
  }, [])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[#1a1229] border border-white/10 p-8 shadow-2xl animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white">
            {isLogin ? 'Вход в EBOS' : 'Регистрация'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition text-2xl leading-none"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        {authError && (
          <div className="mb-4 p-3 bg-red-500/15 border border-red-500/30 text-red-200 rounded-xl text-sm">
            {authError}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Имя</label>
              <input
                type="text"
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                required={!isLogin}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#F5ED75] focus:ring-1 focus:ring-[#F5ED75]/30 transition"
                placeholder="Ваше имя"
              />
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#F5ED75] focus:ring-1 focus:ring-[#F5ED75]/30 transition"
              placeholder="name@company.ru"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Пароль</label>
            <input
              type="password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#F5ED75] focus:ring-1 focus:ring-[#F5ED75]/30 transition"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={authLoading}
            className="w-full py-3 rounded-xl bg-[#F5ED75] text-[#1a1229] font-bold hover:bg-[#e8df60] transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {authLoading ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          {isLogin ? 'Ещё нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
          <button
            type="button"
            onClick={toggleMode}
            className="text-[#F5ED75] hover:underline font-medium"
          >
            {isLogin ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </div>
      </div>
    </div>
  )
}
