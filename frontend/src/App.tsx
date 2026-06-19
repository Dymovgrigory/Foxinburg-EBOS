import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import SystemCenterPage from './pages/SystemCenterPage'
import EmployeesPage from './pages/EmployeesPage'
import FinancePage from './pages/FinancePage'
import SettingsPage from './pages/SettingsPage'
import TeacherDashboardPage from './pages/TeacherDashboardPage'
import StudentDashboardPage from './pages/StudentDashboardPage'
import PlaceholderPage from './components/PlaceholderPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
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
        <Route path="branches" element={<ProtectedRoute><PlaceholderPage title="Филиалы" icon="🏢" /></ProtectedRoute>} />
        <Route path="students" element={<ProtectedRoute><PlaceholderPage title="Ученики" icon="🎓" /></ProtectedRoute>} />
        <Route path="analytics" element={<ProtectedRoute><PlaceholderPage title="Аналитика" icon="📊" /></ProtectedRoute>} />
        <Route path="crm" element={<ProtectedRoute><PlaceholderPage title="CRM" icon="📋" /></ProtectedRoute>} />
        <Route path="marketing" element={<ProtectedRoute><PlaceholderPage title="Маркетинг" icon="📣" /></ProtectedRoute>} />
        <Route path="courses" element={<ProtectedRoute><PlaceholderPage title="Курсы" icon="📚" /></ProtectedRoute>} />
        <Route path="ai" element={<ProtectedRoute><PlaceholderPage title="AI Помощник" icon="🤖" /></ProtectedRoute>} />
        <Route path="roles" element={<ProtectedRoute><PlaceholderPage title="Role Ecosystem" icon="🛡️" /></ProtectedRoute>} />
        <Route path="builder" element={<ProtectedRoute><PlaceholderPage title="Конструктор" subtitle="NEW" icon="🛠️" /></ProtectedRoute>} />
        <Route path="my-courses" element={<ProtectedRoute><PlaceholderPage title="Мои курсы" icon="📚" /></ProtectedRoute>} />
        <Route path="knowledge" element={<ProtectedRoute><PlaceholderPage title="База знаний" icon="🧠" /></ProtectedRoute>} />
        <Route path="homeworks" element={<ProtectedRoute><PlaceholderPage title="Домашние задания" icon="📝" /></ProtectedRoute>} />
        <Route path="certification" element={<ProtectedRoute><PlaceholderPage title="Сертификация" icon="🎓" /></ProtectedRoute>} />
        <Route path="progress" element={<ProtectedRoute><PlaceholderPage title="Мой прогресс" icon="📈" /></ProtectedRoute>} />
        <Route path="library" element={<ProtectedRoute><PlaceholderPage title="Библиотека" icon="📖" /></ProtectedRoute>} />
        <Route path="calendar" element={<ProtectedRoute><PlaceholderPage title="Календарь" icon="📅" /></ProtectedRoute>} />
        <Route path="community" element={<ProtectedRoute><PlaceholderPage title="Сообщество" icon="💬" /></ProtectedRoute>} />
        <Route path="notifications" element={<ProtectedRoute><PlaceholderPage title="Уведомления" icon="🔔" /></ProtectedRoute>} />
        <Route path="payments" element={<ProtectedRoute><PlaceholderPage title="Оплата" icon="💳" /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
