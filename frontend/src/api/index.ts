import api from '../services/api'
import type {
  ApiResponse,
  User,
  Course,
  Module,
  Lesson,
  Schedule,
  Attendance,
  Group,
  EmployeeGroup,
  Homework,
  HomeworkReview,
  Test,
  TestQuestion,
  TestAttempt,
  Payment,
  Transaction,
  Lead,
  Deal,
  NotificationItem,
  ChatRoom,
  ChatMessage,
  Organization,
  Branch,
  LessonProgress,
  Achievement,
  DashboardAnalytics,
  FinanceAnalytics,
  MethodistAnalytics,
} from '../types'

const unwrap = <T>(res: { data: ApiResponse<T> }): T => res.data.data

export const authApi = {
  me: () => api.get<ApiResponse<User>>('/auth/me').then(unwrap),
  updateMe: (data: Partial<User>) => api.patch<ApiResponse<User>>('/auth/me', data).then(unwrap),
  login: (email: string, password: string) =>
    api
      .post<ApiResponse<{ access_token: string; user: User }>>(
        '/auth/login',
        new URLSearchParams({ username: email, password }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      )
      .then(unwrap),
  register: (data: { email: string; password: string; name: string }) =>
    api.post<ApiResponse<{ access_token: string; user: User }>>('/auth/register', data).then(unwrap),
  linkTelegram: (telegram_chat_id: string) =>
    api.patch<ApiResponse<User>>('/users/me/telegram', { telegram_chat_id }).then(unwrap),
  changePassword: (current_password: string, new_password: string) =>
    api.patch<ApiResponse<void>>('/auth/me/password', { current_password, new_password }).then(unwrap),
}

export const usersApi = {
  list: () => api.get<ApiResponse<User[]>>('/users').then(unwrap),
  listStudents: () => api.get<ApiResponse<User[]>>('/users/students').then(unwrap),
  create: (data: Partial<User> & { password: string }) =>
    api.post<ApiResponse<User>>('/users', data).then(unwrap),
  update: (id: number, data: Partial<User>) => api.patch<ApiResponse<User>>(`/users/${id}`, data).then(unwrap),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/users/${id}`).then(unwrap),
}

export const coursesApi = {
  list: () => api.get<ApiResponse<Course[]>>('/courses').then(unwrap),
  get: (id: number) => api.get<ApiResponse<Course>>(`/courses/${id}`).then(unwrap),
  create: (data: Partial<Course>) => api.post<ApiResponse<Course>>('/courses', data).then(unwrap),
  update: (id: number, data: Partial<Course>) => api.patch<ApiResponse<Course>>(`/courses/${id}`, data).then(unwrap),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/courses/${id}`).then(unwrap),
  modules: (courseId: number) =>
    api.get<ApiResponse<Course['modules']>>(`/courses/${courseId}/modules`).then(unwrap),
}

export const employeeGroupsApi = {
  list: (groupType?: string) =>
    api
      .get<ApiResponse<EmployeeGroup[]>>(`/employee-groups${groupType ? `?group_type=${groupType}` : ''}`)
      .then(unwrap),
  get: (id: number) => api.get<ApiResponse<EmployeeGroup>>(`/employee-groups/${id}`).then(unwrap),
  create: (data: Partial<EmployeeGroup>) =>
    api.post<ApiResponse<EmployeeGroup>>('/employee-groups', data).then(unwrap),
  update: (id: number, data: Partial<EmployeeGroup>) =>
    api.patch<ApiResponse<EmployeeGroup>>(`/employee-groups/${id}`, data).then(unwrap),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/employee-groups/${id}`).then(unwrap),
  addMember: (id: number, userId: number) =>
    api.post<ApiResponse<EmployeeGroup>>(`/employee-groups/${id}/members`, { user_id: userId }).then(unwrap),
  removeMember: (id: number, userId: number) =>
    api.delete<ApiResponse<EmployeeGroup>>(`/employee-groups/${id}/members/${userId}`).then(unwrap),
  enrollToCourse: (id: number, courseId: number) =>
    api.post<ApiResponse<{ enrolled_count: number }>>(`/employee-groups/${id}/enroll`, { course_id: courseId }).then(unwrap),
}

export const groupsApi = {
  list: () => api.get<ApiResponse<Group[]>>('/groups').then(unwrap),
  create: (data: Partial<Group>) => api.post<ApiResponse<Group>>('/groups', data).then(unwrap),
  update: (id: number, data: Partial<Group>) => api.patch<ApiResponse<Group>>(`/groups/${id}`, data).then(unwrap),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/groups/${id}`).then(unwrap),
}

