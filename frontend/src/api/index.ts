import api from '../services/api'
import type {
  ApiResponse,
  User,
  Course,
  Module,
  Lesson,
  Schedule,
  ScheduleOccurrence,
  ScheduleException,
  Attendance,
  Group,
  GroupMembership,
  GroupMembershipAdd,
  EmployeeGroup,
  Homework,
  HomeworkReview,
  Task,
  Test,
  TestQuestion,
  TestAttempt,
  Payment,
  Transaction,
  Invoice,
  Expense,
  Subscription,
  PayrollResponse,
  PnLResponse,
  StaffLeave,
  StaffKpi,
  RoleConfig,
  Lead,
  Deal,
  NotificationItem,
  ChatRoom,
  ChatMessage,
  Organization,
  Branch,
  LessonProgress,
  LessonPlayerData,
  Directory,
  Survey,
  Achievement,
  DashboardAnalytics,
  FinanceAnalytics,
  MethodistAnalytics,
  SystemSettings,
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
  getTelegramInfo: () =>
    api.get<ApiResponse<{ bot_username: string; bot_link: string }>>('/users/me/telegram-info').then(unwrap),
  linkTelegram: (data: { telegram_chat_id?: string; id?: number; hash?: string; auth_date?: number; first_name?: string; last_name?: string; username?: string; photo_url?: string }) =>
    api.patch<ApiResponse<User>>('/users/me/telegram', data).then(unwrap),
  getMaxMiniappInfo: () =>
    api.get<ApiResponse<{ bot_username: string | null; link_token: string; miniapp_url: string }>>('/max/miniapp-info').then(unwrap),
  linkMaxInApp: (data: { init_data: string }) =>
    api.post<ApiResponse<User>>('/max/link-in-app', data).then(unwrap),
  changePassword: (current_password: string, new_password: string) =>
    api.patch<ApiResponse<void>>('/auth/me/password', { current_password, new_password }).then(unwrap),
}

export const dashboardApi = {
  summary: () => api.get<ApiResponse<any>>('/dashboard/summary').then(unwrap),
}

export const usersApi = {
  list: () => api.get<ApiResponse<User[]>>('/users').then(unwrap),
  listStudents: () => api.get<ApiResponse<User[]>>('/users/students').then(unwrap),
  employees: (params?: { role?: string; hr_status?: string; search?: string }) =>
    api.get<ApiResponse<User[]>>('/users/employees', { params }).then(unwrap),
  get: (id: number) => api.get<ApiResponse<User>>(`/users/${id}`).then(unwrap),
  create: (data: Partial<User> & { password: string }) =>
    api.post<ApiResponse<User>>('/users', data).then(unwrap),
  update: (id: number, data: Partial<User>) => api.patch<ApiResponse<User>>(`/users/${id}`, data).then(unwrap),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/users/${id}`).then(unwrap),
  payroll: (id: number, params: { from_date: string; to_date: string }) =>
    api.get<ApiResponse<PayrollResponse>>(`/users/${id}/payroll`, { params }).then(unwrap),
  documents: (id: number) => api.get<ApiResponse<{ id: number; original_name: string; public_url?: string; file_type?: string; size_bytes?: number; created_at: string }[]>>(`/users/${id}/documents`).then(unwrap),
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
  list: (params?: {
    status?: string
    branch_id?: number
    teacher_id?: number
    study_type?: string
    search?: string
  }) => api.get<ApiResponse<Group[]>>('/groups', { params }).then(unwrap),
  my: () => api.get<ApiResponse<Group[]>>('/groups/my').then(unwrap),
  get: (id: number) => api.get<ApiResponse<Group>>(`/groups/${id}`).then(unwrap),
  create: (data: Partial<Group>) => api.post<ApiResponse<Group>>('/groups', data).then(unwrap),
  update: (id: number, data: Partial<Group>) => api.patch<ApiResponse<Group>>(`/groups/${id}`, data).then(unwrap),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/groups/${id}`).then(unwrap),
  listStudents: (id: number, params?: { status?: string }) =>
    api.get<ApiResponse<GroupMembership[]>>(`/groups/${id}/students`, { params }).then(unwrap),
  addStudent: (id: number, data: Partial<GroupMembershipAdd>) =>
    api.post<ApiResponse<GroupMembership>>(`/groups/${id}/students`, data).then(unwrap),
  updateStudent: (id: number, studentId: number, data: Partial<GroupMembership>) =>
    api.patch<ApiResponse<GroupMembership>>(`/groups/${id}/students/${studentId}`, data).then(unwrap),
  removeStudent: (id: number, studentId: number) =>
    api.delete<ApiResponse<GroupMembership>>(`/groups/${id}/students/${studentId}`).then(unwrap),
  transferStudent: (id: number, studentId: number, toGroupId: number) =>
    api.post<ApiResponse<GroupMembership>>(`/groups/${id}/students/${studentId}/transfer`, { to_group_id: toGroupId }).then(unwrap),
}

