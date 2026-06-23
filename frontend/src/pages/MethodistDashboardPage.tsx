import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { useAuth } from '../contexts/AuthContext'
import { useToast, Button, Card, Loader, Tabs, Badge, Table, Thead, Th, Tbody, Tr, Td, PageShell } from '../components/ui'
import { methodistsApi } from '../api'
import type { MethodistAnalytics, PendingHomeworkItem, UpcomingScheduleItem } from '../types'
import {
  LuLayoutDashboard,
  LuBookOpen,
  LuGraduationCap,
  LuNotebookPen,
  LuUsers,
  LuUsersRound,
  LuCircleCheck,
  LuClock,
  LuChartLine,
} from 'react-icons/lu'

const TABS = [
  { id: 'overview', label: 'Обзор', icon: <LuLayoutDashboard /> },
  { id: 'courses', label: 'Курсы', icon: <LuBookOpen /> },
  { id: 'students', label: 'Студенты', icon: <LuGraduationCap /> },
  { id: 'homeworks', label: 'ДЗ и тесты', icon: <LuNotebookPen /> },
  { id: 'teachers', label: 'Преподаватели', icon: <LuUsers /> },
]

const RISK_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: 'Низкий', color: 'bg-fox-success/10 text-fox-success' },
  medium: { label: 'Средний', color: 'bg-fox-warning/10 text-fox-warning' },
  high: { label: 'Высокий', color: 'bg-fox-error/10 text-fox-error' },
}

const ACADEMY_STATUS_LABELS: Record<string, string> = {
  not_enrolled: 'Не зачислен',
  in_progress: 'В процессе',
  completed: 'Завершено',
}

const HOMEWORK_STATUS_LABELS: Record<string, string> = {
  assigned: 'Назначено',
  submitted: 'На проверке',
  reviewed: 'Проверено',
  revision: 'На доработке',
  rejected: 'Отклонено',
}

const COURSE_STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  published: 'Опубликован',
  archived: 'В архиве',
}

function formatDateTime(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const kpiVariants = {
  purple: 'bg-fox-purple text-white',
  gold: 'bg-fox-gold text-fox-purple',
  graphite: 'bg-fox-graphite text-white',
  outline: 'bg-fox-light text-fox-purple border border-fox-border',
}
type KpiVariant = keyof typeof kpiVariants

function KpiCard({ icon, value, label, variant = 'purple' }: { icon: React.ReactNode; value: string | number; label: string; variant?: KpiVariant }) {
  return (
    <Card className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${kpiVariants[variant]}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-fox-dark">{value}</p>
        <p className="text-xs text-fox-gray">{label}</p>
      </div>
    </Card>
  )
}

function ProgressBar({ value, label, color = 'bg-fox-purple' }: { value: number; label?: string; color?: string }) {
  const percent = Math.min(100, Math.max(0, value))
  return (
    <div className="w-full">
      {label && <div className="flex justify-between text-xs mb-1"><span className="text-fox-gray">{label}</span><span className="font-medium text-fox-dark">{percent}%</span></div>}
      <div className="h-2 w-full bg-fox-border rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function DonutChart({ segments, size = 120 }: { segments: { label: string; value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  const radius = size / 2 - 8
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--fox-border)" strokeWidth="12" />
        {segments.map((s, i) => {
          const dash = total ? (s.value / total) * circumference : 0
          const circle = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth="12"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          )
          offset += dash
          return circle
        })}
      </svg>
      <div className="space-y-1">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-fox-gray">{s.label}</span>
            <span className="font-medium text-fox-dark ml-auto">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RiskBadge({ status }: { status: string }) {
  const cfg = RISK_LABELS[status] || RISK_LABELS.low
  return <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-bold text-fox-dark">{title}</h3>
      {action}
    </div>
  )
}

