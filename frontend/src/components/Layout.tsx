import { Outlet, Link } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="min-h-screen">
      <nav className="bg-white border-b border-fox-border sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-fox-purple font-bold text-xl">
            🦊 FOXINBURG
          </Link>
          <div className="flex gap-4">
            <Link to="/login" className="px-4 py-2 text-fox-purple border border-fox-purple rounded-lg hover:bg-fox-purple hover:text-fox-gold transition">
              Войти
            </Link>
            <Link to="/login" className="px-4 py-2 bg-fox-purple text-fox-gold rounded-lg hover:bg-opacity-90 transition">
              Регистрация
            </Link>
          </div>
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
