import { useNavigate } from 'react-router-dom'
import Header from '../Header'
import { Card, StatCard, PageShell, Badge, Button } from '../ui'
import { useAuth } from '../../contexts/AuthContext'
import { LuUsers, LuTrendingUp, LuWallet, LuCreditCard, LuTarget, LuHandshake, LuListChecks, LuBell, LuHouse, LuArrowRight } from 'react-icons/lu'
import { roleLabel } from '../../config/navigation'

interface AdminDashboardProps {
  data: {
    users_by_role?: Record<string, number>
    finance?: {
      income_kopecks?: number
      net_kopecks?: number
      debt_kopecks?: number
    }
    leads_by_status?: Record<string, number>
    deals_by_status?: Record<string, number>
    tasks_count?: number
    unread_count?: number
  }
}

function formatMoney(kopecks?: number) {
  if (kopecks === undefined) return '—'
  return `${(kopecks / 100).toLocaleString('ru-RU')} ₽`
}

export default function AdminDashboard({ data }: AdminDashboardProps) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const totalUsers = Object.values(data.users_by_role || {}).reduce((a, b) => a + b, 0)
  const newLeads = data.leads_by_status?.new || 0
  const activeDeals = data.deals_by_status?.active || 0

  return (
    <PageShell>
      <Header title="Главная" icon={<LuHouse />} />

      <div className="p-4 md:p-6 w-full space-y-6">
        <div className="relative overflow-hidden rounded-card p-6 md:p-8 border border-fox-border/60 bg-white shadow-fox-lg">
          <div
            className="absolute top-0 right-0 w-64 h-64 pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage: 'url(/brand/swirl-1.png)',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'top right',
            }}
          />
          <div className="relative z-10 flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-fox-gold text-fox-purple shadow-md flex-shrink-0">
              <LuHouse size={28} />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fox-gold/20 text-fox-purple text-xs font-semibold mb-2">
                {roleLabel(user?.role)}
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-fox-purple mb-2">
                Добро пожаловать, {user?.name}!
              </h2>
              <p className="text-fox-gray max-w-xl">
                Общий контроль школы: пользователи, финансы, CRM и задачи.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Пользователей" value={totalUsers} icon={<LuUsers />} variant="purple" />
          <StatCard title="Доход" value={formatMoney(data.finance?.income_kopecks)} icon={<LuTrendingUp />} variant="gold" />
          <StatCard title="Прибыль" value={formatMoney(data.finance?.net_kopecks)} icon={<LuWallet />} variant="graphite" />
          <StatCard title="Долги" value={formatMoney(data.finance?.debt_kopecks)} icon={<LuCreditCard />} variant="outline" />
          <StatCard title="Новых лидов" value={newLeads} icon={<LuTarget />} variant="purple" />
          <StatCard title="Активных сделок" value={activeDeals} icon={<LuHandshake />} variant="gold" />
          <StatCard title="Задач" value={data.tasks_count || 0} icon={<LuListChecks />} variant="graphite" />
          <StatCard title="Уведомлений" value={data.unread_count || 0} icon={<LuBell />} variant="outline" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card accent="purple">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-fox-dark">CRM</h3>
              <Button size="sm" variant="ghost" rightIcon={<LuArrowRight size={14} />} onClick={() => navigate('/crm')}>
                Открыть CRM
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <StatusBadge label="Лиды новые" value={data.leads_by_status?.new || 0} />
              <StatusBadge label="Лиды в работе" value={data.leads_by_status?.in_progress || 0} />
              <StatusBadge label="Сделки активные" value={data.deals_by_status?.active || 0} />
              <StatusBadge label="Сделки выиграны" value={data.deals_by_status?.won || 0} />
            </div>
          </Card>

          <Card accent="gold">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-fox-dark">Финансы</h3>
              <Button size="sm" variant="ghost" rightIcon={<LuArrowRight size={14} />} onClick={() => navigate('/finance')}>
                Финансы
              </Button>
            </div>
            <div className="space-y-2 text-sm">
              <FinanceRow label="Доход" value={formatMoney(data.finance?.income_kopecks)} />
              <FinanceRow label="Прибыль" value={formatMoney(data.finance?.net_kopecks)} />
              <FinanceRow label="Дебиторская задолженность" value={formatMoney(data.finance?.debt_kopecks)} />
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  )
}

function StatusBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between p-3 bg-fox-light rounded-xl">
      <span className="text-fox-gray">{label}</span>
      <Badge variant="purple">{value}</Badge>
    </div>
  )
}

function FinanceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-fox-light rounded-xl">
      <span className="text-fox-gray">{label}</span>
      <span className="font-semibold text-fox-dark">{value}</span>
    </div>
  )
}
