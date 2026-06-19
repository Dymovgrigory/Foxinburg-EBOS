import { useEffect, useState } from 'react'
import Header from '../components/Header'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

export default function SettingsPage() {
  const { user, login } = useAuth()
  const [profile, setProfile] = useState({ name: '', phone: '', bio: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      setProfile({ name: user.name || '', phone: '', bio: '' })
      fetchProfile()
    }
  }, [user])

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/me')
      const data = res.data.data
      setProfile({ name: data.name || '', phone: data.phone || '', bio: data.bio || '' })
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось загрузить профиль')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')
    try {
      const res = await api.patch('/auth/me', profile)
      const updated = res.data.data
      login(updated, localStorage.getItem('token') || '')
      setMessage('Профиль сохранён')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка сохранения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header title="Настройки" icon="🔧" />

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {message && <div className="p-4 bg-green-50 text-green-700 rounded-xl text-sm">{message}</div>}
        {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span className="text-amber-500">👤</span> Профиль
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
              <input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#E85D4C] focus:ring-2 focus:ring-[#E85D4C]/20 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input value={user?.email || ''} disabled className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
              <input
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#E85D4C] focus:ring-2 focus:ring-[#E85D4C]/20 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Роль</label>
              <input value={user?.role || ''} disabled className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">О себе</label>
              <textarea
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#E85D4C] focus:ring-2 focus:ring-[#E85D4C]/20 outline-none transition"
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-[#F5C542] hover:bg-[#E5B532] text-gray-900 font-semibold rounded-xl transition flex items-center gap-2 disabled:opacity-60"
              >
                <span>💾</span> {loading ? 'Сохранение...' : 'Сохранить профиль'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
