import type React from 'react'
import { Link } from 'react-router-dom'
import { LuArrowLeft, LuBell } from 'react-icons/lu'
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
    <header className="h-16 border-b border-fox-border/60 flex items-center justify-between px-4 md:px-6 sticky top-0 z-20 bg-white/80 backdrop-blur-md">
      <div className="flex items-center gap-3 min-w-0">
        {backTo && (
          <Link
            to={backTo}
            className="w-9 h-9 rounded-button flex items-center justify-center text-fox-purple hover:bg-fox-gold/20 transition"
            aria-label="Назад"
          >
            <LuArrowLeft size={20} />
          </Link>
        )}
        {icon && (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-fox-gold text-fox-purple shadow-sm">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-lg md:text-xl font-bold truncate bg-gradient-to-r from-fox-purple to-fox-purple-light bg-clip-text text-transparent">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs truncate text-fox-gray">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        <Link
          to="/notifications"
          className="relative p-2 rounded-button hover:bg-fox-gold/20 transition text-fox-graphite"
          aria-label="Уведомления"
        >
          <LuBell size={20} />
          <span className="absolute top-1.5 right-1.5">
            <NotificationBadge />
          </span>
        </Link>

        <ThemeToggle variant="ghost" className="hidden sm:flex" />

        {user && (
          <div className="flex items-center gap-3 pl-2 md:pl-3 border-l border-fox-border/60">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-medium truncate max-w-[160px] text-fox-graphite">
                {user.name || user.email}
              </div>
              <div className="text-[10px] capitalize text-fox-gray">
                {user.role}
              </div>
            </div>
            <Link to="/settings">
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold border-2 transition hover:opacity-90 bg-fox-purple text-fox-gold border-fox-gold/40">
                {user.name?.[0] || user.email?.[0] || '?'}
              </div>
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
