import { useState } from 'react'
import Header from '../components/Header'

const transactions = [
  { date: '17 июн.', type: 'income', category: 'Оплата курсов', description: 'Групповой курс (12 чел.)', amount: 144000, status: 'Выполнено' },
  { date: '17 июн.', type: 'expense', category: 'Зарплата', description: 'Зарплата преподавателям', amount: -85000, status: 'Выполнено' },
  { date: '16 июн.', type: 'income', category: 'Абонементы', description: 'Абонемент "Премиум" x5', amount: 74500, status: 'Выполнено' },
  { date: '16 июн.', type: 'expense', category: 'Аренда', description: 'Аренда помещения (июнь)', amount: -120000, status: 'Выполнено' },
  { date: '15 июн.', type: 'income', category: 'Оплата курсов', description: 'Индивидуальные занятия', amount: 58000, status: 'Выполнено' },
]

const categories = [
  { name: 'Оплата курсов', amount: 224000, percent: 51, color: 'bg-green-500' },
  { name: 'Аренда', amount: 120000, percent: 27, color: 'bg-red-500' },
  { name: 'Абонементы', amount: 119200, percent: 27, color: 'bg-blue-500' },
  { name: 'Зарплата', amount: 85000, percent: 19, color: 'bg-red-400' },
  { name: 'Оборудование', amount: 65000, percent: 15, color: 'bg-gray-500' },
  { name: 'Групповые', amount: 64000, percent: 14, color: 'bg-amber-500' },
]

const periods = ['Неделя', 'Месяц', 'Квартал', 'Год']

export default function FinancePage() {
  const [period, setPeriod] = useState('Месяц')

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('ru-RU').format(n) + ' ₽'

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header title="Финансы" subtitle="Финансовая аналитика и управление" icon="💹" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Period + Export */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex bg-white rounded-xl p-1 border border-gray-100">
            {periods.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={[
                  'px-4 py-2 rounded-lg text-sm font-medium transition',
                  period === p ? 'bg-[#7C5CFC] text-white' : 'text-gray-600 hover:bg-gray-50',
                ].join(' ')}
              >
                {p}
              </button>
            ))}
          </div>
          <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2">
            <span>↓</span> Экспорт
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FinanceCard icon="↗" iconColor="bg-green-500" trend="+12.5%" trendUp value={342000} label="Доходы" />
          <FinanceCard icon="↘" iconColor="bg-red-500" trend="-8.2%" trendUp={false} value={212040} label="Расходы" />
          <FinanceCard icon="💰" iconColor="bg-[#7C5CFC]" trend="+15.3%" trendUp value={129960} label="Чистая прибыль" />
          <FinanceCard icon="🧾" iconColor="bg-amber-500" trend="+5.1%" trendUp value={2327} label="Средний чек" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span>📊</span> Доходы vs Расходы
            </h3>
            <div className="space-y-5">
              <FinanceBar label="Доходы" value={342000} max={400000} color="bg-green-500" />
              <FinanceBar label="Расходы" value={212040} max={400000} color="bg-red-500" />
              <FinanceBar label="Прибыль" value={129960} max={200000} color="bg-[#7C5CFC]" />
              <div className="flex justify-between text-sm pt-2">
                <span className="text-gray-500">Маржинальность</span>
                <span className="font-bold text-[#7C5CFC]">38%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span>🥧</span> По категориям
            </h3>
            <div className="space-y-4">
              {categories.map((c) => (
                <div key={c.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={['w-3 h-3 rounded-full', c.color].join(' ')} />
                    <span className="text-sm text-gray-700">{c.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">{formatMoney(c.amount)}</div>
                    <div className="text-xs text-gray-400">{c.percent}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>📅</span> Транзакции
            </h3>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-900">Все</button>
              <button className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Доходы</button>
              <button className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Расходы</button>
            </div>
          </div>
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Дата</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Тип</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Категория</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Описание</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Сумма</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map((t, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-700">{t.date}</td>
                  <td className="px-6 py-4">
                    <span className={['text-sm font-medium', t.type === 'income' ? 'text-green-600' : 'text-red-600'].join(' ')}>
                      {t.type === 'income' ? '↗ Доход' : '↘ Расход'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 flex items-center gap-2">
                    <span className={['w-2 h-2 rounded-full', t.type === 'income' ? 'bg-green-500' : 'bg-red-500'].join(' ')} />
                    {t.category}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{t.description}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    {t.amount > 0 ? '+' : ''}{formatMoney(t.amount)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      {t.status}
                    </span>
                  </td>
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
  trend,
  trendUp,
  value,
  label,
}: {
  icon: string
  iconColor: string
  trend: string
  trendUp: boolean
  value: number
  label: string
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between mb-4">
        <div className={['w-10 h-10 rounded-xl text-white flex items-center justify-center text-lg', iconColor].join(' ')}>
          {icon}
        </div>
        <span className={['text-xs font-semibold', trendUp ? 'text-green-600' : 'text-red-600'].join(' ')}>{trend}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{new Intl.NumberFormat('ru-RU').format(value)} ₽</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  )
}

function FinanceBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-700">{label}</span>
        <span className="font-semibold text-gray-900">{new Intl.NumberFormat('ru-RU').format(value)} ₽</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className={['h-full rounded-full', color].join(' ')} style={{ width: `${Math.min((value / max) * 100, 100)}%` }} />
      </div>
    </div>
  )
}
