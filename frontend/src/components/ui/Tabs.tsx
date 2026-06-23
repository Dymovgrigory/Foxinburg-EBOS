import type React from 'react'

export interface Tab {
  id: string
  label: string
  icon?: React.ReactNode
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (id: string) => void
}

export default function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <nav className="flex gap-2 overflow-x-auto p-1" aria-label="Tabs">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={[
              'flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition rounded-full',
              'focus:outline-none focus:ring-2 focus:ring-fox-gold/50',
              isActive
                ? 'bg-fox-gold text-fox-purple shadow-sm'
                : 'text-fox-gray hover:text-fox-purple hover:bg-fox-light',
            ].join(' ')}
            aria-current={isActive ? 'page' : undefined}
          >
            {tab.icon && <span className="text-base">{tab.icon}</span>}
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
