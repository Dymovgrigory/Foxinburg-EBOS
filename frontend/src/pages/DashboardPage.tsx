import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const roleLabels: Record<string, string> = {
  owner: 'Владелец',
  super_admin: 'Супер-админ',
  admin: 'Администратор',
  methodist: 'Методист',
  teacher: 'Педагог',
  manager: 'Менеджер',
  student: 'Студент',
  parent: 'Родитель',
  guest: 'Гость',
}

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="fox-card mb-6">
        <h1 className="text-3xl font-bold text-fox-purple mb-2">
          Добро пожаловать, {user?.name}!
        </h1>
        <p className="text-gray-600">
          Роль: <span className="font-semibold">{user ? roleLabels[user.role] || user.role : ''}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to="/courses" className="fox-card hover:shadow-lg transition">
          <div className="text-2xl mb-2">📚</div>
          <div className="font-bold text-fox-purple">Курсы</div>
          <div className="text-sm text-gray-500">Список доступных курсов</div>
        </Link>

        {['owner', 'super_admin', 'admin'].includes(user?.role || '') && (
          <Link to="/users" className="fox-card hover:shadow-lg transition">
            <div className="text-2xl mb-2">👥</div>
            <div className="font-bold text-fox-purple">Пользователи</div>
            <div className="text-sm text-gray-500">Управление пользователями</div>
          </Link>
        )}

        {['owner', 'super_admin', 'admin', 'methodist', 'teacher'].includes(user?.role || '') && (
          <div className="fox-card opacity-70">
            <div className="text-2xl mb-2">✅</div>
            <div className="font-bold text-fox-purple">Проверка ДЗ</div>
            <div className="text-sm text-gray-500">В разработке</div>
          </div>
        )}

        {['owner', 'super_admin', 'admin', 'manager'].includes(user?.role || '') && (
          <div className="fox-card opacity-70">
            <div className="text-2xl mb-2">💼</div>
            <div className="font-bold text-fox-purple">CRM</div>
            <div className="text-sm text-gray-500">В разработке</div>
          </div>
        )}
      </div>
    </div>
  )
}
