import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import Header from '../components/Header'
import { coursesApi, lessonsApi, progressApi, testsApi, homeworksApi } from '../api'
import { useToast, Button, Card, Badge, Loader, EmptyState, Tabs, Sheet } from '../components/ui'
import type { Course, Lesson, LessonProgress, Test, TestQuestion, Homework, TestAttempt, HomeworkReview, LessonContent, LessonPlayerData } from '../types'
import {
  LuBookOpen,
  LuCircleCheck,
  LuLock,
  LuPlay,
  LuFileText,
  LuVideo,
  LuFileQuestion,
  LuClipboardList,
  LuFiles,
  LuDownload,
  LuMenu,
} from 'react-icons/lu'

interface LessonItem {
  lesson: Lesson
  moduleTitle: string
  progress?: LessonProgress
}

const statusMeta: Record<string, { label: string; variant: Parameters<typeof Badge>[0]['variant']; icon: React.ReactNode }> = {
  completed: { label: 'Завершён', variant: 'success', icon: <LuCircleCheck /> },
  available: { label: 'Доступен', variant: 'info', icon: <LuPlay /> },
  in_progress: { label: 'В процессе', variant: 'warning', icon: <LuBookOpen /> },
  locked: { label: 'Заблокирован', variant: 'default', icon: <LuLock /> },
}

const typeMeta: Record<string, React.ReactNode> = {
  text: <LuFileText />,
  video: <LuVideo />,
  test: <LuFileQuestion />,
  homework: <LuClipboardList />,
}

