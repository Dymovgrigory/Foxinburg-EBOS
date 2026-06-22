import type React from 'react'
import { Link } from 'react-router-dom'
import { LuBell } from 'react-icons/lu'
import { useAuth } from '../contexts/AuthContext'
import ThemeToggle from './ThemeToggle'
import NotificationBadge from './NotificationBadge'

interface HeaderProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  backTo?: string
}

export default function Header({ title, subtitle, icon, backTo }: HeaderProps) {
  const { user } = useAuth()

  return (
    <header
      className="h-16 backdrop-blur border-b flex items-center justify-between px-4 md:px-6 sticky top-0 z-20"
      style={{
        backgroundColor: 'rgba(var(--fox-white-rgb, 255, 255, 255), 0.8)',
        borderColor: 'var(--fox-border)',
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        {backTo && (
          <Link
            to={backTo}
            className="text-sm font-medium text-fox-purple hover:text-fox-purple-light transition"
          >
            ← Назад
          </Link>
        )}
        {icon && (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ backgroundColor: 'var(--fox-gold)', color: 'var(--fox-purple)' }}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1
            className="text-lg md:text-xl font-bold truncate"
            style={{ color: 'var(--fox-purple)' }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs truncate" style={{ color: 'var(--fox-gray)' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        <Link
          to="/notifications"
          className="relative p-2 rounded-button hover:bg-fox-light transition"
          style={{ color: 'var(--fox-graphite)' }}
          aria-label="Уведомления"
        >
          <LuBell size={20} />
          <span className="absolute top-1.5 right-1.5">
            <NotificationBadge />
          </span>
        </Link>

        <ThemeToggle variant="ghost" className="hidden sm:flex" />

        {user && (
          <div className="flex items-center gap-3 pl-2 md:pl-3 border-l border-fox-border">
            <div className="hidden sm:block text-right">
              <div
                className="text-sm font-medium truncate max-w-[160px]"
                style={{ color: 'var(--fox-graphite)' }}
              >
                {user.name || user.email}
              </div>
              <div className="text-[10px] capitalize" style={{ color: 'var(--fox-gray)' }}>
                {user.role}
              </div>
            </div>
            <Link to="/settings">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold border-2 transition hover:opacity-90"
                style={{
                  backgroundColor: 'var(--fox-purple)',
                  color: 'var(--fox-gold)',
                  borderColor: 'rgba(249, 228, 166, 0.3)',
                }}
              >
                {user.name?.[0] || user.email?.[0] || '?'}
              </div>
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
