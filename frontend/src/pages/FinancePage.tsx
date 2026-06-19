import { useEffect, useState } from 'react'
import Header from '../components/Header'
import api from '../services/api'

interface Payment {
  id: number
  student_id: number
  amount: number
  type: 'income' | 'refund'
  method: string
  status: string
  description?: string
  created_at: string
}

interface Transaction {
  id: number
  user_id: number
  amount: number
  type: string
  balance_after: number
  description?: string
  created_at: string
}

export default function FinancePage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [analytics, setAnalytics] = useState({ income_kopecks: 0, refund_kopecks: 0, net_kopecks: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ student_id: '', amount: '', type: 'income', method: 'cash', status: 'completed', description: '' })

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const [paymentsRes, transactionsRes, analyticsRes] = await Promise.all([
        api.get('/finance/payments'),
        api.get('/finance/transactions'),
        api.get('/analytics/finance'),
      ])
      setPayments(paymentsRes.data.data || [])
      setTransactions(transactionsRes.data.data || [])
      setAnalytics(analyticsRes.data.data || { income_kopecks: 0, refund_kopecks: 0, net_kopecks: 0 })
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка загрузки финансов')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/finance/payments', {
        student_id: Number(form.student_id),
        amount: Math.round(Number(form.amount) * 100),
        type: form.type,
        method: form.method,
        status: form.status,
        description: form.description,
      })
      setShowForm(false)
      setForm({ student_id: '', amount: '', type: 'income', method: 'cash', status: 'completed', description: '' })
      await fetchData()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка создания платежа')
    }
  }

  const formatMoney = (kopecks: number) =>
    new Intl.NumberFormat('ru-RU').format(kopecks / 100) + ' ₽'

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header title="Финансы" subtitle="Финансовая аналитика и управление" icon="💹" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Платежи и транзакции</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-[#E85D4C] hover:bg-[#D14F40] text-white text-sm font-medium rounded-xl transition"
          >
            {showForm ? 'Отмена' : '+ Новый платёж'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 grid md:grid-cols-4 gap-4">
            <input
              required
              type="number"
              placeholder="ID ученика"
              value={form.student_id}
              onChange={(e) => setForm({ ...form, student_id: e.target.value })}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:border-[#E85D4C] outline-none"
            />
            <input
              required
              type="number"
              step="0.01"
              placeholder="Сумма (₽)"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:border-[#E85D4C] outline-none"
            />
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:border-[#E85D4C] outline-none"
            >
              <option value="income">Доход</option>
              <option value="refund">Возврат</option>
            </select>
            <select
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:border-[#E85D4C] outline-none"
            >
              <option value="cash">Наличные</option>
              <option value="card">Карта</option>
              <option value="transfer">Перевод</option>
            </select>
            <input
              type="text"
              placeholder="Описание"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="md:col-span-3 px-4 py-2 border border-gray-200 rounded-xl focus:border-[#E85D4C] outline-none"
            />
            <button type="submit" className="px-4 py-2 bg-[#7C5CFC] hover:bg-[#6B4FD6] text-white rounded-xl font-medium">
              Сохранить
            </button>
          </form>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FinanceCard icon="↗" iconColor="bg-green-500" value={analytics.income_kopecks} label="Доходы" />
          <FinanceCard icon="↘" iconColor="bg-red-500" value={analytics.refund_kopecks} label="Возвраты" />
          <FinanceCard icon="💰" iconColor="bg-[#7C5CFC]" value={analytics.net_kopecks} label="Чистый доход" />
        </div>

        {/* Payments */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Платежи</h3>
          </div>
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Дата</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Ученик</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Тип</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Способ</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Описание</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Сумма</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Загрузка...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Нет платежей</td></tr>
              ) : payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-700">{formatDate(p.created_at)}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{p.student_id}</td>
                  <td className="px-6 py-4">
                    <span className={['text-sm font-medium', p.type === 'income' ? 'text-green-600' : 'text-red-600'].join(' ')}>
                      {p.type === 'income' ? 'Доход' : 'Возврат'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{p.method}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{p.description || '—'}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">{formatMoney(p.amount)}</td>
                  <td className="px-6 py-4">
                    <span className={['px-2 py-1 rounded-full text-xs font-medium', p.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'].join(' ')}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Транзакции</h3>
          </div>
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Дата</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Пользователь</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Тип</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Сумма</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Баланс после</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Описание</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-700">{formatDate(t.created_at)}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{t.user_id}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{t.type}</td>
                  <td className={['px-6 py-4 text-sm font-semibold', t.amount >= 0 ? 'text-green-600' : 'text-red-600'].join(' ')}>
                    {formatMoney(t.amount)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{formatMoney(t.balance_after)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{t.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function FinanceCard({
  icon,
  iconColor,
  value,
  label,
}: {
  icon: string
  iconColor: string
  value: number
  label: string
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between mb-4">
        <div className={['w-10 h-10 rounded-xl text-white flex items-center justify-center text-lg', iconColor].join(' ')}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{new Intl.NumberFormat('ru-RU').format(value / 100)} ₽</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  )
}