export const schedulesApi = {
  list: (params?: {
    group_id?: number
    teacher_id?: number
    branch_id?: number
    start_from?: string
    start_to?: string
  }) => api.get<ApiResponse<Schedule[]>>('/schedules', { params }).then(unwrap),
  create: (data: Partial<Schedule>) => api.post<ApiResponse<Schedule>>('/schedules', data).then(unwrap),
  update: (id: number, data: Partial<Schedule>) =>
    api.patch<ApiResponse<Schedule>>(`/schedules/${id}`, data).then(unwrap),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/schedules/${id}`).then(unwrap),
}

export const attendanceApi = {
  listBySchedule: (scheduleId: number) =>
    api.get<ApiResponse<Attendance[]>>(`/attendance/schedule/${scheduleId}`).then(unwrap),
  mark: (data: { schedule_id: number; student_id: number; status: string; notes?: string }) =>
    api.post<ApiResponse<Attendance>>('/attendance', data).then(unwrap),
  update: (id: number, data: { status?: string; notes?: string }) =>
    api.patch<ApiResponse<Attendance>>(`/attendance/${id}`, data).then(unwrap),
}

export const modulesApi = {
  get: (id: number) => api.get<ApiResponse<Module>>(`/modules/${id}`).then(unwrap),
  create: (data: Partial<Module> & { course_id: number }) =>
    api.post<ApiResponse<Module>>('/modules', data).then(unwrap),
  update: (id: number, data: Partial<Module>) =>
    api.patch<ApiResponse<Module>>(`/modules/${id}`, data).then(unwrap),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/modules/${id}`).then(unwrap),
  lessons: (moduleId: number) =>
    api.get<ApiResponse<Lesson[]>>(`/modules/${moduleId}/lessons`).then(unwrap),
}

export const lessonsApi = {
  get: (id: number) => api.get<ApiResponse<Lesson>>(`/lessons/${id}`).then(unwrap),
  create: (data: Partial<Lesson> & { module_id: number }) =>
    api.post<ApiResponse<Lesson>>('/lessons', data).then(unwrap),
  update: (id: number, data: Partial<Lesson>) =>
    api.patch<ApiResponse<Lesson>>(`/lessons/${id}`, data).then(unwrap),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/lessons/${id}`).then(unwrap),
  complete: (id: number) => api.post<ApiResponse<LessonProgress>>(`/lessons/${id}/complete`).then(unwrap),
}

export const testsApi = {
  list: (lessonId?: number) =>
    api.get<ApiResponse<Test[]>>('/tests', { params: lessonId ? { lesson_id: lessonId } : {} }).then(unwrap),
  get: (id: number) => api.get<ApiResponse<Test>>(`/tests/${id}`).then(unwrap),
  create: (data: Partial<Test>) => api.post<ApiResponse<Test>>('/tests', data).then(unwrap),
  update: (id: number, data: Partial<Test>) => api.patch<ApiResponse<Test>>(`/tests/${id}`, data).then(unwrap),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/tests/${id}`).then(unwrap),
  questions: (testId: number) =>
    api.get<ApiResponse<TestQuestion[]>>(`/tests/${testId}/questions`).then(unwrap),
  createQuestion: (testId: number, data: Partial<TestQuestion>) =>
    api.post<ApiResponse<TestQuestion>>(`/tests/${testId}/questions`, data).then(unwrap),
  updateQuestion: (testId: number, questionId: number, data: Partial<TestQuestion>) =>
    api.patch<ApiResponse<TestQuestion>>(`/tests/${testId}/questions/${questionId}`, data).then(unwrap),
  deleteQuestion: (testId: number, questionId: number) =>
    api.delete<ApiResponse<void>>(`/tests/${testId}/questions/${questionId}`).then(unwrap),
  listAttempts: (testId: number) =>
    api.get<ApiResponse<TestAttempt[]>>(`/tests/${testId}/attempts`).then(unwrap),
  createAttempt: (testId: number, data: { answers?: string }) =>
    api.post<ApiResponse<TestAttempt>>(`/tests/${testId}/attempts`, data).then(unwrap),
  updateAttempt: (testId: number, attemptId: number, data: { answers?: string; score?: number; max_score?: number; is_passed?: boolean; finished_at?: string }) =>
    api.patch<ApiResponse<TestAttempt>>(`/tests/${testId}/attempts/${attemptId}`, data).then(unwrap),
  submitAttempt: (testId: number, attemptId: number) =>
    api.post<ApiResponse<TestAttempt>>(`/tests/${testId}/attempts/${attemptId}/submit`).then(unwrap),
}

