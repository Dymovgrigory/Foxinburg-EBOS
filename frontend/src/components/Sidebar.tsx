import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiChevronLeft, FiChevronRight, FiLogOut, FiMoon, FiSun } from 'react-icons/fi'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { groupsForRole, roleLabel } from '../config/navigation'
import BrandLogo from './BrandLogo'

interface SidebarProps {
  mobileOpen: boolean
  onCloseMobile: () => void
}

export default function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const { user, logout } = useAuth()
  const { resolvedTheme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [userOpen, setUserOpen] = useState(false)

  const groups = groupsForRole(user?.role || 'owner')
  const isActive = (path: string) => location.pathname === path

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const avatar = (
    <div className="w-10 h-10 rounded-full bg-fox-gold text-fox-purple flex items-center justify-center font-bold flex-shrink-0">
      {user?.name?.[0] || user?.email?.[0] || '?'}
    </div>
  )

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-white/10 flex-shrink-0">
        <BrandLogo collapsed={collapsed} variant="dark" />
      </div>

      {/* Profile */}
      {!collapsed && (
        <div className="p-4 border-b border-white/10">
          <button
            onClick={() => setUserOpen(!userOpen)}
            className="w-full flex items-center gap-3 rounded-xl hover:bg-white/5 transition p-1 -m-1"
          >
            {avatar}
            <div className="min-w-0 text-left flex-1">
              <div className="text-sm font-medium text-white truncate">{user?.email}</div>
              <div className="text-xs text-fox-gold/80 capitalize font-medium">{roleLabel(user?.role)}</div>
            </div>
          </button>
          {userOpen && (
            <div className="mt-2 space-y-1 pl-[52px]">
              <Link
                to="/settings"
                onClick={onCloseMobile}
                className="block text-sm text-white/70 hover:text-white py-1"
              >
                Профиль
              </Link>
              <button
                onClick={handleLogout}
                className="block text-sm text-white/70 hover:text-red-300 py-1"
              >
                Выйти
              </button>
            </div>
          )}
        </div>
      )}

      {collapsed && (
        <div className="py-3 border-b border-white/10 flex justify-center">
          {avatar}
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
          onClick={toggleTheme}
          className={[
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition',
            collapsed && 'justify-center',
          ].join(' ')}
          title={resolvedTheme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
        >
          {resolvedTheme === 'dark' ? <FiSun className="text-lg" /> : <FiMoon className="text-lg" />}
          {!collapsed && <span>{resolvedTheme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={[
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition',
            collapsed && 'justify-center',
          ].join(' ')}
          title={collapsed ? 'Развернуть' : 'Свернуть'}
        >
          {collapsed ? <FiChevronRight className="text-lg" /> : <FiChevronLeft className="text-lg" />}
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
          <FiLogOut className="text-lg" />
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
          'hidden lg:flex h-screen flex-col transition-all duration-300 flex-shrink-0',
          collapsed ? 'w-20' : 'w-64',
        ].join(' ')}
        style={{ backgroundColor: 'var(--fox-purple)' }}
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
          'fixed inset-y-0 left-0 z-50 w-64 flex-col transition-transform duration-300 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        style={{ backgroundColor: 'var(--fox-purple)' }}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