export const schedulesApi = {
  list: (params?: {
    group_id?: number
    teacher_id?: number
    branch_id?: number
    room?: string
    status?: string
    start_from?: string
    start_to?: string
  }) => api.get<ApiResponse<Schedule[]>>('/schedules', { params }).then(unwrap),
  calendar: (params?: {
    from_date?: string
    to_date?: string
    group_id?: number
    teacher_id?: number
    branch_id?: number
    room?: string
  }) => api.get<ApiResponse<ScheduleOccurrence[]>>('/schedules/calendar', { params }).then(unwrap),
  get: (id: number) => api.get<ApiResponse<Schedule>>(`/schedules/${id}`).then(unwrap),
  create: (data: Partial<Schedule>) => api.post<ApiResponse<Schedule>>('/schedules', data).then(unwrap),
  update: (id: number, data: Partial<Schedule>) =>
    api.patch<ApiResponse<Schedule>>(`/schedules/${id}`, data).then(unwrap),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/schedules/${id}`).then(unwrap),
}

export const scheduleExceptionsApi = {
  list: (scheduleId: number) =>
    api.get<ApiResponse<ScheduleException[]>>(`/schedules/${scheduleId}/exceptions`).then(unwrap),
  create: (scheduleId: number, data: Partial<ScheduleException>) =>
    api.post<ApiResponse<ScheduleException>>(`/schedules/${scheduleId}/exceptions`, data).then(unwrap),
  update: (scheduleId: number, exceptionDate: string, data: Partial<ScheduleException>) =>
    api.patch<ApiResponse<ScheduleException>>(`/schedules/${scheduleId}/exceptions/${exceptionDate}`, data).then(unwrap),
  delete: (scheduleId: number, exceptionDate: string) =>
    api.delete<ApiResponse<void>>(`/schedules/${scheduleId}/exceptions/${exceptionDate}`).then(unwrap),
}

export const branchesApi = {
  list: () => api.get<ApiResponse<Branch[]>>('/branches').then(unwrap),
  create: (data: Partial<Branch>) => api.post<ApiResponse<Branch>>('/branches', data).then(unwrap),
  update: (id: number, data: Partial<Branch>) => api.patch<ApiResponse<Branch>>(`/branches/${id}`, data).then(unwrap),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/branches/${id}`).then(unwrap),
}

export const attendanceApi = {
  listBySchedule: (scheduleId: number, occurrenceDate?: string) =>
    api.get<ApiResponse<Attendance[]>>(`/attendance/schedule/${scheduleId}`, {
      params: occurrenceDate ? { occurrence_date: occurrenceDate } : {},
    }).then(unwrap),
  mark: (data: { schedule_id: number; student_id: number; occurrence_date: string; status: string; notes?: string }) =>
    api.post<ApiResponse<Attendance>>('/attendance', data).then(unwrap),
  update: (id: number, data: { status?: string; notes?: string }) =>
    api.patch<ApiResponse<Attendance>>(`/attendance/${id}`, data).then(unwrap),
}

