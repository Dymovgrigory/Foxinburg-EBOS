import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { useToast, Card, Badge, Loader, Button, PageShell } from '../components/ui'
import { worldApi, type WorldMap } from '../api'
import { getErrorMessage } from '../utils/error'
import {
  LuMap, LuLock, LuStar, LuCoins, LuFlame, LuTrophy, LuArrowRight, LuCheck, LuCrown,
} from 'react-icons/lu'

function formatRub(kopecks: number) {
  return `${Math.round(kopecks / 100)} ₽`
}

function daysLeft(iso: string | null): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export default function WorldPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [map, setMap] = useState<WorldMap | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setMap(await worldApi.map())
    } catch (err) {
      showToast(getErrorMessage(err, 'Не удалось загрузить карту миров'), 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { load() }, [load])

  const startTrial = async () => {
    setActing(true)
    try {
      await worldApi.startTrial()
      showToast('Бесплатный доступ активирован на 7 дней!', 'success')
      await load()
    } catch (err) {
      showToast(getErrorMessage(err, 'Не удалось активировать триал'), 'error')
    } finally {
      setActing(false)
    }
  }

  const subscribe = async () => {
    setActing(true)
    try {
      const res = await worldApi.subscribe()
      if (res.payment_url) {
        window.location.href = res.payment_url
        return
      }
      showToast(
        res.payments_enabled
          ? 'Заказ создан. Перейдите к оплате.'
          : 'Заказ на подписку создан. Менеджер свяжется для оплаты.',
        'success',
      )
      await load()
    } catch (err) {
      showToast(getErrorMessage(err, 'Не удалось оформить подписку'), 'error')
    } finally {
      setActing(false)
    }
  }

  const cancel = async () => {
    setActing(true)
    try {
      await worldApi.cancel()
      showToast('Автопродление отключено. Доступ сохранится до конца периода.', 'success')
      await load()
    } catch (err) {
      showToast(getErrorMessage(err, 'Не удалось отменить подписку'), 'error')
    } finally {
      setActing(false)
    }
  }

  const openWorld = (worldId: number, unlocked: boolean) => {
    if (unlocked) {
      navigate(`/world/${worldId}`)
    } else {
      showToast('Этот мир откроется по подписке Foxinburg World', 'info')
    }
  }

  if (loading) {
    return (
      <PageShell>
        <Header title="Foxinburg World" icon={<LuMap />} />
        <div className="flex-1 flex items-center justify-center min-h-[40vh]">
          <Loader text="Загрузка карты миров..." />
        </div>
      </PageShell>
    )
  }

  if (!map) return null

  const access = map.access_level
  const sub = map.subscription
  const trialDays = sub?.trial_ends_at ? daysLeft(sub.trial_ends_at) : null
  const periodDays = sub?.current_period_end ? daysLeft(sub.current_period_end) : null

  return (
    <PageShell>
      <Header title="Foxinburg World" subtitle="Игровое путешествие от A1 до C2" icon={<LuMap />} />
      <div className="flex-1 p-4 md:p-6 space-y-6 max-w-6xl w-full mx-auto">
        {/* Gamification stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-fox-purple/10 text-fox-purple flex items-center justify-center"><LuCrown size={20} /></span>
            <div>
              <div className="text-xs text-fox-gray">Уровень</div>
              <div className="text-xl font-bold text-fox-purple">{map.user.level}</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><LuStar size={20} /></span>
            <div>
              <div className="text-xs text-fox-gray">XP</div>
              <div className="text-xl font-bold text-fox-purple">{map.user.xp}</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-yellow-100 text-yellow-600 flex items-center justify-center"><LuCoins size={20} /></span>
            <div>
              <div className="text-xs text-fox-gray">Монеты</div>
              <div className="text-xl font-bold text-fox-purple">{map.user.coins}</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center"><LuFlame size={20} /></span>
            <div>
              <div className="text-xs text-fox-gray">Серия дней</div>
              <div className="text-xl font-bold text-fox-purple">{map.user.streak_days}</div>
            </div>
          </Card>
        </div>

        {/* Subscription banner */}
        <Card className="p-6 bg-gradient-to-br from-fox-purple to-fox-purple-light text-white">
          {access === 'none' && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold mb-1">Откройте Foxinburg World</h2>
                <p className="text-white/80 text-sm max-w-xl">
                  Начните бесплатно на {map.trial_days} дней — доступен первый мир A1.
                  Полный доступ ко всем мирам — {formatRub(map.monthly_price)}/мес с автопродлением.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <Button onClick={startTrial} loading={acting} className="bg-fox-gold text-fox-purple hover:bg-[#FFF8C5]">
                  Попробовать бесплатно
                </Button>
                <Button onClick={subscribe} loading={acting} variant="secondary">
                  Подписка {formatRub(map.monthly_price)}/мес
                </Button>
              </div>
            </div>
          )}
          {access === 'trial' && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <Badge className="mb-2 bg-fox-gold text-fox-purple">Пробный период</Badge>
                <h2 className="text-xl font-bold mb-1">
                  {trialDays !== null ? `Осталось ${trialDays} дн. бесплатного доступа` : 'Пробный доступ активен'}
                </h2>
                <p className="text-white/80 text-sm max-w-xl">
                  Сейчас открыт первый мир A1. Оформите подписку, чтобы открыть все миры до C2.
                </p>
              </div>
              <Button onClick={subscribe} loading={acting} className="bg-fox-gold text-fox-purple hover:bg-[#FFF8C5] shrink-0">
                Открыть все миры — {formatRub(map.monthly_price)}/мес
              </Button>
            </div>
          )}
          {access === 'full' && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <Badge className="mb-2 bg-fox-gold text-fox-purple">
                  {sub?.status === 'active' ? 'Подписка активна' : sub?.status === 'past_due' ? 'Требуется оплата' : 'Полный доступ'}
                </Badge>
                <h2 className="text-xl font-bold mb-1">Все миры открыты</h2>
                <p className="text-white/80 text-sm">
                  {sub?.auto_renew && periodDays !== null
                    ? `Автопродление включено · следующее списание через ${periodDays} дн.`
                    : sub?.cancelled_at
                      ? `Автопродление отключено · доступ до конца периода${periodDays !== null ? ` (${periodDays} дн.)` : ''}`
                      : 'Полный доступ ко всем мирам A1–C2'}
                </p>
              </div>
              {sub?.auto_renew && (
                <Button onClick={cancel} loading={acting} variant="secondary" className="shrink-0">
                  Отключить автопродление
                </Button>
              )}
            </div>
          )}
        </Card>

        {/* World map */}
        <div>
          <h2 className="text-lg font-bold text-fox-purple mb-4 flex items-center gap-2">
            <LuTrophy size={20} /> Карта миров
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {map.worlds.map((w) => {
              const pct = w.total_lessons > 0
                ? Math.round((w.completed_lessons / w.total_lessons) * 100)
                : w.progress_percent
              return (
                <button
                  key={w.id}
                  onClick={() => openWorld(w.id, w.unlocked)}
                  className={`text-left rounded-card border p-5 transition relative overflow-hidden ${
                    w.unlocked
                      ? 'bg-white border-fox-border hover:shadow-fox-lg hover:-translate-y-0.5'
                      : 'bg-fox-light/60 border-fox-border/60 cursor-pointer'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-4xl">{w.world_theme || '🗺️'}</span>
                    <div className="flex items-center gap-2">
                      <Badge>{w.cefr_level}</Badge>
                      {!w.unlocked && (
                        <span className="text-fox-gray"><LuLock size={18} /></span>
                      )}
                    </div>
                  </div>
                  <h3 className={`font-bold mb-1 ${w.unlocked ? 'text-fox-purple' : 'text-fox-gray'}`}>
                    {w.title}
                  </h3>
                  {w.short_description && (
                    <p className="text-xs text-fox-gray line-clamp-2 mb-3">{w.short_description}</p>
                  )}
                  {w.is_demo && access !== 'full' && (
                    <Badge className="mb-3 bg-emerald-100 text-emerald-700">Демо-мир</Badge>
                  )}
                  {w.unlocked ? (
                    <>
                      <div className="h-2 rounded-full bg-fox-light overflow-hidden mb-2">
                        <div className="h-full bg-gradient-to-r from-fox-purple to-fox-gold" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-fox-gray">
                          {w.completed_lessons}/{w.total_lessons} уроков
                          {pct === 100 && <LuCheck className="inline ml-1 text-emerald-600" />}
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold text-fox-purple">
                          {pct === 100 ? 'Пройдено' : w.enrolled ? 'Продолжить' : 'Начать'}
                          <LuArrowRight size={14} />
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-fox-gray inline-flex items-center gap-1">
                      <LuLock size={12} /> Доступно по подписке
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </PageShell>
  )
}
