import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { LuArrowLeft, LuBookOpen, LuLayers, LuCheck, LuAward, LuGraduationCap } from 'react-icons/lu'
import { catalogApi, storeApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import AuthModal from '../components/AuthModal'
import { Button, useToast } from '../components/ui'
import Loader from '../components/ui/Loader'
import { getErrorMessage } from '../utils/error'
import type { CatalogItem } from '../types'
import { formatPrice } from './CatalogPage'

export default function CatalogCoursePage() {
  const { productId } = useParams<{ productId: string }>()
  const [searchParams] = useSearchParams()
  const { user, isLoading: authLoading } = useAuth()
  const { showToast } = useToast()

  const [item, setItem] = useState<CatalogItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [buying, setBuying] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const autoBuyHandled = useRef(false)

  const id = Number(productId)

  useEffect(() => {
    if (!id) {
      setError('Курс не найден')
      setLoading(false)
      return
    }
    catalogApi
      .get(id)
      .then(setItem)
      .catch((err) => setError(getErrorMessage(err, 'Курс не найден')))
      .finally(() => setLoading(false))
  }, [id])

  const handleBuy = useCallback(async () => {
    if (!id) return
    if (!user) {
      setAuthOpen(true)
      return
    }
    setBuying(true)
    try {
      const order = await storeApi.buy(id)
      if (order.payment_url) {
        window.location.href = order.payment_url
        return
      }
      showToast('Заказ создан. Оплата будет доступна в личном кабинете.', 'success')
    } catch (err) {
      showToast(getErrorMessage(err, 'Не удалось оформить покупку'), 'error')
    } finally {
      setBuying(false)
    }
  }, [id, user, showToast])

  // Автозапуск покупки после возврата с авторизации (?buy=1).
  useEffect(() => {
    if (authLoading || autoBuyHandled.current) return
    if (searchParams.get('buy') === '1' && user) {
      autoBuyHandled.current = true
      void handleBuy()
    }
  }, [authLoading, user, searchParams, handleBuy])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--fox-light)' }}><Loader text="Загрузка курса..." /></div>
  }
  if (error || !item) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: 'var(--fox-light)' }}>
        <p className="text-fox-error">{error || 'Курс не найден'}</p>
        <Link to="/catalog"><Button variant="secondary">К каталогу</Button></Link>
      </div>
    )
  }

  const course = item.course

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--fox-light)' }}>
      <header className="sticky top-0 z-40 border-b backdrop-blur" style={{ backgroundColor: 'rgba(255,255,255,0.85)', borderColor: 'var(--fox-border)' }}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-extrabold text-lg" style={{ color: 'var(--fox-purple)' }}>
            <LuGraduationCap size={24} /> FOXINBURG
          </Link>
          <Link to="/catalog" className="inline-flex items-center gap-1 text-sm font-medium text-fox-gray hover:text-fox-purple transition">
            <LuArrowLeft size={16} /> Все курсы
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-10 grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Основной контент */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold" style={{ color: 'var(--fox-purple)' }}>{item.title}</h1>
          {(course?.short_description || item.description) && (
            <p className="mt-3 text-lg text-fox-gray">{course?.short_description || item.description}</p>
          )}

          {course && (
            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-fox-gray">
              <span className="inline-flex items-center gap-1.5"><LuLayers size={16} /> {course.modules_count} модулей</span>
              <span className="inline-flex items-center gap-1.5"><LuBookOpen size={16} /> {course.lessons_count} уроков</span>
              {course.certificate_enabled && <span className="inline-flex items-center gap-1.5"><LuAward size={16} /> Сертификат</span>}
            </div>
          )}

          {course?.description && (
            <div className="mt-8">
              <h2 className="text-xl font-bold text-fox-graphite mb-2">О курсе</h2>
              <p className="text-fox-gray whitespace-pre-line">{course.description}</p>
            </div>
          )}

          {course?.program && course.program.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold text-fox-graphite mb-4">Программа курса</h2>
              <div className="space-y-3">
                {course.program.map((mod, idx) => (
                  <div key={idx} className="rounded-card border bg-white p-4" style={{ borderColor: 'var(--fox-border)' }}>
                    <div className="font-semibold text-fox-graphite">{idx + 1}. {mod.title}</div>
                    {mod.lessons.length > 0 && (
                      <ul className="mt-2 space-y-1.5">
                        {mod.lessons.map((lesson, li) => (
                          <li key={li} className="flex items-center gap-2 text-sm text-fox-gray">
                            <LuCheck size={14} className="text-fox-purple shrink-0" /> {lesson}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Карточка покупки */}
        <aside className="lg:sticky lg:top-24 h-fit">
          <div className="rounded-card border bg-white p-6 shadow-fox" style={{ borderColor: 'var(--fox-border)' }}>
            <div className="text-3xl font-extrabold" style={{ color: 'var(--fox-purple)' }}>{formatPrice(item.price)}</div>
            {item.product_type === 'subscription' && item.subscription_months && (
              <p className="mt-1 text-sm text-fox-gray">Подписка на {item.subscription_months} мес.</p>
            )}
            <Button className="w-full justify-center mt-5" size="lg" onClick={handleBuy} loading={buying} disabled={buying}>
              {user ? 'Купить курс' : 'Купить курс'}
            </Button>
            {!user && (
              <p className="mt-3 text-xs text-center text-fox-gray">
                Для оплаты нужен аккаунт — регистрация займёт минуту.
              </p>
            )}
            <ul className="mt-5 space-y-2 text-sm text-fox-gray">
              <li className="flex items-center gap-2"><LuCheck size={16} className="text-fox-purple" /> Доступ открывается сразу после оплаты</li>
              <li className="flex items-center gap-2"><LuCheck size={16} className="text-fox-purple" /> Онлайн-оплата картой через Т-Кассу</li>
              <li className="flex items-center gap-2"><LuCheck size={16} className="text-fox-purple" /> Проверка домашних заданий преподавателем</li>
            </ul>
          </div>
        </aside>
      </div>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        redirectTo={`/catalog/${id}?buy=1`}
        defaultRegister
      />
    </div>
  )
}
