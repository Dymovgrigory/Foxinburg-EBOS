import { useAuth } from '../contexts/AuthContext'

interface HeaderProps {
  title: string
  subtitle?: string
  icon?: string
}

export default function Header({ title, subtitle, icon }: HeaderProps) {
  const { user } = useAuth()

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-[#E85D4C]/10 text-[#E85D4C] flex items-center justify-center text-xl">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="flex items-center gap-2 px-4 py-2 bg-[#E85D4C] hover:bg-[#D14F40] text-white text-sm font-medium rounded-lg transition">
          <span>↻</span>
          <span>Обновить</span>
        </button>
        {user && (
          <div className="w-9 h-9 rounded-full bg-[#E85D4C] text-white flex items-center justify-center font-semibold">
            {user.name?.[0] || '?'}
          </div>
        )}
      </div>
    </header>
  )
}