function parseJson(value?: string | null) {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function homeworkStatusMeta(homework: Homework, review: HomeworkReview | null) {
  if (homework.status === 'reviewed' && review?.status === 'approved') {
    return { label: 'Выполнено', variant: 'success' as const }
  }
  if (homework.status === 'rejected') {
    return { label: 'Отклонено', variant: 'error' as const }
  }
  if (homework.status === 'revision') {
    return { label: 'На доработке', variant: 'warning' as const }
  }
  if (homework.status === 'submitted') {
    return { label: 'Отправлено', variant: 'warning' as const }
  }
  return { label: 'Назначено', variant: 'default' as const }
}

function hasFileContent(contents?: LessonContent[]) {
  return (contents || []).some((c) => ['pdf', 'file'].includes(c.content_type))
}

export default function CoursePlayerPage() {
  const { id } = useParams<{ id: string }>()
  const courseId = Number(id)
  const { showToast } = useToast()

  const [course, setCourse] = useState<Course | null>(null)
  const [progress, setProgress] = useState<LessonProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [activeLessonId, setActiveLessonId] = useState<number | null>(null)
  const [player, setPlayer] = useState<LessonPlayerData | null>(null)
  const [activeLoading, setActiveLoading] = useState(false)
  const [activeLocked, setActiveLocked] = useState(false)
  const [activeTab, setActiveTab] = useState('theory')
  const [showProgram, setShowProgram] = useState(false)

  // test state
  const [attempt, setAttempt] = useState<TestAttempt | null>(null)
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({})
  const [testSubmitting, setTestSubmitting] = useState(false)

  // homework state
  const [homework, setHomework] = useState<Homework | null>(null)
  const [homeworkReview, setHomeworkReview] = useState<HomeworkReview | null>(null)
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
      setPlayer(null)
      setActiveLocked(false)
      return
    }
    loadActiveLesson(activeLessonId)
  }, [activeLessonId])

  const loadActiveLesson = async (lessonId: number) => {
    setActiveLoading(true)
    setActiveLocked(false)
    setPlayer(null)
    setAttempt(null)
    setAnswers({})
    setHomework(null)
    setHomeworkReview(null)
    setHomeworkAnswer('')
    try {
      const data = await lessonsApi.player(lessonId)
      setPlayer(data)

      // Определяем начальную вкладку
      const lesson = data.lesson
      if (lesson.lesson_type === 'test') {
        setActiveTab('test')
      } else if (lesson.lesson_type === 'homework') {
        setActiveTab('homework')
      } else if (hasFileContent(lesson.contents)) {
        setActiveTab('files')
      } else {
        setActiveTab('theory')
      }

      // Инициализируем тест
      if (lesson.lesson_type === 'test' && lesson.test) {
        if (data.latest_test_attempt) {
          setAttempt(data.latest_test_attempt)
        } else {
          await startTestAttempt(lesson.test)
        }
      }

      // Инициализируем ДЗ
      if (lesson.lesson_type === 'homework' && data.homework) {
        setHomework(data.homework)
        if (data.homework.content) setHomeworkAnswer(data.homework.content)
        const reviews = await homeworksApi.reviews(data.homework.id)
        setHomeworkReview(reviews[0] || null)
      }
    } catch (err: any) {
      const status = err.response?.status
      const message = err.response?.data?.message || 'Ошибка загрузки урока'
      if (status === 403) {
        setActiveLocked(true)
      }
      showToast(message, status === 403 ? 'warning' : 'error')
    } finally {
      setActiveLoading(false)
    }
  }

  const startTestAttempt = async (test: Test) => {
    try {
      const a = await testsApi.createAttempt(test.id, {})
      setAttempt(a)
      setAnswers({})
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Не удалось начать тест', 'error')
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
    if (!player?.lesson) return
    setCompleting(true)
    try {
      await lessonsApi.complete(player.lesson.id)
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
    if (!player?.lesson?.test || !attempt) return
    setTestSubmitting(true)
    try {
      await testsApi.updateAttempt(player.lesson.test.id, attempt.id, {
        answers: JSON.stringify(answers),
      })
      const scored = await testsApi.submitAttempt(player.lesson.test.id, attempt.id)
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
    if (!player?.lesson?.test) return
    setTestSubmitting(true)
    try {
      const a = await testsApi.createAttempt(player.lesson.test.id, {})
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

  const activeLesson = player?.lesson
  const activeProgress = player?.progress

  const tabs = useMemo(() => {
    if (!activeLesson) return []
    const list: { id: string; label: string; icon: React.ReactNode }[] = []
    list.push({ id: 'theory', label: 'Теория', icon: <LuBookOpen /> })
    if (activeLesson.lesson_type === 'test' || activeLesson.test) {
      list.push({ id: 'test', label: 'Тест', icon: <LuFileQuestion /> })
    }
    if (activeLesson.lesson_type === 'homework') {
      list.push({ id: 'homework', label: 'Домашнее задание', icon: <LuClipboardList /> })
    }
    if (hasFileContent(activeLesson.contents)) {
      list.push({ id: 'files', label: 'Файлы', icon: <LuFiles /> })
    }
    return list
  }, [activeLesson])

  const ProgramList = ({ onClose }: { onClose?: () => void }) => (
    <div className="space-y-4">
      {course!.modules.map((m) => (
        <div key={m.id}>
          <div className="text-xs font-semibold text-fox-gray uppercase mb-2">{m.title}</div>
          <div className="space-y-1">
            {m.lessons.map((l) => {
              const item = allLessons.find((x) => x.lesson.id === l.id)
              const status = item?.progress?.status || 'locked'
              const meta = statusMeta[status]
              const isActive = activeLessonId === l.id
              return (
                <button
                  key={l.id}
                  onClick={() => {
                    if (item) handleSelectLesson(item)
                    onClose?.()
                  }}
                  className={[
                    'w-full text-left px-3 py-2 rounded-xl text-sm transition-colors flex items-center gap-2',
                    isActive ? 'bg-fox-purple/10 text-fox-purple font-medium' : 'hover:bg-fox-light text-fox-graphite',
                    status === 'locked' && 'opacity-60 cursor-not-allowed',
                  ].join(' ')}
                >
                  <span>{meta.icon}</span>
                  <span className="flex-1 truncate">{l.title}</span>
                  <span className="text-xs">{typeMeta[l.lesson_type] || <LuFileText />}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-fox-light">
        <Header title="Курс" icon={<LuBookOpen />} />
        <div className="p-6 w-full">
          <Loader text="Загрузка курса..." />
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-fox-light">
        <Header title="Курс" icon={<LuBookOpen />} />
        <div className="p-6 w-full">
          <EmptyState
            icon={<LuBookOpen />}
            title="Курс не найден"
            description="Проверьте ссылку или выберите курс в дашборде."
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-fox-light">
      <Header title={course.title} subtitle="Прохождение курса" icon={<LuBookOpen />} />

      <div className="p-4 md:p-6 w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar — desktop */}
        <Card className="hidden lg:block lg:col-span-1 h-fit max-h-[calc(100vh-140px)] overflow-y-auto">
          <h3 className="text-sm font-bold text-fox-dark mb-4">Программа курса</h3>
          <ProgramList />
        </Card>

        {/* Viewer */}
        <div className="lg:col-span-2 space-y-4">
          {/* Mobile program selector */}
          <Card className="lg:hidden flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-xs text-fox-gray/70">Текущий урок</p>
              <p className="font-bold text-fox-dark truncate">
                {activeLesson ? activeLesson.title : 'Выберите урок'}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<LuMenu size={18} />}
              onClick={() => setShowProgram(true)}
            >
              Программа
            </Button>
          </Card>

          {activeLoading ? (
            <Loader text="Загрузка урока..." />
          ) : activeLocked ? (
            <Card className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-fox-light flex items-center justify-center text-fox-gray mb-4">
                <LuLock size={32} />
              </div>
              <h3 className="text-lg font-bold text-fox-dark mb-2">Урок заблокирован</h3>
              <p className="text-sm text-fox-gray max-w-md">
                Завершите предыдущий урок и все обязательные задания, чтобы получить доступ.
              </p>
            </Card>
          ) : !activeLesson ? (
            <EmptyState
              icon={<LuBookOpen />}
              title="Выберите урок"
              description="Начните с первого доступного урока в боковом меню."
            />
          ) : (
            <Card>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={statusMeta[activeProgress?.status || 'locked'].variant}>
                      {statusMeta[activeProgress?.status || 'locked'].label}
                    </Badge>
                    <Badge variant="purple">
                      {typeMeta[activeLesson.lesson_type] || <LuFileText />} {activeLesson.lesson_type}
                    </Badge>
                  </div>
                  <h2 className="text-xl font-bold text-fox-dark">{activeLesson.title}</h2>
                </div>
                <div className="text-sm text-fox-gray">{activeLesson.duration_minutes} мин</div>
              </div>

              {activeLesson.description && (
                <p className="text-fox-gray text-sm mb-4 whitespace-pre-line">{activeLesson.description}</p>
              )}

              <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

              <div className="mt-4">
                {activeTab === 'theory' && (
                  <div className="space-y-4">
                    {activeLesson.contents && activeLesson.contents.length > 0 ? (
                      activeLesson.contents.map((c) => (
                        <div key={c.id} className="bg-fox-light rounded-xl p-4 border border-fox-border/30">
                          <div className="font-medium text-sm text-fox-dark">{c.title || 'Материал'}</div>
                          {c.content_type === 'text' && c.body && (
                            <p className="text-sm text-fox-gray mt-2 whitespace-pre-line">{c.body}</p>
                          )}
                          {c.content_type === 'video' && c.external_url && (
                            <video src={c.external_url} controls className="mt-2 w-full rounded-lg" />
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="bg-fox-light rounded-xl p-8 text-center text-fox-gray text-sm border border-fox-border/30">
                        Теоретический материал к этому уроку ещё не добавлен.
                      </div>
                    )}
                    {(activeLesson.lesson_type === 'text' || activeLesson.lesson_type === 'video') && (
                      <Button
                        onClick={handleComplete}
                        loading={completing}
                        disabled={!player?.can_complete || activeProgress?.status === 'completed'}
                      >
                        {activeProgress?.status === 'completed' ? 'Урок завершён' : 'Завершить урок'}
                      </Button>
                    )}
                  </div>
                )}

                {activeTab === 'test' && activeLesson.test && (
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
                        {attempt?.started_at && (
                          <p className="text-xs text-fox-gray">
                            Попытка начата: {new Date(attempt.started_at).toLocaleString('ru-RU')}
                          </p>
                        )}
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

                {activeTab === 'homework' && (
                  <div className="space-y-4">
                    <div className="bg-fox-light rounded-xl p-4 border border-fox-border/30">
                      <div className="font-medium text-fox-dark">
                        {activeLesson.homework_title || activeLesson.title}
                      </div>
                      {activeLesson.homework_description && (
                        <p className="text-sm text-fox-gray mt-2 whitespace-pre-line">
                          {activeLesson.homework_description}
                        </p>
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
                          className="w-full px-4 py-3 border border-fox-border rounded-xl text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-fox-gold/50 focus:border-fox-gold bg-white disabled:bg-fox-light/50"
                        />
                        <div className="flex items-center gap-3">
                          <Button
                            onClick={handleSubmitHomework}
                            loading={homeworkSubmitting}
                            disabled={homework.status !== 'assigned'}
                          >
                            {homework.status === 'assigned' ? 'Отправить на проверку' : 'Ответ отправлен'}
                          </Button>
                          <Badge variant={homeworkStatusMeta(homework, homeworkReview).variant}>
                            {homeworkStatusMeta(homework, homeworkReview).label}
                          </Badge>
                        </div>
                        {homeworkReview && (
                          <div className="bg-fox-light rounded-xl p-4 border border-fox-border/30">
                            <div className="text-sm font-semibold text-fox-dark">
                              Результат проверки
                              {homeworkReview.score !== undefined && homeworkReview.score !== null && (
                                <span className="ml-2 text-fox-purple">{homeworkReview.score} балл(ов)</span>
                              )}
                            </div>
                            {homeworkReview.comment && (
                              <p className="text-sm text-fox-gray mt-2 whitespace-pre-line">
                                {homeworkReview.comment}
                              </p>
                            )}
                            <p className="text-xs text-fox-gray/70 mt-2">
                              {new Date(homeworkReview.created_at).toLocaleString('ru-RU')}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-fox-gray">Домашнее задание не назначено.</p>
                    )}
                  </div>
                )}

                {activeTab === 'files' && (
                  <div className="space-y-3">
                    {(activeLesson.contents || [])
                      .filter((c) => ['pdf', 'file'].includes(c.content_type))
                      .map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between bg-fox-light rounded-xl p-4 border border-fox-border/30"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-fox-dark truncate">
                              {c.title || 'Файл'}
                            </div>
                            <div className="text-xs text-fox-gray uppercase">{c.content_type}</div>
                          </div>
                          {(c.file_url || c.external_url) && (
                            <a
                              href={c.file_url || c.external_url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-sm text-fox-purple hover:text-fox-purple-dark"
                            >
                              <LuDownload size={16} />
                              Открыть
                            </a>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Mobile program drawer */}
      <Sheet
        isOpen={showProgram}
        onClose={() => setShowProgram(false)}
        title="Программа курса"
        position="left"
      >
        <ProgramList onClose={() => setShowProgram(false)} />
      </Sheet>
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
                  selected ? 'border-fox-gold bg-fox-gold/10' : 'border-fox-border bg-white hover:bg-fox-light/50',
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
                <span className="text-sm text-fox-graphite">{opt}</span>
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
          className="w-full px-4 py-2.5 border border-fox-border rounded-xl text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-fox-gold/50 focus:border-fox-gold bg-white"
        />
      )}
    </div>
  )
}
