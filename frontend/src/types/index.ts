// Common API response wrapper used by backend
export interface ApiResponse<T> {
  data: T
  message?: string
  meta?: Record<string, unknown>
}

export interface User {
  id: number
  email: string
  name: string
  role: string
  plan: string
  is_active?: boolean
  is_verified?: boolean
  avatar_url?: string | null
  phone?: string | null
  bio?: string | null
  organization_id?: number | null
  branch_id?: number | null
  group_id?: number | null
  telegram_chat_id?: string | null
  last_login_at?: string
  created_at?: string
}

export interface Course {
  id: number
  title: string
  description?: string
  short_description?: string
  type: string
  status: string
  passing_score: number
  is_sequential: boolean
  certificate_enabled: boolean
  modules: Module[]
  created_at: string
}

export interface Module {
  id: number
  title: string
  description?: string
  order_index: number
  course_id?: number
  lessons: Lesson[]
}

export interface Lesson {
  id: number
  title: string
  description?: string
  lesson_type: string
  duration_minutes: number
  order_index: number
  is_active: boolean
}

export interface Schedule {
  id: number
  title: string
  group_id?: number
  teacher_id?: number
  course_id?: number
  lesson_id?: number
  branch_id?: number
  start_time: string
  end_time: string
  description?: string
  room?: string
  status: string
  recurrence?: string
  created_at: string
}

export interface Group {
  id: number
  name: string
  course_id?: number
  teacher_id?: number
  branch_id?: number
  level?: string
  status?: string
  created_at?: string
}

export interface Homework {
  id: number
  student_id: number
  lesson_id?: number
  title?: string
  description?: string
  status: string
  file_url?: string | null
  created_at: string
}

export interface Test {
  id: number
  title: string
  description?: string
  lesson_id: number
  passing_score: number
  time_limit_minutes?: number
  max_attempts: number
  is_active: boolean
  created_at: string
  updated_at: string
  questions?: TestQuestion[]
}

export interface TestQuestion {
  id: number
  test_id: number
  order_index: number
  question_text: string
  question_type: string
  options?: string
  correct_answers?: string
  points: number
}

export interface HomeworkReview {
  id: number
  homework_id: number
  reviewer_id: number
  score?: number
  comment?: string
  status: string
  created_at: string
}

export interface Payment {
  id: number
  student_id: number
  amount: number
  type: 'income' | 'refund'
  method: string
  status: string
  description?: string
  created_at: string
}

export interface Transaction {
  id: number
  user_id: number
  amount: number
  type: string
  balance_after: number
  description?: string
  created_at: string
}

export interface Lead {
  id: number
  name: string
  email?: string
  phone?: string
  source?: string
  status: string
  manager_id?: number
  comment?: string
  created_at: string
}

export interface Deal {
  id: number
  lead_id: number
  title: string
  amount: number
  status: string
  created_at: string
}

export interface NotificationItem {
  id: number
  user_id: number
  title: string
  message: string
  type: string
  link?: string
  entity_type?: string
  entity_id?: number
  is_read: boolean
  read_at?: string
  created_at: string
}

export interface ChatRoom {
  id: number
  name: string
  type: string
  group_id?: number
  participant_ids?: number[]
  created_at: string
}

export interface ChatMessage {
  id: number
  room_id: number
  sender_id: number
  sender_name?: string
  content: string
  created_at: string
  is_deleted: boolean
}

export interface Organization {
  id: number
  name: string
  legal_name?: string
  inn?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  settings?: Record<string, unknown>
  created_at: string
}

export interface Branch {
  id: number
  organization_id: number
  name: string
  address?: string
  phone?: string
  email?: string
  timezone?: string
  is_active: boolean
  created_at: string
}

export interface Enrollment {
  id: number
  student_id: number
  course_id: number
  group_id?: number
  status: string
  created_at: string
}

export interface LessonProgress {
  id: number
  student_id: number
  lesson_id: number
  status: string
  score?: number
  completed_at?: string
  created_at: string
}

export interface Achievement {
  id: number
  title: string
  description?: string
  icon?: string
  points?: number
  created_at?: string
}

export interface DashboardAnalytics {
  users_by_role: Record<string, number>
  total_income_kopecks: number
  leads_by_status: Record<string, number>
  deals_by_status: Record<string, number>
  enrollments_by_status: Record<string, number>
  homeworks_by_status: Record<string, number>
  progress_by_status: Record<string, number>
}

export interface FinanceAnalytics {
  income_kopecks: number
  refund_kopecks: number
  net_kopecks: number
}

export interface SystemPermissionsResponse {
  role_permissions: Record<string, string[]>
  role_hierarchy: Record<string, string[]>
  module_permissions: Record<string, string[]>
  endpoints: { method: string; path: string }[]
  endpoints_count: number
}
