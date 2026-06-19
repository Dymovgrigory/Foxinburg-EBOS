import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LandingPage from './pages/LandingPage'
// Login is integrated into the landing page
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

function App() {
  return (
    <Routes>
      {/* Public pages without sidebar */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LandingPage showAuth />} />

      {/* Protected app with sidebar */}
      <Route path="/" element={<Layout />}>
        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="system-center"
          element={
            <ProtectedRoute>
              <SystemCenterPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="employees"
          element={
            <ProtectedRoute>
              <EmployeesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance"
          element={
            <ProtectedRoute>
              <FinancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="teacher-dashboard"
          element={
            <ProtectedRoute>
              <TeacherDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="student-dashboard"
          element={
            <ProtectedRoute>
              <StudentDashboardPage />
            </ProtectedRoute>
          }
        />
        {/* Placeholder routes */}
        <Route path="branches" element={<ProtectedRoute><BranchesPage /></ProtectedRoute>} />
        <Route path="students" element={<ProtectedRoute><StudentsPage /></ProtectedRoute>} />
        <Route path="analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
        <Route path="crm" element={<ProtectedRoute><CrmPage /></ProtectedRoute>} />
        <Route path="marketing" element={<ProtectedRoute><PlaceholderPage title="Маркетинг" icon="📣" /></ProtectedRoute>} />
        <Route path="courses" element={<ProtectedRoute><CoursesPage /></ProtectedRoute>} />
        <Route path="ai" element={<ProtectedRoute><PlaceholderPage title="AI Помощник" icon="🤖" /></ProtectedRoute>} />
        <Route path="roles" element={<ProtectedRoute><PlaceholderPage title="Role Ecosystem" icon="🛡️" /></ProtectedRoute>} />
        <Route path="builder" element={<ProtectedRoute><PlaceholderPage title="Конструктор" subtitle="NEW" icon="🛠️" /></ProtectedRoute>} />
        <Route path="my-courses" element={<ProtectedRoute><PlaceholderPage title="Мои курсы" icon="📚" /></ProtectedRoute>} />
        <Route path="knowledge" element={<ProtectedRoute><PlaceholderPage title="База знаний" icon="🧠" /></ProtectedRoute>} />
        <Route path="homeworks" element={<ProtectedRoute><HomeworksPage /></ProtectedRoute>} />
        <Route path="certification" element={<ProtectedRoute><PlaceholderPage title="Сертификация" icon="🎓" /></ProtectedRoute>} />
        <Route path="progress" element={<ProtectedRoute><PlaceholderPage title="Мой прогресс" icon="📈" /></ProtectedRoute>} />
        <Route path="library" element={<ProtectedRoute><PlaceholderPage title="Библиотека" icon="📖" /></ProtectedRoute>} />
        <Route path="calendar" element={<ProtectedRoute><PlaceholderPage title="Календарь" icon="📅" /></ProtectedRoute>} />
        <Route path="community" element={<ProtectedRoute><PlaceholderPage title="Сообщество" icon="💬" /></ProtectedRoute>} />
        <Route path="notifications" element={<ProtectedRoute><PlaceholderPage title="Уведомления" icon="🔔" /></ProtectedRoute>} />
        <Route path="payments" element={<ProtectedRoute><PlaceholderPage title="Оплата" icon="💳" /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
