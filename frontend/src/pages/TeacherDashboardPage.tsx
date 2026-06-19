import Header from '../components/Header'
import { useAuth } from '../contexts/AuthContext'

const widgets = [
  { title: 'Мои курсы', value: '3', icon: '📚', color: 'bg-blue-500' },
  { title: 'Домашние задания', value: '5', icon: '📝', color: 'bg-amber-500' },
  { title: 'Ученики', value: '24', icon: '🎓', color: 'bg-green-500' },
  { title: 'Уведомления', value: '3', icon: '🔔', color: 'bg-red-500' },
]

export default function TeacherDashboardPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header title="Главная" icon="🏠" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-[#E85D4C] to-[#F07B6A] rounded-2xl p-8 text-white">
          <h2 className="text-2xl font-bold mb-2">Добро пожаловать, {user?.name}!</h2>
          <p className="opacity-90">Ваша роль: {roleLabel(user?.role)}. У вя 5 новых домашних заданий на проверку.</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Ближайшие занятия</h3>
            <div className="space-y-4">
              <LessonRow title="Английский A1" time="10:00 — 11:30" group="Группа A1" />
              <LessonRow title="IELTS Speaking" time="12:00 — 13:00" group="Индивидуально" />
              <LessonRow title="Английский B1" time="15:00 — 16:30" group="Группа B1" />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Проверка ДЗ</h3>
            <div className="space-y-4">
              <HomeworkRow name="Алексей Попов" task="Урок 1.1 — Essay" status="На проверке" />
              <HomeworkRow name="Марина Васильева" task="Урок 1.2 — Видео" status="На проверке" />
              <HomeworkRow name="Иван Кузнецов" task="Урок 2.1 — Тест" status="На проверке" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LessonRow({ title, time, group }: { title: string; time: string; group: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
      <div>
        <div className="font-medium text-gray-900">{title}</div>
        <div className="text-sm text-gray-500">{group}</div>
      </div>
      <div className="text-sm font-semibold text-[#E85D4C]">{time}</div>
    </div>
  )
}

function HomeworkRow({ name, task, status }: { name: string; task: string; status: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
      <div>
        <div className="font-medium text-gray-900">{name}</div>
        <div className="text-sm text-gray-500">{task}</div>
      </div>
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">{status}</span>
    </div>
  )
}

function roleLabel(role?: string) {
  const labels: Record<string, string> = {
    owner: 'Владелец',
    super_admin: 'Супер-админ',
    admin: 'Администратор',
    methodist: 'Методист',
    teacher: 'Педагог',
    manager: 'Менеджер',
    student: 'Ученик',
    parent: 'Родитель',
    guest: 'Гость',
  }
  return labels[role || ''] || role
}
