import { useEffect, useMemo, useState } from 'react'
import { getErrorMessage } from '../utils/error'
import Header from '../components/Header'
import { useToast, Button, Card, Badge, Modal, Input, Loader, EmptyState, Table, Thead, Th, Tbody, Tr, Td } from '../components/ui'
import { crmApi, usersApi } from '../api'
import type { Lead, Deal, User } from '../types'
import { LuClipboardList, LuHandshake } from 'react-icons/lu'

const LEAD_STATUSES = [
  { value: 'new', label: 'Новый' },
  { value: 'contacted', label: 'Связались' },
  { value: 'trial', label: 'Пробное' },
  { value: 'waiting_payment', label: 'Ожидает оплаты' },
  { value: 'converted', label: 'Конвертирован' },
  { value: 'rejected', label: 'Отказ' },
]

const DEAL_STATUSES = [
  { value: 'in_progress', label: 'В работе' },
  { value: 'won', label: 'Выиграна' },
  { value: 'lost', label: 'Проиграна' },
]

export default function CrmPage() {
  const { showToast } = useToast()
  const [leads, setLeads] = useState<Lead[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'leads' | 'deals' | 'pipeline'>('pipeline')
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [showDealModal, setShowDealModal] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [leadForm, setLeadForm] = useState({
    name: '',
    email: '',
    phone: '',
    source: '',
    status: 'new',
    manager_id: '',
    comment: '',
  })

  const [dealForm, setDealForm] = useState({
    lead_id: '',
    title: '',
    amount: '',
    status: 'in_progress',
  })

  const managers = useMemo(() => users.filter((u) => ['owner', 'super_admin', 'admin', 'manager'].includes(u.role)), [users])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [leadsRes, dealsRes, usersRes] = await Promise.all([
        crmApi.leads(),
        crmApi.deals(),
        usersApi.list().catch(() => []),
      ])
      setLeads(leadsRes)
      setDeals(dealsRes)
      setUsers(usersRes)
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка загрузки CRM'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const resetLeadForm = () => {
    setLeadForm({ name: '', email: '', phone: '', source: '', status: 'new', manager_id: '', comment: '' })
    setEditingLead(null)
  }

  const resetDealForm = () => {
    setDealForm({ lead_id: '', title: '', amount: '', status: 'in_progress' })
    setEditingDeal(null)
  }

  const openLeadCreate = () => {
    resetLeadForm()
    setShowLeadModal(true)
  }

  const openLeadEdit = (lead: Lead) => {
    setEditingLead(lead)
    setLeadForm({
      name: lead.name,
      email: lead.email || '',
      phone: lead.phone || '',
      source: lead.source || '',
      status: lead.status,
      manager_id: lead.manager_id ? String(lead.manager_id) : '',
      comment: lead.comment || '',
    })
    setShowLeadModal(true)
  }

  const openDealCreate = () => {
    resetDealForm()
    setShowDealModal(true)
  }

  const openDealEdit = (deal: Deal) => {
    setEditingDeal(deal)
    setDealForm({
      lead_id: String(deal.lead_id),
      title: deal.title,
      amount: String(deal.amount / 100),
      status: deal.status,
    })
    setShowDealModal(true)
  }

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        ...leadForm,
        manager_id: leadForm.manager_id ? Number(leadForm.manager_id) : undefined,
      }
      if (editingLead) {
        await crmApi.updateLead(editingLead.id, payload)
        showToast('Лид обновлён', 'success')
      } else {
        await crmApi.createLead(payload)
        showToast('Лид создан', 'success')
      }
      setShowLeadModal(false)
      resetLeadForm()
      await fetchData()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка сохранения лида'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDealSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        lead_id: Number(dealForm.lead_id),
        title: dealForm.title,
        amount: Math.round(Number(dealForm.amount) * 100),
        status: dealForm.status,
      }
      if (editingDeal) {
        await crmApi.updateDeal(editingDeal.id, payload)
        showToast('Сделка обновлена', 'success')
      } else {
        await crmApi.createDeal(payload)
        showToast('Сделка создана', 'success')
      }
      setShowDealModal(false)
      resetDealForm()
      await fetchData()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка сохранения сделки'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteLead = async (lead: Lead) => {
    if (!confirm('Удалить лид?')) return
    try {
      await crmApi.deleteLead(lead.id)
      showToast('Лид удалён', 'success')
      await fetchData()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка удаления'), 'error')
    }
  }

  const handleDeleteDeal = async (deal: Deal) => {
    if (!confirm('Удалить сделку?')) return
    try {
      await crmApi.deleteDeal(deal.id)
      showToast('Сделка удалена', 'success')
      await fetchData()
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка удаления'), 'error')
    }
  }

  const pipelineColumns = useMemo(() => {
    return LEAD_STATUSES.map((status) => ({
      ...status,
      leads: leads.filter((l) => l.status === status.value),
    }))
  }, [leads])

  const formatMoney = (kopecks: number) => new Intl.NumberFormat('ru-RU').format(kopecks / 100) + ' ₽'
  const formatDate = (s: string) => new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })

  return (
    <div className="min-h-screen bg-fox-light">
      <Header title="CRM" subtitle="Лиды, сделки и воронка продаж" icon={<LuClipboardList />} />

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <Card>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex bg-fox-light rounded-xl p-1 border border-fox-border/50">
              {(['pipeline', 'leads', 'deals'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={[
                    'px-4 py-2 rounded-lg text-sm font-medium transition',
                    activeTab === t ? 'bg-fox-purple text-white shadow-sm' : 'text-fox-gray hover:bg-white',
                  ].join(' ')}
                >
                  {t === 'pipeline' ? 'Воронка' : t === 'leads' ? 'Лиды' : 'Сделки'}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" size="sm" onClick={openLeadCreate}>
                + Лид
              </Button>
              <Button size="sm" onClick={openDealCreate}>
                + Сделка
              </Button>
            </div>
          </div>
        </Card>

        {loading ? (
          <Loader text="Загрузка CRM..." />
        ) : activeTab === 'pipeline' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {pipelineColumns.map((col) => (
              <Card key={col.value} padding="sm" className="flex flex-col h-[calc(100vh-280px)] min-h-[400px]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-fox-dark">{col.label}</h3>
                  <Badge variant="default" size="sm">{col.leads.length}</Badge>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {col.leads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => openLeadEdit(lead)}
                      className="p-3 bg-fox-light rounded-xl border border-fox-border/30 hover:border-fox-gold cursor-pointer transition"
                    >
                      <div className="font-medium text-sm text-fox-dark">{lead.name}</div>
                      {lead.phone && <div className="text-xs text-fox-gray">{lead.phone}</div>}
                      {lead.source && <div className="text-xs text-fox-gray/70 mt-1">источник: {lead.source}</div>}
                      <div className="text-[10px] text-fox-gray/70 mt-2">{formatDate(lead.created_at)}</div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        ) : activeTab === 'leads' ? (
          <Card>
            {leads.length === 0 ? (
              <EmptyState icon={<LuClipboardList />} title="Лидов пока нет" description="Добавь первого лида в воронку." actionLabel="Новый лид" onAction={openLeadCreate} />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <Thead>
                    <tr>
                      <Th>Имя</Th>
                      <Th>Контакты</Th>
                      <Th>Источник</Th>
                      <Th>Статус</Th>
                      <Th>Менеджер</Th>
                      <Th>Дата</Th>
                      <Th>Действия</Th>
                    </tr>
                  </Thead>
                  <Tbody>
                    {leads.map((l) => (
                      <Tr key={l.id}>
                        <Td className="font-medium text-fox-dark">{l.name}</Td>
                        <Td>
                          <div className="text-sm">
                            {l.email && <div>{l.email}</div>}
                            {l.phone && <div className="text-fox-gray">{l.phone}</div>}
                          </div>
                        </Td>
                        <Td>{l.source || '—'}</Td>
                        <Td><Badge variant={leadStatusVariant(l.status)} size="sm">{leadStatusLabel(l.status)}</Badge></Td>
                        <Td>{users.find((u) => u.id === l.manager_id)?.name || '—'}</Td>
                        <Td>{formatDate(l.created_at)}</Td>
                        <Td>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openLeadEdit(l)}>Изменить</Button>
                            <Button variant="danger" size="sm" onClick={() => handleDeleteLead(l)}>Удалить</Button>
                          </div>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </div>
            )}
          </Card>
        ) : (
          <Card>
            {deals.length === 0 ? (
              <EmptyState icon={<LuHandshake />} title="Сделок пока нет" description="Создай первую сделку." actionLabel="Новая сделка" onAction={openDealCreate} />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <Thead>
                    <tr>
                      <Th>Название</Th>
                      <Th>Лид</Th>
                      <Th>Сумма</Th>
                      <Th>Статус</Th>
                      <Th>Дата</Th>
                      <Th>Действия</Th>
                    </tr>
                  </Thead>
                  <Tbody>
                    {deals.map((d) => (
                      <Tr key={d.id}>
                        <Td className="font-medium text-fox-dark">{d.title}</Td>
                        <Td>{leads.find((l) => l.id === d.lead_id)?.name || `ID ${d.lead_id}`}</Td>
                        <Td className="font-semibold text-fox-dark">{formatMoney(d.amount)}</Td>
                        <Td><Badge variant={dealStatusVariant(d.status)} size="sm">{dealStatusLabel(d.status)}</Badge></Td>
                        <Td>{formatDate(d.created_at)}</Td>
                        <Td>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openDealEdit(d)}>Изменить</Button>
                            <Button variant="danger" size="sm" onClick={() => handleDeleteDeal(d)}>Удалить</Button>
                          </div>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Lead Modal */}
      <Modal
        isOpen={showLeadModal}
        onClose={() => setShowLeadModal(false)}
        title={editingLead ? 'Редактировать лид' : 'Новый лид'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowLeadModal(false)}>Отмена</Button>
            <Button type="submit" form="lead-form" loading={submitting}>{editingLead ? 'Сохранить' : 'Создать'}</Button>
          </>
        }
      >
        <form id="lead-form" onSubmit={handleLeadSubmit} className="grid gap-4">
          <Input label="Имя" required value={leadForm.name} onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={leadForm.email} onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} />
            <Input label="Телефон" value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Источник" value={leadForm.source} onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })} />
            <div>
              <label className="block text-sm font-medium text-fox-graphite mb-1.5">Статус</label>
              <select
                value={leadForm.status}
                onChange={(e) => setLeadForm({ ...leadForm, status: e.target.value })}
                className="w-full rounded-xl border border-fox-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-fox-gold/50 focus:border-fox-gold bg-white"
              >
                {LEAD_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-fox-graphite mb-1.5">Менеджер</label>
            <select
              value={leadForm.manager_id}
              onChange={(e) => setLeadForm({ ...leadForm, manager_id: e.target.value })}
              className="w-full rounded-xl border border-fox-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-fox-gold/50 focus:border-fox-gold bg-white"
            >
              <option value="">Без менеджера</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <Input label="Комментарий" value={leadForm.comment} onChange={(e) => setLeadForm({ ...leadForm, comment: e.target.value })} />
        </form>
      </Modal>

      {/* Deal Modal */}
      <Modal
        isOpen={showDealModal}
        onClose={() => setShowDealModal(false)}
        title={editingDeal ? 'Редактировать сделку' : 'Новая сделка'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowDealModal(false)}>Отмена</Button>
            <Button type="submit" form="deal-form" loading={submitting}>{editingDeal ? 'Сохранить' : 'Создать'}</Button>
          </>
        }
      >
        <form id="deal-form" onSubmit={handleDealSubmit} className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-fox-graphite mb-1.5">Лид</label>
            <select
              required
              value={dealForm.lead_id}
              onChange={(e) => setDealForm({ ...dealForm, lead_id: e.target.value })}
              className="w-full rounded-xl border border-fox-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-fox-gold/50 focus:border-fox-gold bg-white"
            >
              <option value="">Выберите лид</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <Input label="Название сделки" required value={dealForm.title} onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Сумма (₽)" type="number" step="0.01" required value={dealForm.amount} onChange={(e) => setDealForm({ ...dealForm, amount: e.target.value })} />
            <div>
              <label className="block text-sm font-medium text-fox-graphite mb-1.5">Статус</label>
              <select
                value={dealForm.status}
                onChange={(e) => setDealForm({ ...dealForm, status: e.target.value })}
                className="w-full rounded-xl border border-fox-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-fox-gold/50 focus:border-fox-gold bg-white"
              >
                {DEAL_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function leadStatusVariant(status: string): Parameters<typeof Badge>[0]['variant'] {
  const map: Record<string, Parameters<typeof Badge>[0]['variant']> = {
    new: 'info',
    contacted: 'warning',
    trial: 'purple',
    waiting_payment: 'error',
    converted: 'success',
    rejected: 'default',
  }
  return map[status] || 'default'
}

function leadStatusLabel(status: string) {
  return LEAD_STATUSES.find((s) => s.value === status)?.label || status
}

function dealStatusVariant(status: string): Parameters<typeof Badge>[0]['variant'] {
  const map: Record<string, Parameters<typeof Badge>[0]['variant']> = {
    in_progress: 'warning',
    won: 'success',
    lost: 'default',
  }
  return map[status] || 'default'
}

function dealStatusLabel(status: string) {
  return DEAL_STATUSES.find((s) => s.value === status)?.label || status
}
