import type React from 'react'
import { LuConstruction } from 'react-icons/lu'
import Header from './Header'

interface PlaceholderPageProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
}

export default function PlaceholderPage({ title, subtitle, icon }: PlaceholderPageProps) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--fox-light)' }}>
      <Header title={title} subtitle={subtitle} icon={icon} />
      <div className="p-6 max-w-4xl mx-auto">
        <div
          className="rounded-card shadow-fox border p-12 text-center"
          style={{ backgroundColor: 'var(--fox-white)', borderColor: 'var(--fox-border)' }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: 'var(--fox-gold)', color: 'var(--fox-purple)' }}
          >
            <LuConstruction size={40} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--fox-purple)' }}>
            {title}
          </h2>
          <p style={{ color: 'var(--fox-gray)' }}>Этот модуль находится в разработке.</p>
        </div>
      </div>
    </div>
  )
}
