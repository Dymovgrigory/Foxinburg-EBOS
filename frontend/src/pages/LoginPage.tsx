import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register'
      const payload = isLogin ? { email, password } : { email, password, name }
      const response = await api.post(endpoint, payload)
      localStorage.setItem('token', response.data.access_token)
      localStorage.setItem('user', JSON.stringify(response.data.user))
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка авторизации')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
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
              className="w-full px-4 py-3 border border-fox-border rounded-lg focus:border-fox-purple focus:outline-none"
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-fox-border rounded-lg focus:border-fox-purple focus:outline-none"
            required
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-fox-border rounded-lg focus:border-fox-purple focus:outline-none"
            required
          />
          <button
            type="submit"
            className="w-full py-3 bg-fox-purple text-fox-gold font-bold rounded-lg hover:bg-opacity-90 transition"
          >
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
