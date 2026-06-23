import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import api from '../services/api'
import { reportsApi } from '../api'
import {
  useToast,
  Button,
  Card,
  Input,
  Select,
  Table,
  Thead,
  Th,
  Tbody,
  Tr,
  Td,
  Badge,
  Loader,
  EmptyState,
} from '../components/ui'
import { getErrorMessage } from '../utils/error'
import {
  LuChartBarBig,
  LuDownload,
  LuFilter,
} from 'react-icons/lu'

interface ReportType {
  id: string
  label: string
}

interface Branch {
  id: number
  name: string
}

export default function ReportsPage() {
  const { showToast } = useToast()
  const [types, setTypes] = useState<ReportType[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [type, setType] = useState('manager')
  const [branchId, setBranchId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [data, setData] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  const [loadingTypes, setLoadingTypes] = useState(true)

  useEffect(() => {
    reportsApi
      .types()
      .then(setTypes)
      .catch(() => showToast('Не удалось загрузить типы отчетов', 'error'))
      .finally(() => setLoadingTypes(false))

    api
      .get('/branches')
      .then((res) => setBranches(res.data.data || []))
      .catch(() => {})
  }, [])

  const loadReport = async () => {
    setLoading(true)
    try {
      const params: { branch_id?: number; date_from?: string; date_to?: string } = {}
      if (branchId) params.branch_id = Number(branchId)
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      const result = await reportsApi.get(type, params)
      setData(result)
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка построения отчета'), 'error')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const exportCsv = async () => {
    try {
      const params: { branch_id?: number; date_from?: string; date_to?: string } = {}
      if (branchId) params.branch_id = Number(branchId)
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      const res = await reportsApi.exportCsv(type, params)
      const blob = new Blob([res.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report_${type}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка экспорта'), 'error')
    }
  }

  const rows = useMemo(() => {
    if (!data) return []
    if (Array.isArray(data)) return data
    if (typeof data === 'object' && data !== null) {
      if ('manager_revenue' in data && Array.isArray((data as Record<string, unknown>).manager_revenue)) {
        return (data as Record<string, unknown>).manager_revenue as Record<string, unknown>[]
      }
    }
    return []
  }, [data])

  const managerMetrics = useMemo(() => {
    if (type !== 'manager' || !data || !Array.isArray(data) || data.length === 0) return null
    return data[0] as Record<string, unknown>
  }, [data, type])

  return (
    <div className="min-h-screen bg-fox-light">
      <Header title="Отчеты" icon={<LuChartBarBig />} />

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <Card>
          <div className="flex flex-col xl:flex-row xl:items-end gap-4">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select label="Тип отчета" value={type} onChange={(e) => setType(e.target.value)}>
                {loadingTypes ? (
                  <option>Загрузка...</option>
                ) : (
                  types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))
                )}
              </Select>
              <Select label="Филиал" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                <option value="">Все филиалы</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
              <Input
                label="Дата с"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <Input
                label="Дата по"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={loadReport} leftIcon={<LuFilter size={16} />}>
                Применить
              </Button>
              <Button variant="secondary" onClick={exportCsv} leftIcon={<LuDownload size={16} />}>
                Экспорт
              </Button>
            </div>
          </div>
        </Card>

        {loading ? (
          <Loader text="Формирование отчета..." />
        ) : data === null ? (
          <EmptyState
            icon={<LuChartBarBig />}
            title="Выберите параметры"
            description="Нажмите «Применить», чтобы построить отчет."
          />
        ) : (
          <>
            {type === 'sales' && data && typeof data === 'object' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <h3 className="text-base font-bold text-fox-dark mb-4">Лиды по статусам</h3>
                  <div className="space-y-2">
                    {Object.entries(((data as Record<string, unknown>).leads_by_status as Record<string, number>) || {}).map(
                      ([status, count]) => (
                        <div key={status} className="flex justify-between text-sm">
                          <span className="text-fox-graphite capitalize">{status}</span>
                          <Badge variant="purple">{count}</Badge>
                        </div>
                      )
                    )}
                  </div>
                </Card>
                <Card>
                  <h3 className="text-base font-bold text-fox-dark mb-4">Сделки по статусам</h3>
                  <div className="space-y-2">
                    {Object.entries(
                      ((data as Record<string, unknown>).deals_by_status as Record<string, { count: number; amount_kopecks: number }>) || {}
                    ).map(([status, info]) => (
                      <div key={status} className="flex justify-between text-sm">
                        <span className="text-fox-graphite capitalize">{status}</span>
                        <span className="text-fox-purple font-medium">
                          {info.count} / {formatRub(info.amount_kopecks)}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {managerMetrics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(managerMetrics).map(([key, value]) => (
                  <Card key={key}>
                    <div className="text-xs text-fox-gray uppercase">{key}</div>
                    <div className="text-xl font-bold text-fox-purple mt-1">
                      {key.includes('kopecks') ? formatRub(value as number) : String(value)}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {rows.length > 0 && (
              <Card padding="none">
                <Table>
                  <Thead>
                    <tr>
                      {Object.keys(rows[0]).map((k) => (
                        <Th key={k}>{k}</Th>
                      ))}
                    </tr>
                  </Thead>
                  <Tbody>
                    {rows.map((row, idx) => (
                      <Tr key={idx}>
                        {Object.values(row).map((value, i) => (
                          <Td key={i}>{renderCell(value)}</Td>
                        ))}
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Card>
            )}

            {rows.length === 0 && !managerMetrics && type !== 'sales' && (
              <EmptyState icon={<LuChartBarBig />} title="Нет данных" description="За выбранный период данных нет." />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function formatRub(kopecks?: number) {
  if (kopecks === undefined || kopecks === null) return '—'
  return `${(kopecks / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽`
}

function renderCell(value: unknown) {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? <Badge variant="success">Да</Badge> : <Badge variant="default">Нет</Badge>
  if (typeof value === 'number' && String(value).length > 2) return formatRub(value)
  return String(value)
}
