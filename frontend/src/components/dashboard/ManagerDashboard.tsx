import { useNavigate } from 'react-router-dom'
import Header from '../Header'
import { Card, StatCard, PageShell, Badge, Button } from '../ui'
import { useAuth } from '../../contexts/AuthContext'
import { LuTarget, LuHandshake, LuListChecks, LuBell, LuHouse, LuArrowRight } from 'react-icons/lu'
import { roleLabel } from '../../config/navigation'

interface ManagerDashboardProps {
  data: {
    leads_by_status?: Record<string, number>
    deals_by_status?: Record<string, number>
    tasks_count?: number
    unread_count?: number
  }
}

export default function ManagerDashboard({ data }: ManagerDashboardProps) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const newLeads = data.leads_by_status?.new || 0
  const inProgressLeads = data.leads_by_status?.in_progress || 0
  const activeDeals = data.deals_by_status?.active || 0
  const wonDeals = data.deals_by_status?.won || 0

  return (
    <PageShell>
      <Header title="Главная" icon={<LuHouse />} />

      <div className="p-4 md:p-6 w-full space-y-6">
        <div className="relative overflow-hidden rounded-card p-6 md:p-8 border border-fox-border/60 bg-white shadow-fox-lg">
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
                Ваша зона: лиды, сделки и задачи.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Новых лидов" value={newLeads} icon={<LuTarget />} variant="purple" />
          <StatCard title="Активных сделок" value={activeDeals} icon={<LuHandshake />} variant="gold" />
          <StatCard title="Задач" value={data.tasks_count || 0} icon={<LuListChecks />} variant="graphite" />
          <StatCard title="Уведомлений" value={data.unread_count || 0} icon={<LuBell />} variant="outline" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card accent="purple">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-fox-dark">Воронка</h3>
              <Button size="sm" variant="ghost" rightIcon={<LuArrowRight size={14} />} onClick={() => navigate('/crm')}>
                Открыть CRM
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <StatusBadge label="Новые" value={newLeads} />
              <StatusBadge label="В работе" value={inProgressLeads} />
              <StatusBadge label="Активные сделки" value={activeDeals} />
              <StatusBadge label="Выиграно" value={wonDeals} />
            </div>
          </Card>

          <Card accent="gold">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-fox-dark">Быстрые действия</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button leftIcon={<LuTarget size={16} />} onClick={() => navigate('/crm')}>
                К CRM
              </Button>
              <Button variant="secondary" leftIcon={<LuListChecks size={16} />} onClick={() => navigate('/tasks')}>
                К задачам
              </Button>
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
