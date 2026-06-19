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
        // Backend login использует OAuth2PasswordRequestForm
        const params = new URLSearchParams()
        params.append('username', email)
        params.append('password', password)
        response = await api.post('/auth/login', params, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      } else {
        response = await api.post('/auth/register', { email, password, name })
      }

      // Единый формат ответа API: { success: true, data: {...}, message: '...' }
      const payload = response.data.data ?? response.data
      const token = payload.access_token
      const user: User = payload.user

      if (!token || !user) {
        throw new Error('Некорректный ответ сервера')
      }

      login(user, token)
      navigate('/dashboard')
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.detail || err.message || 'Ошибка авторизации'
      setError(msg)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-fox-light">
      <div className="fox-card w-full max-w-md">
        <h2 className="text-2xl font-bold text-fox-purple mb-6 text-center">
          {isLogin ? 'Вход в аккаунт' : 'Создать аккаунт'}
        </h2>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <input
              type="text"
              placeholder="Ваше имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="fox-input"
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="fox-input"
            required
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="fox-input"
            required
          />
          <button type="submit" className="fox-btn-primary w-full">
            {isLogin ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>
        <p className="mt-4 text-center text-gray-600">
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
  )
}
