import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import { useToast, Card, Loader, EmptyState } from '../components/ui'
import { analyticsApi } from '../api'
import type { DashboardAnalytics } from '../types'

const STATUS_COLORS = ['bg-fox-purple', 'bg-fox-gold', 'bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-red-500', 'bg-pink-500', 'bg-teal-500']

export default function AnalyticsPage() {
  const { showToast } = useToast()
  const [data, setData] = useState<DashboardAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsApi
      .dashboard()
      .then(setData)
      .catch((err) => showToast(err.response?.data?.message || 'Ошибка загрузки аналитики', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const metrics = useMemo(
    () => [
      { label: 'Доход', value: formatMoney(data?.total_income_kopecks || 0), icon: '💰', color: 'bg-green-500' },
      { label: 'Пользователей', value: sumValues(data?.users_by_role), icon: '👥', color: 'bg-fox-purple' },
      { label: 'Лидов', value: sumValues(data?.leads_by_status), icon: '📋', color: 'bg-blue-500' },
      { label: 'Зачислений', value: sumValues(data?.enrollments_by_status), icon: '🎓', color: 'bg-fox-gold text-fox-purple' },
      { label: 'Сделок', value: sumValues(data?.deals_by_status), icon: '🤝', color: 'bg-pink-500' },
      { label: 'Домашних заданий', value: sumValues(data?.homeworks_by_status), icon: '📝', color: 'bg-amber-500' },
    ],
    [data]
  )

  const charts = useMemo(
    () => [
      { title: 'Пользователи по ролям', data: data?.users_by_role || {} },
      { title: 'Лиды по статусам', data: data?.leads_by_status || {} },
      { title: 'Сделки по статусам', data: data?.deals_by_status || {} },
      { title: 'Зачисления по статусам', data: data?.enrollments_by_status || {} },
      { title: 'Домашние задания', data: data?.homeworks_by_status || {} },
      { title: 'Прогресс уроков', data: data?.progress_by_status || {} },
    ],
    [data]
  )

  return (
    <div className="min-h-screen bg-fox-light">
      <Header title="Аналитика" subtitle="Обзор ключевых метрик платформы" icon="📊" />

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {loading ? (
          <Loader text="Загрузка аналитики..." />
        ) : !data ? (
          <EmptyState icon="📊" title="Не удалось загрузить аналитику" description="Попробуй обновить страницу." />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {metrics.map((m) => (
                <Card key={m.label} className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl text-white ${m.color}`}>
                    {m.icon}
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-fox-dark">{m.value}</div>
                    <div className="text-xs text-gray-500">{m.label}</div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {charts.map((chart) => (
                <DistributionCard key={chart.title} title={chart.title} data={chart.data} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function DistributionCard({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = useMemo(() => Object.entries(data || {}).sort((a, b) => b[1] - a[1]), [data])
  const total = entries.reduce((sum, [, v]) => sum + v, 0) || 1

  return (
    <Card>
      <h3 className="text-base font-bold text-fox-dark mb-4">{title}</h3>
      <div className="space-y-3">
        {entries.length === 0 ? (
          <p className="text-sm text-gray-400">Нет данных</p>
        ) : (
          entries.map(([key, value], idx) => {
            const percent = Math.round((value / total) * 100)
            return (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 capitalize">{key}</span>
                  <span className="font-medium text-fox-dark">
                    {value} <span className="text-gray-400">({percent}%)</span>
                  </span>
                </div>
                <div className="h-2 bg-fox-border rounded-full overflow-hidden">
                  <div
                    className={['h-full rounded-full', STATUS_COLORS[idx % STATUS_COLORS.length]].join(' ')}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            )
          })
        )}
      </div>
    </Card>
  )
}

function formatMoney(kopecks: number) {
  return new Intl.NumberFormat('ru-RU').format(kopecks / 100) + ' ₽'
}

function sumValues(obj?: Record<string, number>) {
  return Object.values(obj || {}).reduce((a, b) => a + b, 0)
}
