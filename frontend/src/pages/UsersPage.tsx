import { useEffect, useState } from 'react'
import api from '../services/api'

interface User {
  id: number
  name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/users')
      .then((res) => {
        const data = res.data.data ?? res.data
        setUsers(data || [])
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Ошибка загрузки пользователей')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8">Загрузка...</div>
  if (error) return <div className="p-8 text-red-600">{error}</div>

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-fox-purple mb-6">👥 Пользователи</h1>
      <div className="fox-card overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-fox-border">
              <th className="pb-3">Имя</th>
              <th className="pb-3">Email</th>
              <th className="pb-3">Роль</th>
              <th className="pb-3">Статус</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-fox-border last:border-0">
                <td className="py-3">{u.name}</td>
                <td className="py-3">{u.email}</td>
                <td className="py-3 capitalize">{u.role}</td>
                <td className="py-3">
                  {u.is_active ? (
                    <span className="text-green-600">Активен</span>
                  ) : (
                    <span className="text-red-600">Заблокирован</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
