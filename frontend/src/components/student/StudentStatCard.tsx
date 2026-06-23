import type React from 'react'

interface StudentStatCardProps {
  icon: React.ReactNode
  value: number | string
  label: string
  color?: 'purple' | 'gold' | 'green' | 'graphite' | 'outline'
  onClick?: () => void
}

const colorMap = {
  purple: 'bg-fox-purple text-white',
  gold: 'bg-fox-gold text-fox-purple',
  green: 'bg-fox-graphite text-white',
  graphite: 'bg-fox-graphite text-white',
  outline: 'bg-fox-light text-fox-purple border border-fox-border',
}

export default function StudentStatCard({
  icon,
  value,
  label,
  color = 'purple',
  onClick,
}: StudentStatCardProps) {
  const bgClass = colorMap[color]
  const clickable = Boolean(onClick)

  return (
    <div
      onClick={onClick}
      className={[
        'fox-card flex items-center gap-4 transition duration-200',
        clickable ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-fox-md' : '',
      ].join(' ')}
    >
      <div
        className={[
          'w-14 h-14 rounded-xl flex items-center justify-center text-xl shadow-lg',
          bgClass,
        ].join(' ')}
      >
        {icon}
      </div>
      <div>
        <div className="text-3xl font-black text-fox-dark">{value}</div>
        <div className="text-xs font-medium text-fox-gray uppercase tracking-wide">{label}</div>
      </div>
    </div>
  )
}
