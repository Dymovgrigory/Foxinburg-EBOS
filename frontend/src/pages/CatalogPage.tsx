import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LuBookOpen, LuLayers, LuArrowRight, LuGraduationCap } from 'react-icons/lu'
import { catalogApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import AuthModal from '../components/AuthModal'
import { Button } from '../components/ui'
import Loader from '../components/ui/Loader'
import { getErrorMessage } from '../utils/error'
import type { CatalogItem } from '../types'

export const formatPrice = (kopecks: number) =>
  new Intl.NumberFormat('ru-RU').format(Math.round(kopecks / 100)) + ' ₽'

function PublicHeader({ onLogin }: { onLogin: () => void }) {
  const { user } = useAuth()
  return (
    <header className="sticky top-0 z-40 border-b backdrop-blur" style={{ backgroundColor: 'rgba(255,255,255,0.85)', borderColor: 'var(--fox-border)' }}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-extrabold text-lg" style={{ color: 'var(--fox-purple)' }}>
          <LuGraduationCap size={24} /> FOXINBURG
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link to="/" className="text-sm font-medium text-fox-gray hover:text-fox-purple transition">Главная</Link>
          <Link to="/catalog" className="text-sm font-semibold text-fox-purple">Каталог</Link>
          {user ? (
            <Link to="/student-dashboard">
              <Button variant="secondary" size="sm">Личный кабинет</Button>
            </Link>
          ) : (
            <Button variant="secondary" size="sm" onClick={onLogin}>Войти</Button>
          )}
        </nav>
      </div>
    </header>
  )
}

export default function CatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(() => {
    catalogApi
      .list()
      .then(setItems)
      .catch((err) => setError(getErrorMessage(err, 'Не удалось загрузить каталог')))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--fox-light)' }}>
      <PublicHeader onLogin={() => setAuthOpen(true)} />

      <section className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold" style={{ color: 'var(--fox-purple)' }}>
            Каталог курсов
          </h1>
          <p className="mt-2 text-fox-gray max-w-2xl">
            Выберите курс, оплатите онлайн и сразу получите доступ к занятиям — без звонков и заявок.
          </p>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center"><Loader text="Загрузка каталога..." /></div>
        ) : error ? (
          <div className="py-20 text-center text-fox-error">{error}</div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-fox-gray">
            Курсы скоро появятся. Загляните позже!
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <Link
                key={item.product_id}
                to={`/catalog/${item.product_id}`}
                className="group rounded-card border bg-white overflow-hidden shadow-fox hover:shadow-fox-lg transition flex flex-col"
                style={{ borderColor: 'var(--fox-border)' }}
              >
                <div
                  className="h-36 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, var(--fox-purple), var(--fox-violet, #7c3aed))' }}
                >
                  {item.image_url || item.course?.cover_url ? (
                    <img src={item.image_url || item.course?.cover_url || ''} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <LuBookOpen size={48} className="text-white/80" />
                  )}
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-bold text-fox-graphite group-hover:text-fox-purple transition line-clamp-2">{item.title}</h3>
                  {(item.course?.short_description || item.description) && (
                    <p className="mt-1.5 text-sm text-fox-gray line-clamp-2">
                      {item.course?.short_description || item.description}
                    </p>
                  )}
                  {item.course && (
                    <div className="mt-3 flex items-center gap-4 text-xs text-fox-gray">
                      <span className="inline-flex items-center gap-1"><LuLayers size={14} /> {item.course.modules_count} модулей</span>
                      <span className="inline-flex items-center gap-1"><LuBookOpen size={14} /> {item.course.lessons_count} уроков</span>
                    </div>
                  )}
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <span className="text-xl font-extrabold" style={{ color: 'var(--fox-purple)' }}>{formatPrice(item.price)}</span>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-fox-purple">
                      Подробнее <LuArrowRight size={16} className="group-hover:translate-x-0.5 transition" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} redirectTo="/catalog" />
    </div>
  )
}
