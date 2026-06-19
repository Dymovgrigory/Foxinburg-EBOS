import Header from '../components/Header'
import { useAuth } from '../contexts/AuthContext'

const widgets = [
  { title: 'Мои курсы', value: '2', icon: '📚', color: 'bg-blue-500' },
  { title: 'Домашние задания', value: '3', icon: '📝', color: 'bg-amber-500' },
  { title: 'Пройдено уроков', value: '12', icon: '✅', color: 'bg-green-500' },
  { title: 'Уведомления', value: '2', icon: '🔔', color: 'bg-red-500' },
]

export default function StudentDashboardPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header title="Главная" icon="🏠" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-[#4CAF7E] to-[#3D9C70] rounded-2xl p-8 text-white">
          <h2 className="text-2xl font-bold mb-2">Привет, {user?.name}!</h2>
          <p className="opacity-90">Продолжай обучение — следующий урок уже доступен.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {widgets.map((w) => (
            <div key={w.title} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className={['w-10 h-10 rounded-xl text-white flex items-center justify-center text-lg mb-4', w.color].join(' ')}>
                {w.icon}
              </div>
              <div className="text-2xl font-bold text-gray-900">{w.value}</div>
              <div className="text-sm text-gray-500">{w.title}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Мой прогресс</h3>
          <div className="space-y-4">
            <ProgressRow name="Academy для педагогов" value={65} />
            <ProgressRow name="Academy для администраторов" value={30} />
          </div>
        </div>
      </div>
    </div>
  )
}

function ProgressRow({ name, value }: { name: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-700">{name}</span>
        <span className="font-semibold text-gray-900">{value}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-[#4CAF7E] rounded-full" style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}
