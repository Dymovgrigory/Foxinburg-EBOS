import { useEffect, useState } from 'react'
import Header from '../components/Header'
import api from '../services/api'

interface Organization {
  id: number
  name: string
}

interface Branch {
  id: number
  name: string
  address?: string
  phone?: string
  email?: string
  organization_id: number
}

export default function BranchesPage() {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ organization_id: '', name: '', address: '', phone: '', email: '' })

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const orgsRes = await api.get('/organizations')
      const orgList: Organization[] = orgsRes.data.data || []
      setOrgs(orgList)
      if (orgList.length > 0) {
        const branchesRes = await api.get(`/organizations/${orgList[0].id}/branches`)
        setBranches(branchesRes.data.data || [])
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.organization_id) return
    try {
      await api.post(`/organizations/${form.organization_id}/branches`, {
        name: form.name,
        address: form.address,
        phone: form.phone,
        email: form.email,
        organization_id: Number(form.organization_id),
      })
      setShowForm(false)
      setForm({ organization_id: '', name: '', address: '', phone: '', email: '' })
      await fetchData()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка создания филиала')
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header title="Филиалы" subtitle="Организации и филиалы" icon="🏢" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Филиалы</h2>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-[#E85D4C] hover:bg-[#D14F40] text-white text-sm font-medium rounded-xl transition">
            {showForm ? 'Отмена' : '+ Новый филиал'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 grid md:grid-cols-3 gap-4">
            <select required value={form.organization_id} onChange={(e) => setForm({ ...form, organization_id: e.target.value })} className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]">
              <option value="">Организация</option>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <input required placeholder="Название филиала" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]" />
            <input placeholder="Адрес" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]" />
            <input placeholder="Телефон" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]" />
            <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]" />
            <button type="submit" className="px-4 py-2 bg-[#7C5CFC] hover:bg-[#6B4FD6] text-white rounded-xl font-medium">Создать</button>
          </form>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Название</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Адрес</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Телефон</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Загрузка...</td></tr>
              ) : branches.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Нет филиалов</td></tr>
              ) : branches.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-700">{b.id}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{b.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{b.address || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{b.phone || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{b.email || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
