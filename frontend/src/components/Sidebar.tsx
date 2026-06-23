import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiChevronLeft, FiChevronRight, FiLogOut, FiMoon, FiSun } from 'react-icons/fi'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { groupsForRole, roleLabel } from '../config/navigation'

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
    <div className="w-10 h-10 rounded-full bg-fox-purple text-fox-gold flex items-center justify-center font-bold flex-shrink-0 border-2 border-fox-gold/30">
      {user?.name?.[0] || user?.email?.[0] || '?'}
    </div>
  )

  const logo = (
    <div className="flex items-center gap-3">
      <img
        src="/brand/fox-head.png"
        alt="FOXINBURG"
        className={['object-contain', collapsed ? 'w-9 h-9' : 'w-9 h-9'].join(' ')}
      />
      {!collapsed && (
        <div className="flex flex-col leading-tight">
          <span className="font-display font-bold text-fox-purple text-sm tracking-tight">FOXINBURG</span>
          <span className="text-[9px] text-fox-gray uppercase tracking-widest">EBOS</span>
        </div>
      )}
    </div>
  )

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-fox-sidebar-border flex-shrink-0">
        {logo}
      </div>

      {/* Profile */}
      {!collapsed && (
        <div className="p-4 border-b border-fox-sidebar-border">
          <button
            onClick={() => setUserOpen(!userOpen)}
            className="w-full flex items-center gap-3 rounded-xl hover:bg-fox-sidebar-hover-bg transition p-1 -m-1"
          >
            {avatar}
            <div className="min-w-0 text-left flex-1">
              <div className="text-sm font-medium text-fox-sidebar-text truncate">{user?.email}</div>
              <div className="text-xs text-fox-purple capitalize font-medium">{roleLabel(user?.role)}</div>
            </div>
          </button>
          {userOpen && (
            <div className="mt-2 space-y-1 pl-[52px]">
              <Link
                to="/settings"
                onClick={onCloseMobile}
                className="block text-sm text-fox-sidebar-muted hover:text-fox-purple py-1"
              >
                Профиль
              </Link>
              <button
                onClick={handleLogout}
                className="block text-sm text-fox-sidebar-muted hover:text-fox-error py-1"
              >
                Выйти
              </button>
            </div>
          )}
        </div>
      )}

      {collapsed && (
        <div className="py-3 border-b border-fox-sidebar-border flex justify-center">
          {avatar}
        </div>
      )}

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {groups.map((group, gi) => (
          <div key={gi}>
            {!collapsed && group.title && (
              <div className="px-3 mb-2 text-[10px] font-semibold text-fox-sidebar-muted uppercase tracking-wider">
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
                        ? 'bg-fox-sidebar-active-bg text-fox-sidebar-active-text shadow-sm'
                        : 'text-fox-sidebar-muted hover:bg-fox-sidebar-hover-bg hover:text-fox-purple',
                      collapsed && 'justify-center',
                    ].join(' ')}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="text-lg">{item.icon}</span>
                    {!collapsed && <span className="flex-1">{item.label}</span>}
                    {!collapsed && item.badge && (
                      <span className="flex-shrink-0">
                        {typeof item.badge === 'number' ? (
                          <span className="bg-fox-purple text-fox-gold text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
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
      <div className="p-3 border-t border-fox-sidebar-border space-y-1 flex-shrink-0">
        <button
          onClick={toggleTheme}
          className={[
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-fox-sidebar-muted hover:bg-fox-sidebar-hover-bg hover:text-fox-purple transition',
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
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-fox-sidebar-muted hover:bg-fox-sidebar-hover-bg hover:text-fox-purple transition',
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
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-fox-sidebar-muted hover:bg-fox-error/10 hover:text-fox-error transition',
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

  const sidebarClass = [
    'flex h-screen flex-col transition-all duration-300 flex-shrink-0 border-r',
    collapsed ? 'w-20' : 'w-64',
    'bg-fox-sidebar-bg border-fox-sidebar-border relative',
  ].join(' ')

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={[sidebarClass, 'hidden lg:flex'].join(' ')}>
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: 'url(/brand/swirl-1.png)',
            backgroundSize: '200%',
            backgroundPosition: 'top right',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div className="relative z-10 flex flex-col h-full">{sidebarContent}</div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-fox-purple/30 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 w-64 flex-col transition-transform duration-300 lg:hidden border-r',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'bg-fox-sidebar-bg border-fox-sidebar-border relative',
        ].join(' ')}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: 'url(/brand/swirl-1.png)',
            backgroundSize: '200%',
            backgroundPosition: 'top right',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div className="relative z-10 flex flex-col h-full">{sidebarContent}</div>
      </aside>
    </>
  )
}
