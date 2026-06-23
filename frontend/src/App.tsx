import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import RoleProtectedRoute, { ROLE_ACCESS } from './components/RoleProtectedRoute'
import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'
import SystemCenterPage from './pages/SystemCenterPage'
import EmployeesPage from './pages/EmployeesPage'
import FinancePage from './pages/FinancePage'
import SettingsPage from './pages/SettingsPage'
import TeacherDashboardPage from './pages/TeacherDashboardPage'
import StudentDashboardPage from './pages/StudentDashboardPage'
import MethodistDashboardPage from './pages/MethodistDashboardPage'
import CrmPage from './pages/CrmPage'
import MarketingPage from './pages/MarketingPage'
import RolesPage from './pages/RolesPage'
import PaymentsPage from './pages/PaymentsPage'
import HomeworksPage from './pages/HomeworksPage'
import CoursesPage from './pages/CoursesPage'
import BranchesPage from './pages/BranchesPage'
import StudentsPage from './pages/StudentsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import SchedulePage from './pages/SchedulePage'
import NotificationsPage from './pages/NotificationsPage'
import ChatPage from './pages/ChatPage'
import TeacherAcademyPage from './pages/TeacherAcademyPage'
import TeacherCoursesPage from './pages/TeacherCoursesPage'
import TeacherProgressPage from './pages/TeacherProgressPage'
import CertificationPage from './pages/CertificationPage'
import LibraryPage from './pages/LibraryPage'
import KnowledgeBasePage from './pages/KnowledgeBasePage'
import AIAssistantPage from './pages/AIAssistantPage'
import CourseBuilderPage from './pages/CourseBuilderPage'
import CoursePlayerPage from './pages/CoursePlayerPage'
import EmployeeGroupsPage from './pages/EmployeeGroupsPage'
import TeacherGroupsPage from './pages/TeacherGroupsPage'
import TasksPage from './pages/TasksPage'
import SchoolSettingsPage from './pages/SchoolSettingsPage'
import DirectoriesPage from './pages/DirectoriesPage'
import ReportsPage from './pages/ReportsPage'
import SurveysPage from './pages/SurveysPage'

function Protected({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

function RoleProtected({ path, children }: { path: string; children: React.ReactNode }) {
  return <RoleProtectedRoute allowedRoles={ROLE_ACCESS[path]}>{children}</RoleProtectedRoute>
}

function App() {
  return (
    <Routes>
      {/* Public pages without sidebar */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LandingPage showAuth />} />

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
        <Route path="groups" element={<RoleProtected path="/groups"><TeacherGroupsPage /></RoleProtected>} />
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
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
