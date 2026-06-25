import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiChevronLeft, FiChevronRight, FiChevronDown, FiChevronUp, FiLogOut, FiMoon, FiSun } from 'react-icons/fi'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { groupsForRole, roleLabel } from '../config/navigation'
import type { MenuGroup, MenuItem } from '../config/navigation'

interface SidebarProps {
  mobileOpen: boolean
  onCloseMobile: () => void
}

function SidebarItem({
  item,
  collapsed,
  active,
  onNavigate,
}: {
  item: MenuItem
  collapsed: boolean
  active: boolean
  onNavigate: () => void
}) {
  const content = (
    <>
      {item.icon && <span className="text-lg">{item.icon}</span>}
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
    </>
  )

  const className = [
    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
    active
      ? 'bg-fox-sidebar-active-bg text-fox-sidebar-active-text shadow-sm'
      : 'text-fox-sidebar-muted hover:bg-fox-sidebar-hover-bg hover:text-fox-purple',
    collapsed && 'justify-center',
  ].join(' ')

  if (item.to) {
    return (
      <Link
        to={item.to}
        onClick={onNavigate}
        className={className}
        title={collapsed ? item.label : undefined}
      >
        {content}
      </Link>
    )
  }

  return (
    <div className={className} title={collapsed ? item.label : undefined}>
      {content}
    </div>
  )
}

export default function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const { user, logout } = useAuth()
  const { resolvedTheme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [userOpen, setUserOpen] = useState(false)

  const groups = groupsForRole(user?.role || 'owner')
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {}
    groups.forEach((g, idx) => {
      initial[idx] = g.collapsible ? (g.defaultOpen ?? groupHasActive(g)) : true
    })
    return initial
  })

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev }
      let changed = false
      groups.forEach((g, idx) => {
        if (g.collapsible && groupHasActive(g) && !next[idx]) {
          next[idx] = true
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [groups, location.pathname])
  const isActive = (path?: string) => !!path && location.pathname === path
  const itemOrChildActive = (item: MenuItem): boolean => {
    if (isActive(item.to)) return true
    if (item.children) return item.children.some((c) => itemOrChildActive(c))
    return false
  }
  const groupHasActive = (group: MenuGroup) => group.items.some((i) => itemOrChildActive(i))

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
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
        {groups.map((group, gi) => {
          const hasActive = groupHasActive(group)
          const isOpen = collapsed ? true : (openGroups[gi] ?? !group.collapsible)
          const canCollapse = !collapsed && group.collapsible && group.title
          return (
            <div key={gi}>
              {group.title && !collapsed && (
                <button
                  type="button"
                  onClick={() =>
                    canCollapse
                      ? setOpenGroups((prev) => ({ ...prev, [gi]: !isOpen }))
                      : undefined
                  }
                  className={[
                    'w-full flex items-center gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition',
                    canCollapse ? 'cursor-pointer hover:text-fox-purple' : 'cursor-default',
                    hasActive ? 'text-fox-purple' : 'text-fox-sidebar-muted',
                  ].join(' ')}
                >
                  {group.icon && <span className="text-base">{group.icon}</span>}
                  <span className="flex-1 text-left">{group.title}</span>
                  {canCollapse && (
                    <span className="text-fox-sidebar-muted">
                      {isOpen ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                    </span>
                  )}
                </button>
              )}
              {(!group.collapsible || collapsed || isOpen) && (
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <SidebarItem
                      key={item.to || item.label}
                      item={item}
                      collapsed={collapsed}
                      active={isActive(item.to)}
                      onNavigate={onCloseMobile}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
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

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-fox-purple/30 backdrop-blur-sm lg:hidden"
            onClick={onCloseMobile}
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] flex-col border-r bg-fox-sidebar-bg border-fox-sidebar-border lg:hidden"
          >
            <button
              onClick={onCloseMobile}
              className="absolute top-3 right-3 z-50 w-9 h-9 flex items-center justify-center rounded-lg text-fox-sidebar-muted hover:text-fox-sidebar-text hover:bg-fox-sidebar-hover-bg transition"
              aria-label="Закрыть меню"
            >
              <FiChevronLeft size={20} />
            </button>
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
      )}
    </>
  )
}
