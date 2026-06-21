import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import Header from '../components/Header'
import { coursesApi, lessonsApi, progressApi, testsApi, homeworksApi } from '../api'
import { useToast, Button, Card, Badge, Loader, EmptyState } from '../components/ui'
import type { Course, Lesson, LessonProgress, Test, TestQuestion, Homework, TestAttempt } from '../types'

interface LessonItem {
  lesson: Lesson
  moduleTitle: string
  progress?: LessonProgress
}

const statusMeta: Record<string, { label: string; variant: Parameters<typeof Badge>[0]['variant']; icon: string }> = {
  completed: { label: 'Завершён', variant: 'success', icon: '✅' },
  available: { label: 'Доступен', variant: 'info', icon: '🔓' },
  in_progress: { label: 'В процессе', variant: 'warning', icon: '📖' },
  locked: { label: 'Заблокирован', variant: 'default', icon: '🔒' },
}

const typeMeta: Record<string, string> = {
  text: '📄',
  video: '🎥',
  test: '📝',
  homework: '📚',
}

function parseJson(value?: string | null) {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export default function CoursePlayerPage() {
  const { id } = useParams<{ id: string }>()
  const courseId = Number(id)
  const { showToast } = useToast()

  const [course, setCourse] = useState<Course | null>(null)
  const [progress, setProgress] = useState<LessonProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [activeLessonId, setActiveLessonId] = useState<number | null>(null)
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
  const [activeLoading, setActiveLoading] = useState(false)

  // test state
  const [attempt, setAttempt] = useState<TestAttempt | null>(null)
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({})
  const [testSubmitting, setTestSubmitting] = useState(false)

  // homework state
  const [homework, setHomework] = useState<Homework | null>(null)
  const [homeworkAnswer, setHomeworkAnswer] = useState('')
  const [homeworkSubmitting, setHomeworkSubmitting] = useState(false)

  // complete button state
  const [completing, setCompleting] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [courseRes, progressRes] = await Promise.all([
        coursesApi.get(courseId),
        progressApi.list(),
      ])
      setCourse(courseRes)
      setProgress(progressRes)
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка загрузки курса', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [courseId])

  const allLessons = useMemo<LessonItem[]>(() => {
    if (!course) return []
    const items: LessonItem[] = []
    course.modules.forEach((m) => {
      m.lessons.forEach((l) => {
        items.push({
          lesson: l,
          moduleTitle: m.title,
          progress: progress.find((p) => p.lesson_id === l.id),
        })
      })
    })
    return items
  }, [course, progress])

  useEffect(() => {
    if (!course || activeLessonId) return
    const firstOpen = allLessons.find((i) => i.progress?.status !== 'locked')
    setActiveLessonId(firstOpen?.lesson.id || allLessons[0]?.lesson.id || null)
  }, [course, allLessons, activeLessonId])

  useEffect(() => {
    if (!activeLessonId) {
      setActiveLesson(null)
      return
    }
    loadActiveLesson(activeLessonId)
  }, [activeLessonId])

  const loadActiveLesson = async (lessonId: number) => {
    setActiveLoading(true)
    try {
      const lesson = await lessonsApi.get(lessonId)
      setActiveLesson(lesson)
      setAttempt(null)
      setAnswers({})
      setHomework(null)
      setHomeworkAnswer('')

      if (lesson.lesson_type === 'test' && lesson.test) {
        await startTestAttempt(lesson.test)
      }
      if (lesson.lesson_type === 'homework') {
        await loadHomework(lessonId)
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка загрузки урока', 'error')
    } finally {
      setActiveLoading(false)
    }
  }

  const startTestAttempt = async (test: Test) => {
    try {
      const a = await testsApi.createAttempt(test.id, {})
      setAttempt(a)
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Не удалось начать тест', 'error')
    }
  }

  const loadHomework = async (lessonId: number) => {
    try {
      const list = await homeworksApi.list(lessonId)
      setHomework(list[0] || null)
      if (list[0]?.content) setHomeworkAnswer(list[0].content)
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Не удалось загрузить задание', 'error')
    }
  }

  const handleSelectLesson = (item: LessonItem) => {
    if (item.progress?.status === 'locked') {
      showToast('Этот урок пока заблокирован. Завершите предыдущие уроки.', 'warning')
      return
    }
    setActiveLessonId(item.lesson.id)
  }

  const handleComplete = async () => {
    if (!activeLesson) return
    setCompleting(true)
    try {
      await lessonsApi.complete(activeLesson.id)
      showToast('Урок завершён', 'success')
      await fetchData()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка завершения урока', 'error')
    } finally {
      setCompleting(false)
    }
  }

  const handleAnswerChange = (questionId: number, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleSubmitTest = async () => {
    if (!activeLesson?.test || !attempt) return
    setTestSubmitting(true)
    try {
      await testsApi.updateAttempt(activeLesson.test.id, attempt.id, {
        answers: JSON.stringify(answers),
      })
      const scored = await testsApi.submitAttempt(activeLesson.test.id, attempt.id)
      setAttempt(scored)
      showToast(scored.is_passed ? 'Тест пройден' : 'Тест не пройден', scored.is_passed ? 'success' : 'warning')
      await fetchData()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка отправки теста', 'error')
    } finally {
      setTestSubmitting(false)
    }
  }

  const handleRetryTest = async () => {
    if (!activeLesson?.test) return
    setTestSubmitting(true)
    try {
      const a = await testsApi.createAttempt(activeLesson.test.id, {})
      setAttempt(a)
      setAnswers({})
      showToast('Новая попытка начата', 'info')
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Не удалось начать новую попытку', 'error')
    } finally {
      setTestSubmitting(false)
    }
  }

  const handleSubmitHomework = async () => {
    if (!homework) return
    setHomeworkSubmitting(true)
    try {
      const updated = await homeworksApi.submit(homework.id, { content: homeworkAnswer })
      setHomework(updated)
      showToast('Ответ отправлен на проверку', 'success')
      await fetchData()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка отправки задания', 'error')
    } finally {
      setHomeworkSubmitting(false)
    }
  }

  const activeProgress = useMemo(
    () => progress.find((p) => p.lesson_id === activeLessonId),
    [progress, activeLessonId]
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-fox-light">
        <Header title="Курс" icon="📚" />
        <div className="p-6 max-w-6xl mx-auto">
          <Loader text="Загрузка курса..." />
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-fox-light">
        <Header title="Курс" icon="📚" />
        <div className="p-6 max-w-6xl mx-auto">
          <EmptyState icon="📚" title="Курс не найден" description="Проверьте ссылку или выберите курс в дашборде." />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-fox-light">
      <Header title={course.title} subtitle="Прохождение курса" icon="📚" />

      <div className="p-4 md:p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar */}
        <Card className="lg:col-span-1 h-fit max-h-[calc(100vh-140px)] overflow-y-auto">
          <h3 className="text-sm font-bold text-fox-dark mb-4">Программа курса</h3>
          <div className="space-y-4">
            {course.modules.map((m) => (
              <div key={m.id}>
                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">{m.title}</div>
                <div className="space-y-1">
                  {m.lessons.map((l) => {
                    const item = allLessons.find((x) => x.lesson.id === l.id)
                    const status = item?.progress?.status || 'locked'
                    const meta = statusMeta[status]
                    const isActive = activeLessonId === l.id
                    return (
                      <button
                        key={l.id}
                        onClick={() => item && handleSelectLesson(item)}
                        className={[
                          'w-full text-left px-3 py-2 rounded-xl text-sm transition-colors flex items-center gap-2',
                          isActive ? 'bg-fox-purple/10 text-fox-purple font-medium' : 'hover:bg-fox-light text-gray-700',
                          status === 'locked' && 'opacity-60 cursor-not-allowed',
                        ].join(' ')}
                      >
                        <span>{meta.icon}</span>
                        <span className="flex-1 truncate">{l.title}</span>
                        <span className="text-xs">{typeMeta[l.lesson_type] || '📄'}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Viewer */}
        <div className="lg:col-span-2 space-y-4">
          {activeLoading ? (
            <Loader text="Загрузка урока..." />
          ) : !activeLesson ? (
            <EmptyState icon="📖" title="Выберите урок" description="Начните с первого доступного урока в боковом меню." />
          ) : (
            <Card>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={statusMeta[activeProgress?.status || 'locked'].variant}>
                      {statusMeta[activeProgress?.status || 'locked'].label}
                    </Badge>
                    <Badge variant="purple">{typeMeta[activeLesson.lesson_type] || '📄'} {activeLesson.lesson_type}</Badge>
                  </div>
                  <h2 className="text-xl font-bold text-fox-dark">{activeLesson.title}</h2>
                </div>
                <div className="text-sm text-gray-500">{activeLesson.duration_minutes} мин</div>
              </div>

              {activeLesson.description && (
                <p className="text-gray-600 text-sm mb-6 whitespace-pre-line">{activeLesson.description}</p>
              )}

              {/* Text / Video */}
              {(activeLesson.lesson_type === 'text' || activeLesson.lesson_type === 'video') && (
                <div className="space-y-4">
                  {activeLesson.contents && activeLesson.contents.length > 0 ? (
                    activeLesson.contents.map((c) => (
                      <div key={c.id} className="bg-fox-light rounded-xl p-4 border border-fox-border/30">
                        <div className="font-medium text-sm text-fox-dark">{c.title || 'Материал'}</div>
                        {c.content_type === 'text' && c.body && (
                          <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">{c.body}</p>
                        )}
                        {c.content_type === 'video' && c.external_url && (
                          <video src={c.external_url} controls className="mt-2 w-full rounded-lg" />
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="bg-fox-light rounded-xl p-8 text-center text-gray-500 text-sm border border-fox-border/30">
                      {activeLesson.lesson_type === 'video' ? 'Видеоматериал к этому уроку ещё не загружен.' : 'Текстовый материал к этому уроку ещё не добавлен.'}
                    </div>
                  )}
                  <Button
                    onClick={handleComplete}
                    loading={completing}
                    disabled={activeProgress?.status === 'completed' || activeProgress?.status === 'locked'}
                  >
                    {activeProgress?.status === 'completed' ? 'Урок завершён' : 'Завершить урок'}
                  </Button>
                </div>
              )}

              {/* Test */}
              {activeLesson.lesson_type === 'test' && activeLesson.test && (
                <div className="space-y-6">
                  {attempt?.finished_at ? (
                    <div className="bg-fox-light rounded-xl p-4 border border-fox-border/30 space-y-3">
                      <div>
                        <div className="text-lg font-bold text-fox-dark">
                          Результат: {attempt.score} / {attempt.max_score}
                        </div>
                        <Badge variant={attempt.is_passed ? 'success' : 'error'} className="mt-2">
                          {attempt.is_passed ? 'Тест пройден' : 'Тест не пройден'}
                        </Badge>
                      </div>
                      {!attempt.is_passed && (
                        <Button onClick={handleRetryTest} loading={testSubmitting}>
                          ↻ Повторить попытку
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      {activeLesson.test.questions?.map((q, idx) => (
                        <TestQuestionView
                          key={q.id}
                          index={idx}
                          question={q}
                          value={answers[q.id]}
                          onChange={(v) => handleAnswerChange(q.id, v)}
                        />
                      ))}
                      <Button onClick={handleSubmitTest} loading={testSubmitting}>
                        Отправить ответы
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Homework */}
              {activeLesson.lesson_type === 'homework' && (
                <div className="space-y-4">
                  <div className="bg-fox-light rounded-xl p-4 border border-fox-border/30">
                    <div className="font-medium text-fox-dark">{activeLesson.homework_title || activeLesson.title}</div>
                    {activeLesson.homework_description && (
                      <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">{activeLesson.homework_description}</p>
                    )}
                  </div>
                  {homework ? (
                    <>
                      <textarea
                        value={homeworkAnswer}
                        onChange={(e) => setHomeworkAnswer(e.target.value)}
                        disabled={homework.status !== 'assigned'}
                        placeholder="Ваш ответ..."
                        rows={6}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-fox-gold/50 focus:border-fox-gold bg-white disabled:bg-gray-50"
                      />
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={handleSubmitHomework}
                          loading={homeworkSubmitting}
                          disabled={homework.status !== 'assigned'}
                        >
                          {homework.status === 'assigned' ? 'Отправить на проверку' : 'Ответ отправлен'}
                        </Button>
                        <Badge variant={homework.status === 'reviewed' ? 'success' : homework.status === 'submitted' ? 'warning' : 'default'}>
                          {homework.status}
                        </Badge>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">Домашнее задание не назначено.</p>
                  )}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function TestQuestionView({
  index,
  question,
  value,
  onChange,
}: {
  index: number
  question: TestQuestion
  value?: string | string[]
  onChange: (v: string | string[]) => void
}) {
  const options = parseJson(question.options) as string[] | null
  const isMulti = question.question_type === 'multiple'

  return (
    <div className="bg-fox-light rounded-xl p-4 border border-fox-border/30">
      <div className="font-medium text-fox-dark mb-3">
        {index + 1}. {question.question_text}
      </div>
      {options ? (
        <div className="space-y-2">
          {options.map((opt) => {
            const selected = isMulti
              ? Array.isArray(value) && value.includes(String(opt))
              : String(value) === String(opt)
            return (
              <label
                key={String(opt)}
                className={[
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  selected ? 'border-fox-gold bg-fox-gold/10' : 'border-gray-200 bg-white hover:bg-gray-50',
                ].join(' ')}
              >
                <input
                  type={isMulti ? 'checkbox' : 'radio'}
                  name={`q-${question.id}`}
                  value={String(opt)}
                  checked={selected}
                  onChange={() => {
                    if (isMulti) {
                      const current = Array.isArray(value) ? [...value] : []
                      const s = String(opt)
                      onChange(current.includes(s) ? current.filter((x) => x !== s) : [...current, s])
                    } else {
                      onChange(String(opt))
                    }
                  }}
                  className="accent-fox-gold"
                />
                <span className="text-sm text-gray-700">{opt}</span>
              </label>
            )
          })}
        </div>
      ) : (
        <input
          type="text"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ваш ответ"
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-fox-gold/50 focus:border-fox-gold bg-white"
        />
      )}
    </div>
  )
}
