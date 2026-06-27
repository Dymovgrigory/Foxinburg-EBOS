import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import RoleProtectedRoute, { ROLE_ACCESS } from './components/RoleProtectedRoute'
import Loader from './components/ui/Loader'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const SystemCenterPage = lazy(() => import('./pages/SystemCenterPage'))
const EmployeesPage = lazy(() => import('./pages/EmployeesPage'))
const FinancePage = lazy(() => import('./pages/FinancePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const TeacherDashboardPage = lazy(() => import('./pages/TeacherDashboardPage'))
const StudentDashboardPage = lazy(() => import('./pages/StudentDashboardPage'))
const MethodistDashboardPage = lazy(() => import('./pages/MethodistDashboardPage'))
const CrmPage = lazy(() => import('./pages/CrmPage'))
const MarketingPage = lazy(() => import('./pages/MarketingPage'))
const RolesPage = lazy(() => import('./pages/RolesPage'))
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'))
const HomeworksPage = lazy(() => import('./pages/HomeworksPage'))
const CoursesPage = lazy(() => import('./pages/CoursesPage'))
const BranchesPage = lazy(() => import('./pages/BranchesPage'))
const StudentsPage = lazy(() => import('./pages/StudentsPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const SchedulePage = lazy(() => import('./pages/SchedulePage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const MaxLinkPage = lazy(() => import('./pages/MaxLinkPage'))
const CatalogPage = lazy(() => import('./pages/CatalogPage'))
const CatalogCoursePage = lazy(() => import('./pages/CatalogCoursePage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const TeacherAcademyPage = lazy(() => import('./pages/TeacherAcademyPage'))
const TeacherCoursesPage = lazy(() => import('./pages/TeacherCoursesPage'))
const TeacherProgressPage = lazy(() => import('./pages/TeacherProgressPage'))
const CertificationPage = lazy(() => import('./pages/CertificationPage'))
const LibraryPage = lazy(() => import('./pages/LibraryPage'))
const KnowledgeBasePage = lazy(() => import('./pages/KnowledgeBasePage'))
const AIAssistantPage = lazy(() => import('./pages/AIAssistantPage'))
const CourseBuilderPage = lazy(() => import('./pages/CourseBuilderPage'))
const CoursePlayerPage = lazy(() => import('./pages/CoursePlayerPage'))
const EmployeeGroupsPage = lazy(() => import('./pages/EmployeeGroupsPage'))
const GroupsPage = lazy(() => import('./pages/GroupsPage'))
const TasksPage = lazy(() => import('./pages/TasksPage'))
const SchoolSettingsPage = lazy(() => import('./pages/SchoolSettingsPage'))
const DirectoriesPage = lazy(() => import('./pages/DirectoriesPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const SurveysPage = lazy(() => import('./pages/SurveysPage'))
const StoreProductsPage = lazy(() => import('./pages/StoreProductsPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function Protected({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

function RoleProtected({ path, children }: { path: string; children: React.ReactNode }) {
  return <RoleProtectedRoute allowedRoles={ROLE_ACCESS[path]}>{children}</RoleProtectedRoute>
}

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh]">
      <Loader text="Загрузка страницы..." />
    </div>
  )
}

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public pages without sidebar */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LandingPage showAuth />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/catalog/:productId" element={<CatalogCoursePage />} />
        <Route path="/max-link" element={<MaxLinkPage />} />

        {/* Protected app with sidebar */}
        <Route path="/" element={<Layout />}>
          <Route path="dashboard" element={<Protected><DashboardPage /></Protected>} />
          <Route path="system-center" element={<RoleProtected path="/system-center"><SystemCenterPage /></RoleProtected>} />
          <Route path="employees" element={<RoleProtected path="/employees"><EmployeesPage /></RoleProtected>} />
          <Route path="finance" element={<RoleProtected path="/finance"><FinancePage /></RoleProtected>} />
          <Route path="settings" element={<Protected><SettingsPage /></Protected>} />
          <Route path="teacher-dashboard" element={<RoleProtected path="/teacher-dashboard"><TeacherDashboardPage /></RoleProtected>} />
          <Route path="student-dashboard" element={<RoleProtected path="/student-dashboard"><StudentDashboardPage /></RoleProtected>} />
          <Route path="methodist-dashboard" element={<RoleProtected path="/methodist-dashboard"><MethodistDashboardPage /></RoleProtected>} />
          <Route path="branches" element={<RoleProtected path="/branches"><BranchesPage /></RoleProtected>} />
          <Route path="students" element={<RoleProtected path="/students"><StudentsPage /></RoleProtected>} />
          <Route path="analytics" element={<RoleProtected path="/analytics"><AnalyticsPage /></RoleProtected>} />
          <Route path="crm" element={<RoleProtected path="/crm"><CrmPage /></RoleProtected>} />
          <Route path="courses" element={<RoleProtected path="/courses"><CoursesPage /></RoleProtected>} />
          <Route path="calendar" element={<RoleProtected path="/calendar"><SchedulePage /></RoleProtected>} />
          <Route path="groups" element={<RoleProtected path="/groups"><GroupsPage /></RoleProtected>} />
          <Route path="tasks" element={<RoleProtected path="/tasks"><TasksPage /></RoleProtected>} />
          <Route path="school-settings" element={<RoleProtected path="/school-settings"><SchoolSettingsPage /></RoleProtected>} />
          <Route path="directories" element={<RoleProtected path="/directories"><DirectoriesPage /></RoleProtected>} />
          <Route path="reports" element={<RoleProtected path="/reports"><ReportsPage /></RoleProtected>} />
          <Route path="surveys" element={<RoleProtected path="/surveys"><SurveysPage /></RoleProtected>} />
          <Route path="homeworks" element={<RoleProtected path="/homeworks"><HomeworksPage /></RoleProtected>} />
          <Route path="chats" element={<Protected><ChatPage /></Protected>} />
          <Route path="notifications" element={<Protected><NotificationsPage /></Protected>} />
          <Route path="academy" element={<RoleProtected path="/academy"><TeacherAcademyPage /></RoleProtected>} />
          <Route path="course-builder" element={<RoleProtected path="/course-builder"><CourseBuilderPage /></RoleProtected>} />
          <Route path="employee-groups" element={<RoleProtected path="/employee-groups"><EmployeeGroupsPage /></RoleProtected>} />
          <Route path="courses/:id/learn" element={<Protected><CoursePlayerPage /></Protected>} />

          <Route path="marketing" element={<RoleProtected path="/marketing"><MarketingPage /></RoleProtected>} />
          <Route path="ai" element={<Protected><AIAssistantPage /></Protected>} />
          <Route path="roles" element={<RoleProtected path="/roles"><RolesPage /></RoleProtected>} />
          <Route path="builder" element={<Navigate to="/course-builder" replace />} />
          <Route path="my-courses" element={<RoleProtected path="/my-courses"><TeacherCoursesPage /></RoleProtected>} />
          <Route path="knowledge" element={<RoleProtected path="/knowledge"><KnowledgeBasePage /></RoleProtected>} />
          <Route path="certification" element={<RoleProtected path="/certification"><CertificationPage /></RoleProtected>} />
          <Route path="progress" element={<RoleProtected path="/progress"><TeacherProgressPage /></RoleProtected>} />
          <Route path="library" element={<RoleProtected path="/library"><LibraryPage /></RoleProtected>} />
          <Route path="community" element={<Navigate to="/chats" replace />} />
          <Route path="payments" element={<RoleProtected path="/payments"><PaymentsPage /></RoleProtected>} />
          <Route path="store/products" element={<RoleProtected path="/store/products"><StoreProductsPage /></RoleProtected>} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default App
