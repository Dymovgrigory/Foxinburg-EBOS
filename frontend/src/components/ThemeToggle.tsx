import { FiSun, FiMoon, FiMonitor } from 'react-icons/fi'
import { useTheme } from '../contexts/ThemeContext'

interface ThemeToggleProps {
  variant?: 'button' | 'ghost'
  showLabel?: boolean
  className?: string
}

export default function ThemeToggle({
  variant = 'button',
  showLabel = false,
  className = '',
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme()

  if (variant === 'ghost') {
    return (
      <button
        onClick={toggleTheme}
        className={`p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition ${className}`}
        aria-label={resolvedTheme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
        title={resolvedTheme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
      >
        {resolvedTheme === 'dark' ? <FiSun size={20} /> : <FiMoon size={20} />}
      </button>
    )
  }

  return (
    <div className={`inline-flex items-center gap-1 p-1 rounded-button bg-fox-light border border-fox-border ${className}`}>
      {(['light', 'system', 'dark'] as const).map((value) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={[
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition',
            theme === value
              ? 'bg-white text-fox-purple shadow-sm'
              : 'text-fox-gray hover:text-fox-graphite',
          ].join(' ')}
          aria-label={value === 'light' ? 'Светлая' : value === 'dark' ? 'Тёмная' : 'Системная'}
          title={value === 'light' ? 'Светлая' : value === 'dark' ? 'Тёмная' : 'Системная'}
        >
          {value === 'light' && <FiSun size={16} />}
          {value === 'dark' && <FiMoon size={16} />}
          {value === 'system' && <FiMonitor size={16} />}
          {showLabel && (
            <span className="hidden sm:inline">
              {value === 'light' ? 'Светлая' : value === 'dark' ? 'Тёмная' : 'Система'}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
