import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import ThemeToggle from './ThemeToggle'

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div
      className="min-h-screen flex overflow-x-hidden"
      style={{ backgroundColor: 'var(--fox-light)', backgroundImage: 'var(--fox-page-gradient)' }}
    >
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <main className="flex-1 min-w-0 flex flex-col">
        <div className="lg:hidden h-16 flex items-center justify-between px-4 sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-fox-border/60">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="text-fox-purple hover:text-fox-purple-light p-2 -ml-2 rounded-lg hover:bg-fox-gold/20 transition"
              aria-label="Открыть меню"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <img src="/brand/fox-head.png" alt="FOXINBURG" className="w-8 h-8 object-contain" />
            <span className="font-display font-bold text-fox-purple text-sm">FOXINBURG</span>
          </div>
          <ThemeToggle variant="ghost" />
        </div>
        <Outlet />
      </main>
    </div>
  )
}
