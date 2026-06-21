import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-fox-light">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <main className="flex-1 min-w-0 flex flex-col">
        <div className="lg:hidden h-14 bg-fox-purple flex items-center px-4 sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-white/90 hover:text-white p-2 -ml-2 rounded-lg hover:bg-white/10 transition"
            aria-label="Открыть меню"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="ml-3 font-bold text-white">FOXINBURG</span>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
