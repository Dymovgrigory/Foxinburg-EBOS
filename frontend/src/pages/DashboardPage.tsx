import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }
    api.get('/auth/me')
      .then(res => setUser(res.data))
      .catch(() => {
        localStorage.removeItem('token')
        navigate('/login')
      })
  }, [navigate])

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  if (!user) return <div className="p-8">Загрузка...</div>

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-fox-purple mb-2">Личный кабинет</h1>
            <p className="text-gray-600">Добро пожаловать, {user.name}!</p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 border border-fox-purple text-fox-purple rounded-lg hover:bg-fox-purple hover:text-fox-gold transition"
          >
            Выйти
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-fox-light p-4 rounded-xl border border-fox-border">
            <div className="text-sm text-gray-600">Email</div>
            <div className="font-semibold">{user.email}</div>
          </div>
          <div className="bg-fox-light p-4 rounded-xl border border-fox-border">
            <div className="text-sm text-gray-600">Роль</div>
            <div className="font-semibold">{user.role}</div>
          </div>
          <div className="bg-fox-light p-4 rounded-xl border border-fox-border">
            <div className="text-sm text-gray-600">Тариф</div>
            <div className="font-semibold">{user.plan}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
