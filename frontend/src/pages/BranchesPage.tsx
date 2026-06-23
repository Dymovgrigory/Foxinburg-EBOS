import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import api from '../services/api'
import {
  useToast,
  Button,
  Card,
  Input,
  Badge,
  Loader,
  EmptyState,
  Table,
  Thead,
  Th,
  Tbody,
  Tr,
  Td,
  Modal,
  ModalFooterActions,
  Select,
} from '../components/ui'
import {
  LuBuilding,
  LuSearch,
  LuPlus,
  LuPencil,
  LuTrash2,
  LuPower,
  LuMapPin,
} from 'react-icons/lu'

interface Organization {
  id: number
  name: string
}

interface Branch {
  id: number
  name: string
  city?: string
  address?: string
  phone?: string
  email?: string
  organization_id: number
  is_active: number
  created_at: string
}

const emptyForm = {
  organization_id: '',
  name: '',
  city: '',
  address: '',
  phone: '',
  email: '',
  is_active: 1,
}

export default function BranchesPage() {
  const { showToast } = useToast()
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showActive, setShowActive] = useState(true)
  const [showInactive, setShowInactive] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Branch | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [orgsRes, branchesRes] = await Promise.all([
        api.get('/organizations'),
        api.get('/branches'),
      ])
      setOrgs(orgsRes.data.data || [])
      setBranches(branchesRes.data.data || [])
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка загрузки', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filtered = useMemo(() => {
    let result = branches
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          (b.city || '').toLowerCase().includes(q) ||
          (b.address || '').toLowerCase().includes(q) ||
          (b.phone || '').toLowerCase().includes(q)
      )
    }
    result = result.filter((b) => {
      if (b.is_active && !showActive) return false
      if (!b.is_active && !showInactive) return false
      return true
    })
    return result
  }, [branches, search, showActive, showInactive])

  const openCreate = () => {
    setEditing(null)
    setForm({
      ...emptyForm,
      organization_id: orgs[0]?.id ? String(orgs[0].id) : '',
    })
    setModalOpen(true)
  }

  const openEdit = (branch: Branch) => {
    setEditing(branch)
    setForm({
      organization_id: String(branch.organization_id),
      name: branch.name,
      city: branch.city || '',
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      is_active: branch.is_active,
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.organization_id || !form.name) {
      showToast('Укажите организацию и название', 'error')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        organization_id: Number(form.organization_id),
        is_active: Number(form.is_active),
      }
      if (editing) {
        await api.patch(`/branches/${editing.id}`, payload)
        showToast('Филиал обновлён', 'success')
      } else {
        await api.post('/branches', payload)
        showToast('Филиал создан', 'success')
      }
      setModalOpen(false)
      await fetchData()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка сохранения', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleStatus = async (branch: Branch) => {
    try {
      await api.patch(`/branches/${branch.id}`, {
        is_active: branch.is_active ? 0 : 1,
      })
      showToast('Статус обновлён', 'success')
      await fetchData()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка обновления', 'error')
    }
  }

  const handleDelete = async (branch: Branch) => {
    if (!confirm(`Удалить филиал «${branch.name}»?`)) return
    try {
      await api.delete(`/branches/${branch.id}`)
      showToast('Филиал удалён', 'success')
      await fetchData()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка удаления', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-fox-light">
      <Header title="Филиалы" subtitle="Управление филиалами школы" icon={<LuBuilding />} />

      <div className="p-4 md:p-6 w-full space-y-6">
        <Card>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-fox-dark">Филиалы</h2>
              <p className="text-xs text-fox-gray mt-0.5">{filtered.length} из {branches.length}</p>
            </div>
            <Button onClick={openCreate} leftIcon={<LuPlus size={18} />}>
              Добавить филиал
            </Button>
          </div>

          <div className="mt-5 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-fox-gray" size={18} />
              <Input
                placeholder="Поиск по названию, городу, адресу или телефону"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-fox-graphite cursor-pointer">
              <input
                type="checkbox"
                checked={showActive}
                onChange={(e) => setShowActive(e.target.checked)}
                className="rounded border-fox-border text-fox-purple focus:ring-fox-purple"
              />
              Активные
            </label>
            <label className="flex items-center gap-2 text-sm text-fox-graphite cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-fox-border text-fox-purple focus:ring-fox-purple"
              />
              Неактивные
            </label>
          </div>
        </Card>

        {loading ? (
          <Loader text="Загрузка филиалов..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<LuBuilding />}
            title="Нет филиалов"
            description="Создайте первый филиал организации."
            actionLabel="Добавить филиал"
            onAction={openCreate}
          />
        ) : (
          <Card padding="none">
            <Table>
              <Thead>
                <tr>
                  <Th>Статус</Th>
                  <Th>Название</Th>
                  <Th>Город</Th>
                  <Th>Адрес</Th>
                  <Th>Телефон</Th>
                  <Th>Аудитории</Th>
                  <Th>Действия</Th>
                </tr>
              </Thead>
              <Tbody>
                {filtered.map((b) => (
                  <Tr key={b.id}>
                    <Td>
                      {b.is_active ? (
                        <Badge variant="success">Активен</Badge>
                      ) : (
                        <Badge variant="default">Неактивен</Badge>
                      )}
                    </Td>
                    <Td className="font-medium text-fox-dark">{b.name}</Td>
                    <Td>{b.city || '—'}</Td>
                    <Td>{b.address || '—'}</Td>
                    <Td>{b.phone || '—'}</Td>
                    <Td>
                      <span className="inline-flex items-center gap-1 text-fox-purple">
                        <LuMapPin size={14} />
                        —
                      </span>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(b)}
                          className="p-2 text-fox-gray hover:text-fox-purple hover:bg-fox-light rounded-lg transition"
                          title="Редактировать"
                        >
                          <LuPencil size={18} />
                        </button>
                        <button
                          onClick={() => toggleStatus(b)}
                          className="p-2 text-fox-gray hover:text-fox-warning hover:bg-fox-light rounded-lg transition"
                          title={b.is_active ? 'Деактивировать' : 'Активировать'}
                        >
                          <LuPower size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(b)}
                          className="p-2 text-fox-gray hover:text-fox-error hover:bg-fox-error/10 rounded-lg transition"
                          title="Удалить"
                        >
                          <LuTrash2 size={18} />
                        </button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Card>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Редактировать филиал' : 'Новый филиал'}
        footer={
          <ModalFooterActions
            onCancel={() => setModalOpen(false)}
            onConfirm={handleSubmit}
            loading={submitting}
            confirmText={editing ? 'Сохранить' : 'Создать'}
          />
        }
      >
        <div className="space-y-4">
          <Select
            label="Организация"
            value={form.organization_id}
            onChange={(e) => setForm({ ...form, organization_id: e.target.value })}
          >
            <option value="">Выберите организацию</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
          <Input
            label="Название филиала"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="Город"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
          <Input
            label="Адрес"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Телефон"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-fox-graphite cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(form.is_active)}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })}
              className="rounded border-fox-border text-fox-purple focus:ring-fox-purple"
            />
            Активен
          </label>
        </div>
      </Modal>
    </div>
  )
}
