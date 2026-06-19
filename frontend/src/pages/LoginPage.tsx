import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth, User } from '../contexts/AuthContext'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      let response
      if (isLogin) {
        const params = new URLSearchParams()
        params.append('username', email)
        params.append('password', password)
        response = await api.post('/auth/login', params, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      } else {
        response = await api.post('/auth/register', { email, password, name })
      }

      const payload = response.data.data ?? response.data
      const token = payload.access_token
      const user: User = payload.user

      if (!token || !user) {
        throw new Error('Некорректный ответ сервера')
      }

      login(user, token)
      navigate('/system-center')
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.detail || err.message || 'Ошибка авторизации'
      setError(msg)
    }
  }

  return (
    <div className="min-h-screen flex bg-[#F8F9FB]">
      {/* Left side */}
      <div className="hidden lg:flex flex-1 bg-[#E85D4C] text-white flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">✦</div>
            <div>
              <div className="font-bold text-xl leading-tight">FOXINBURG</div>
              <div className="text-[10px] tracking-wider opacity-80">EBOS</div>
            </div>
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
        <div className="text-sm opacity-70">© 2026 FOXINBURG EBOS</div>
      </div>

      {/* Right side */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#E85D4C] text-white flex items-center justify-center text-xl">✦</div>
            <div>
              <div className="font-bold text-xl leading-tight text-gray-900">FOXINBURG</div>
              <div className="text-[10px] text-gray-400 tracking-wider">EBOS</div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
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
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#E85D4C] focus:ring-2 focus:ring-[#E85D4C]/20 outline-none transition"
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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#E85D4C] focus:ring-2 focus:ring-[#E85D4C]/20 outline-none transition"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#E85D4C] focus:ring-2 focus:ring-[#E85D4C]/20 outline-none transition"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-[#E85D4C] hover:bg-[#D14F40] text-white font-semibold rounded-xl transition"
            >
              {isLogin ? 'Войти' : 'Зарегистрироваться'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-[#E85D4C] font-semibold hover:underline"
            >
              {isLogin ? 'Зарегистрироваться' : 'Войти'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
