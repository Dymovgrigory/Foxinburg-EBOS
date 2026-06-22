import type React from 'react'

export function Table({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto rounded-card border border-fox-border/50">
      <table className={['min-w-full text-sm text-left', className].join(' ')}>{children}</table>
    </div>
  )
}

export function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-fox-light/50 text-xs uppercase text-fox-gray font-semibold">
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
        'px-4 py-3',
        sortable ? 'cursor-pointer hover:text-fox-purple select-none' : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortable && (
          <span className="text-fox-gray/70">
            {sorted === 'asc' ? '▲' : sorted === 'desc' ? '▼' : '⇅'}
          </span>
        )}
      </div>
    </th>
  )
}

export function Tbody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-fox-border bg-white">{children}</tbody>
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
        'hover:bg-fox-purple/[0.02] transition',
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
  return <td className={['px-4 py-3 text-fox-graphite', className].join(' ')}>{children}</td>
}
