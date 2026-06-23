import { useEffect, useMemo, useState } from 'react'
import { getErrorMessage } from '../utils/error'
import Header from '../components/Header'
import { useToast, Card, Badge, Input, Loader, EmptyState, Table, Thead, Th, Tbody, Tr, Td, PageShell, Tabs } from '../components/ui'
import StatCard from '../components/ui/StatCard'
import { analyticsApi, systemApi, usersApi, coursesApi, organizationsApi } from '../api'
import {
  LuUsers,
  LuBookOpen,
  LuBuilding,
  LuBuilding2,
  LuCode,
  LuShield,
  LuDatabaseBackup,
  LuCircleCheck,
  LuSettings,
} from 'react-icons/lu'
import { roleLabel } from '../config/navigation'
import type { DashboardAnalytics, SystemPermissionsResponse, User, Course, Organization } from '../types'

const MODULE_READINESS = [
  { name: 'QA', value: 90 },
  { name: 'Identity', value: 85 },
  { name: 'Infrastructure', value: 85 },
  { name: 'LMS', value: 80 },
  { name: 'Notifications', value: 80 },
  { name: 'Storage', value: 75 },
  { name: 'Teacher Academy', value: 75 },
  { name: 'Analytics', value: 70 },
  { name: 'CRM', value: 70 },
  { name: 'Search', value: 70 },
  { name: 'AI', value: 65 },
  { name: 'Admin Academy', value: 60 },
  { name: 'Media', value: 60 },
  { name: 'Student World', value: 45 },
  { name: 'Billing', value: 40 },
]

const CONSTITUTION_LAWS = [
  'Пользователь — центр экосистемы',
  'Данные принадлежат организации',
  'Каждая роль видит только своё',
  'Аудит непрерывен и необратим',
  'Интеграции — через API первого класса',
]

