import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import NotificationBadge from '../components/NotificationBadge'
import HomeworkBadge from '../components/HomeworkBadge'
import BrandLogo from './BrandLogo'

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
      { to: '/builder', label: 'Конструктор', icon: '🛠️' },
    ],
  },
]

const teacherGroups: MenuGroup[] = [
  {
    items: [
      { to: '/teacher-dashboard', label: 'Главная', icon: '🏠' },
      { to: '/my-courses', label: 'Мои курсы', icon: '📚' },
      { to: '/knowledge', label: 'База знаний', icon: '🧠' },
      { to: '/homeworks', label: 'Домашние задания', icon: '📝', badge: <HomeworkBadge /> },
      { to: '/academy', label: 'Академия педагогов', icon: '🎓' },
      { to: '/certification', label: 'Сертификация', icon: '🏅' },
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
    items: [{ to: '/methodist-dashboard', label: 'Дашборд', icon: '📊' }],
  },
  {
    title: 'Академия',
    items: [
      { to: '/academy', label: 'Академия педагогов', icon: '🎓' },
      { to: '/knowledge', label: 'База знаний', icon: '🧠' },
    ],
  },
  {
    title: 'Курсы',
    items: [
      { to: '/courses', label: 'Курсы', icon: '📚' },
      { to: '/course-builder', label: 'Конструктор курсов', icon: '🛠️' },
    ],
  },
  {
    title: 'Учебный процесс',
    items: [
      { to: '/employee-groups', label: 'Группы сотрудников', icon: '👥' },
      { to: '/students', label: 'Ученики', icon: '🎓' },
      { to: '/homeworks', label: 'Проверка ДЗ', icon: '📝', badge: <HomeworkBadge /> },
      { to: '/calendar', label: 'Расписание', icon: '📅' },
    ],
  },
  {
    title: 'Администрирование',
    items: [{ to: '/settings', label: 'Настройки', icon: '🔧' }],
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

interface SidebarProps {
  mobileOpen: boolean
  onCloseMobile: () => void
}

export default function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
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

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-white/10 flex-shrink-0">
        <BrandLogo collapsed={collapsed} />
      </div>

      {/* Profile */}
      {!collapsed && (
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-fox-gold text-fox-purple flex items-center justify-center font-bold flex-shrink-0">
              {user?.name?.[0] || '?'}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-white truncate">{user?.email}</div>
              <div className="text-xs text-fox-gold/80 capitalize font-medium">{roleLabel(user?.role)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {groups.map((group, gi) => (
          <div key={gi}>
            {!collapsed && group.title && (
              <div className="px-3 mb-2 text-[10px] font-semibold text-white/40 uppercase tracking-wider">
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
                    onClick={onCloseMobile}
                    className={[
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                      active
                        ? 'bg-fox-gold text-fox-purple shadow-md shadow-fox-gold/20'
                        : 'text-white/70 hover:bg-white/10 hover:text-white',
                      collapsed && 'justify-center',
                    ].join(' ')}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="text-lg">{item.icon}</span>
                    {!collapsed && <span className="flex-1">{item.label}</span>}
                    {!collapsed && item.badge && (
                      <span className="flex-shrink-0">
                        {typeof item.badge === 'number' ? (
                          <span className="bg-fox-gold text-fox-purple text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                            {item.badge}
                          </span>
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
      <div className="p-3 border-t border-white/10 space-y-1 flex-shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={[
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition',
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
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-red-500/20 hover:text-red-200 transition',
            collapsed && 'justify-center',
          ].join(' ')}
          title={collapsed ? 'Выйти' : undefined}
        >
          <span>⎋</span>
          {!collapsed && <span>Выйти</span>}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={[
          'hidden lg:flex h-screen bg-fox-purple flex-col transition-all duration-300 flex-shrink-0',
          collapsed ? 'w-20' : 'w-64',
        ].join(' ')}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-fox-purple/60 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 w-64 bg-fox-purple flex-col transition-transform duration-300 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
