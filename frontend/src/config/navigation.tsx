import type React from 'react'
import {
  LuLayoutDashboard,
  LuHouse,
  LuTrendingUp,
  LuBuilding,
  LuUsers,
  LuUser,
  LuGraduationCap,
  LuChartBarBig,
  LuClipboardList,
  LuMegaphone,
  LuBookOpen,
  LuCalendar,
  LuMessageSquare,
  LuBell,
  LuSparkles,
  LuSettings,
  LuShield,
  LuPuzzle,
  LuNotebookPen,
  LuSchool,
  LuAward,
  LuChartLine,
  LuLibrary,
  LuUsersRound,
  LuCreditCard,
  LuBrain,
  LuListChecks,
} from 'react-icons/lu'
import NotificationBadge from '../components/NotificationBadge'
import HomeworkBadge from '../components/HomeworkBadge'

export interface MenuItem {
  to?: string
  label: string
  icon?: React.ReactNode
  badge?: number | React.ReactNode
  roles?: string[]
  children?: MenuItem[]
  defaultOpen?: boolean
}

export interface MenuGroup {
  title?: string
  icon?: React.ReactNode
  items: MenuItem[]
  collapsible?: boolean
  defaultOpen?: boolean
}

const badgeNotification = <NotificationBadge key="notifications" />
const badgeHomework = <HomeworkBadge key="homeworks" />

export const adminGroups: MenuGroup[] = [
  {
    title: 'Управление школой',
    collapsible: true,
    defaultOpen: true,
    items: [
      { to: '/school-settings', label: 'Настройки системы', icon: <LuSchool /> },
      { to: '/branches', label: 'Филиалы', icon: <LuBuilding /> },
      { to: '/directories', label: 'Справочники', icon: <LuBookOpen /> },
      { to: '/reports', label: 'Отчеты', icon: <LuChartBarBig /> },
      { to: '/surveys', label: 'Опросы в приложении', icon: <LuClipboardList /> },
    ],
  },
  {
    title: 'Учебный процесс',
    collapsible: true,
    defaultOpen: false,
    items: [
      { to: '/groups', label: 'Группы', icon: <LuUsers /> },
      { to: '/students', label: 'Ученики', icon: <LuGraduationCap /> },
      { to: '/calendar', label: 'Расписание', icon: <LuCalendar /> },
      { to: '/courses', label: 'Курсы', icon: <LuBookOpen /> },
      { to: '/homeworks', label: 'Домашние задания', icon: <LuNotebookPen />, badge: badgeHomework },
      { to: '/course-builder', label: 'Конструктор', icon: <LuPuzzle /> },
    ],
  },
  {
    title: 'Продажи',
    collapsible: true,
    defaultOpen: false,
    items: [
      { to: '/crm', label: 'CRM', icon: <LuClipboardList /> },
      { to: '/marketing', label: 'Маркетинг', icon: <LuMegaphone /> },
      { to: '/tasks', label: 'Задачи', icon: <LuListChecks /> },
    ],
  },
  {
    title: 'Финансы, кадры',
    collapsible: true,
    defaultOpen: false,
    items: [
      { to: '/finance', label: 'Финансы', icon: <LuTrendingUp /> },
      { to: '/employees', label: 'Сотрудники', icon: <LuUsers /> },
      { to: '/analytics', label: 'Аналитика', icon: <LuChartBarBig /> },
    ],
  },
  {
    title: 'Инструменты',
    collapsible: true,
    defaultOpen: false,
    items: [
      { to: '/ai', label: 'AI Помощник', icon: <LuSparkles /> },
      { to: '/system-center', label: 'OS Center', icon: <LuSettings /> },
      { to: '/roles', label: 'Role Ecosystem', icon: <LuShield /> },
      { to: '/notifications', label: 'Уведомления', icon: <LuBell />, badge: badgeNotification },
      { to: '/chats', label: 'Чаты', icon: <LuMessageSquare /> },
      { to: '/settings', label: 'Настройки профиля', icon: <LuUser /> },
    ],
  },
]

export const teacherGroups: MenuGroup[] = [
  {
    items: [
      { to: '/teacher-dashboard', label: 'Главная', icon: <LuHouse /> },
      { to: '/tasks', label: 'Задачи', icon: <LuListChecks />, badge: badgeHomework },
    ],
  },
  {
    title: 'Учебный процесс',
    collapsible: true,
    defaultOpen: true,
    items: [
      { to: '/groups', label: 'Группы', icon: <LuUsers /> },
      { to: '/calendar', label: 'Расписание', icon: <LuCalendar /> },
    ],
  },
  {
    title: 'Академия педагогов',
    collapsible: true,
    defaultOpen: false,
    items: [
      { to: '/academy', label: 'Академия', icon: <LuSchool /> },
      { to: '/knowledge', label: 'База знаний', icon: <LuBrain /> },
      { to: '/library', label: 'Библиотека', icon: <LuLibrary /> },
      { to: '/certification', label: 'Сертификация', icon: <LuAward /> },
    ],
  },
  {
    title: 'Курсы',
    collapsible: true,
    defaultOpen: false,
    items: [
      { to: '/courses', label: 'Курсы', icon: <LuBookOpen /> },
      { to: '/course-builder', label: 'Конструктор', icon: <LuPuzzle /> },
    ],
  },
  {
    items: [
      { to: '/homeworks', label: 'Домашние задания', icon: <LuNotebookPen />, badge: badgeHomework },
      { to: '/my-courses', label: 'Мои курсы', icon: <LuBookOpen /> },
      { to: '/progress', label: 'Мой прогресс', icon: <LuChartLine /> },
      { to: '/ai', label: 'AI Помощник', icon: <LuSparkles /> },
      { to: '/chats', label: 'Чаты', icon: <LuMessageSquare /> },
      { to: '/notifications', label: 'Уведомления', icon: <LuBell />, badge: badgeNotification },
      { to: '/settings', label: 'Настройки', icon: <LuSettings /> },
    ],
  },
]