export const tasksApi = {
  list: (params?: {
    status?: string
    type?: string
    assignee_id?: number
    creator_id?: number
    due_from?: string
    due_to?: string
    search?: string
  }) => api.get<ApiResponse<Task[]>>('/tasks', { params }).then(unwrap),
  create: (data: Partial<Task>) => api.post<ApiResponse<Task>>('/tasks', data).then(unwrap),
  update: (id: number, data: Partial<Task>) => api.patch<ApiResponse<Task>>(`/tasks/${id}`, data).then(unwrap),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/tasks/${id}`).then(unwrap),
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
  reorder: (courseId: number, moduleIds: number[]) =>
    api.post<ApiResponse<Module[]>>('/modules/reorder', { course_id: courseId, module_ids: moduleIds }).then(unwrap),
}

export const lessonsApi = {
  get: (id: number) => api.get<ApiResponse<Lesson>>(`/lessons/${id}`).then(unwrap),
  player: (id: number) => api.get<ApiResponse<LessonPlayerData>>(`/lessons/${id}/player`).then(unwrap),
  create: (data: Partial<Lesson> & { module_id: number }) =>
    api.post<ApiResponse<Lesson>>('/lessons', data).then(unwrap),
  update: (id: number, data: Partial<Lesson>) =>
    api.patch<ApiResponse<Lesson>>(`/lessons/${id}`, data).then(unwrap),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/lessons/${id}`).then(unwrap),
  complete: (id: number) => api.post<ApiResponse<LessonProgress>>(`/lessons/${id}/complete`).then(unwrap),
  reorder: (moduleId: number, lessonIds: number[]) =>
    api.post<ApiResponse<Lesson[]>>('/lessons/reorder', { module_id: moduleId, lesson_ids: lessonIds }).then(unwrap),
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
  invoices: (params?: { student_id?: number; group_id?: number; status?: string }) =>
    api.get<ApiResponse<Invoice[]>>('/finance/invoices', { params }).then(unwrap),
  createInvoice: (data: Partial<Invoice>) => api.post<ApiResponse<Invoice>>('/finance/invoices', data).then(unwrap),
  updateInvoice: (id: number, data: Partial<Invoice>) =>
    api.patch<ApiResponse<Invoice>>(`/finance/invoices/${id}`, data).then(unwrap),
  deleteInvoice: (id: number) => api.delete<ApiResponse<void>>(`/finance/invoices/${id}`).then(unwrap),
  generateInvoices: (data: { group_id: number; period_start: string; period_end: string; due_date?: string }) =>
    api.post<ApiResponse<Invoice[]>>('/finance/invoices/generate', data).then(unwrap),
  payInvoice: (id: number, data: { amount: number; method?: string; description?: string }) =>
    api.post<ApiResponse<Payment>>(`/finance/invoices/${id}/pay`, data).then(unwrap),
  debtors: () => api.get<ApiResponse<{ student_id: number; student_name: string; total_debt_kopecks: number; invoices: Invoice[] }[]>>('/finance/debtors').then(unwrap),
  expenses: (params?: { branch_id?: number; category?: string; date_from?: string; date_to?: string }) =>
    api.get<ApiResponse<Expense[]>>('/finance/expenses', { params }).then(unwrap),
  createExpense: (data: Partial<Expense>) => api.post<ApiResponse<Expense>>('/finance/expenses', data).then(unwrap),
  updateExpense: (id: number, data: Partial<Expense>) =>
    api.patch<ApiResponse<Expense>>(`/finance/expenses/${id}`, data).then(unwrap),
  deleteExpense: (id: number) => api.delete<ApiResponse<void>>(`/finance/expenses/${id}`).then(unwrap),
  payroll: (params: { teacher_id: number; from_date: string; to_date: string }) =>
    api.get<ApiResponse<PayrollResponse>>('/finance/payroll', { params }).then(unwrap),
  runPayroll: (data: { teacher_id: number; from_date: string; to_date: string }) =>
    api.post<ApiResponse<PayrollResponse>>('/finance/payroll/run', data).then(unwrap),
  pnl: (params: { from_date: string; to_date: string; branch_id?: number }) =>
    api.get<ApiResponse<PnLResponse>>('/finance/pnl', { params }).then(unwrap),
  downloadInvoicePdf: (id: number) =>
    api.get(`/finance/invoices/${id}/pdf`, { responseType: 'blob' }),
  downloadPaymentActPdf: (id: number) =>
    api.get(`/finance/payments/${id}/act/pdf`, { responseType: 'blob' }),
  subscriptions: (params?: { student_id?: number; group_id?: number; status?: string }) =>
    api.get<ApiResponse<Subscription[]>>('/finance/subscriptions', { params }).then(unwrap),
  createSubscription: (data: Partial<Subscription>) =>
    api.post<ApiResponse<Subscription>>('/finance/subscriptions', data).then(unwrap),
  updateSubscription: (id: number, data: Partial<Subscription>) =>
    api.patch<ApiResponse<Subscription>>(`/finance/subscriptions/${id}`, data).then(unwrap),
  deleteSubscription: (id: number) =>
    api.delete<ApiResponse<void>>(`/finance/subscriptions/${id}`).then(unwrap),
  renewSubscription: (id: number) =>
    api.post<ApiResponse<Subscription>>(`/finance/subscriptions/${id}/renew`).then(unwrap),
  freezeSubscription: (id: number, frozen_until?: string) =>
    api.post<ApiResponse<Subscription>>(`/finance/subscriptions/${id}/freeze`, null, { params: { frozen_until } }).then(unwrap),
  cancelSubscription: (id: number) =>
    api.post<ApiResponse<Subscription>>(`/finance/subscriptions/${id}/cancel`).then(unwrap),
}

