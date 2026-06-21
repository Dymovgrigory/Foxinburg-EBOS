import api from '../services/api'
import type {
  ApiResponse,
  User,
  Course,
  Schedule,
  Group,
  Homework,
  HomeworkReview,
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
  create: (data: Partial<User> & { password: string }) =>
    api.post<ApiResponse<User>>('/users', data).then(unwrap),
  update: (id: number, data: Partial<User>) => api.patch<ApiResponse<User>>(`/users/${id}`, data).then(unwrap),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/users/${id}`).then(unwrap),
}

export const coursesApi = {
  list: () => api.get<ApiResponse<Course[]>>('/courses').then(unwrap),
  create: (data: Partial<Course>) => api.post<ApiResponse<Course>>('/courses', data).then(unwrap),
  update: (id: number, data: Partial<Course>) => api.patch<ApiResponse<Course>>(`/courses/${id}`, data).then(unwrap),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/courses/${id}`).then(unwrap),
  modules: (courseId: number) =>
    api.get<ApiResponse<Course['modules']>>(`/courses/${courseId}/modules`).then(unwrap),
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

export const homeworksApi = {
  list: () => api.get<ApiResponse<Homework[]>>('/homeworks').then(unwrap),
  create: (data: Partial<Homework>) => api.post<ApiResponse<Homework>>('/homeworks', data).then(unwrap),
  update: (id: number, data: Partial<Homework>) =>
    api.patch<ApiResponse<Homework>>(`/homeworks/${id}`, data).then(unwrap),
  reviews: (homeworkId: number) =>
    api.get<ApiResponse<HomeworkReview[]>>(`/homeworks/${homeworkId}/reviews`).then(unwrap),
  createReview: (homeworkId: number, data: Partial<HomeworkReview>) =>
    api.post<ApiResponse<HomeworkReview>>(`/homeworks/${homeworkId}/reviews`, data).then(unwrap),
}

export const financeApi = {
  payments: () => api.get<ApiResponse<Payment[]>>('/finance/payments').then(unwrap),
  createPayment: (data: Partial<Payment>) =>
    api.post<ApiResponse<Payment>>('/finance/payments', data).then(unwrap),
  updatePayment: (id: number, data: Partial<Payment>) =>
    api.patch<ApiResponse<Payment>>(`/finance/payments/${id}`, data).then(unwrap),
  deletePayment: (id: number) => api.delete<ApiResponse<void>>(`/finance/payments/${id}`).then(unwrap),
  transactions: () => api.get<ApiResponse<Transaction[]>>('/finance/transactions').then(unwrap),
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

export const teacherAcademyApi = {
  course: () => api.get<ApiResponse<Course>>('/teacher-academy/course').then(unwrap),
  progress: () => api.get<ApiResponse<{ completed_modules: number[]; total_modules: number }>>('/teacher-academy/progress').then(unwrap),
  completeModule: (moduleId: number) =>
    api.post<ApiResponse<void>>(`/teacher-academy/modules/${moduleId}/complete`).then(unwrap),
  sync: () => api.post<ApiResponse<Course>>('/teacher-academy/sync').then(unwrap),
}
