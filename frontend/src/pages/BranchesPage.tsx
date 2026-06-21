import { useEffect, useState } from 'react'
import Header from '../components/Header'
import api from '../services/api'
import { useToast, Button, Card, Input, Loader, EmptyState, Table, Thead, Th, Tbody, Tr, Td } from '../components/ui'

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
  const { showToast } = useToast()
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ organization_id: '', name: '', address: '', phone: '', email: '' })

  const fetchData = async () => {
    setLoading(true)
    try {
      const orgsRes = await api.get('/organizations')
      const orgList: Organization[] = orgsRes.data.data || []
      setOrgs(orgList)
      if (orgList.length > 0) {
        const branchesRes = await api.get(`/organizations/${orgList[0].id}/branches`)
        setBranches(branchesRes.data.data || [])
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка загрузки', 'error')
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
    setSubmitting(true)
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
      showToast('Филиал создан', 'success')
      await fetchData()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка создания филиала', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-fox-light">
      <Header title="Филиалы" subtitle="Организации и филиалы" icon="🏢" />

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <Card>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-fox-dark">Филиалы</h2>
              <p className="text-xs text-gray-500 mt-0.5">{branches.length} филиалов</p>
            </div>
            <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'secondary' : 'primary'} leftIcon={showForm ? '✕' : '+'}>
              {showForm ? 'Отмена' : 'Новый филиал'}
            </Button>
          </div>
        </Card>

        {showForm && (
          <Card>
            <h3 className="text-base font-bold text-fox-dark mb-4">Новый филиал</h3>
            <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-4">
              <select
                required
                value={form.organization_id}
                onChange={(e) => setForm({ ...form, organization_id: e.target.value })}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-fox-gold/50 focus:border-fox-gold bg-white"
              >
                <option value="">Организация</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
              <Input required placeholder="Название филиала" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="Адрес" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <Input placeholder="Телефон" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <div className="flex items-end">
                <Button type="submit" loading={submitting} className="w-full">Создать</Button>
              </div>
            </form>
          </Card>
        )}

        {loading ? (
          <Loader text="Загрузка филиалов..." />
        ) : branches.length === 0 ? (
          <EmptyState
            icon="🏢"
            title="Нет филиалов"
            description="Создай первый филиал организации."
            actionLabel="Новый филиал"
            onAction={() => setShowForm(true)}
          />
        ) : (
          <Card padding="none">
            <Table>
              <Thead>
                <tr>
                  <Th>ID</Th>
                  <Th>Название</Th>
                  <Th>Адрес</Th>
                  <Th>Телефон</Th>
                  <Th>Email</Th>
                </tr>
              </Thead>
              <Tbody>
                {branches.map((b) => (
                  <Tr key={b.id}>
                    <Td>#{b.id}</Td>
                    <Td className="font-medium text-fox-dark">{b.name}</Td>
                    <Td>{b.address || '—'}</Td>
                    <Td>{b.phone || '—'}</Td>
                    <Td>{b.email || '—'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  )
}
