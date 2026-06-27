import { useState, useCallback, useEffect } from 'react'
import { LuEye, LuEyeOff, LuX, LuMail, LuLock, LuUser } from 'react-icons/lu'
import { getErrorMessage } from '../utils/error'
import { authApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { Button, Input } from './ui'
import type { User } from '../types'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  redirectTo?: string
  defaultRegister?: boolean
}

export default function AuthModal({ isOpen, onClose, redirectTo = '/system-center', defaultRegister = false }: AuthModalProps) {
  const { login } = useAuth()
  const [isLogin, setIsLogin] = useState(!defaultRegister)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authName, setAuthName] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // Синхронизируем режим (вход/регистрация) при каждом открытии модалки,
  // т.к. на лендинге модалка остаётся примонтированной между кликами.
  useEffect(() => {
    if (isOpen) {
      setIsLogin(!defaultRegister)
      setAuthError('')
    }
  }, [isOpen, defaultRegister])

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
        window.location.href = redirectTo
      } catch (err: unknown) {
        setAuthError(getErrorMessage(err, 'Ошибка авторизации'))
      } finally {
        setAuthLoading(false)
      }
    },
    [isLogin, authEmail, authPassword, authName, login, redirectTo]
  )

  const toggleMode = useCallback(() => {
    setIsLogin((prev) => !prev)
    setAuthError('')
  }, [])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fadeIn"
      style={{ backgroundColor: 'rgba(28, 14, 54, 0.4)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-card border p-8 shadow-fox-lg animate-scaleIn"
        style={{ backgroundColor: 'var(--fox-white)', borderColor: 'var(--fox-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold" style={{ color: 'var(--fox-purple)' }}>
            {isLogin ? 'Вход в EBOS' : 'Регистрация'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-fox-gray hover:text-fox-purple hover:bg-fox-light transition"
            aria-label="Закрыть"
          >
            <LuX size={24} />
          </button>
        </div>

        {authError && (
          <div
            className="mb-4 p-3 rounded-xl text-sm"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: 'var(--fox-error)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
          >
            {authError}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {!isLogin && (
            <Input
              label="Имя"
              type="text"
              value={authName}
              onChange={(e) => setAuthName(e.target.value)}
              required={!isLogin}
              placeholder="Ваше имя"
              leftIcon={<LuUser size={18} />}
            />
          )}
          <Input
            label="Email"
            type="email"
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
            required
            placeholder="name@company.ru"
            leftIcon={<LuMail size={18} />}
          />
          <div className="relative">
            <Input
              label="Пароль"
              type={showPassword ? 'text' : 'password'}
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              required
              placeholder="••••••••"
              leftIcon={<LuLock size={18} />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-fox-gray hover:text-fox-purple transition"
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {showPassword ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                </button>
              }
            />
          </div>
          <Button
            type="submit"
            loading={authLoading}
            disabled={authLoading}
            className="w-full justify-center"
          >
            {isLogin ? 'Войти' : 'Зарегистрироваться'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm" style={{ color: 'var(--fox-gray)' }}>
          {isLogin ? 'Ещё нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
          <button
            type="button"
            onClick={toggleMode}
            className="font-medium hover:underline"
            style={{ color: 'var(--fox-purple)' }}
          >
            {isLogin ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </div>
      </div>
    </div>
  )
}
