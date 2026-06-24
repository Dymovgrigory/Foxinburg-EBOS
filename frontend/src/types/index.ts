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
  position?: string | null
  employment_date?: string | null
  salary_type?: string
  salary_rate?: number
  hr_status?: string
  contract_number?: string | null
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

export interface LessonContent {
  id: number
  content_type: string
  title?: string
  body?: string
  file_url?: string
  external_url?: string
  yandex_disk_path?: string
  order_index?: number
}

export interface Lesson {
  id: number
  title: string
  description?: string
  lesson_type: string
  duration_minutes: number
  order_index: number
  is_active: boolean
  homework_title?: string
  homework_description?: string
  contents?: LessonContent[]
  test?: Test
}

export interface LessonPlayerData {
  lesson: Lesson
  progress?: LessonProgress
  homework?: Homework
  latest_test_attempt?: TestAttempt
  can_complete: boolean
  is_locked: boolean
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
  recurrence_end?: string | null
  color?: string | null
  is_online?: boolean
  topic?: string | null
  replacement_teacher_id?: number | null
  created_at: string
}

export interface ScheduleOccurrence {
  occurrence_id: string
  occurrence_date: string
  schedule_id: number
  title: string
  topic?: string | null
  description?: string | null
  group_id?: number | null
  teacher_id?: number | null
  replacement_teacher_id?: number | null
  branch_id?: number | null
  course_id?: number | null
  lesson_id?: number | null
  room?: string | null
  start_time: string
  end_time: string
  status: string
  color?: string | null
  is_online?: boolean
  recurrence?: string
  is_exception?: boolean
  is_cancelled?: boolean
}

export interface Attendance {
  id: number
  schedule_id: number
  student_id: number
  occurrence_date: string
  status: 'present' | 'absent' | 'late' | 'excused'
  notes?: string | null
  marked_by_id?: number | null
  marked_at: string
}

export interface ScheduleException {
  id: number
  schedule_id: number
  exception_date: string
  is_cancelled: boolean
  start_time?: string | null
  end_time?: string | null
  room?: string | null
  teacher_id?: number | null
  replacement_teacher_id?: number | null
  created_at: string
  updated_at: string
}

export interface Group {
  id: number
  name: string
  description?: string
  course_id?: number
  teacher_id?: number
  branch_id?: number
  room?: string
  study_type?: string
  language?: string
  level?: string
  max_students?: number
  status?: 'current' | 'planned' | 'closed'
  start_date?: string | null
  end_date?: string | null
  academic_hour_minutes?: number
  balance_type?: 'lessons' | 'rubles'
  hourly_rate?: number
  monthly_fee?: number | null
  auto_invoices_enabled?: boolean
  certificates_enabled?: boolean
  students_count?: number
  course_title?: string | null
  teacher_name?: string | null
  branch_name?: string | null
  students?: StudentInfo[]
  memberships?: GroupMembership[]
  created_at?: string
  updated_at?: string
}

export interface StudentInfo {
  id: number
  name: string
  email: string
  phone?: string | null
  is_active?: boolean
}

export interface GroupMembership {
  id: number
  group_id: number
  student_id: number
  student?: StudentInfo
  joined_at: string
  left_at?: string | null
  status: 'active' | 'left' | 'transferred'
  individual_hourly_rate?: number | null
  individual_lesson_count?: number | null
  discount_percent?: number
  individual_monthly_fee?: number | null
  auto_invoices_enabled?: boolean
  created_at?: string
  updated_at?: string
}

export interface GroupMembershipAdd {
  student_id?: number
  joined_at?: string
  status?: string
  individual_hourly_rate?: number
  individual_lesson_count?: number
  discount_percent?: number
  individual_monthly_fee?: number
  auto_invoices_enabled?: boolean
  new_student_name?: string
  new_student_email?: string
  new_student_password?: string
  new_student_phone?: string
}

export interface EmployeeGroup {
  id: number
  name: string
  description?: string
  group_type: string
  member_count?: number
  members: User[]
  created_at: string
  updated_at: string
}

