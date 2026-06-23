import type React from 'react'
import { LuArrowUp, LuArrowDown, LuArrowUpDown } from 'react-icons/lu'

export function Table({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={['min-w-full text-sm text-left border-separate border-spacing-y-2', className].join(' ')}>
        {children}
      </table>
    </div>
  )
}

export function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="text-xs uppercase text-fox-gray font-semibold">
      {children}
    </thead>
  )
}

export function Th({
  children,
  sortable = false,
  sorted,
  onClick,
}: {
  children?: React.ReactNode
  sortable?: boolean
  sorted?: 'asc' | 'desc' | null
  onClick?: () => void
}) {
  return (
    <th
      onClick={onClick}
      className={[
        'px-4 py-2.5',
        sortable ? 'cursor-pointer hover:text-fox-purple select-none' : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-1.5">
        {children}
        {sortable && (
          <span className="text-fox-gray/70">
            {sorted === 'asc' ? <LuArrowUp size={12} /> : sorted === 'desc' ? <LuArrowDown size={12} /> : <LuArrowUpDown size={12} />}
          </span>
        )}
      </div>
    </th>
  )
}

export function Tbody({ children }: { children: React.ReactNode }) {
  return <tbody className="text-fox-graphite">{children}</tbody>
}

export function Tr({
  children,
  onClick,
  className = '',
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <tr
      onClick={onClick}
      className={[
        'bg-white rounded-card shadow-sm border border-fox-border/50',
        'hover:bg-fox-gold/[0.04] hover:shadow-fox transition',
        onClick ? 'cursor-pointer' : '',
        className,
      ].join(' ')}
    >
      {children}
    </tr>
  )
}

export function Td({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return <td className={['px-4 py-3 first:rounded-l-card last:rounded-r-card', className].join(' ')}>{children}</td>
}
