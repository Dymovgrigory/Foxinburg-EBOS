import { useEffect, useState } from 'react'
import Header from '../components/Header'
import api from '../services/api'

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/analytics/dashboard')
      .then((res) => setData(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Ошибка загрузки аналитики'))
      .finally(() => setLoading(false))
  }, [])

  const formatMoney = (kopecks: number) => new Intl.NumberFormat('ru-RU').format(kopecks / 100) + ' ₽'

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header title="Аналитика" subtitle="Обзор ключевых метрик" icon="📊" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

        {loading ? (
          <div className="text-center py-12 text-gray-400">Загрузка...</div>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Доход" value={formatMoney(data.total_income_kopecks || 0)} />
              <MetricCard label="Лидов" value={Object.values<number>(data.leads_by_status || {}).reduce((a, b) => a + b, 0)} />
              <MetricCard label="Зачислений" value={Object.values<number>(data.enrollments_by_status || {}).reduce((a, b) => a + b, 0)} />
              <MetricCard label="Пользователей" value={Object.values<number>(data.users_by_role || {}).reduce((a, b) => a + b, 0)} />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <DistributionCard title="Пользователи по ролям" data={data.users_by_role} />
              <DistributionCard title="Лиды по статусам" data={data.leads_by_status} />
              <DistributionCard title="Зачисления по статусам" data={data.enrollments_by_status} />
              <DistributionCard title="Прогресс уроков" data={data.progress_by_status} />
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-400">Нет данных</div>
        )}
      </div>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  )
}

function DistributionCard({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data || {})
  const total = entries.reduce((sum, [, v]) => sum + v, 0) || 1
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3">
        {entries.map(([key, value]) => (
          <div key={key}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700">{key}</span>
              <span className="font-medium text-gray-900">{value} ({Math.round((value / total) * 100)}%)</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#7C5CFC] rounded-full" style={{ width: `${(value / total) * 100}%` }} />
            </div>
          </div>
        ))}
        {entries.length === 0 && <p className="text-sm text-gray-400">Нет данных</p>}
      </div>
    </div>
  )
}
