import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import NotificationBadge from '../components/NotificationBadge'

interface MenuItem {
  to: string
  label: string
  icon: string
  badge?: number | React.ReactNode
  roles?: string[]
}

interface MenuGroup {
  title?: string
  items: MenuItem[]
}

const adminGroups: MenuGroup[] = [
  {
    items: [
      { to: '/system-center', label: 'Executive', icon: '🏠' },
      { to: '/finance', label: 'Финансы', icon: '💹' },
      { to: '/branches', label: 'Филиалы', icon: '🏢' },
      { to: '/employees', label: 'Сотрудники', icon: '👥' },
      { to: '/students', label: 'Ученики', icon: '🎓' },
      { to: '/analytics', label: 'Аналитика', icon: '📊' },
      { to: '/crm', label: 'CRM', icon: '📋' },
      { to: '/marketing', label: 'Маркетинг', icon: '📣' },
      { to: '/courses', label: 'Курсы', icon: '📚' },
      { to: '/calendar', label: 'Расписание', icon: '📅' },
      { to: '/chats', label: 'Чаты', icon: '💬' },
      { to: '/notifications', label: 'Уведомления', icon: '🔔', badge: <NotificationBadge /> },
    ],
  },
  {
    title: 'Инструменты',
    items: [{ to: '/ai', label: 'AI Помощник', icon: '🤖' }],
  },
  {
    title: 'OS',
    items: [
      { to: '/system-center', label: 'OS Center', icon: '⚙️' },
      { to: '/roles', label: 'Role Ecosystem', icon: '🛡️' },
      { to: '/settings', label: 'Настройки', icon: '🔧' },
      { to: '/builder', label: 'Конструктор', icon: '🛠️', badge: undefined },
    ],
  },
]

const teacherGroups: MenuGroup[] = [
  {
    items: [
      { to: '/dashboard', label: 'Главная', icon: '🏠' },
      { to: '/my-courses', label: 'Мои курсы', icon: '📚' },
      { to: '/knowledge', label: 'База знаний', icon: '🧠' },
      { to: '/homeworks', label: 'Домашние задания', icon: '📝', badge: 5 },
      { to: '/certification', label: 'Сертификация', icon: '🎓' },
      { to: '/progress', label: 'Мой прогресс', icon: '📈' },
      { to: '/ai', label: 'AI Помощник', icon: '🤖' },
      { to: '/library', label: 'Библиотека', icon: '📖' },
      { to: '/calendar', label: 'Календарь', icon: '📅' },
      { to: '/chats', label: 'Чаты', icon: '💬' },
      { to: '/notifications', label: 'Уведомления', icon: '🔔', badge: <NotificationBadge /> },
      { to: '/settings', label: 'Настройки', icon: '🔧' },
    ],
  },
]

const studentGroups: MenuGroup[] = [
  {
    items: [
      { to: '/dashboard', label: 'Главная', icon: '🏠' },
      { to: '/my-courses', label: 'Мои курсы', icon: '📚' },
      { to: '/homeworks', label: 'Домашние задания', icon: '📝' },
      { to: '/progress', label: 'Мой прогресс', icon: '📈' },
      { to: '/library', label: 'Библиотека', icon: '📖' },
      { to: '/calendar', label: 'Календарь', icon: '📅' },
      { to: '/chats', label: 'Чаты', icon: '💬' },
      { to: '/notifications', label: 'Уведомления', icon: '🔔', badge: <NotificationBadge /> },
      { to: '/settings', label: 'Настройки', icon: '🔧' },
    ],
  },
]

const managerGroups: MenuGroup[] = [
  {
    items: [
      { to: '/dashboard', label: 'Главная', icon: '🏠' },
      { to: '/crm', label: 'CRM', icon: '📋' },
      { to: '/finance', label: 'Финансы', icon: '💹' },
      { to: '/analytics', label: 'Аналитика', icon: '📊' },
      { to: '/marketing', label: 'Маркетинг', icon: '📣' },
      { to: '/settings', label: 'Настройки', icon: '🔧' },
    ],
  },
]

