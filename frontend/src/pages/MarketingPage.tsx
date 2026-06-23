import { useEffect, useMemo, useState } from 'react'
import { getErrorMessage } from '../utils/error'
import Header from '../components/Header'
import { useToast, Card, Loader, EmptyState, Badge, Table, Thead, Th, Tbody, Tr, Td } from '../components/ui'
import StatCard from '../components/ui/StatCard'
import { analyticsApi, crmApi } from '../api'
import type { DashboardAnalytics, Lead, Deal } from '../types'
import { LuClipboardList, LuCoins, LuHandshake, LuMegaphone, LuTarget } from 'react-icons/lu'

const STATUS_COLORS = [
  'bg-fox-purple',
  'bg-fox-gold',
  'bg-fox-graphite',
  'bg-fox-light border border-fox-border',
  'bg-fox-purple/80',
  'bg-fox-gold/80',
  'bg-fox-graphite/80',
  'bg-fox-light/80 border border-fox-border',
]

const LEAD_STATUSES: Record<string, string> = {
  new: 'Новый',
  contacted: 'Связались',
  trial: 'Пробное',
  waiting_payment: 'Ожидает оплаты',
  converted: 'Конвертирован',
  rejected: 'Отказ',
}

const DEAL_STATUSES: Record<string, string> = {
  in_progress: 'В работе',
  won: 'Выиграна',
  lost: 'Проиграна',
}

export default function MarketingPage() {
  const { showToast } = useToast()
  const [data, setData] = useState<DashboardAnalytics | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [analyticsRes, leadsRes, dealsRes] = await Promise.all([
        analyticsApi.dashboard(),
        crmApi.leads(),
        crmApi.deals(),
      ])
      setData(analyticsRes)
      setLeads(leadsRes)
      setDeals(dealsRes)
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка загрузки маркетинга'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const leadsTotal = useMemo(() => sumValues(data?.leads_by_status), [data])
  const dealsTotal = useMemo(() => sumValues(data?.deals_by_status), [data])
  const conversionRate = useMemo(() => {
    if (!leadsTotal) return 0
    return Math.round((dealsTotal / leadsTotal) * 100)
  }, [leadsTotal, dealsTotal])

  const sourceStats = useMemo(() => {
    const map: Record<string, number> = {}
    leads.forEach((l) => {
      const source = l.source || 'Не указан'
      map[source] = (map[source] || 0) + 1
    })
    return map
  }, [leads])

  const formatMoney = (kopecks?: number) =>
    new Intl.NumberFormat('ru-RU').format((kopecks || 0) / 100) + ' ₽'
  const formatDate = (s: string) => new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })

  return (
    <div className="min-h-screen bg-fox-light">
      <Header title="Маркетинг" subtitle="Воронка, лиды и источники" icon={<LuMegaphone />} />

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {loading ? (
          <Loader text="Загрузка маркетинга..." />
        ) : !data ? (
          <EmptyState icon={<LuMegaphone />} title="Не удалось загрузить данные" description="Попробуй обновить страницу." />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Лидов" value={String(leadsTotal)} icon={<LuClipboardList />} variant="purple" />
              <StatCard title="Сделок" value={String(dealsTotal)} icon={<LuHandshake />} variant="gold" />
              <StatCard title="Конверсия" value={`${conversionRate}%`} icon={<LuTarget />} variant="graphite" />
              <StatCard title="Доход" value={formatMoney(data.total_income_kopecks)} icon={<LuCoins />} variant="outline" />
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              <DistributionCard title="Лиды по статусам" data={data.leads_by_status} labels={LEAD_STATUSES} />
              <DistributionCard title="Сделки по статусам" data={data.deals_by_status} labels={DEAL_STATUSES} />
              <DistributionCard title="Источники лидов" data={sourceStats} />
            </div>

            <Card>
              <h2 className="text-lg font-bold text-fox-dark mb-4">Последние сделки</h2>
              {deals.length === 0 ? (
                <EmptyState icon={<LuHandshake />} title="Сделок пока нет" description="Создай первую сделку в CRM." />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <Thead>
                      <tr>
                        <Th>Название</Th>
                        <Th>Сумма</Th>
                        <Th>Статус</Th>
                        <Th>Дата</Th>
                      </tr>
                    </Thead>
                    <Tbody>
                      {deals.slice(0, 10).map((d) => (
                        <Tr key={d.id}>
                          <Td className="font-medium text-fox-dark">{d.title}</Td>
                          <Td className="font-semibold text-fox-dark">{formatMoney(d.amount)}</Td>
                          <Td>
                            <Badge variant={dealStatusVariant(d.status)} size="sm">
                              {DEAL_STATUSES[d.status] || d.status}
                            </Badge>
                          </Td>
                          <Td>{formatDate(d.created_at)}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

function DistributionCard({
  title,
  data,
  labels,
}: {
  title: string
  data?: Record<string, number>
  labels?: Record<string, string>
}) {
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
                  <span className="text-fox-graphite capitalize">{labels?.[key] || key}</span>
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

function dealStatusVariant(status: string): Parameters<typeof Badge>[0]['variant'] {
  const map: Record<string, Parameters<typeof Badge>[0]['variant']> = {
    in_progress: 'warning',
    won: 'success',
    lost: 'default',
  }
  return map[status] || 'default'
}

function sumValues(obj?: Record<string, number>) {
  return Object.values(obj || {}).reduce((a, b) => a + b, 0)
}