export interface Homework {
  id: number
  student_id: number
  lesson_id?: number
  title?: string
  description?: string
  content?: string
  file_urls?: string
  status: string
  submitted_at?: string
  created_at: string
}

export interface Task {
  id: number
  title: string
  description?: string | null
  assignee_id?: number | null
  creator_id?: number | null
  contact_id?: number | null
  assignee_name?: string | null
  creator_name?: string | null
  contact_name?: string | null
  status: 'planned' | 'completed' | 'overdue'
  type?: string | null
  due_date?: string | null
  created_at: string
  updated_at: string
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

export interface TestAttempt {
  id: number
  test_id: number
  student_id: number
  answers?: string
  score: number
  max_score: number
  is_passed: boolean
  started_at: string
  finished_at?: string
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
  invoice_id?: number | null
  group_id?: number | null
  amount: number
  type: 'income' | 'refund'
  method: string
  status: string
  period_start?: string | null
  period_end?: string | null
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

export interface Invoice {
  id: number
  student_id: number
  group_id?: number | null
  membership_id?: number | null
  amount: number
  status: 'draft' | 'sent' | 'paid' | 'cancelled' | 'overdue'
  due_date?: string | null
  period_start?: string | null
  period_end?: string | null
  description?: string | null
  paid_at?: string | null
  created_at: string
  updated_at: string
}

export interface Expense {
  id: number
  branch_id?: number | null
  created_by_id?: number | null
  category: string
  amount: number
  expense_date: string
  description?: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface PayrollLessonItem {
  schedule_id: number
  title: string
  group_name?: string | null
  start_time: string
  end_time: string
  academic_hours: number
  amount_kopecks: number
}

export interface PayrollResponse {
  teacher_id: number
  teacher_name: string
  salary_type?: string
  period_start: string
  period_end: string
  rate_kopecks: number
  total_academic_hours: number
  total_amount_kopecks: number
  lessons: PayrollLessonItem[]
  expense_id?: number | null
}

export interface StaffLeave {
  id: number
  user_id: number
  leave_type: string
  start_date: string
  end_date: string
  status: string
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface StaffKpi {
  id: number
  user_id: number
  period_start: string
  period_end: string
  metric: string
  target: number
  actual: number
  unit: string
  notes?: string | null
  completion_percent: number
  created_at: string
  updated_at: string
}

export interface RoleConfig {
  id: number
  role: string
  label: string
  permissions: string[]
  is_custom: boolean
  is_active: boolean
  created_at: string
  updated_at: string
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
  short_name?: string
  description?: string
  logo_url?: string
  square_logo_url?: string
  wide_logo_url?: string
  certificate_bg_url?: string
  card_bg_url?: string
  website?: string
  email?: string
  license_number?: string
  direction?: string
  city?: string
  address?: string
  main_phone?: string
  timezone?: string
  currency?: string
  is_active?: number
  created_at: string
  updated_at: string
}

export interface Branch {
  id: number
  organization_id: number
  name: string
  city?: string
  address?: string
  phone?: string
  email?: string
  timezone?: string
  is_active: number
  created_at: string
}

export interface Directory {
  id: number
  kind: string
  name: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface SurveyQuestion {
  id?: number
  text: string
  type: 'single' | 'text' | 'rating'
  options: string[]
  order: number
}

export interface Survey {
  id: number
  title: string
  description?: string
  is_active: boolean
  target_roles: string[]
  anonymous: boolean
  created_by_id?: number
  created_at: string
  updated_at: string
  questions: SurveyQuestion[]
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
  invoices_total_kopecks: number
  invoices_paid_kopecks: number
  debt_kopecks: number
  expenses_kopecks: number
  pnl_kopecks: number
}

export interface PnLResponse {
  period_start: string
  period_end: string
  income_kopecks: number
  refund_kopecks: number
  expense_kopecks: number
  net_kopecks: number
}

export interface Subscription {
  id: number
  student_id: number
  group_id: number
  membership_id?: number | null
  type: 'lessons' | 'monthly' | 'unlimited'
  status: 'active' | 'frozen' | 'expired' | 'cancelled'
  start_date: string
  end_date?: string | null
  lessons_total: number
  lessons_used: number
  frozen_at?: string | null
  frozen_until?: string | null
  auto_renew: boolean
  monthly_fee: number
  created_at: string
  updated_at: string
}

export interface SystemPermissionsResponse {
  role_permissions: Record<string, string[]>
  role_hierarchy: Record<string, string[]>
  module_permissions: Record<string, string[]>
  endpoints: { method: string; path: string }[]
  endpoints_count: number
}

export interface MethodistOverview {
  courses_count: number
  published_courses_count: number
  groups_count: number
  employee_groups_count: number
  students_count: number
  teachers_count: number
  active_enrollments_count: number
  pending_homeworks_count: number
  overdue_homeworks_count: number
  average_progress_percent: number
  average_attendance_percent: number
}

export interface MethodistCourseStat {
  id: number
  title: string
  type: string
  status: string
  modules_count: number
  lessons_count: number
  students_count: number
  active_enrollments_count: number
  completed_enrollments_count: number
  average_progress_percent: number
  completion_rate_percent: number
}

export interface MethodistStudentStat {
  id: number
  name: string
  email: string
  group_id?: number | null
  group_name?: string | null
  active_enrollments_count: number
  average_progress_percent: number
  homeworks_submitted: number
  homeworks_reviewed: number
  homeworks_overdue: number
  attendance_percent: number
  risk_status: 'low' | 'medium' | 'high'
}

export interface HomeworkStatusCounts {
  assigned: number
  submitted: number
  reviewed: number
  revision: number
  rejected: number
}

export interface PendingHomeworkItem {
  id: number
  title: string
  student_name: string
  lesson_title: string
  submitted_at?: string
  is_overdue: boolean
}

export interface RecentTestAttemptItem {
  id: number
  student_name: string
  test_title: string
  score: number
  max_score: number
  is_passed: boolean
  finished_at?: string
}

export interface MethodistHomeworksAndTests {
  homework_status_counts: HomeworkStatusCounts
  pending_homeworks: PendingHomeworkItem[]
  average_test_score: number
  test_pass_rate_percent: number
  recent_test_attempts: RecentTestAttemptItem[]
}

export interface MethodistTeacherStat {
  id: number
  name: string
  email: string
  groups_count: number
  students_count: number
  schedules_count: number
  academy_progress_percent: number
  academy_status: 'not_enrolled' | 'in_progress' | 'completed'
}

export interface UpcomingScheduleItem {
  id: number
  title: string
  course_title?: string | null
  group_name?: string | null
  teacher_name: string
  room?: string | null
  start_time: string
  end_time: string
}

export interface MethodistAnalytics {
  overview: MethodistOverview
  courses: MethodistCourseStat[]
  students: MethodistStudentStat[]
  homeworks_and_tests: MethodistHomeworksAndTests
  teachers: MethodistTeacherStat[]
  upcoming_schedule: UpcomingScheduleItem[]
}

export interface SystemSettings {
  id: number
  school_name?: string | null
  school_legal_name?: string | null
  school_address?: string | null
  school_phone?: string | null
  school_email?: string | null
  school_website?: string | null
  school_logo_url?: string | null
  school_timezone: string
  school_currency: string

  platform_default_language: string
  platform_registration_enabled: boolean
  platform_maintenance_mode: boolean
  platform_max_file_size_mb: number

  smtp_host?: string | null
  smtp_port?: number | null
  smtp_username?: string | null
  smtp_password?: string | null
  smtp_use_tls: boolean
  smtp_sender_name?: string | null
  smtp_sender_email?: string | null

  sms_provider?: string | null
  sms_api_key?: string | null
  sms_sender_name?: string | null

  telegram_bot_token?: string | null
  telegram_channel_id?: string | null
  telegram_notifications_enabled: boolean

  yandex_client_id?: string | null
  yandex_client_secret?: string | null
  yandex_redirect_uri?: string | null
  yandex_disk_enabled: boolean
  yandex_calendar_enabled: boolean

  created_at: string
  updated_at: string
}