export default function SystemCenterPage() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null)
  const [system, setSystem] = useState<SystemPermissionsResponse | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [branchesCount, setBranchesCount] = useState(0)
  const [activeTab, setActiveTab] = useState('overview')
  const [apiSearch, setApiSearch] = useState('')

  const tabs = [
    { id: 'overview', label: 'Обзор' },
    { id: 'modules', label: 'Модули' },
    { id: 'roles', label: 'Роли' },
    { id: 'api', label: 'API' },
    { id: 'db', label: 'База данных' },
    { id: 'constitution', label: 'Конституция' },
  ]

  const fetchData = async () => {
    setLoading(true)
    try {
      const [analyticsRes, systemRes, usersRes, coursesRes, orgsRes] = await Promise.all([
        analyticsApi.dashboard().catch(() => null),
        systemApi.permissions().catch(() => null),
        usersApi.list().catch(() => []),
        coursesApi.list().catch(() => []),
        organizationsApi.list().catch(() => []),
      ])
      setAnalytics(analyticsRes)
      setSystem(systemRes)
      setUsers(usersRes)
      setCourses(coursesRes)
      setOrganizations(orgsRes)

      const branches = await Promise.all(
        orgsRes.map((o: Organization) => organizationsApi.branches(o.id).catch(() => []))
      )
      setBranchesCount(branches.flat().length)
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка загрузки System Center'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const stats = useMemo(
    () => [
      { label: 'Пользователей', value: users.length, icon: <LuUsers />, variant: 'purple' as const },
      { label: 'Курсов', value: courses.length, icon: <LuBookOpen />, variant: 'gold' as const },
      { label: 'Организаций', value: organizations.length, icon: <LuBuilding />, variant: 'graphite' as const },
      { label: 'Филиалов', value: branchesCount, icon: <LuBuilding2 />, variant: 'outline' as const },
      { label: 'API endpoints', value: system?.endpoints_count || 0, icon: <LuCode />, variant: 'purple' as const },
      { label: 'Ролей', value: 9, icon: <LuShield />, variant: 'gold' as const },
      { label: 'Бэкапов', value: 1, icon: <LuDatabaseBackup />, variant: 'graphite' as const },
      { label: 'Статус', value: 'OK', icon: <LuCircleCheck />, variant: 'outline' as const },
    ],
    [users.length, courses.length, organizations.length, branchesCount, system?.endpoints_count]
  )

  const filteredEndpoints = useMemo(() => {
    if (!system?.endpoints) return []
    const term = apiSearch.toLowerCase()
    return system.endpoints.filter(
      (e: { method: string; path: string }) =>
        e.path.toLowerCase().includes(term) || e.method.toLowerCase().includes(term)
    )
  }, [system?.endpoints, apiSearch])

  interface RoleRow {
    role: string
    perms: string[]
    managed: string[]
    modules: string[]
  }

  const roles: RoleRow[] = useMemo(() => {
    if (!system?.role_permissions) return []
    return Object.entries(system.role_permissions).map(([role, perms]) => ({
      role,
      perms,
      managed: system.role_hierarchy[role] || [],
      modules: Object.entries(system.module_permissions)
        .filter(([, rolesList]) => (rolesList as string[]).includes(role))
        .map(([module]) => module),
    }))
  }, [system])

  const dbEntities = useMemo(() => {
    if (!analytics) return []
    return [
      { name: 'Пользователи', count: sumValues(analytics.users_by_role), source: analytics.users_by_role },
      { name: 'Лиды', count: sumValues(analytics.leads_by_status), source: analytics.leads_by_status },
      { name: 'Сделки', count: sumValues(analytics.deals_by_status), source: analytics.deals_by_status },
      { name: 'Зачисления', count: sumValues(analytics.enrollments_by_status), source: analytics.enrollments_by_status },
      { name: 'Домашние задания', count: sumValues(analytics.homeworks_by_status), source: analytics.homeworks_by_status },
      { name: 'Прогресс уроков', count: sumValues(analytics.progress_by_status), source: analytics.progress_by_status },
    ]
  }, [analytics])

  return (
    <PageShell>
      <Header title="System Center" subtitle="Управление операционной системой школы" icon={<LuSettings />} />

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {loading ? (
          <Loader text="Загрузка System Center..." />
        ) : (
          <>
            <div className="relative overflow-hidden rounded-card p-6 md:p-8 border border-fox-border/60 bg-white shadow-fox-lg">
              <div
                className="absolute top-0 right-0 w-64 h-64 pointer-events-none opacity-[0.04]"
                style={{
                  backgroundImage: 'url(/brand/wave.png)',
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'top right',
                }}
              />
              <div className="relative z-10 flex items-start gap-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-fox-purple text-fox-gold shadow-md flex-shrink-0">
                  <LuSettings size={28} />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fox-purple/10 text-fox-purple text-xs font-semibold mb-2">
                    Администратор
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-fox-purple mb-2">
                    System Center
                  </h2>
                  <p className="text-fox-gray max-w-xl">
                    Управление операционной системой школы: модули, роли, API и база данных.
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((s) => (
                <StatCard
                  key={s.label}
                  title={s.label}
                  value={s.value}
                  icon={s.icon}
                  variant={s.variant}
                />
              ))}
            </div>

            {/* Tabs */}
            <Card padding="none">
              <div className="p-2 border-b border-fox-border/60">
                <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-bold text-fox-dark mb-4">Готовность модулей</h3>
                      <div className="space-y-4">
                        {MODULE_READINESS.map((m) => (
                          <div key={m.name}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-fox-graphite">{m.name}</span>
                              <span className={['font-semibold', colorForValue(m.value)].join(' ')}>{m.value}%</span>
                            </div>
                            <div className="h-2 bg-fox-border rounded-full overflow-hidden">
                              <div
                                className={['h-full rounded-full transition-all', barColorForValue(m.value)].join(' ')}
                                style={{ width: `${m.value}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-fox-dark mb-4">Конституция EBOS</h3>
                      <div className="bg-fox-gold/10 rounded-2xl p-5 border border-fox-gold/30">
                        <ol className="space-y-4">
                          {CONSTITUTION_LAWS.map((law, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                              <span className="w-6 h-6 rounded-full bg-fox-purple text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {idx + 1}
                              </span>
                              <span className="text-fox-graphite text-sm">{law}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'modules' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-fox-dark">Распределение по статусам</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      {analytics && (
                        <>
                          <DistributionCard title="Пользователи по ролям" data={analytics.users_by_role} />
                          <DistributionCard title="Лиды по статусам" data={analytics.leads_by_status} />
                          <DistributionCard title="Сделки по статусам" data={analytics.deals_by_status} />
                          <DistributionCard title="Домашние задания" data={analytics.homeworks_by_status} />
                        </>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'roles' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-fox-dark">Матрица ролей и прав</h3>
                      <span className="text-xs text-fox-gray">{roles.length} ролей</span>
                    </div>
                    {roles.length === 0 ? (
                      <EmptyState icon={<LuShield size={40} />} title="Нет данных о ролях" description="Попробуй обновить страницу." />
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <Thead>
                            <tr>
                              <Th>Роль</Th>
                              <Th>Управляет</Th>
                              <Th>Модули</Th>
                              <Th>Прав</Th>
                            </tr>
                          </Thead>
                          <Tbody>
                            {roles.map((r: RoleRow) => (
                              <Tr key={r.role}>
                                <Td className="font-medium text-fox-dark">{roleLabel(r.role)}</Td>
                                <Td>
                                  <div className="flex flex-wrap gap-1">
                                    {r.managed.slice(0, 3).map((child: string) => (
                                      <Badge key={child} variant="default" size="sm">
                                        {roleLabel(child)}
                                      </Badge>
                                    ))}
                                    {r.managed.length > 3 && (
                                      <Badge variant="default" size="sm">+{r.managed.length - 3}</Badge>
                                    )}
                                  </div>
                                </Td>
                                <Td>
                                  <div className="flex flex-wrap gap-1">
                                    {r.modules.slice(0, 3).map((m: string) => (
                                      <Badge key={m} variant="purple" size="sm">
                                        {m}
                                      </Badge>
                                    ))}
                                    {r.modules.length === 0 && <span className="text-xs text-fox-gray/70">—</span>}
                                  </div>
                                </Td>
                                <Td>
                                  <Badge variant="warning" size="sm">{r.perms.length}</Badge>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'api' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                      <h3 className="text-lg font-bold text-fox-dark">API Endpoints ({filteredEndpoints.length})</h3>
                      <Input
                        placeholder="Поиск по пути или методу"
                        value={apiSearch}
                        onChange={(e) => setApiSearch(e.target.value)}
                        className="sm:max-w-xs"
                      />
                    </div>
                    {filteredEndpoints.length === 0 ? (
                      <EmptyState icon={<LuCode size={40} />} title="Endpoints не найдены" description="Попробуй изменить поиск." />
                    ) : (
                      <div className="overflow-x-auto max-h-[60vh]">
                        <Table>
                          <Thead>
                            <tr>
                              <Th>Метод</Th>
                              <Th>Путь</Th>
                            </tr>
                          </Thead>
                          <Tbody>
                            {filteredEndpoints.map((e: { method: string; path: string }, idx: number) => (
                              <Tr key={idx}>
                                <Td>
                                  <Badge variant={methodVariant(e.method)} size="sm">{e.method}</Badge>
                                </Td>
                                <Td className="font-mono text-sm">{e.path}</Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'db' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-fox-dark">Сущности базы данных</h3>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {dbEntities.map((e) => (
                        <Card key={e.name} className="flex items-center justify-between">
                          <div>
                            <div className="text-2xl font-bold text-fox-dark">{e.count}</div>
                            <div className="text-xs text-fox-gray">{e.name}</div>
                          </div>
                          <div className="text-right">
                            {Object.entries(e.source).slice(0, 2).map(([k, v]) => (
                              <div key={k} className="text-xs text-fox-gray">{k}: {v}</div>
                            ))}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'constitution' && (
                  <div className="max-w-3xl space-y-6">
                    <p className="text-fox-gray leading-relaxed">
                      Конституция EBOS определяет базовые принципы платформы: пользователь находится в центре,
                      данные организации защищены, каждая роль видит только разрешённую информацию, аудит
                      непрерывен, а интеграции строятся через API первого класса.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {CONSTITUTION_LAWS.map((law, idx) => (
                        <Card key={idx} className="border-l-4 border-l-fox-gold">
                          <div className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full bg-fox-purple text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-sm text-fox-graphite">{law}</span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </PageShell>
  )
}

function DistributionCard({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = useMemo(() => Object.entries(data || {}), [data])
  const total = entries.reduce((sum, [, v]) => sum + v, 0) || 1
  return (
    <Card>
      <h4 className="text-base font-bold text-fox-dark mb-4">{title}</h4>
      <div className="space-y-3">
        {entries.map(([key, value]) => (
          <div key={key}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-fox-graphite">{key}</span>
              <span className="font-medium text-fox-dark">
                {value} ({Math.round((value / total) * 100)}%)
              </span>
            </div>
            <div className="h-2 bg-fox-border rounded-full overflow-hidden">
              <div
                className="h-full bg-fox-purple rounded-full"
                style={{ width: `${(value / total) * 100}%` }}
              />
            </div>
          </div>
        ))}
        {entries.length === 0 && <p className="text-sm text-fox-gray/70">Нет данных</p>}
      </div>
    </Card>
  )
}

function sumValues(obj: Record<string, number>) {
  return Object.values(obj || {}).reduce((a, b) => a + b, 0)
}

function colorForValue(value: number) {
  if (value >= 80) return 'text-fox-success'
  if (value >= 60) return 'text-fox-purple'
  return 'text-fox-error'
}

function barColorForValue(value: number) {
  if (value >= 80) return 'bg-fox-success'
  if (value >= 60) return 'bg-fox-purple'
  return 'bg-fox-error'
}

function methodVariant(method: string): Parameters<typeof Badge>[0]['variant'] {
  const map: Record<string, Parameters<typeof Badge>[0]['variant']> = {
    GET: 'success',
    POST: 'info',
    PATCH: 'warning',
    PUT: 'warning',
    DELETE: 'error',
    WS: 'purple',
  }
  return map[method] || 'default'
}

