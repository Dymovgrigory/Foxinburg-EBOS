import { useEffect, useState } from 'react'
import Header from '../components/Header'
import api from '../services/api'

interface Stats {
  tables: number
  laws: number
  modules: number
  endpoints: number
  users: number
  roles: number
  backups: number
  status: string
}

const moduleReadiness = [
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

const laws = [
  'Пользователь — центр экосистемы',
  'Данные принадлежат организации',
  'Каждая роль видит только своё',
  'Аудит непрерывен и необратим',
  'Интеграции — через API первого класса',
]

export default function SystemCenterPage() {
  const [stats, setStats] = useState<Stats>({
    tables: 0,
    laws: laws.length,
    modules: 15,
    endpoints: 0,
    users: 0,
    roles: 9,
    backups: 0,
    status: 'OK',
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Обзор')
  const tabs = ['Обзор', 'Конституция', 'Модули', 'База данных', 'Роли', 'API']

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes] = await Promise.all([
          api.get('/users').catch(() => ({ data: { data: [] } })),
          api.get('/courses').catch(() => ({ data: { data: [] } })),
        ])
        setStats((s) => ({
          ...s,
          users: usersRes.data.data?.length || 0,
          endpoints: 48,
          tables: 28,
          backups: 1,
        }))
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const cards = [
    { label: 'Таблиц БД', sub: '0 записей', value: stats.tables, icon: '🗄️', color: 'bg-blue-500' },
    { label: 'Законов', sub: 'Конституция', value: stats.laws, icon: '📜', color: 'bg-amber-500' },
    { label: 'Модулей', sub: '0% готовность', value: stats.modules, icon: '🧩', color: 'bg-emerald-500' },
    { label: 'API Endpoints', sub: 'Зарегистрировано', value: stats.endpoints, icon: '</>', color: 'bg-violet-500' },
    { label: 'Пользователей', sub: 'В системе', value: stats.users, icon: '👥', color: 'bg-pink-500' },
    { label: 'Ролей', sub: 'В матрице', value: stats.roles, icon: '🛡️', color: 'bg-cyan-500' },
    { label: 'Бэкапов', sub: 'Создано', value: stats.backups, icon: '💾', color: 'bg-teal-500' },
    { label: 'Статус', sub: 'Система работает', value: stats.status, icon: '✓', color: 'bg-green-500' },
  ]

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header title="System Center" subtitle="v" icon="⚙️" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <div key={card.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className={['w-10 h-10 rounded-xl text-white flex items-center justify-center text-lg', card.color].join(' ')}>
                  {card.icon}
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {loading ? '—' : card.value}
              </div>
              <div className="text-sm font-medium text-gray-700">{card.label}</div>
              <div className="text-xs text-gray-400">{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-2 p-2 border-b border-gray-100 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={[
                  'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition',
                  activeTab === tab
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:bg-gray-50',
                ].join(' ')}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'Обзор' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Readiness */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span>🧩</span> Готовность модулей
                  </h3>
                  <div className="space-y-4">
                    {moduleReadiness.map((m) => (
                      <div key={m.name}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{m.name}</span>
                          <span className={['font-semibold', colorForValue(m.value)].join(' ')}>{m.value}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={['h-full rounded-full transition-all', barColorForValue(m.value)].join(' ')}
                            style={{ width: `${m.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Laws */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span>📜</span> Законы Конституции
                  </h3>
                  <div className="bg-[#FFF8F0] rounded-2xl p-5 border border-amber-100">
                    <ol className="space-y-4">
                      {laws.map((law, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-gray-700 text-sm">{law}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Конституция' && (
              <div className="text-gray-500">Конституция EBOS: центр пользователя, безопасность данных, ролевая матрица, аудит, API-first.</div>
            )}
            {activeTab === 'Модули' && (
              <div className="text-gray-500">Список модулей и их готовность.</div>
            )}
            {activeTab === 'База данных' && (
              <div className="text-gray-500">28 таблиц, PostgreSQL, Redis кэш.</div>
            )}
            {activeTab === 'Роли' && (
              <div className="text-gray-500">9 ролей: Владелец, Супер-админ, Администратор, Методист, Педагог, Менеджер, Ученик, Родитель, Гость.</div>
            )}
            {activeTab === 'API' && (
              <div className="text-gray-500">48 endpoints, документация /docs.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function colorForValue(value: number) {
  if (value >= 80) return 'text-green-600'
  if (value >= 60) return 'text-amber-500'
  return 'text-red-500'
}

function barColorForValue(value: number) {
  if (value >= 80) return 'bg-green-500'
  if (value >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}
