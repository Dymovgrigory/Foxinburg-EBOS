import { useAuth } from '../contexts/AuthContext'

interface HeaderProps {
  title: string
  subtitle?: string
  icon?: string
}

export default function Header({ title, subtitle, icon }: HeaderProps) {
  const { user } = useAuth()

  return (
    <header className="h-16 bg-white/80 backdrop-blur border-b border-fox-border/50 flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-fox-purple/10 text-fox-purple flex items-center justify-center text-xl flex-shrink-0">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-lg md:text-xl font-bold text-fox-dark truncate">{title}</h1>
          {subtitle && <p className="text-xs text-gray-400 truncate">{subtitle}</p>}
        </div>
      </div>

      {user && (
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden sm:block text-right">
            <div className="text-sm font-medium text-fox-dark truncate max-w-[160px]">{user.name || user.email}</div>
            <div className="text-[10px] text-gray-400 capitalize">{user.role}</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-fox-purple text-fox-gold flex items-center justify-center font-bold border-2 border-fox-gold/30">
            {user.name?.[0] || user.email?.[0] || '?'}
          </div>
        </div>
      )}
    </header>
  )
}
