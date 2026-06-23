import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import ThemeToggle from './ThemeToggle'
import BrandLogo from './BrandLogo'

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-fox-light">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <main className="flex-1 min-w-0 flex flex-col">
        <div
          className="lg:hidden h-16 flex items-center justify-between px-4 sticky top-0 z-30 bg-fox-white border-b border-fox-border"
        >
          <div className="flex items-center">
            <button
              onClick={() => setMobileOpen(true)}
              className="text-fox-purple hover:text-fox-purple-light p-2 -ml-2 rounded-lg hover:bg-fox-light transition"
              aria-label="Открыть меню"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="ml-3">
              <BrandLogo collapsed />
            </div>
          </div>
          <ThemeToggle variant="ghost" />
        </div>
        <Outlet />
      </main>
    </div>
  )
}