export const homeworksApi = {
  list: (lessonId?: number) =>
    api.get<ApiResponse<Homework[]>>(`/homeworks${lessonId ? `?lesson_id=${lessonId}` : ''}`).then(unwrap),
  create: (data: Partial<Homework>) => api.post<ApiResponse<Homework>>('/homeworks', data).then(unwrap),
  update: (id: number, data: Partial<Homework>) =>
    api.patch<ApiResponse<Homework>>(`/homeworks/${id}`, data).then(unwrap),
  assignToLesson: (data: {
    lesson_id: number
    group_id?: number
    title?: string
    description?: string
    content?: string
    file_urls?: string
  }) => api.post<ApiResponse<Homework[]>>('/homeworks/assign-to-lesson', data).then(unwrap),
  reviews: (homeworkId: number) =>
    api.get<ApiResponse<HomeworkReview[]>>(`/homeworks/${homeworkId}/reviews`).then(unwrap),
  createReview: (homeworkId: number, data: Partial<HomeworkReview>) =>
    api.post<ApiResponse<HomeworkReview>>(`/homeworks/${homeworkId}/reviews`, data).then(unwrap),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/homeworks/${id}`).then(unwrap),
  submit: (homeworkId: number, data: { content?: string; file_urls?: string }) =>
    api.post<ApiResponse<Homework>>(`/homeworks/${homeworkId}/submit`, data).then(unwrap),
}

export const financeApi = {
  payments: () => api.get<ApiResponse<Payment[]>>('/finance/payments').then(unwrap),
  myPayments: () => api.get<ApiResponse<Payment[]>>('/finance/payments/me').then(unwrap),
  createPayment: (data: Partial<Payment>) =>
    api.post<ApiResponse<Payment>>('/finance/payments', data).then(unwrap),
  updatePayment: (id: number, data: Partial<Payment>) =>
    api.patch<ApiResponse<Payment>>(`/finance/payments/${id}`, data).then(unwrap),
  deletePayment: (id: number) => api.delete<ApiResponse<void>>(`/finance/payments/${id}`).then(unwrap),
  transactions: () => api.get<ApiResponse<Transaction[]>>('/finance/transactions').then(unwrap),
  myTransactions: () => api.get<ApiResponse<Transaction[]>>('/finance/transactions/me').then(unwrap),
  balance: () => api.get<ApiResponse<{ balance: number; total_paid: number }>>('/finance/balance').then(unwrap),
  analytics: () => api.get<ApiResponse<FinanceAnalytics>>('/analytics/finance').then(unwrap),
}

export const crmApi = {
  leads: () => api.get<ApiResponse<Lead[]>>('/leads').then(unwrap),
  createLead: (data: Partial<Lead>) => api.post<ApiResponse<Lead>>('/leads/demo', data).then(unwrap),
  updateLead: (id: number, data: Partial<Lead>) => api.patch<ApiResponse<Lead>>(`/leads/${id}`, data).then(unwrap),
  deleteLead: (id: number) => api.delete<ApiResponse<void>>(`/leads/${id}`).then(unwrap),
  deals: () => api.get<ApiResponse<Deal[]>>('/deals').then(unwrap),
  createDeal: (data: Partial<Deal>) => api.post<ApiResponse<Deal>>('/deals', data).then(unwrap),
  updateDeal: (id: number, data: Partial<Deal>) => api.patch<ApiResponse<Deal>>(`/deals/${id}`, data).then(unwrap),
  deleteDeal: (id: number) => api.delete<ApiResponse<void>>(`/deals/${id}`).then(unwrap),
}

export const notificationsApi = {
  list: () => api.get<ApiResponse<NotificationItem[]>>('/notifications').then(unwrap),
  unreadCount: () => api.get<ApiResponse<{ count: number }>>('/notifications/unread-count').then(unwrap),
  markRead: (id: number) => api.patch<ApiResponse<void>>(`/notifications/${id}/read`).then(unwrap),
  markAllRead: () => api.patch<ApiResponse<void>>('/notifications/read-all').then(unwrap),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/notifications/${id}`).then(unwrap),
  create: (data: Partial<NotificationItem>) =>
    api.post<ApiResponse<NotificationItem>>('/notifications', data).then(unwrap),
}

