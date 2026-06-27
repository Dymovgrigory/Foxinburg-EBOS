import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header'
import { useToast, Card, Badge, Loader, Button, PageShell } from '../components/ui'
import { worldApi, type WorldDetail } from '../api'
import { getErrorMessage } from '../utils/error'
import {
  LuMap, LuPlay, LuFileText, LuClipboardCheck, LuNotebookPen, LuCircleCheck, LuLock, LuArrowRight,
} from 'react-icons/lu'

const LESSON_ICON: Record<string, React.ReactNode> = {
  video: <LuPlay size={16} />,
  text: <LuFileText size={16} />,
  test: <LuClipboardCheck size={16} />,
  homework: <LuNotebookPen size={16} />,
}

export default function WorldDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<WorldDetail | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      setDetail(await worldApi.detail(Number(id)))
    } catch (err) {
      showToast(getErrorMessage(err, 'Мир недоступен'), 'error')
      navigate('/world')
    } finally {
      setLoading(false)
    }
  }, [id, navigate, showToast])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <PageShell>
        <Header title="Мир" icon={<LuMap />} backTo="/world" />
        <div className="flex-1 flex items-center justify-center min-h-[40vh]">
          <Loader text="Загрузка мира..." />
        </div>
      </PageShell>
    )
  }

  if (!detail) return null

  const totalLessons = detail.modules.reduce((s, m) => s + m.lessons.length, 0)
  const completed = detail.modules.reduce(
    (s, m) => s + m.lessons.filter((l) => l.status === 'completed').length, 0,
  )

  return (
    <PageShell>
      <Header
        title={detail.title}
        subtitle={detail.cefr_level ? `Уровень ${detail.cefr_level}` : undefined}
        icon={<span className="text-xl">{detail.world_theme || '🗺️'}</span>}
        backTo="/world"
      />
      <div className="flex-1 p-4 md:p-6 space-y-6 max-w-4xl w-full mx-auto">
        <Card className="p-6">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <h2 className="text-lg font-bold text-fox-purple">{detail.title}</h2>
              {detail.description && <p className="text-sm text-fox-gray mt-1">{detail.description}</p>}
            </div>
            <Button onClick={() => navigate(`/courses/${detail.id}/learn`)} className="shrink-0">
              {completed > 0 ? 'Продолжить' : 'Начать'} <LuArrowRight size={16} />
            </Button>
          </div>
          <div className="h-2 rounded-full bg-fox-light overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-fox-purple to-fox-gold"
              style={{ width: `${totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0}%` }}
            />
          </div>
          <p className="text-xs text-fox-gray">{completed}/{totalLessons} уроков пройдено</p>
        </Card>

        {detail.modules.map((module) => (
          <Card key={module.id} className="p-5">
            <h3 className="font-bold text-fox-purple mb-3">{module.title}</h3>
            <div className="space-y-2">
              {module.lessons.map((lesson) => {
                const done = lesson.status === 'completed'
                const locked = lesson.status === 'locked'
                return (
                  <button
                    key={lesson.id}
                    onClick={() => navigate(`/courses/${detail.id}/learn`)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-fox-border hover:bg-fox-light/60 transition text-left"
                  >
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      done ? 'bg-emerald-100 text-emerald-600' : 'bg-fox-purple/10 text-fox-purple'
                    }`}>
                      {done ? <LuCircleCheck size={16} /> : LESSON_ICON[lesson.lesson_type] || <LuFileText size={16} />}
                    </span>
                    <span className="flex-1 text-sm font-medium text-fox-graphite">{lesson.title}</span>
                    {done && <Badge variant="success">Пройдено</Badge>}
                    {locked && <span className="text-fox-gray"><LuLock size={14} /></span>}
                  </button>
                )
              })}
              {module.lessons.length === 0 && (
                <p className="text-sm text-fox-gray">Уроки скоро появятся.</p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  )
}
