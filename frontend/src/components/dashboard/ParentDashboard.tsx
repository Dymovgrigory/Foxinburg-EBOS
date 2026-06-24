import { useNavigate } from 'react-router-dom'
import Header from '../Header'
import { Card, PageShell, Button } from '../ui'
import { useAuth } from '../../contexts/AuthContext'
import { LuHouse, LuCreditCard, LuBell, LuUsers } from 'react-icons/lu'
import { roleLabel } from '../../config/navigation'

export default function ParentDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

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
                Здесь будет личный кабинет родителя: прогресс ребёнка, оплата и уведомления.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="flex flex-col items-center text-center p-6">
            <div className="w-12 h-12 rounded-xl bg-fox-purple/10 text-fox-purple flex items-center justify-center mb-4">
              <LuUsers size={24} />
            </div>
            <h3 className="font-semibold text-fox-dark mb-2">Дети</h3>
            <p className="text-sm text-fox-gray mb-4">Связь родитель–ребёнок появится в ближайшем обновлении.</p>
            <Button variant="secondary" disabled>Скоро</Button>
          </Card>

          <Card className="flex flex-col items-center text-center p-6">
            <div className="w-12 h-12 rounded-xl bg-fox-gold/20 text-fox-purple flex items-center justify-center mb-4">
              <LuCreditCard size={24} />
            </div>
            <h3 className="font-semibold text-fox-dark mb-2">Оплата</h3>
            <p className="text-sm text-fox-gray mb-4">История платежей и задолженность.</p>
            <Button onClick={() => navigate('/payments')}>Перейти</Button>
          </Card>

          <Card className="flex flex-col items-center text-center p-6">
            <div className="w-12 h-12 rounded-xl bg-fox-info/10 text-fox-info flex items-center justify-center mb-4">
              <LuBell size={24} />
            </div>
            <h3 className="font-semibold text-fox-dark mb-2">Уведомления</h3>
            <p className="text-sm text-fox-gray mb-4">Сообщения от школы.</p>
            <Button variant="secondary" onClick={() => navigate('/notifications')}>Открыть</Button>
          </Card>
        </div>
      </div>
    </PageShell>
  )
}