const methodistGroups: MenuGroup[] = [
  {
    items: [
      { to: '/dashboard', label: 'Главная', icon: '🏠' },
      { to: '/courses', label: 'Курсы', icon: '📚' },
      { to: '/homeworks', label: 'Проверка ДЗ', icon: '📝' },
      { to: '/knowledge', label: 'База знаний', icon: '🧠' },
      { to: '/settings', label: 'Настройки', icon: '🔧' },
    ],
  },
]

const parentGroups: MenuGroup[] = [
  {
    items: [
      { to: '/dashboard', label: 'Главная', icon: '🏠' },
      { to: '/progress', label: 'Прогресс ребёнка', icon: '📈' },
      { to: '/payments', label: 'Оплата', icon: '💳' },
      { to: '/settings', label: 'Настройки', icon: '🔧' },
    ],
  },
]

const guestGroups: MenuGroup[] = [
  {
    items: [
      { to: '/dashboard', label: 'Главная', icon: '🏠' },
      { to: '/courses', label: 'Курсы', icon: '📚' },
      { to: '/settings', label: 'Настройки', icon: '🔧' },
    ],
  },
]

function groupsForRole(role: string): MenuGroup[] {
  if (role === 'teacher') return teacherGroups
  if (role === 'student') return studentGroups
  if (role === 'parent') return parentGroups
  if (role === 'manager') return managerGroups
  if (role === 'methodist') return methodistGroups
  if (role === 'guest') return guestGroups
  return adminGroups
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const groups = groupsForRole(user?.role || 'owner')
  const isActive = (path: string) => location.pathname === path

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside
      className={[
        'h-screen bg-white border-r border-gray-100 flex flex-col transition-all duration-300',
        collapsed ? 'w-20' : 'w-64',
      ].join(' ')}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-[#E85D4C] flex items-center justify-center text-white text-lg mr-3 flex-shrink-0">
          ✦
        </div>
        {!collapsed && (
          <div>
            <div className="font-bold text-gray-900 leading-tight">FOXINBURG</div>
            <div className="text-[10px] text-gray-400 tracking-wider">EBOS</div>
          </div>
        )}
      </div>

      {/* Profile */}
      {!collapsed && (
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E85D4C] text-white flex items-center justify-center font-semibold">
              {user?.name?.[0] || '?'}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{user?.email}</div>
              <div className="text-xs text-[#E85D4C] capitalize">{roleLabel(user?.role)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {groups.map((group, gi) => (
          <div key={gi}>
            {!collapsed && group.title && (
              <div className="px-3 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                {group.title}
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item.to)
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={[
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition',
                      active
                        ? 'bg-[#E85D4C] text-white shadow-md shadow-[#E85D4C]/25'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                      collapsed && 'justify-center',
                    ].join(' ')}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="text-lg">{item.icon}</span>
                    {!collapsed && <span className="flex-1">{item.label}</span>}
                    {!collapsed && item.badge && (
                      <span className="flex-shrink-0">
                        {typeof item.badge === 'number' ? (
                          <span className="bg-[#4CAF7E] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{item.badge}</span>
                        ) : (
                          item.badge
                        )}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-gray-100 space-y-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={[
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition',
            collapsed && 'justify-center',
          ].join(' ')}
          title={collapsed ? 'Развернуть' : 'Свернуть'}
        >
          <span>{collapsed ? '→' : '←'}</span>
          {!collapsed && <span>Свернуть</span>}
        </button>
        <button
          onClick={handleLogout}
          className={[
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition',
            collapsed && 'justify-center',
          ].join(' ')}
          title={collapsed ? 'Выйти' : undefined}
        >
          <span>⎋</span>
          {!collapsed && <span>Выйти</span>}
        </button>
      </div>
    </aside>
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