export const studentGroups: MenuGroup[] = [
  {
    items: [
      { to: '/dashboard', label: 'Главная', icon: <LuHouse /> },
      { to: '/my-courses', label: 'Мои курсы', icon: <LuBookOpen /> },
      { to: '/homeworks', label: 'Домашние задания', icon: <LuNotebookPen /> },
      { to: '/progress', label: 'Мой прогресс', icon: <LuChartLine /> },
      { to: '/library', label: 'Библиотека', icon: <LuLibrary /> },
      { to: '/calendar', label: 'Календарь', icon: <LuCalendar /> },
      { to: '/chats', label: 'Чаты', icon: <LuMessageSquare /> },
      { to: '/notifications', label: 'Уведомления', icon: <LuBell />, badge: badgeNotification },
      { to: '/settings', label: 'Настройки', icon: <LuSettings /> },
    ],
  },
]

export const managerGroups: MenuGroup[] = [
  {
    items: [
      { to: '/dashboard', label: 'Главная', icon: <LuHouse /> },
      { to: '/crm', label: 'CRM', icon: <LuClipboardList /> },
      { to: '/finance', label: 'Финансы', icon: <LuTrendingUp /> },
      { to: '/analytics', label: 'Аналитика', icon: <LuChartBarBig /> },
      { to: '/marketing', label: 'Маркетинг', icon: <LuMegaphone /> },
      { to: '/settings', label: 'Настройки', icon: <LuSettings /> },
    ],
  },
]

export const methodistGroups: MenuGroup[] = [
  {
    items: [{ to: '/methodist-dashboard', label: 'Дашборд', icon: <LuLayoutDashboard /> }],
  },
  {
    title: 'Академия',
    items: [
      { to: '/academy', label: 'Академия педагогов', icon: <LuSchool /> },
      { to: '/knowledge', label: 'База знаний', icon: <LuBrain /> },
    ],
  },
  {
    title: 'Курсы',
    items: [
      { to: '/courses', label: 'Курсы', icon: <LuBookOpen /> },
      { to: '/course-builder', label: 'Конструктор курсов', icon: <LuPuzzle /> },
    ],
  },
  {
    title: 'Учебный процесс',
    items: [
      { to: '/employee-groups', label: 'Группы сотрудников', icon: <LuUsersRound /> },
      { to: '/students', label: 'Ученики', icon: <LuGraduationCap /> },
      { to: '/homeworks', label: 'Проверка ДЗ', icon: <LuNotebookPen />, badge: badgeHomework },
      { to: '/calendar', label: 'Расписание', icon: <LuCalendar /> },
    ],
  },
  {
    title: 'Администрирование',
    items: [{ to: '/settings', label: 'Настройки', icon: <LuSettings /> }],
  },
]

export const parentGroups: MenuGroup[] = [
  {
    items: [
      { to: '/dashboard', label: 'Главная', icon: <LuHouse /> },
      { to: '/progress', label: 'Прогресс ребёнка', icon: <LuChartLine /> },
      { to: '/payments', label: 'Оплата', icon: <LuCreditCard /> },
      { to: '/settings', label: 'Настройки', icon: <LuSettings /> },
    ],
  },
]

export const guestGroups: MenuGroup[] = [
  {
    items: [
      { to: '/dashboard', label: 'Главная', icon: <LuHouse /> },
      { to: '/courses', label: 'Курсы', icon: <LuBookOpen /> },
      { to: '/settings', label: 'Настройки', icon: <LuSettings /> },
    ],
  },
]

export function groupsForRole(role: string): MenuGroup[] {
  if (role === 'teacher') return teacherGroups
  if (role === 'student') return studentGroups
  if (role === 'parent') return parentGroups
  if (role === 'manager') return managerGroups
  if (role === 'methodist') return methodistGroups
  if (role === 'guest') return guestGroups
  return adminGroups
}

export function roleLabel(role?: string) {
  const labels: Record<string, string> = {
    owner: 'Владелец',
    super_admin: 'Супер-админ',
    admin: 'Администратор',
    methodist: 'Методист',
    teacher: 'Педагог',
    manager: 'Менеджер',
    student: 'Ученик',
    parent: 'Родитель',
    guest: 'Гость',
  }
  return labels[role || ''] || role
}
