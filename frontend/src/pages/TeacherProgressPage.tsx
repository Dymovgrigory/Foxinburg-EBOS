import { useEffect, useState } from 'react'
import Header from '../components/Header'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast, Card, Loader, EmptyState, Badge } from '../components/ui'
import { LuAward, LuChartLine, LuGraduationCap } from 'react-icons/lu'

function ProgressBar({ value, label, color = 'bg-fox-purple' }: { value: number; label?: string; color?: string }) {
  const percent = Math.min(100, Math.max(0, value))
  return (
    <div className="w-full">
      {label && <div className="flex justify-between text-xs mb-1"><span className="text-fox-gray">{label}</span><span className="font-medium text-fox-dark">{percent}%</span></div>}
      <div className="h-2 w-full bg-fox-light rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

interface AcademyModule {
  id: number
  title: string
  order_index: number
  status: string
  lesson_id?: number
}

interface AcademyProgress {
  enrollment_id: number
  status: string
  progress_percent: number
  modules: AcademyModule[]
  enrolled_at?: string
  completed_at?: string
}

interface Achievement {
  id: number
  title: string
  description?: string
  xp_reward?: number
  coins_reward?: number
  awarded_at?: string
}

const moduleStatusMeta: Record<string, { label: string; variant: Parameters<typeof Badge>[0]['variant'] }> = {
  completed: { label: 'Завершён', variant: 'success' },
  in_progress: { label: 'В процессе', variant: 'info' },
  locked: { label: 'Заблокирован', variant: 'default' },
  available: { label: 'Доступен', variant: 'warning' },
}

export default function TeacherProgressPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [academy, setAcademy] = useState<AcademyProgress | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [academyRes, achievementsRes] = await Promise.all([
        api.get('/teacher-academy/progress'),
        api.get('/achievements/my'),
      ])
      setAcademy(academyRes.data.data)
      setAchievements(achievementsRes.data.data || [])
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка загрузки прогресса', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-fox-light">
        <Header title="Мой прогресс" subtitle="Академия и достижения" icon={<LuChartLine />} />
        <div className="p-6 max-w-7xl mx-auto">
          <Loader text="Загрузка прогресса..." />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-fox-light">
      <Header title="Мой прогресс" subtitle={`${user?.name || 'Педагог'}, ваш прогресс обучения`} icon={<LuChartLine />} />
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-fox-dark">Академия педагогов</h2>
            <Badge variant={academy?.status === 'completed' ? 'success' : 'info'}>
              {academy?.status === 'completed' ? 'Завершено' : 'В процессе'}
            </Badge>
          </div>
          {academy ? (
            <>
              <ProgressBar value={academy.progress_percent} label="Общий прогресс" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {academy.modules.map((m) => {
                  const meta = moduleStatusMeta[m.status] || { label: m.status, variant: 'default' as const }
                  return (
                    <div key={m.id} className="p-4 bg-fox-light rounded-xl border border-fox-border/30">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-fox-dark">{m.title}</span>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <EmptyState icon={<LuGraduationCap />} title="Академия не начата" description="Начните обучение в разделе «Академия педагогов»." />
          )}
        </Card>

        <Card className="space-y-4">
          <h2 className="text-xl font-bold text-fox-dark">Достижения</h2>
          {achievements.length === 0 ? (
            <EmptyState icon={<LuAward />} title="Нет достижений" description="Продолжайте обучение, чтобы получить первые достижения." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((a) => (
                <div key={a.id} className="p-4 bg-fox-light rounded-xl border border-fox-border/30">
                  <p className="font-medium text-fox-dark">{a.title}</p>
                  {a.description && <p className="text-sm text-fox-gray mt-1">{a.description}</p>}
                  <div className="flex gap-3 text-xs text-fox-gray mt-2">
                    {a.xp_reward ? <span>+{a.xp_reward} XP</span> : null}
                    {a.coins_reward ? <span>+{a.coins_reward} 🪙</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