export const hrApi = {
  leaves: (params?: { user_id?: number; status?: string }) =>
    api.get<ApiResponse<StaffLeave[]>>('/hr/leaves', { params }).then(unwrap),
  createLeave: (data: Partial<StaffLeave>) => api.post<ApiResponse<StaffLeave>>('/hr/leaves', data).then(unwrap),
  updateLeave: (id: number, data: Partial<StaffLeave>) =>
    api.patch<ApiResponse<StaffLeave>>(`/hr/leaves/${id}`, data).then(unwrap),
  deleteLeave: (id: number) => api.delete<ApiResponse<void>>(`/hr/leaves/${id}`).then(unwrap),
  kpis: (params?: { user_id?: number; period_start?: string; period_end?: string }) =>
    api.get<ApiResponse<StaffKpi[]>>('/hr/kpis', { params }).then(unwrap),
  createKpi: (data: Partial<StaffKpi>) => api.post<ApiResponse<StaffKpi>>('/hr/kpis', data).then(unwrap),
  updateKpi: (id: number, data: Partial<StaffKpi>) =>
    api.patch<ApiResponse<StaffKpi>>(`/hr/kpis/${id}`, data).then(unwrap),
  deleteKpi: (id: number) => api.delete<ApiResponse<void>>(`/hr/kpis/${id}`).then(unwrap),
}

export const roleConfigApi = {
  list: () => api.get<ApiResponse<RoleConfig[]>>('/system/roles').then(unwrap),
  create: (data: Partial<RoleConfig>) => api.post<ApiResponse<RoleConfig>>('/system/roles', data).then(unwrap),
  update: (role: string, data: Partial<RoleConfig>) =>
    api.patch<ApiResponse<RoleConfig>>(`/system/roles/${role}`, data).then(unwrap),
  delete: (role: string) => api.delete<ApiResponse<void>>(`/system/roles/${role}`).then(unwrap),
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
  get: (id: number) => api.get<ApiResponse<Organization>>(`/organizations/${id}`).then(unwrap),
  create: (data: Partial<Organization>) => api.post<ApiResponse<Organization>>('/organizations', data).then(unwrap),
  update: (id: number, data: Partial<Organization>) =>
    api.patch<ApiResponse<Organization>>(`/organizations/${id}`, data).then(unwrap),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/organizations/${id}`).then(unwrap),
  uploadImage: (file: File, entityType: string = 'school_asset') => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('entity_type', entityType)
    return api
      .post<ApiResponse<{ public_url: string }>>('/files/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(unwrap)
  },
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

export const surveysApi = {
  list: () => api.get<ApiResponse<Survey[]>>('/surveys').then(unwrap),
  get: (id: number) => api.get<ApiResponse<Survey>>(`/surveys/${id}`).then(unwrap),
  create: (data: Partial<Survey>) => api.post<ApiResponse<Survey>>('/surveys', data).then(unwrap),
  update: (id: number, data: Partial<Survey>) => api.patch<ApiResponse<Survey>>(`/surveys/${id}`, data).then(unwrap),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/surveys/${id}`).then(unwrap),
  results: (id: number) => api.get<ApiResponse<unknown>>(`/surveys/${id}/results`).then(unwrap),
}

export const reportsApi = {
  types: () => api.get<ApiResponse<{ id: string; label: string }[]>>('/reports/types').then(unwrap),
  get: (type: string, params?: { branch_id?: number; date_from?: string; date_to?: string }) =>
    api.get<ApiResponse<unknown>>(`/reports/${type}`, { params }).then(unwrap),
  exportCsv: (type: string, params?: { branch_id?: number; date_from?: string; date_to?: string }) =>
    api.get(`/reports/${type}/export.csv`, { params, responseType: 'blob' }),
  exportPdf: (type: string, params?: { branch_id?: number; date_from?: string; date_to?: string }) =>
    api.get(`/reports/${type}/export.pdf`, { params, responseType: 'blob' }),
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

export const systemSettingsApi = {
  get: () => api.get<ApiResponse<SystemSettings>>('/system/settings').then(unwrap),
  update: (data: Partial<SystemSettings>) =>
    api.patch<ApiResponse<SystemSettings>>('/system/settings', data).then(unwrap),
}

export const aiApi = {
  ask: (data: { message: string; context?: string }) =>
    api.post<ApiResponse<{ reply: string; provider: string }>>('/ai/ask', data).then(unwrap),
}

export const directoriesApi = {
  list: (kind: string) =>
    api.get<ApiResponse<Directory[]>>(`/directories?kind=${encodeURIComponent(kind)}`).then(unwrap),
  create: (data: Partial<Directory>) =>
    api.post<ApiResponse<Directory>>('/directories', data).then(unwrap),
  update: (id: number, data: Partial<Directory>) =>
    api.patch<ApiResponse<Directory>>(`/directories/${id}`, data).then(unwrap),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/directories/${id}`).then(unwrap),
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
