import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/AppShell';
import AdminShell from './components/AdminShell';
import CoursesPage from './pages/CoursesPage';
import CourseDetailPage from './pages/CourseDetailPage';
import LessonPage from './pages/LessonPage';
import QuizPage from './pages/QuizPage';
import DashboardPage from './pages/DashboardPage';
import ProgressPage from './pages/ProgressPage';
import MessagesPage from './pages/MessagesPage';
import SchedulePage from './pages/SchedulePage';
import SettingsPage from './pages/SettingsPage';
import AdminStudentsPage from './pages/admin/AdminStudentsPage';
import AdminStudentDetailPage from './pages/admin/AdminStudentDetailPage';
import AdminRevenuePage from './pages/admin/AdminRevenuePage';
import AdminContentPage from './pages/admin/AdminContentPage';
import AdminMessagesPage from './pages/admin/AdminMessagesPage';
import LoginPage from './pages/LoginPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import LandingPage from './pages/LandingPage';
import { isAuthenticated, getToken } from './api/client';

// ─── Route guards ─────────────────────────────────────────────────────────────

function RequireAuth({ children }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return <AppShell>{children}</AppShell>;
}

function RequireTeacher({ children }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  // Decode role from JWT payload (no extra fetch needed)
  try {
    const payload = JSON.parse(atob(getToken().split('.')[1]));
    if (payload.role !== 'teacher' && payload.role !== 'owner') {
      return <Navigate to="/dashboard" replace />;
    }
  } catch {
    return <Navigate to="/login" replace />;
  }
  return <AppShell><AdminShell>{children}</AdminShell></AppShell>;
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />

        {/* Student pages — wrapped in AppShell */}
        <Route path="/courses"           element={<RequireAuth><CoursesPage /></RequireAuth>} />
        <Route path="/courses/:courseId" element={<RequireAuth><CourseDetailPage /></RequireAuth>} />
        <Route path="/courses/:courseId/topics/:topicId/lessons/:lessonId" element={<RequireAuth><LessonPage /></RequireAuth>} />
        <Route path="/quizzes/:quizId"   element={<RequireAuth><QuizPage /></RequireAuth>} />
        <Route path="/dashboard"         element={<RequireAuth><DashboardPage /></RequireAuth>} />
        <Route path="/progress"          element={<RequireAuth><ProgressPage /></RequireAuth>} />
        <Route path="/quizzes"           element={<RequireAuth><Stub title="Kvizovi" /></RequireAuth>} />
        <Route path="/schedule"          element={<RequireAuth><SchedulePage /></RequireAuth>} />
        <Route path="/messages"          element={<RequireAuth><MessagesPage /></RequireAuth>} />
        <Route path="/settings"          element={<RequireAuth><SettingsPage /></RequireAuth>} />

        {/* Admin panel — teacher/owner only, wrapped in AppShell + AdminShell */}
        <Route path="/admin"                    element={<Navigate to="/admin/students" replace />} />
        <Route path="/admin/students"           element={<RequireTeacher><AdminStudentsPage /></RequireTeacher>} />
        <Route path="/admin/students/:id"       element={<RequireTeacher><AdminStudentDetailPage /></RequireTeacher>} />
        <Route path="/admin/revenue"            element={<RequireTeacher><AdminRevenuePage /></RequireTeacher>} />
        <Route path="/admin/content"            element={<RequireTeacher><AdminContentPage /></RequireTeacher>} />
        <Route path="/admin/messages"           element={<RequireTeacher><AdminMessagesPage /></RequireTeacher>} />
      </Routes>
    </BrowserRouter>
  );
}

// Temporary placeholder
function Stub({ title }) {
  return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-soft)' }}>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 16 }}>
        U izradi · Coming soon
      </p>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 36, color: 'var(--ink)', margin: '0 0 12px' }}>{title}</h1>
      <p style={{ fontSize: 16 }}>Ova stranica je još u izradi.</p>
    </div>
  );
}