export const chatsApi = {
  list: () => api.get<ApiResponse<ChatRoom[]>>('/chats').then(unwrap),
  create: (data: Partial<ChatRoom>) => api.post<ApiResponse<ChatRoom>>('/chats', data).then(unwrap),
  messages: (roomId: number) =>
    api.get<ApiResponse<ChatMessage[]>>(`/chats/${roomId}/messages`).then(unwrap),
  sendMessage: (roomId: number, content: string) =>
    api.post<ApiResponse<ChatMessage>>(`/chats/${roomId}/messages`, { content }).then(unwrap),
  addParticipant: (roomId: number, userId: number) =>
    api.post<ApiResponse<void>>(`/chats/${roomId}/participants`, { user_id: userId }).then(unwrap),
  removeParticipant: (roomId: number, userId: number) =>
    api.delete<ApiResponse<void>>(`/chats/${roomId}/participants/${userId}`).then(unwrap),
}

export const organizationsApi = {
  list: () => api.get<ApiResponse<Organization[]>>('/organizations').then(unwrap),
  create: (data: Partial<Organization>) => api.post<ApiResponse<Organization>>('/organizations', data).then(unwrap),
  update: (id: number, data: Partial<Organization>) =>
    api.patch<ApiResponse<Organization>>(`/organizations/${id}`, data).then(unwrap),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/organizations/${id}`).then(unwrap),
  branches: (orgId: number) =>
    api.get<ApiResponse<Branch[]>>(`/organizations/${orgId}/branches`).then(unwrap),
  createBranch: (orgId: number, data: Partial<Branch>) =>
    api.post<ApiResponse<Branch>>(`/organizations/${orgId}/branches`, data).then(unwrap),
  updateBranch: (orgId: number, branchId: number, data: Partial<Branch>) =>
    api.patch<ApiResponse<Branch>>(`/organizations/${orgId}/branches/${branchId}`, data).then(unwrap),
  deleteBranch: (orgId: number, branchId: number) =>
    api.delete<ApiResponse<void>>(`/organizations/${orgId}/branches/${branchId}`).then(unwrap),
}

export const progressApi = {
  list: () => api.get<ApiResponse<LessonProgress[]>>('/progress').then(unwrap),
}

export const achievementsApi = {
  list: () => api.get<ApiResponse<Achievement[]>>('/achievements').then(unwrap),
  my: () => api.get<ApiResponse<Achievement[]>>('/achievements/my').then(unwrap),
}

export const analyticsApi = {
  dashboard: () => api.get<ApiResponse<DashboardAnalytics>>('/analytics/dashboard').then(unwrap),
}

export interface SystemPermissionsResponse {
  role_permissions: Record<string, string[]>
  role_hierarchy: Record<string, string[]>
  module_permissions: Record<string, string[]>
  endpoints: { method: string; path: string }[]
  endpoints_count: number
}

export const systemApi = {
  permissions: () => api.get<ApiResponse<SystemPermissionsResponse>>('/system/permissions').then(unwrap),
}

export const aiApi = {
  ask: (data: { message: string; context?: string }) =>
    api.post<ApiResponse<{ reply: string; provider: string }>>('/ai/ask', data).then(unwrap),
}

export const methodistsApi = {
  dashboard: () => api.get<ApiResponse<{ courses_count: number; groups_count: number; students_count: number; pending_homeworks_count: number }>>('/methodists/dashboard').then(unwrap),
  analytics: () => api.get<ApiResponse<MethodistAnalytics>>('/methodists/analytics').then(unwrap),
}

export const teacherAcademyApi = {
  course: () => api.get<ApiResponse<Course>>('/teacher-academy/course').then(unwrap),
  progress: () => api.get<ApiResponse<{ enrollment_id: number; status: string; progress_percent: number; is_certified: boolean; completed_at?: string }>>('/teacher-academy/progress').then(unwrap),
  completeModule: (moduleId: number) =>
    api.post<ApiResponse<void>>(`/teacher-academy/modules/${moduleId}/complete`).then(unwrap),
  sync: () => api.post<ApiResponse<Course>>('/teacher-academy/sync').then(unwrap),
  certificateRaw: () => api.get('/teacher-academy/certificate', { responseType: 'text' }),
  getContentToken: (contentId: number) =>
    api.post<ApiResponse<{ token: string; expires_in: number }>>(`/teacher-academy/contents/${contentId}/token`).then(unwrap),
}
