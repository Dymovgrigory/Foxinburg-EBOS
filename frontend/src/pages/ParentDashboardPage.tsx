import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header'
import { useToast, Card, Badge, Loader, EmptyState, PageShell } from '../components/ui'
import { parentApi, type ChildBrief, type ChildDashboard } from '../api'
import { getErrorMessage } from '../utils/error'
import {
  LuUsers, LuStar, LuCoins, LuFlame, LuCrown, LuTrophy, LuCalendarCheck, LuWallet, LuArrowRight,
} from 'react-icons/lu'

const money = (kopecks: number) => new Intl.NumberFormat('ru-RU').format(Math.round((kopecks || 0) / 100)) + ' ₽'

function ChildCard({ child, onOpen }: { child: ChildBrief; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="text-left rounded-card border border-fox-border bg-white p-5 hover:shadow-fox-lg hover:-translate-y-0.5 transition flex items-center gap-4"
    >
      <div className="w-12 h-12 rounded-full bg-fox-purple text-fox-gold flex items-center justify-center font-bold text-lg shrink-0">
        {child.name?.[0] || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-fox-purple truncate">{child.name}</h3>
        <p className="text-xs text-fox-gray">Уровень {child.level} · {child.xp} XP · серия {child.streak_days} дн.</p>
      </div>
      <LuArrowRight className="text-fox-purple shrink-0" />
    </button>
  )
}

export default function ParentDashboardPage() {
  const { childId } = useParams<{ childId: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState<ChildBrief[]>([])
  const [dashboard, setDashboard] = useState<ChildDashboard | null>(null)

  const loadChildren = useCallback(async () => {
    setLoading(true)
    try {
      const list = await parentApi.children()
      setChildren(list)
      // Если ребёнок один и не выбран — открываем его автоматически.
      if (!childId && list.length === 1) {
        navigate(`/parent/children/${list[0].id}`, { replace: true })
      }
    } catch (err) {
      showToast(getErrorMessage(err, 'Не удалось загрузить список детей'), 'error')
    } finally {
      setLoading(false)
    }
  }, [childId, navigate, showToast])

  const loadDashboard = useCallback(async (id: number) => {
    setLoading(true)
    try {
      setDashboard(await parentApi.childDashboard(id))
    } catch (err) {
      showToast(getErrorMessage(err, 'Не удалось загрузить дашборд ребёнка'), 'error')
      navigate('/parent', { replace: true })
    } finally {
      setLoading(false)
    }
  }, [navigate, showToast])

  useEffect(() => {
    if (childId) {
      loadDashboard(Number(childId))
    } else {
      setDashboard(null)
      loadChildren()
    }
  }, [childId, loadChildren, loadDashboard])

  // Список детей (нет выбранного ребёнка)
  if (!childId) {
    return (
      <PageShell>
        <Header title="Кабинет родителя" subtitle="Прогресс вашего ребёнка" icon={<LuUsers />} />
        <div className="flex-1 p-4 md:p-6 max-w-3xl w-full mx-auto">
          {loading ? (
            <div className="flex items-center justify-center min-h-[40vh]"><Loader text="Загрузка..." /></div>
          ) : children.length === 0 ? (
            <EmptyState
              icon={<LuUsers />}
              title="Пока нет привязанных детей"
              description="Обратитесь к администратору школы, чтобы связать ваш аккаунт с учеником."
            />
          ) : (
            <div className="space-y-3">
              {children.map((c) => (
                <ChildCard key={c.id} child={c} onOpen={() => navigate(`/parent/children/${c.id}`)} />
              ))}
            </div>
          )}
        </div>
      </PageShell>
    )
  }

  if (loading || !dashboard) {
    return (
      <PageShell>
        <Header title="Кабинет родителя" icon={<LuUsers />} backTo="/parent" />
        <div className="flex-1 flex items-center justify-center min-h-[40vh]"><Loader text="Загрузка дашборда..." /></div>
      </PageShell>
    )
  }

  const { child, worlds, achievements, attendance, finance } = dashboard

  return (
    <PageShell>
      <Header title={child.name} subtitle="Прогресс в Foxinburg World" icon={<LuUsers />} backTo="/parent" />
      <div className="flex-1 p-4 md:p-6 space-y-6 max-w-5xl w-full mx-auto">
        {/* Gamification */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-fox-purple/10 text-fox-purple flex items-center justify-center"><LuCrown size={20} /></span>
            <div><div className="text-xs text-fox-gray">Уровень</div><div className="text-xl font-bold text-fox-purple">{child.level}</div></div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><LuStar size={20} /></span>
            <div><div className="text-xs text-fox-gray">XP</div><div className="text-xl font-bold text-fox-purple">{child.xp}</div></div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-yellow-100 text-yellow-600 flex items-center justify-center"><LuCoins size={20} /></span>
            <div><div className="text-xs text-fox-gray">Монеты</div><div className="text-xl font-bold text-fox-purple">{child.coins}</div></div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center"><LuFlame size={20} /></span>
            <div><div className="text-xs text-fox-gray">Серия дней</div><div className="text-xl font-bold text-fox-purple">{child.streak_days}</div></div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Worlds progress */}
          <Card className="p-5">
            <h3 className="font-bold text-fox-purple mb-4 flex items-center gap-2"><LuTrophy size={18} /> Прогресс по мирам</h3>
            {worlds.length === 0 ? (
              <p className="text-sm text-fox-gray">Ребёнок ещё не начал ни одного мира.</p>
            ) : (
              <div className="space-y-3">
                {worlds.map((w) => (
                  <div key={w.course_id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-fox-graphite">{w.title}</span>
                      <span className="text-fox-gray">{w.progress_percent}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-fox-light overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-fox-purple to-fox-gold" style={{ width: `${w.progress_percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Achievements */}
          <Card className="p-5">
            <h3 className="font-bold text-fox-purple mb-4 flex items-center gap-2"><LuStar size={18} /> Достижения</h3>
            {achievements.length === 0 ? (
              <p className="text-sm text-fox-gray">Пока нет достижений.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {achievements.map((a) => (
                  <Badge key={a.id} variant="purple" title={a.description || undefined}>🏅 {a.title}</Badge>
                ))}
              </div>
            )}
          </Card>

          {/* Attendance */}
          <Card className="p-5">
            <h3 className="font-bold text-fox-purple mb-4 flex items-center gap-2"><LuCalendarCheck size={18} /> Посещаемость</h3>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-3xl font-bold text-fox-purple">{attendance.rate_percent}%</span>
              <span className="text-sm text-fox-gray mb-1">посещений</span>
            </div>
            <p className="text-sm text-fox-gray">{attendance.present} из {attendance.total} занятий</p>
          </Card>

          {/* Finance */}
          <Card className="p-5">
            <h3 className="font-bold text-fox-purple mb-4 flex items-center gap-2"><LuWallet size={18} /> Финансы</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl bg-fox-light p-3">
                <div className="text-xs text-fox-gray">Баланс</div>
                <div className="text-lg font-bold text-fox-purple">{money(finance.balance)}</div>
              </div>
              <div className="rounded-xl bg-fox-light p-3">
                <div className="text-xs text-fox-gray">Задолженность</div>
                <div className={`text-lg font-bold ${finance.debt > 0 ? 'text-fox-error' : 'text-fox-purple'}`}>{money(finance.debt)}</div>
              </div>
            </div>
            {finance.recent_payments.length > 0 ? (
              <ul className="space-y-2">
                {finance.recent_payments.slice(0, 5).map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-fox-graphite truncate pr-2">{p.description || p.type}</span>
                    <span className="font-semibold text-fox-purple shrink-0">{money(p.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-fox-gray">Платежей пока нет.</p>
            )}
          </Card>
        </div>
      </div>
    </PageShell>
  )
}
