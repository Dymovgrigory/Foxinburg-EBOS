import { useState } from 'react'
import { getErrorMessage } from '../utils/error'
import { useNavigate } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo'
import { authApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import type { User } from '../types'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let payload
      if (isLogin) {
        payload = await authApi.login(email, password)
      } else {
        payload = await authApi.register({ email, password, name })
      }
      const { access_token, user } = payload
      if (!access_token || !user) {
        throw new Error('Некорректный ответ сервера')
      }
      login(user as User, access_token)
      navigate('/system-center')
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Ошибка авторизации')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-fox-light">
      {/* Left side */}
      <div className="hidden lg:flex flex-1 bg-fox-purple text-white flex-col justify-between p-12">
        <div>
          <div className="mb-12">
            <BrandLogo darkText={false} />
          </div>
          <h2 className="text-4xl font-bold mb-6">Единая ОС для образовательного бизнеса</h2>
          <p className="text-lg opacity-90 mb-8">World · Academy · CRM/ERP · HRM</p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm">✓</span>
              <span>9 ролей в одной экосистеме</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm">✓</span>
              <span>Автоматизация учебных процессов</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm">✓</span>
              <span>Финансы, CRM и аналитика</span>
            </div>
          </div>
        </div>
        <div className="text-sm opacity-70">© {new Date().getFullYear()} FOXINBURG EBOS</div>
      </div>

      {/* Right side */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-card shadow-fox border border-fox-border/50 p-8">
          <div className="lg:hidden mb-8">
            <BrandLogo darkText />
          </div>
          <h2 className="text-2xl font-bold text-fox-dark mb-2">
            {isLogin ? 'Вход в систему' : 'Создать аккаунт'}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {isLogin ? 'Войдите в свою учётную запись EBOS' : 'Зарегистрируйтесь, чтобы начать'}
          </p>

          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-fox-purple focus:ring-2 focus:ring-fox-gold/50 outline-none transition"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-fox-purple focus:ring-2 focus:ring-fox-gold/50 outline-none transition"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-fox-purple focus:ring-2 focus:ring-fox-gold/50 outline-none transition"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-fox-purple hover:bg-fox-purple-light text-white font-semibold rounded-xl transition disabled:opacity-60"
            >
              {loading ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-fox-purple font-semibold hover:underline"
            >
              {isLogin ? 'Зарегистрироваться' : 'Войти'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
