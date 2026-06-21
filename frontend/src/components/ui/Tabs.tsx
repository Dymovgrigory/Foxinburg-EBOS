export interface Tab {
  id: string
  label: string
  icon?: string
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (id: string) => void
}

export default function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex gap-1 overflow-x-auto" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={[
                'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition',
                'focus:outline-none',
                isActive
                  ? 'text-fox-purple border-b-2 border-fox-purple'
                  : 'text-gray-500 hover:text-fox-purple hover:bg-fox-light',
              ].join(' ')}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.icon && <span>{tab.icon}</span>}
              {tab.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
