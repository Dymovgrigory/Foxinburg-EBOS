import { useState, useCallback } from 'react'
import { getErrorMessage } from '../utils/error'
import { authApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import type { User } from '../types'

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
        let payload
        if (isLogin) {
          payload = await authApi.login(authEmail, authPassword)
        } else {
          payload = await authApi.register({ email: authEmail, password: authPassword, name: authName })
        }
        const { access_token, user } = payload
        if (!access_token || !user) throw new Error('Некорректный ответ сервера')
        login(user as User, access_token)
        window.location.href = '/system-center'
      } catch (err: unknown) {
        setAuthError(getErrorMessage(err, 'Ошибка авторизации'))
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
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-fox-purple/40 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-card bg-white border border-fox-border/50 p-8 shadow-fox-lg animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-fox-dark">
            {isLogin ? 'Вход в EBOS' : 'Регистрация'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-fox-dark transition text-2xl leading-none"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        {authError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm">
            {authError}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm text-gray-500 mb-1">Имя</label>
              <input
                type="text"
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                required={!isLogin}
                className="w-full px-4 py-3 rounded-xl bg-fox-light border border-fox-border/50 text-fox-dark placeholder-gray-400 focus:outline-none focus:border-fox-purple focus:ring-2 focus:ring-fox-gold/50 transition"
                placeholder="Ваше имя"
              />
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-500 mb-1">Email</label>
            <input
              type="email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-fox-light border border-fox-border/50 text-fox-dark placeholder-gray-400 focus:outline-none focus:border-fox-purple focus:ring-2 focus:ring-fox-gold/50 transition"
              placeholder="name@company.ru"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Пароль</label>
            <input
              type="password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-fox-light border border-fox-border/50 text-fox-dark placeholder-gray-400 focus:outline-none focus:border-fox-purple focus:ring-2 focus:ring-fox-gold/50 transition"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={authLoading}
            className="w-full py-3 rounded-xl bg-fox-gold text-fox-purple font-bold hover:bg-fox-gold-light transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {authLoading ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          {isLogin ? 'Ещё нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
          <button
            type="button"
            onClick={toggleMode}
            className="text-fox-purple hover:underline font-medium"
          >
            {isLogin ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </div>
      </div>
    </div>
  )
}
