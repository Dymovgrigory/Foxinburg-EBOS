import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import { useToast, Button, Card, Input, Loader, EmptyState, Modal, ModalFooterActions } from '../components/ui'
import { coursesApi, modulesApi, lessonsApi, testsApi, homeworksApi, groupsApi } from '../api'
import type { Course, Module, Lesson, Test, TestQuestion, Group } from '../types'
import { LuBookOpen, LuWrench, LuPencil, LuTrash2, LuFileText, LuVideo, LuClipboardList, LuHouse } from 'react-icons/lu'

interface EditableItem {
  id?: number
  title: string
  description?: string
}

export default function CourseBuilderPage() {
  const { showToast } = useToast()

  const [courses, setCourses] = useState<Course[]>([])
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)

  const [modules, setModules] = useState<Module[]>([])
  const [loadingModules, setLoadingModules] = useState(false)
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null)
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null)

  const [groups, setGroups] = useState<Group[]>([])

  // Modals
  const [courseModal, setCourseModal] = useState<EditableItem | null>(null)
  const [moduleModal, setModuleModal] = useState<EditableItem & { course_id?: number } | null>(null)
  const [lessonModal, setLessonModal] = useState<
    (Partial<Omit<Lesson, 'test'>> & {
      module_id?: number
      test?: {
        title?: string
        description?: string
        passing_score?: number
        max_attempts?: number
        time_limit_minutes?: number
        questions?: any[]
      }
      homework?: {
        title?: string
        description?: string
      }
    }) | null
  >(null)

  // Lesson extras
  const [lessonTests, setLessonTests] = useState<Test[]>([])
  const [lessonHomeworks, setLessonHomeworks] = useState<{ id: number; student_id: number; status: string }[]>([])
  const [testForm, setTestForm] = useState<Partial<Test>>({})
  const [questions, setQuestions] = useState<Partial<TestQuestion>[]>([])
  const [homeworkForm, setHomeworkForm] = useState<{ group_id?: number; title?: string; description?: string; content?: string }>({})

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) || null,
    [courses, selectedCourseId]
  )
  const selectedModule = useMemo(
    () => modules.find((m) => m.id === selectedModuleId) || null,
    [modules, selectedModuleId]
  )
  const selectedLesson = useMemo(
    () => selectedModule?.lessons.find((l) => l.id === selectedLessonId) || null,
    [selectedModule, selectedLessonId]
  )

  const loadCourses = async () => {
    try {
      setLoadingCourses(true)
      const data = await coursesApi.list()
      setCourses(data)
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Не удалось загрузить курсы', 'error')
    } finally {
      setLoadingCourses(false)
    }
  }

  const loadModules = async (courseId: number) => {
    try {
      setLoadingModules(true)
      const data = await coursesApi.modules(courseId)
      setModules(data)
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Не удалось загрузить модули', 'error')
    } finally {
      setLoadingModules(false)
    }
  }

  const loadGroups = async () => {
    try {
      const data = await groupsApi.list()
      setGroups(data)
    } catch {
      // non-critical
    }
  }

  useEffect(() => {
    loadCourses()
    loadGroups()
  }, [])

  useEffect(() => {
    if (selectedCourseId) {
      loadModules(selectedCourseId)
    } else {
      setModules([])
      setSelectedModuleId(null)
      setSelectedLessonId(null)
    }
  }, [selectedCourseId])

  useEffect(() => {
    if (!selectedLessonId) {
      setLessonTests([])
      setLessonHomeworks([])
      return
    }
    const loadExtras = async () => {
      try {
        const [tests, homeworks] = await Promise.all([
          testsApi.list(selectedLessonId),
          homeworksApi.list(selectedLessonId),
        ])
        setLessonTests(tests)
        setLessonHomeworks(homeworks)
      } catch (err: any) {
        showToast(err.response?.data?.message || 'Не удалось загрузить данные урока', 'error')
      }
    }
    loadExtras()
  }, [selectedLessonId])

  const saveCourse = async () => {
    if (!courseModal?.title) return
    try {
      if (courseModal.id) {
        await coursesApi.update(courseModal.id, {
          title: courseModal.title,
          description: courseModal.description,
        })
        showToast('Курс обновлён', 'success')
      } else {
        await coursesApi.create({
          title: courseModal.title,
          description: courseModal.description,
          type: 'academy',
        })
        showToast('Курс создан', 'success')
      }
      setCourseModal(null)
      loadCourses()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка сохранения курса', 'error')
    }
  }

  const deleteCourse = async (id: number) => {
    if (!confirm('Удалить курс? Это действие нельзя отменить.')) return
    try {
      await coursesApi.delete(id)
      showToast('Курс удалён', 'success')
      if (selectedCourseId === id) setSelectedCourseId(null)
      loadCourses()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка удаления', 'error')
    }
  }

  const saveModule = async () => {
    if (!moduleModal?.title || !moduleModal.course_id) return
    try {
      if (moduleModal.id) {
        await modulesApi.update(moduleModal.id, {
          title: moduleModal.title,
          description: moduleModal.description,
        })
        showToast('Модуль обновлён', 'success')
      } else {
        await modulesApi.create({
          course_id: moduleModal.course_id,
          title: moduleModal.title,
          description: moduleModal.description,
          order_index: modules.length,
        })
        showToast('Модуль создан', 'success')
      }
      setModuleModal(null)
      if (selectedCourseId) loadModules(selectedCourseId)
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка сохранения модуля', 'error')
    }
  }

  const deleteModule = async (id: number) => {
    if (!confirm('Удалить модуль и все его уроки?')) return
    try {
      await modulesApi.delete(id)
      showToast('Модуль удалён', 'success')
      if (selectedModuleId === id) {
        setSelectedModuleId(null)
        setSelectedLessonId(null)
      }
      if (selectedCourseId) loadModules(selectedCourseId)
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка удаления', 'error')
    }
  }

  const buildLessonPayload = () => {
    if (!lessonModal) return null
    const payload: any = {
      module_id: lessonModal.module_id,
      title: lessonModal.title,
      description: lessonModal.description,
      lesson_type: lessonModal.lesson_type || 'text',
      order_index: lessonModal.order_index ?? (selectedModule?.lessons.length || 0),
      duration_minutes: lessonModal.duration_minutes || 15,
    }

    if (payload.lesson_type === 'test' && lessonModal.test) {
      payload.test = {
        title: lessonModal.test.title || lessonModal.title,
        description: lessonModal.test.description,
        passing_score: lessonModal.test.passing_score || 70,
        max_attempts: lessonModal.test.max_attempts || 3,
        time_limit_minutes: lessonModal.test.time_limit_minutes || undefined,
        questions: (lessonModal.test.questions || []).map((q, idx) => ({
          question_text: q.question_text,
          question_type: q.question_type || 'single',
          options: q.options ? JSON.stringify(q.options.split(';').map((s: string) => s.trim()).filter(Boolean)) : undefined,
          correct_answers: q.correct_answers ? JSON.stringify(q.correct_answers.split(';').map((s: string) => s.trim()).filter(Boolean)) : undefined,
          points: q.points || 1,
          order_index: idx,
        })),
      }
    }

    if (payload.lesson_type === 'homework' && lessonModal.homework) {
      payload.homework = {
        title: lessonModal.homework.title || lessonModal.title,
        description: lessonModal.homework.description,
      }
      payload.homework_title = payload.homework.title
      payload.homework_description = payload.homework.description
    }

    return payload
  }

  const saveLesson = async () => {
    if (!lessonModal?.title || !lessonModal.module_id) return
    const payload = buildLessonPayload()
    if (!payload) return

    try {
      if (lessonModal.id) {
        await lessonsApi.update(lessonModal.id, payload)
        showToast('Урок обновлён', 'success')
      } else {
        await lessonsApi.create(payload)
        showToast('Урок создан', 'success')
      }
      setLessonModal(null)
      if (selectedCourseId) loadModules(selectedCourseId)
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка сохранения урока', 'error')
    }
  }

  const LESSON_TYPE_OPTIONS: { value: string; label: string }[] = [
    { value: 'text', label: 'Текст / Документ' },
    { value: 'video', label: 'Видео' },
    { value: 'test', label: 'Тест' },
    { value: 'homework', label: 'Домашнее задание' },
  ]

  const lessonTypeIcon = (type?: string) => {
    switch (type) {
      case 'video':
        return <LuVideo size={14} />
      case 'test':
        return <LuClipboardList size={14} />
      case 'homework':
        return <LuHouse size={14} />
      default:
        return <LuFileText size={14} />
    }
  }

  const openLessonModal = async (lesson: Lesson, moduleId: number) => {
    const modal: any = {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description || '',
      lesson_type: lesson.lesson_type || 'text',
      duration_minutes: lesson.duration_minutes,
      order_index: lesson.order_index,
      module_id: moduleId,
      homework_title: lesson.homework_title,
      homework_description: lesson.homework_description,
    }

    if (lesson.lesson_type === 'test') {
      try {
        const tests = await testsApi.list(lesson.id)
        const test = tests[0]
        if (test) {
          const questions = await testsApi.questions(test.id)
          modal.test = {
            title: test.title,
            description: test.description,
            passing_score: test.passing_score,
            max_attempts: test.max_attempts,
            time_limit_minutes: test.time_limit_minutes,
            questions: questions.map((q: TestQuestion) => ({
              question_text: q.question_text,
              question_type: q.question_type,
              options: q.options ? safeJoinJson(q.options) : '',
              correct_answers: q.correct_answers ? safeJoinJson(q.correct_answers) : '',
              points: q.points,
            })),
          }
        }
      } catch {
        // non-critical
      }
      if (!modal.test) {
        modal.test = { questions: [] }
      }
    }

    if (lesson.lesson_type === 'homework') {
      modal.homework = {
        title: lesson.homework_title || lesson.title,
        description: lesson.homework_description || '',
      }
    }

    setLessonModal(modal)
  }

  const safeJoinJson = (raw?: string) => {
    if (!raw) return ''
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.join('; ')
      return String(parsed)
    } catch {
      return raw
    }
  }

  const deleteLesson = async (id: number) => {
    if (!confirm('Удалить урок?')) return
    try {
      await lessonsApi.delete(id)
      showToast('Урок удалён', 'success')
      if (selectedLessonId === id) setSelectedLessonId(null)
      if (selectedCourseId) loadModules(selectedCourseId)
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка удаления', 'error')
    }
  }

  const moveLesson = async (moduleId: number, lessonId: number, direction: -1 | 1) => {
    const module = modules.find((m) => m.id === moduleId)
    if (!module?.lessons) return
    const sorted = [...module.lessons].sort((a, b) => a.order_index - b.order_index)
    const index = sorted.findIndex((l) => l.id === lessonId)
    const newIndex = index + direction
    if (index < 0 || newIndex < 0 || newIndex >= sorted.length) return

    const current = sorted[index]
    const swap = sorted[newIndex]

    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== moduleId) return m
        const updated = m.lessons.map((l) => {
          if (l.id === current.id) return { ...l, order_index: swap.order_index }
          if (l.id === swap.id) return { ...l, order_index: current.order_index }
          return l
        })
        return { ...m, lessons: updated.sort((a, b) => a.order_index - b.order_index) }
      })
    )

    try {
      await Promise.all([
        lessonsApi.update(current.id, { order_index: swap.order_index }),
        lessonsApi.update(swap.id, { order_index: current.order_index }),
      ])
      showToast('Порядок уроков обновлён', 'success')
      if (selectedCourseId) loadModules(selectedCourseId)
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Не удалось изменить порядок', 'error')
      if (selectedCourseId) loadModules(selectedCourseId)
    }
  }

  const createTest = async () => {
    if (!selectedLessonId || !testForm.title) return
    try {
      const test = await testsApi.create({
        ...testForm,
        lesson_id: selectedLessonId,
        passing_score: testForm.passing_score || 70,
        max_attempts: testForm.max_attempts || 3,
      })

      for (const q of questions) {
        if (!q.question_text) continue
        await testsApi.createQuestion(test.id, {
          ...q,
          test_id: test.id,
          order_index: q.order_index || 0,
          points: q.points || 1,
          question_type: q.question_type || 'single',
        })
      }

      showToast('Тест создан', 'success')
      setTestForm({})
      setQuestions([])
      setLessonTests(await testsApi.list(selectedLessonId))
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка создания теста', 'error')
    }
  }

  const deleteTest = async (id: number) => {
    if (!confirm('Удалить тест?')) return
    try {
      await testsApi.delete(id)
      showToast('Тест удалён', 'success')
      if (selectedLessonId) setLessonTests(await testsApi.list(selectedLessonId))
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка удаления', 'error')
    }
  }

  const assignHomework = async () => {
    if (!selectedLessonId) return
    try {
      await homeworksApi.assignToLesson({
        lesson_id: selectedLessonId,
        group_id: homeworkForm.group_id,
        title: homeworkForm.title,
        description: homeworkForm.description,
        content: homeworkForm.content,
      })
      showToast('Домашнее задание назначено', 'success')
      setHomeworkForm({})
      setLessonHomeworks(await homeworksApi.list(selectedLessonId))
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Ошибка назначения ДЗ', 'error')
    }
  }

  if (loadingCourses) {
    return (
      <div className="min-h-screen bg-fox-light">
        <Header title="Конструктор курсов" subtitle="Редактирование обучения" icon={<LuWrench />} />
        <div className="p-6 w-full">
          <Loader text="Загрузка курсов..." />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-fox-light">
      <Header title="Конструктор курсов" subtitle="Редактирование обучения" icon={<LuWrench />} />

      <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Courses */}
          <Card className="lg:col-span-3" padding="none">
            <div className="p-4 border-b border-fox-border bg-fox-light/50 flex items-center justify-between">
              <h3 className="font-bold text-fox-dark">Курсы</h3>
              <Button size="sm" onClick={() => setCourseModal({ title: '', description: '' })}>
                + Курс
              </Button>
            </div>
            <div className="divide-y divide-fox-border max-h-[70vh] overflow-y-auto">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className={[
                    'p-4 cursor-pointer transition flex items-start justify-between gap-2',
                    selectedCourseId === course.id ? 'bg-fox-purple/5' : 'hover:bg-fox-light/50',
                  ].join(' ')}
                  onClick={() => {
                    setSelectedCourseId(course.id)
                    setSelectedModuleId(null)
                    setSelectedLessonId(null)
                  }}
                >
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${selectedCourseId === course.id ? 'text-fox-purple' : 'text-fox-dark'}`}>
                      {course.title}
                    </p>
                    <p className="text-xs text-fox-gray/70 truncate">{course.status}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      className="text-fox-gray/70 hover:text-fox-purple"
                      onClick={(e) => {
                        e.stopPropagation()
                        setCourseModal({ id: course.id, title: course.title, description: course.description || '' })
                      }}
                    >
                      <LuPencil size={16} />
                    </button>
                    <button
                      className="text-fox-gray/70 hover:text-fox-error"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteCourse(course.id)
                      }}
                    >
                      <LuTrash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {courses.length === 0 && (
                <div className="p-6 text-center text-sm text-fox-gray/70">Нет курсов</div>
              )}
            </div>
          </Card>

          {/* Modules & Lessons */}
          <Card className="lg:col-span-4" padding="none">
            <div className="p-4 border-b border-fox-border bg-fox-light/50 flex items-center justify-between">
              <h3 className="font-bold text-fox-dark">
                {selectedCourse ? selectedCourse.title : 'Выберите курс'}
              </h3>
              {selectedCourse && (
                <Button
                  size="sm"
                  onClick={() => setModuleModal({ title: '', description: '', course_id: selectedCourse.id })}
                >
                  + Модуль
                </Button>
              )}
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-3 space-y-3">
              {!selectedCourse ? (
                <EmptyState icon={<LuBookOpen />} title="Курс не выбран" description="Выберите курс слева" />
              ) : loadingModules ? (
                <Loader text="Загрузка модулей..." />
              ) : (
                modules.map((module) => (
                  <div
                    key={module.id}
                    className={[
                      'rounded-xl border transition',
                      selectedModuleId === module.id
                        ? 'border-fox-purple bg-fox-purple/5'
                        : 'border-fox-border bg-white',
                    ].join(' ')}
                  >
                    <div
                      className="p-3 flex items-center justify-between cursor-pointer"
                      onClick={() => {
                        setSelectedModuleId(module.id)
                        setSelectedLessonId(null)
                      }}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-fox-dark truncate">{module.title}</p>
                        <p className="text-xs text-fox-gray/70">{module.lessons?.length || 0} уроков</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          className="text-fox-gray/70 hover:text-fox-purple"
                          onClick={(e) => {
                            e.stopPropagation()
                            setModuleModal({
                              id: module.id,
                              title: module.title,
                              description: module.description || '',
                              course_id: selectedCourse.id,
                            })
                          }}
                        >
                          <LuPencil size={16} />
                        </button>
                        <button
                          className="text-fox-gray/70 hover:text-fox-error"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteModule(module.id)
                          }}
                        >
                          <LuTrash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {selectedModuleId === module.id && (
                      <div className="px-3 pb-3 space-y-2">
                        {[...module.lessons].sort((a, b) => a.order_index - b.order_index).map((lesson, index, arr) => (
                          <div
                            key={lesson.id}
                            className={[
                              'flex items-center justify-between p-2 rounded-lg text-sm cursor-pointer',
                              selectedLessonId === lesson.id
                                ? 'bg-fox-purple text-white'
                                : 'bg-fox-light/50 hover:bg-fox-light text-fox-dark',
                            ].join(' ')}
                            onClick={() => setSelectedLessonId(lesson.id)}
                          >
                            <span className="mr-2 inline-flex items-center">{lessonTypeIcon(lesson.lesson_type)}</span>
                            <span className="truncate">{lesson.title}</span>
                            <div className="flex gap-1">
                              {index > 0 && (
                                <button
                                  className={selectedLessonId === lesson.id ? 'text-white/80 hover:text-white' : 'text-fox-gray/70 hover:text-fox-purple'}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    moveLesson(module.id, lesson.id, -1)
                                  }}
                                  title="Переместить выше"
                                >
                                  ↑
                                </button>
                              )}
                              {index < arr.length - 1 && (
                                <button
                                  className={selectedLessonId === lesson.id ? 'text-white/80 hover:text-white' : 'text-fox-gray/70 hover:text-fox-purple'}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    moveLesson(module.id, lesson.id, 1)
                                  }}
                                  title="Переместить ниже"
                                >
                                  ↓
                                </button>
                              )}
                              <button
                                className={selectedLessonId === lesson.id ? 'text-white/80 hover:text-white' : 'text-fox-gray/70 hover:text-fox-purple'}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openLessonModal(lesson, module.id)
                                }}
                              >
                                <LuPencil size={16} />
                              </button>
                              <button
                                className={selectedLessonId === lesson.id ? 'text-white/80 hover:text-white' : 'text-fox-gray/70 hover:text-fox-error'}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteLesson(lesson.id)
                                }}
                              >
                                <LuTrash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full mt-1"
                          onClick={() =>
                            setLessonModal({
                              title: '',
                              description: '',
                              module_id: module.id,
                              lesson_type: 'text',
                              test: { questions: [] },
                              homework: { title: '', description: '' },
                            })
                          }
                        >
                          + Добавить урок
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Lesson editor */}
          <div className="lg:col-span-5 space-y-6">
            {!selectedLesson ? (
              <Card className="p-12 text-center text-fox-gray/70">
                Выберите урок для редактирования
              </Card>
            ) : (
              <>
                <Card>
                  <h3 className="text-lg font-bold text-fox-dark mb-4">{selectedLesson.title}</h3>
                  <p className="text-sm text-fox-gray mb-4">
                    Материалы добавляются через синхронизацию с Яндекс.Диском на странице Академии.
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-fox-light/50 p-3 rounded-xl">
                      <span className="text-fox-gray/70">Тип</span>
                      <p className="font-medium text-fox-dark">
                        <span className="inline-flex items-center gap-1.5">
                          {lessonTypeIcon(selectedLesson.lesson_type)}
                          {LESSON_TYPE_OPTIONS.find((o) => o.value === selectedLesson.lesson_type)?.label || selectedLesson.lesson_type}
                        </span>
                      </p>
                    </div>
                    <div className="bg-fox-light/50 p-3 rounded-xl">
                      <span className="text-fox-gray/70">Длительность</span>
                      <p className="font-medium text-fox-dark">{selectedLesson.duration_minutes} мин</p>
                    </div>
                  </div>
                  {selectedLesson.lesson_type === 'homework' && (
                    <div className="mt-4 p-3 bg-fox-light/50 rounded-xl text-sm">
                      <span className="text-fox-gray/70">Шаблон ДЗ</span>
                      <p className="font-medium text-fox-dark">{selectedLesson.homework_title || selectedLesson.title}</p>
                      <p className="text-fox-gray">{selectedLesson.homework_description}</p>
                    </div>
                  )}
                </Card>

                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-fox-dark flex items-center gap-2"><LuClipboardList size={16} /> Тест урока</h3>
                  </div>
                  {lessonTests.length > 0 ? (
                    <div className="space-y-2 mb-4">
                      {lessonTests.map((test) => (
                        <div key={test.id} className="flex items-center justify-between p-3 bg-fox-light/50 rounded-xl">
                          <div>
                            <p className="text-sm font-medium text-fox-dark">{test.title}</p>
                            <p className="text-xs text-fox-gray/70">
                              Проходной: {test.passing_score}% · Попыток: {test.max_attempts}
                            </p>
                          </div>
                          <Button size="sm" variant="danger" onClick={() => deleteTest(test.id)}>
                            Удалить
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-fox-gray/70 mb-4">Тест ещё не создан</p>
                  )}

                  <div className="space-y-3 border-t border-fox-border pt-4">
                    <Input
                      label="Название теста"
                      value={testForm.title || ''}
                      onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <Input
                        label="Проходной балл"
                        type="number"
                        value={testForm.passing_score || 70}
                        onChange={(e) => setTestForm({ ...testForm, passing_score: Number(e.target.value) })}
                      />
                      <Input
                        label="Попыток"
                        type="number"
                        value={testForm.max_attempts || 3}
                        onChange={(e) => setTestForm({ ...testForm, max_attempts: Number(e.target.value) })}
                      />
                      <Input
                        label="Минут"
                        type="number"
                        value={testForm.time_limit_minutes || ''}
                        onChange={(e) => setTestForm({ ...testForm, time_limit_minutes: Number(e.target.value) || undefined })}
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-fox-graphite">Вопросы</p>
                      {questions.map((q, idx) => (
                        <div key={idx} className="p-3 bg-fox-light/50 rounded-xl space-y-2">
                          <Input
                            placeholder="Текст вопроса"
                            value={q.question_text || ''}
                            onChange={(e) => {
                              const next = [...questions]
                              next[idx].question_text = e.target.value
                              setQuestions(next)
                            }}
                          />
                          <Input
                            placeholder="Варианты через ;"
                            value={q.options || ''}
                            onChange={(e) => {
                              const next = [...questions]
                              next[idx].options = e.target.value
                              setQuestions(next)
                            }}
                          />
                          <Input
                            placeholder="Правильные ответы через ;"
                            value={q.correct_answers || ''}
                            onChange={(e) => {
                              const next = [...questions]
                              next[idx].correct_answers = e.target.value
                              setQuestions(next)
                            }}
                          />
                          <Input
                            placeholder="Баллы"
                            type="number"
                            value={q.points || 1}
                            onChange={(e) => {
                              const next = [...questions]
                              next[idx].points = Number(e.target.value)
                              setQuestions(next)
                            }}
                          />
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setQuestions([...questions, {}])}
                      >
                        + Добавить вопрос
                      </Button>
                    </div>

                    <Button onClick={createTest} disabled={!testForm.title}>
                      Создать тест
                    </Button>
                  </div>
                </Card>

                <Card>
                  <h3 className="font-bold text-fox-dark mb-4 flex items-center gap-2"><LuHouse size={16} /> Домашнее задание</h3>
                  {lessonHomeworks.length > 0 ? (
                    <p className="text-sm text-fox-gray mb-4">
                      Назначено {lessonHomeworks.length} ученикам
                    </p>
                  ) : (
                    <p className="text-sm text-fox-gray/70 mb-4">ДЗ ещё не назначено</p>
                  )}
                  <div className="space-y-3">
                    <Input
                      label="Заголовок"
                      value={homeworkForm.title || ''}
                      onChange={(e) => setHomeworkForm({ ...homeworkForm, title: e.target.value })}
                    />
                    <Input
                      label="Описание"
                      value={homeworkForm.description || ''}
                      onChange={(e) => setHomeworkForm({ ...homeworkForm, description: e.target.value })}
                    />
                    <Input
                      label="Содержание / инструкция"
                      value={homeworkForm.content || ''}
                      onChange={(e) => setHomeworkForm({ ...homeworkForm, content: e.target.value })}
                    />
                    <div>
                      <label className="block text-sm font-medium text-fox-graphite mb-1.5">Группа (необязательно)</label>
                      <select
                        className="w-full rounded-xl border border-fox-border bg-white px-4 py-2.5 text-sm"
                        value={homeworkForm.group_id || ''}
                        onChange={(e) =>
                          setHomeworkForm({ ...homeworkForm, group_id: e.target.value ? Number(e.target.value) : undefined })
                        }
                      >
                        <option value="">Все ученики курса</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button onClick={assignHomework}>Назначить ДЗ</Button>
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Course modal */}
      {courseModal && (
        <Modal
          isOpen
          onClose={() => setCourseModal(null)}
          title={courseModal.id ? 'Редактировать курс' : 'Новый курс'}
          footer={
            <ModalFooterActions
              onCancel={() => setCourseModal(null)}
              onConfirm={saveCourse}
              confirmText="Сохранить"
            />
          }
        >
          <div className="space-y-3">
            <Input
              label="Название"
              value={courseModal.title}
              onChange={(e) => setCourseModal({ ...courseModal, title: e.target.value })}
            />
            <Input
              label="Описание"
              value={courseModal.description || ''}
              onChange={(e) => setCourseModal({ ...courseModal, description: e.target.value })}
            />
          </div>
        </Modal>
      )}

      {/* Module modal */}
      {moduleModal && (
        <Modal
          isOpen
          onClose={() => setModuleModal(null)}
          title={moduleModal.id ? 'Редактировать модуль' : 'Новый модуль'}
          footer={
            <ModalFooterActions
              onCancel={() => setModuleModal(null)}
              onConfirm={saveModule}
              confirmText="Сохранить"
            />
          }
        >
          <div className="space-y-3">
            <Input
              label="Название"
              value={moduleModal.title}
              onChange={(e) => setModuleModal({ ...moduleModal, title: e.target.value })}
            />
            <Input
              label="Описание"
              value={moduleModal.description || ''}
              onChange={(e) => setModuleModal({ ...moduleModal, description: e.target.value })}
            />
          </div>
        </Modal>
      )}

      {/* Lesson modal */}
      {lessonModal && (
        <Modal
          isOpen
          onClose={() => setLessonModal(null)}
          title={lessonModal.id ? 'Редактировать урок' : 'Новый урок'}
          footer={
            <ModalFooterActions
              onCancel={() => setLessonModal(null)}
              onConfirm={saveLesson}
              confirmText="Сохранить"
            />
          }
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <Input
              label="Название"
              value={lessonModal.title || ''}
              onChange={(e) => setLessonModal({ ...lessonModal, title: e.target.value })}
            />
            <Input
              label="Описание"
              value={lessonModal.description || ''}
              onChange={(e) => setLessonModal({ ...lessonModal, description: e.target.value })}
            />
            <Input
              label="Длительность, мин"
              type="number"
              value={lessonModal.duration_minutes || 15}
              onChange={(e) => setLessonModal({ ...lessonModal, duration_minutes: Number(e.target.value) })}
            />

            <div>
              <label className="block text-sm font-medium text-fox-graphite mb-1.5">Формат урока</label>
              <select
                className="w-full rounded-xl border border-fox-border bg-white px-4 py-2.5 text-sm"
                value={lessonModal.lesson_type || 'text'}
                onChange={(e) =>
                  setLessonModal({
                    ...lessonModal,
                    lesson_type: e.target.value,
                    test: e.target.value === 'test' ? lessonModal.test || { questions: [] } : undefined,
                    homework: e.target.value === 'homework' ? lessonModal.homework || { title: '', description: '' } : undefined,
                  })
                }
              >
                {LESSON_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {lessonModal.lesson_type === 'test' && (
              <div className="space-y-3 border-t border-fox-border pt-3">
                <p className="text-sm font-medium text-fox-graphite">Настройки теста</p>
                <Input
                  label="Название теста"
                  value={lessonModal.test?.title || ''}
                  onChange={(e) =>
                    setLessonModal({
                      ...lessonModal,
                      test: { ...lessonModal.test, title: e.target.value },
                    })
                  }
                />
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    label="Проходной балл, %"
                    type="number"
                    value={lessonModal.test?.passing_score || 70}
                    onChange={(e) =>
                      setLessonModal({
                        ...lessonModal,
                        test: { ...lessonModal.test, passing_score: Number(e.target.value) },
                      })
                    }
                  />
                  <Input
                    label="Попыток"
                    type="number"
                    value={lessonModal.test?.max_attempts || 3}
                    onChange={(e) =>
                      setLessonModal({
                        ...lessonModal,
                        test: { ...lessonModal.test, max_attempts: Number(e.target.value) },
                      })
                    }
                  />
                  <Input
                    label="Минут"
                    type="number"
                    value={lessonModal.test?.time_limit_minutes || ''}
                    onChange={(e) =>
                      setLessonModal({
                        ...lessonModal,
                        test: { ...lessonModal.test, time_limit_minutes: e.target.value ? Number(e.target.value) : undefined },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-fox-graphite">Вопросы</p>
                  {(lessonModal.test?.questions || []).map((q: any, idx: number) => (
                    <div key={idx} className="p-3 bg-fox-light/50 rounded-xl space-y-2">
                      <Input
                        placeholder="Текст вопроса"
                        value={q.question_text || ''}
                        onChange={(e) => {
                          const next = { ...lessonModal.test, questions: [...(lessonModal.test?.questions || [])] }
                          next.questions[idx] = { ...next.questions[idx], question_text: e.target.value }
                          setLessonModal({ ...lessonModal, test: next })
                        }}
                      />
                      <select
                        className="w-full rounded-xl border border-fox-border bg-white px-3 py-2 text-sm"
                        value={q.question_type || 'single'}
                        onChange={(e) => {
                          const next = { ...lessonModal.test, questions: [...(lessonModal.test?.questions || [])] }
                          next.questions[idx] = { ...next.questions[idx], question_type: e.target.value }
                          setLessonModal({ ...lessonModal, test: next })
                        }}
                      >
                        <option value="single">Один правильный ответ</option>
                        <option value="multiple">Несколько правильных ответов</option>
                        <option value="text">Текстовый ответ</option>
                      </select>
                      <Input
                        placeholder="Варианты ответов через ;"
                        value={q.options || ''}
                        onChange={(e) => {
                          const next = { ...lessonModal.test, questions: [...(lessonModal.test?.questions || [])] }
                          next.questions[idx] = { ...next.questions[idx], options: e.target.value }
                          setLessonModal({ ...lessonModal, test: next })
                        }}
                      />
                      <Input
                        placeholder="Правильные ответы через ;"
                        value={q.correct_answers || ''}
                        onChange={(e) => {
                          const next = { ...lessonModal.test, questions: [...(lessonModal.test?.questions || [])] }
                          next.questions[idx] = { ...next.questions[idx], correct_answers: e.target.value }
                          setLessonModal({ ...lessonModal, test: next })
                        }}
                      />
                      <Input
                        placeholder="Баллы"
                        type="number"
                        value={q.points || 1}
                        onChange={(e) => {
                          const next = { ...lessonModal.test, questions: [...(lessonModal.test?.questions || [])] }
                          next.questions[idx] = { ...next.questions[idx], points: Number(e.target.value) }
                          setLessonModal({ ...lessonModal, test: next })
                        }}
                      />
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          const next = { ...lessonModal.test, questions: (lessonModal.test?.questions || []).filter((_: any, i: number) => i !== idx) }
                          setLessonModal({ ...lessonModal, test: next })
                        }}
                      >
                        Удалить вопрос
                      </Button>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const next = {
                        ...lessonModal.test,
                        questions: [...(lessonModal.test?.questions || []), { question_type: 'single', points: 1 }],
                      }
                      setLessonModal({ ...lessonModal, test: next })
                    }}
                  >
                    + Добавить вопрос
                  </Button>
                </div>
              </div>
            )}

            {lessonModal.lesson_type === 'homework' && (
              <div className="space-y-3 border-t border-fox-border pt-3">
                <p className="text-sm font-medium text-fox-graphite">Настройки ДЗ</p>
                <Input
                  label="Заголовок ДЗ"
                  value={lessonModal.homework?.title || ''}
                  onChange={(e) =>
                    setLessonModal({
                      ...lessonModal,
                      homework: { ...lessonModal.homework, title: e.target.value },
                    })
                  }
                />
                <Input
                  label="Описание ДЗ"
                  value={lessonModal.homework?.description || ''}
                  onChange={(e) =>
                    setLessonModal({
                      ...lessonModal,
                      homework: { ...lessonModal.homework, description: e.target.value },
                    })
                  }
                />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
