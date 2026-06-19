import { useEffect, useState } from 'react'
import Header from '../components/Header'
import api from '../services/api'

interface Lead {
  id: number
  name: string
  email?: string
  phone?: string
  source?: string
  status: string
  manager_id?: number
  comment?: string
  created_at: string
}

interface Deal {
  id: number
  lead_id: number
  title: string
  amount: number
  status: string
  created_at: string
}

export default function CrmPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'leads' | 'deals'>('leads')
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [showDealForm, setShowDealForm] = useState(false)
  const [leadForm, setLeadForm] = useState({ name: '', email: '', phone: '', source: '', status: 'new', comment: '' })
  const [dealForm, setDealForm] = useState({ lead_id: '', title: '', amount: '', status: 'in_progress' })

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const [leadsRes, dealsRes] = await Promise.all([api.get('/leads'), api.get('/deals')])
      setLeads(leadsRes.data.data || [])
      setDeals(dealsRes.data.data || [])
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка загрузки CRM')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/leads/demo', leadForm)
      setShowLeadForm(false)
      setLeadForm({ name: '', email: '', phone: '', source: '', status: 'new', comment: '' })
      await fetchData()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка создания лида')
    }
  }

  const handleDealSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/deals', {
        lead_id: Number(dealForm.lead_id),
        title: dealForm.title,
        amount: Math.round(Number(dealForm.amount) * 100),
        status: dealForm.status,
      })
      setShowDealForm(false)
      setDealForm({ lead_id: '', title: '', amount: '', status: 'in_progress' })
      await fetchData()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка создания сделки')
    }
  }

  const formatMoney = (kopecks: number) => new Intl.NumberFormat('ru-RU').format(kopecks / 100) + ' ₽'

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header title="CRM" subtitle="Лиды и сделки" icon="📋" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex bg-white rounded-xl p-1 border border-gray-100">
            {(['leads', 'deals'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={[
                  'px-4 py-2 rounded-lg text-sm font-medium transition',
                  activeTab === t ? 'bg-[#E85D4C] text-white' : 'text-gray-600 hover:bg-gray-50',
                ].join(' ')}
              >
                {t === 'leads' ? 'Лиды' : 'Сделки'}
              </button>
            ))}
          </div>
          <button
            onClick={() => (activeTab === 'leads' ? setShowLeadForm(!showLeadForm) : setShowDealForm(!showDealForm))}
            className="px-4 py-2 bg-[#E85D4C] hover:bg-[#D14F40] text-white text-sm font-medium rounded-xl transition"
          >
            {activeTab === 'leads' ? (showLeadForm ? 'Отмена' : '+ Новый лид') : showDealForm ? 'Отмена' : '+ Новая сделка'}
          </button>
        </div>

        {activeTab === 'leads' && showLeadForm && (
          <form onSubmit={handleLeadSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 grid md:grid-cols-3 gap-4">
            <input required placeholder="Имя" value={leadForm.name} onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]" />
            <input type="email" placeholder="Email" value={leadForm.email} onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]" />
            <input placeholder="Телефон" value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]" />
            <input placeholder="Источник" value={leadForm.source} onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })} className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]" />
            <select value={leadForm.status} onChange={(e) => setLeadForm({ ...leadForm, status: e.target.value })} className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]">
              <option value="new">Новый</option>
              <option value="contacted">Связались</option>
              <option value="trial">Пробное</option>
              <option value="waiting_payment">Ожидает оплаты</option>
              <option value="converted">Конвертирован</option>
              <option value="rejected">Отказ</option>
            </select>
            <input placeholder="Комментарий" value={leadForm.comment} onChange={(e) => setLeadForm({ ...leadForm, comment: e.target.value })} className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]" />
            <button type="submit" className="px-4 py-2 bg-[#7C5CFC] hover:bg-[#6B4FD6] text-white rounded-xl font-medium">Сохранить</button>
          </form>
        )}

        {activeTab === 'deals' && showDealForm && (
          <form onSubmit={handleDealSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 grid md:grid-cols-4 gap-4">
            <select required value={dealForm.lead_id} onChange={(e) => setDealForm({ ...dealForm, lead_id: e.target.value })} className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]">
              <option value="">Выберите лид</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <input required placeholder="Название сделки" value={dealForm.title} onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })} className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]" />
            <input required type="number" step="0.01" placeholder="Сумма (₽)" value={dealForm.amount} onChange={(e) => setDealForm({ ...dealForm, amount: e.target.value })} className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]" />
            <select value={dealForm.status} onChange={(e) => setDealForm({ ...dealForm, status: e.target.value })} className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]">
              <option value="in_progress">В работе</option>
              <option value="won">Выиграна</option>
              <option value="lost">Проиграна</option>
            </select>
            <button type="submit" className="px-4 py-2 bg-[#7C5CFC] hover:bg-[#6B4FD6] text-white rounded-xl font-medium">Сохранить</button>
          </form>
        )}

        {activeTab === 'leads' ? (
          <DataTable
            headers={['ID', 'Имя', 'Контакты', 'Источник', 'Статус', 'Комментарий', 'Дата']}
            loading={loading}
            rows={leads.map((l) => [
              l.id,
              l.name,
              <div key={l.id} className="text-sm">{l.email && <div>{l.email}</div>}{l.phone && <div>{l.phone}</div>}</div>,
              l.source || '—',
              <StatusBadge key={l.id} status={l.status} />,
              l.comment || '—',
              new Date(l.created_at).toLocaleDateString('ru-RU'),
            ])}
          />
        ) : (
          <DataTable
            headers={['ID', 'Лид', 'Название', 'Сумма', 'Статус', 'Дата']}
            loading={loading}
            rows={deals.map((d) => [
              d.id,
              leads.find((l) => l.id === d.lead_id)?.name || d.lead_id,
              d.title,
              formatMoney(d.amount),
              <StatusBadge key={d.id} status={d.status} />,
              new Date(d.created_at).toLocaleDateString('ru-RU'),
            ])}
          />
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700',
    contacted: 'bg-yellow-100 text-yellow-700',
    trial: 'bg-purple-100 text-purple-700',
    waiting_payment: 'bg-orange-100 text-orange-700',
    converted: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    in_progress: 'bg-blue-100 text-blue-700',
    won: 'bg-green-100 text-green-700',
    lost: 'bg-gray-100 text-gray-700',
  }
  return <span className={['px-2 py-1 rounded-full text-xs font-medium', styles[status] || 'bg-gray-100 text-gray-700'].join(' ')}>{status}</span>
}

function DataTable({ headers, rows, loading }: { headers: string[]; rows: (React.ReactNode)[][]; loading: boolean }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading ? (
            <tr><td colSpan={headers.length} className="px-6 py-8 text-center text-gray-400">Загрузка...</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={headers.length} className="px-6 py-8 text-center text-gray-400">Нет данных</td></tr>
          ) : rows.map((row, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              {row.map((cell, cidx) => (
                <td key={cidx} className="px-6 py-4 text-sm text-gray-700">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
