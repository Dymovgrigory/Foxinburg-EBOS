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
import PlaceholderPage from './components/PlaceholderPage'
import CrmPage from './pages/CrmPage'
import HomeworksPage from './pages/HomeworksPage'
import CoursesPage from './pages/CoursesPage'
import BranchesPage from './pages/BranchesPage'
import StudentsPage from './pages/StudentsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import SchedulePage from './pages/SchedulePage'
import NotificationsPage from './pages/NotificationsPage'
import ChatPage from './pages/ChatPage'
import TeacherAcademyPage from './pages/TeacherAcademyPage'

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
        <Route path="branches" element={<RoleProtected path="/branches"><BranchesPage /></RoleProtected>} />
        <Route path="students" element={<RoleProtected path="/students"><StudentsPage /></RoleProtected>} />
        <Route path="analytics" element={<RoleProtected path="/analytics"><AnalyticsPage /></RoleProtected>} />
        <Route path="crm" element={<RoleProtected path="/crm"><CrmPage /></RoleProtected>} />
        <Route path="courses" element={<RoleProtected path="/courses"><CoursesPage /></RoleProtected>} />
        <Route path="calendar" element={<RoleProtected path="/calendar"><SchedulePage /></RoleProtected>} />
        <Route path="homeworks" element={<RoleProtected path="/homeworks"><HomeworksPage /></RoleProtected>} />
        <Route path="chats" element={<Protected><ChatPage /></Protected>} />
        <Route path="notifications" element={<Protected><NotificationsPage /></Protected>} />
        <Route path="academy" element={<RoleProtected path="/academy"><TeacherAcademyPage /></RoleProtected>} />

        {/* Placeholder routes */}
        <Route path="marketing" element={<Protected><PlaceholderPage title="Маркетинг" icon="📣" /></Protected>} />
        <Route path="ai" element={<Protected><PlaceholderPage title="AI Помощник" icon="🤖" /></Protected>} />
        <Route path="roles" element={<Protected><PlaceholderPage title="Role Ecosystem" icon="🛡️" /></Protected>} />
        <Route path="builder" element={<Protected><PlaceholderPage title="Конструктор" subtitle="NEW" icon="🛠️" /></Protected>} />
        <Route path="my-courses" element={<Protected><PlaceholderPage title="Мои курсы" icon="📚" /></Protected>} />
        <Route path="knowledge" element={<Protected><PlaceholderPage title="База знаний" icon="🧠" /></Protected>} />
        <Route path="certification" element={<Protected><PlaceholderPage title="Сертификация" icon="🎓" /></Protected>} />
        <Route path="progress" element={<Protected><PlaceholderPage title="Мой прогресс" icon="📈" /></Protected>} />
        <Route path="library" element={<Protected><PlaceholderPage title="Библиотека" icon="📖" /></Protected>} />
        <Route path="community" element={<Protected><PlaceholderPage title="Сообщество" icon="💬" /></Protected>} />
        <Route path="payments" element={<Protected><PlaceholderPage title="Оплата" icon="💳" /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