export default function MethodistDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [analytics, setAnalytics] = useState<MethodistAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [courseFilter, setCourseFilter] = useState('')
  const [studentFilter, setStudentFilter] = useState('')
  const [teacherFilter, setTeacherFilter] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await methodistsApi.analytics()
        setAnalytics(data)
      } catch (err: any) {
        showToast(err.response?.data?.message || 'Не удалось загрузить аналитику', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [showToast])

  const overviewCards = useMemo(() => {
    if (!analytics) return []
    const o = analytics.overview
    return [
      { icon: <LuBookOpen />, value: o.courses_count, label: 'Курсов', variant: 'purple' as const, path: '/courses' },
      { icon: <LuUsersRound />, value: o.groups_count, label: 'Групп', variant: 'gold' as const, path: '/employee-groups' },
      { icon: <LuGraduationCap />, value: o.students_count, label: 'Учеников', variant: 'graphite' as const, path: '/students' },
      { icon: <LuUsers />, value: o.teachers_count, label: 'Преподавателей', variant: 'outline' as const, path: '/employee-groups' },
      { icon: <LuNotebookPen />, value: o.pending_homeworks_count, label: 'ДЗ на проверку', variant: 'purple' as const, path: '/homeworks' },
      { icon: <LuClock />, value: o.overdue_homeworks_count, label: 'Просроченные ДЗ', variant: 'gold' as const, path: '/homeworks' },
      { icon: <LuChartLine />, value: `${o.average_progress_percent}%`, label: 'Средний прогресс', variant: 'graphite' as const },
      { icon: <LuCircleCheck />, value: `${o.average_attendance_percent}%`, label: 'Посещаемость', variant: 'outline' as const },
    ]
  }, [analytics])

  const filteredCourses = useMemo(() => {
    if (!analytics) return []
    if (!courseFilter.trim()) return analytics.courses
    const q = courseFilter.toLowerCase()
    return analytics.courses.filter((c) => c.title.toLowerCase().includes(q))
  }, [analytics, courseFilter])

  const filteredStudents = useMemo(() => {
    if (!analytics) return []
    if (!studentFilter.trim()) return analytics.students
    const q = studentFilter.toLowerCase()
    return analytics.students.filter((s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q))
  }, [analytics, studentFilter])

  const filteredTeachers = useMemo(() => {
    if (!analytics) return []
    if (!teacherFilter.trim()) return analytics.teachers
    const q = teacherFilter.toLowerCase()
    return analytics.teachers.filter((t) => t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q))
  }, [analytics, teacherFilter])

  const homeworkSegments = useMemo(() => {
    if (!analytics) return []
    const counts = analytics.homeworks_and_tests.homework_status_counts
    return [
      { label: HOMEWORK_STATUS_LABELS.assigned, value: counts.assigned, color: '#6B6B7B' },
      { label: HOMEWORK_STATUS_LABELS.submitted, value: counts.submitted, color: '#F59E0B' },
      { label: HOMEWORK_STATUS_LABELS.reviewed, value: counts.reviewed, color: '#22C55E' },
      { label: HOMEWORK_STATUS_LABELS.revision, value: counts.revision, color: '#3A2953' },
      { label: HOMEWORK_STATUS_LABELS.rejected, value: counts.rejected, color: '#EF4444' },
    ].filter((s) => s.value > 0)
  }, [analytics])

  if (loading || !analytics) {
    return (
      <PageShell>
        <Header title="Дашборд методиста" subtitle="Обзор учебного процесса" icon={<LuLayoutDashboard />} />
        <div className="p-6 w-full">
          <Loader text="Загрузка аналитики..." />
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <Header
        title="Дашборд методиста"
        subtitle={`Добро пожаловать, ${user?.name || user?.email || 'методист'}!`}
        icon={<LuLayoutDashboard />}
      />

      <div className="p-4 md:p-6 w-full space-y-6">
        <div className="relative overflow-hidden rounded-card p-6 md:p-8 border border-fox-border/60 bg-white shadow-fox-lg">
          <div
            className="absolute top-0 right-0 w-64 h-64 pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage: 'url(/brand/swirl-2.png)',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'top right',
            }}
          />
          <div className="relative z-10 flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-fox-purple text-fox-gold shadow-md flex-shrink-0">
              <LuLayoutDashboard size={28} />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fox-purple/10 text-fox-purple text-xs font-semibold mb-2">
                Методист
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-fox-purple mb-2">
                Обзор учебного процесса
              </h2>
              <p className="text-fox-gray max-w-xl">
                {analytics.overview.courses_count} курсов, {analytics.overview.students_count} учеников,{' '}
                {analytics.overview.teachers_count} преподавателей.
              </p>
            </div>
          </div>
        </div>

        <Card className="p-0 overflow-hidden">
          <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
          <div className="p-5">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {overviewCards.map((card) => (
                    <div key={card.label} onClick={() => card.path && navigate(card.path)} className={card.path ? 'cursor-pointer' : ''}>
                      <KpiCard icon={card.icon} value={card.value} label={card.label} variant={card.variant} />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Card className="lg:col-span-1 space-y-4">
                    <SectionHeader title="Распределение ДЗ" />
                    {homeworkSegments.length > 0 ? (
                      <DonutChart segments={homeworkSegments} />
                    ) : (
                      <p className="text-sm text-fox-gray">Нет данных по домашним заданиям</p>
                    )}
                  </Card>

                  <Card className="lg:col-span-1 space-y-4">
                    <SectionHeader title="Ключевые показатели" />
                    <div className="space-y-4">
                      <ProgressBar value={analytics.overview.average_progress_percent} label="Средний прогресс по курсам" />
                      <ProgressBar value={analytics.overview.average_attendance_percent} label="Средняя посещаемость" color="bg-fox-gold" />
                      <ProgressBar
                        value={analytics.overview.published_courses_count && analytics.overview.courses_count ? Math.round((analytics.overview.published_courses_count / analytics.overview.courses_count) * 100) : 0}
                        label="Опубликовано курсов"
                        color="bg-emerald-500"
                      />
                    </div>
                  </Card>

                  <Card className="lg:col-span-1 space-y-4">
                    <SectionHeader title="Быстрые действия" />
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => navigate('/courses')}>Курсы</Button>
                      <Button variant="secondary" onClick={() => navigate('/academy')}>Академия</Button>
                      <Button variant="secondary" onClick={() => navigate('/homeworks')}>Проверка ДЗ</Button>
                      <Button variant="secondary" onClick={() => navigate('/employee-groups')}>Группы</Button>
                      <Button variant="secondary" onClick={() => navigate('/students')}>Ученики</Button>
                      <Button variant="secondary" onClick={() => navigate('/course-builder')}>Конструктор</Button>
                    </div>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="space-y-4">
                    <SectionHeader
                      title="ДЗ на проверку"
                      action={<Button size="sm" variant="ghost" onClick={() => navigate('/homeworks')}>Все ДЗ</Button>}
                    />
                    {analytics.homeworks_and_tests.pending_homeworks.length === 0 ? (
                      <p className="text-sm text-fox-gray">Нет заданий на проверку</p>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {analytics.homeworks_and_tests.pending_homeworks.map((hw) => (
                          <PendingHomeworkRow key={hw.id} homework={hw} />
                        ))}
                      </div>
                    )}
                  </Card>

                  <Card className="space-y-4">
                    <SectionHeader title="Ближайшие занятия" />
                    {analytics.upcoming_schedule.length === 0 ? (
                      <p className="text-sm text-fox-gray">Нет запланированных занятий</p>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {analytics.upcoming_schedule.map((s) => (
                          <ScheduleRow key={s.id} schedule={s} />
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 'courses' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 justify-between">
                  <input
                    type="text"
                    placeholder="Поиск курса..."
                    value={courseFilter}
                    onChange={(e) => setCourseFilter(e.target.value)}
                    className="px-3 py-2 border border-fox-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-fox-gold/50 sm:max-w-sm"
                  />
                  <Button onClick={() => navigate('/courses')}>Управление курсами</Button>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <Thead>
                      <Tr>
                        <Th>Курс</Th>
                        <Th>Статус</Th>
                        <Th>Модули</Th>
                        <Th>Уроки</Th>
                        <Th>Студенты</Th>
                        <Th>Средний прогресс</Th>
                        <Th>Завершено</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filteredCourses.map((course) => (
                        <Tr key={course.id}>
                          <Td>
                            <div className="font-medium text-fox-dark">{course.title}</div>
                            <div className="text-xs text-fox-gray/70">{course.type}</div>
                          </Td>
                          <Td><Badge variant={course.status === 'published' ? 'success' : 'default'}>{COURSE_STATUS_LABELS[course.status] || course.status}</Badge></Td>
                          <Td>{course.modules_count}</Td>
                          <Td>{course.lessons_count}</Td>
                          <Td>{course.students_count}</Td>
                          <Td>
                            <ProgressBar value={course.average_progress_percent} />
                          </Td>
                          <Td>{course.completion_rate_percent}%</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </div>
                {filteredCourses.length === 0 && <p className="text-sm text-fox-gray text-center py-4">Курсы не найдены</p>}
              </div>
            )}

            {activeTab === 'students' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 justify-between">
                  <input
                    type="text"
                    placeholder="Поиск по имени или email..."
                    value={studentFilter}
                    onChange={(e) => setStudentFilter(e.target.value)}
                    className="px-3 py-2 border border-fox-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-fox-gold/50 sm:max-w-sm"
                  />
                  <Button onClick={() => navigate('/students')}>Все ученики</Button>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <Thead>
                      <Tr>
                        <Th>Ученик</Th>
                        <Th>Группа</Th>
                        <Th>Курсы</Th>
                        <Th>Прогресс</Th>
                        <Th>ДЗ</Th>
                        <Th>Посещаемость</Th>
                        <Th>Риск</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filteredStudents.map((student) => (
                        <Tr key={student.id}>
                          <Td>
                            <div className="font-medium text-fox-dark">{student.name}</div>
                            <div className="text-xs text-fox-gray/70">{student.email}</div>
                          </Td>
                          <Td>{student.group_name || '—'}</Td>
                          <Td>{student.active_enrollments_count}</Td>
                          <Td>
                            <ProgressBar value={student.average_progress_percent} />
                          </Td>
                          <Td>
                            <div className="text-xs">
                              <span className="text-fox-success">{student.homeworks_reviewed}</span>
                              {' / '}
                              <span className="text-fox-warning">{student.homeworks_submitted}</span>
                              {student.homeworks_overdue > 0 && (
                                <span className="ml-2 text-fox-error">+{student.homeworks_overdue} проср.</span>
                              )}
                            </div>
                          </Td>
                          <Td>{student.attendance_percent}%</Td>
                          <Td><RiskBadge status={student.risk_status} /></Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </div>
                {filteredStudents.length === 0 && <p className="text-sm text-fox-gray text-center py-4">Ученики не найдены</p>}
              </div>
            )}

            {activeTab === 'homeworks' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Card className="space-y-4">
                    <SectionHeader title="Статусы ДЗ" />
                    {homeworkSegments.length > 0 ? (
                      <DonutChart segments={homeworkSegments} />
                    ) : (
                      <p className="text-sm text-fox-gray">Нет данных</p>
                    )}
                  </Card>
                  <Card className="space-y-4">
                    <SectionHeader title="Тесты" />
                    <div className="grid grid-cols-2 gap-4">
                      <KpiCard icon={<LuNotebookPen />} value={analytics.homeworks_and_tests.average_test_score} label="Средний балл" variant="purple" />
                      <KpiCard icon={<LuCircleCheck />} value={`${analytics.homeworks_and_tests.test_pass_rate_percent}%`} label="Проходной балл" variant="outline" />
                    </div>
                  </Card>
                  <Card className="space-y-4">
                    <SectionHeader title="Действия" />
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => navigate('/homeworks')}>Проверить ДЗ</Button>
                      <Button variant="secondary" onClick={() => navigate('/course-builder')}>Добавить тест</Button>
                    </div>
                  </Card>
                </div>

                <Card className="space-y-4">
                  <SectionHeader title="ДЗ на проверку" />
                  {analytics.homeworks_and_tests.pending_homeworks.length === 0 ? (
                    <p className="text-sm text-fox-gray">Нет заданий на проверку</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <Thead>
                          <Tr>
                            <Th>Задание</Th>
                            <Th>Ученик</Th>
                            <Th>Урок</Th>
                            <Th>Сдано</Th>
                            <Th>Статус</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {analytics.homeworks_and_tests.pending_homeworks.map((hw) => (
                            <Tr key={hw.id}>
                              <Td>{hw.title}</Td>
                              <Td>{hw.student_name}</Td>
                              <Td>{hw.lesson_title}</Td>
                              <Td>{formatDateTime(hw.submitted_at)}</Td>
                              <Td>{hw.is_overdue ? <Badge variant="error">Просрочено</Badge> : <Badge variant="warning">На проверке</Badge>}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </div>
                  )}
                </Card>

                <Card className="space-y-4">
                  <SectionHeader title="Последние тесты" />
                  {analytics.homeworks_and_tests.recent_test_attempts.length === 0 ? (
                    <p className="text-sm text-fox-gray">Нет завершённых тестов</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <Thead>
                          <Tr>
                            <Th>Тест</Th>
                            <Th>Ученик</Th>
                            <Th>Балл</Th>
                            <Th>Результат</Th>
                            <Th>Завершено</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {analytics.homeworks_and_tests.recent_test_attempts.map((attempt) => (
                            <Tr key={attempt.id}>
                              <Td>{attempt.test_title}</Td>
                              <Td>{attempt.student_name}</Td>
                              <Td>{attempt.score} / {attempt.max_score}</Td>
                              <Td>{attempt.is_passed ? <Badge variant="success">Сдан</Badge> : <Badge variant="error">Не сдан</Badge>}</Td>
                              <Td>{formatDateTime(attempt.finished_at)}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {activeTab === 'teachers' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 justify-between">
                  <input
                    type="text"
                    placeholder="Поиск преподавателя..."
                    value={teacherFilter}
                    onChange={(e) => setTeacherFilter(e.target.value)}
                    className="px-3 py-2 border border-fox-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-fox-gold/50 sm:max-w-sm"
                  />
                  <Button onClick={() => navigate('/employee-groups')}>Группы сотрудников</Button>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <Thead>
                      <Tr>
                        <Th>Преподаватель</Th>
                        <Th>Группы</Th>
                        <Th>Ученики</Th>
                        <Th>Занятия</Th>
                        <Th>Академия</Th>
                        <Th>Прогресс в Академии</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filteredTeachers.map((teacher) => (
                        <Tr key={teacher.id}>
                          <Td>
                            <div className="font-medium text-fox-dark">{teacher.name}</div>
                            <div className="text-xs text-fox-gray/70">{teacher.email}</div>
                          </Td>
                          <Td>{teacher.groups_count}</Td>
                          <Td>{teacher.students_count}</Td>
                          <Td>{teacher.schedules_count}</Td>
                          <Td>
                            <Badge variant={teacher.academy_status === 'completed' ? 'success' : teacher.academy_status === 'in_progress' ? 'warning' : 'default'}>
                              {ACADEMY_STATUS_LABELS[teacher.academy_status]}
                            </Badge>
                          </Td>
                          <Td>
                            <ProgressBar value={teacher.academy_progress_percent} />
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </div>
                {filteredTeachers.length === 0 && <p className="text-sm text-fox-gray text-center py-4">Преподаватели не найдены</p>}
              </div>
            )}
          </div>
        </Card>
      </div>
    </PageShell>
  )
}

function PendingHomeworkRow({ homework }: { homework: PendingHomeworkItem }) {
  return (
    <div className="flex items-center justify-between p-3 bg-fox-light rounded-xl">
      <div>
        <div className="text-sm font-medium text-fox-dark">{homework.title}</div>
        <div className="text-xs text-fox-gray/70">{homework.student_name} • {homework.lesson_title}</div>
      </div>
      <div className="text-right">
        <div className="text-xs text-fox-gray">{formatDateTime(homework.submitted_at)}</div>
        {homework.is_overdue && <span className="text-xs text-fox-error font-medium">Просрочено</span>}
      </div>
    </div>
  )
}

function ScheduleRow({ schedule }: { schedule: UpcomingScheduleItem }) {
  return (
    <div className="flex items-center justify-between p-3 bg-fox-light rounded-xl">
      <div>
        <div className="text-sm font-medium text-fox-dark">{schedule.title}</div>
        <div className="text-xs text-fox-gray/70">
          {schedule.group_name || 'Без группы'} • {schedule.teacher_name}
          {schedule.room && ` • ${schedule.room}`}
        </div>
      </div>
      <div className="text-xs text-fox-gray text-right">
        <div>{formatDate(schedule.start_time)}</div>
        <div>{new Date(schedule.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} — {new Date(schedule.end_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    </div>
  )
}
