import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface NavItem {
  to: string
  label: string
  roles?: string[]
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: '🏠 Главная' },
  { to: '/courses', label: '📚 Курсы' },
  { to: '/users', label: '👥 Пользователи', roles: ['owner', 'super_admin', 'admin'] },
  { to: '/homeworks', label: '✅ Проверка ДЗ', roles: ['owner', 'super_admin', 'admin', 'methodist', 'teacher'] },
  { to: '/crm', label: '💼 CRM', roles: ['owner', 'super_admin', 'admin', 'manager'] },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const visibleNav = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  )

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-fox-light">
      {/* Mobile header */}
      <div className="md:hidden bg-white border-b border-fox-border sticky top-0 z-50 px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-fox-purple font-bold text-xl">
          🦊 FOXINBURG
        </Link>
        <button onClick={() => setMenuOpen(!menuOpen)} className="text-fox-purple p-2">
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={[
          'bg-white border-r border-fox-border w-full md:w-64 flex-shrink-0 flex flex-col',
          menuOpen ? 'block' : 'hidden md:flex',
        ].join(' ')}
      >
        <div className="h-16 items-center px-6 hidden md:flex border-b border-fox-border">
          <Link to="/" className="text-fox-purple font-bold text-xl">
            🦊 FOXINBURG
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {visibleNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              className={[
                'block px-4 py-3 rounded-lg font-medium transition',
                isActive(item.to)
                  ? 'bg-fox-purple text-fox-gold'
                  : 'text-fox-purple hover:bg-fox-border',
              ].join(' ')}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {user && (
          <div className="p-4 border-t border-fox-border">
            <div className="px-4 py-2 mb-2">
              <div className="font-semibold text-fox-purple">{user.name}</div>
              <div className="text-xs text-gray-500 capitalize">{user.role}</div>
            </div>
            <button
              onClick={handleLogout}
              className="fox-btn-secondary w-full text-center"
            >
              Выйти
            </button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
