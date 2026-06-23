import { useEffect, useMemo, useState } from 'react'
import { getErrorMessage } from '../utils/error'
import Header from '../components/Header'
import { useToast, Card, Loader, EmptyState, PageShell } from '../components/ui'
import StatCard from '../components/ui/StatCard'
import { analyticsApi } from '../api'
import type { DashboardAnalytics } from '../types'
import { LuChartBarBig, LuCoins, LuUsers, LuClipboardList, LuGraduationCap, LuHandshake, LuNotebookPen } from 'react-icons/lu'

const STATUS_COLORS = [
  'bg-fox-purple',
  'bg-fox-gold',
  'bg-fox-graphite',
  'bg-fox-purple-light',
  'bg-fox-purple-dark',
  'bg-fox-gold-dark',
  'bg-fox-dark',
  'bg-fox-gray',
]

export default function AnalyticsPage() {
  const { showToast } = useToast()
  const [data, setData] = useState<DashboardAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsApi
      .dashboard()
      .then(setData)
      .catch((err) => showToast(getErrorMessage(err, 'Ошибка загрузки аналитики'), 'error'))
      .finally(() => setLoading(false))
  }, [showToast])

  const metrics = useMemo(
    () => [
      { label: 'Доход', value: formatMoney(data?.total_income_kopecks || 0), icon: <LuCoins />, variant: 'purple' as const },
      { label: 'Пользователей', value: sumValues(data?.users_by_role), icon: <LuUsers />, variant: 'gold' as const },
      { label: 'Лидов', value: sumValues(data?.leads_by_status), icon: <LuClipboardList />, variant: 'graphite' as const },
      { label: 'Зачислений', value: sumValues(data?.enrollments_by_status), icon: <LuGraduationCap />, variant: 'outline' as const },
      { label: 'Сделок', value: sumValues(data?.deals_by_status), icon: <LuHandshake />, variant: 'purple' as const },
      { label: 'Домашних заданий', value: sumValues(data?.homeworks_by_status), icon: <LuNotebookPen />, variant: 'gold' as const },
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
    <PageShell>
      <Header title="Аналитика" subtitle="Обзор ключевых метрик платформы" icon={<LuChartBarBig />} />

      <div className="p-4 md:p-6 w-full space-y-6">
        {loading ? (
          <Loader text="Загрузка аналитики..." />
        ) : !data ? (
          <EmptyState icon={<LuChartBarBig />} title="Не удалось загрузить аналитику" description="Попробуй обновить страницу." />
        ) : (
          <>
            <div className="relative overflow-hidden rounded-card p-6 md:p-8 border border-fox-border/60 bg-white shadow-fox-lg">
              <div
                className="absolute top-0 right-0 w-64 h-64 pointer-events-none opacity-[0.04]"
                style={{
                  backgroundImage: 'url(/brand/blob.png)',
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'top right',
                }}
              />
              <div className="relative z-10 flex items-start gap-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-fox-gold text-fox-purple shadow-md flex-shrink-0">
                  <LuChartBarBig size={28} />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-fox-purple mb-2">Аналитика платформы</h2>
                  <p className="text-fox-gray max-w-xl">Ключевые метрики FOXINBURG EBOS в одном месте.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {metrics.map((m) => (
                <StatCard
                  key={m.label}
                  title={m.label}
                  value={m.value}
                  icon={m.icon}
                  variant={m.variant}
                />
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
    </PageShell>
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
          <p className="text-sm text-fox-gray/70">Нет данных</p>
        ) : (
          entries.map(([key, value], idx) => {
            const percent = Math.round((value / total) * 100)
            return (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-fox-graphite capitalize">{key}</span>
                  <span className="font-medium text-fox-dark">
                    {value} <span className="text-fox-gray/70">({percent}%)</span>
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
