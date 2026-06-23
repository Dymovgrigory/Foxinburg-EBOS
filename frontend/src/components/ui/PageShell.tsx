import type React from 'react'

interface PageShellProps {
  children: React.ReactNode
  className?: string
}

export default function PageShell({ children, className = '' }: PageShellProps) {
  return (
    <div
      className={['min-h-screen flex flex-col', className].join(' ')}
      style={{
        backgroundColor: 'var(--fox-light)',
        backgroundImage: 'var(--fox-page-gradient)',
      }}
    >
      {children}
    </div>
  )
}
