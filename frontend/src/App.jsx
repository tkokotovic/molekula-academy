import { Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/AppShell';
import TeacherShell from './components/TeacherShell';
import CoursesPage from './pages/CoursesPage';
import CourseDetailPage from './pages/CourseDetailPage';
import LessonPage from './pages/LessonPage';
import QuizPage from './pages/QuizPage';
import QuizzesPage from './pages/QuizzesPage';
import DashboardPage from './pages/DashboardPage';
import ProgressPage from './pages/ProgressPage';
import MessagesPage from './pages/MessagesPage';
import SchedulePage from './pages/SchedulePage';
import SettingsPage from './pages/SettingsPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminStudentsPage from './pages/admin/AdminStudentsPage';
import AdminStudentDetailPage from './pages/admin/AdminStudentDetailPage';
import AdminGroupsPage from './pages/admin/AdminGroupsPage';
import AdminCoursesPage from './pages/admin/AdminCoursesPage';
import AdminContentPage from './pages/admin/AdminContentPage';
import AdminHomeworksPage from './pages/admin/AdminHomeworksPage';
import AdminMessagesPage from './pages/admin/AdminMessagesPage';
import AdminBroadcastsPage from './pages/admin/AdminBroadcastsPage';
import AdminSessionsPage from './pages/admin/AdminSessionsPage';
import AdminRevenuePage from './pages/admin/AdminRevenuePage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import AdminQuestionsPage from './pages/admin/AdminQuestionsPage';
import LessonEditorPage from './pages/admin/LessonEditorPage';
import LessonPrintPage from './pages/admin/LessonPrintPage';
import StudentHomeworksPage from './pages/StudentHomeworksPage';
import LoginPage from './pages/LoginPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import LandingPage from './pages/LandingPage';
import OnboardingPage from './pages/OnboardingPage';
import { isAuthenticated, getToken } from './api/client';

// ─── Error boundary (dev debugging) ───────────────────────────────────────────

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: 'monospace', color: '#dc2626', whiteSpace: 'pre-wrap', fontSize: 13 }}>
          <b>Render error:</b>{'\n'}{this.state.error?.message}{'\n\n'}{this.state.error?.stack}
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Route guards ─────────────────────────────────────────────────────────────

function RequireAuth({ children }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return <AppShell>{children}</AppShell>;
}

function RequireTeacher({ children }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  try {
    const payload = JSON.parse(atob(getToken().split('.')[1]));
    if (payload.role !== 'teacher' && payload.role !== 'owner') {
      return <Navigate to="/dashboard" replace />;
    }
  } catch {
    return <Navigate to="/login" replace />;
  }
  return <TeacherShell>{children}</TeacherShell>;
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />

        {/* Student pages — wrapped in AppShell */}
        <Route path="/courses"           element={<RequireAuth><CoursesPage /></RequireAuth>} />
        <Route path="/courses/:courseId" element={<RequireAuth><CourseDetailPage /></RequireAuth>} />
        <Route path="/courses/:courseId/topics/:topicId/lessons/:lessonId" element={<RequireAuth><LessonPage /></RequireAuth>} />
        <Route path="/quizzes/:quizId"   element={<RequireAuth><QuizPage /></RequireAuth>} />
        <Route path="/dashboard"         element={<RequireAuth><DashboardPage /></RequireAuth>} />
        <Route path="/progress"          element={<RequireAuth><ProgressPage /></RequireAuth>} />
        <Route path="/quizzes"           element={<RequireAuth><QuizzesPage /></RequireAuth>} />
        <Route path="/schedule"          element={<RequireAuth><SchedulePage /></RequireAuth>} />
        <Route path="/messages"          element={<RequireAuth><MessagesPage /></RequireAuth>} />
        <Route path="/homeworks"         element={<RequireAuth><StudentHomeworksPage /></RequireAuth>} />
        <Route path="/settings"          element={<RequireAuth><SettingsPage /></RequireAuth>} />

        {/* Admin panel — teacher/owner only */}
        <Route path="/admin"                        element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard"              element={<RequireTeacher><AdminDashboardPage /></RequireTeacher>} />
        <Route path="/admin/students"               element={<RequireTeacher><AdminStudentsPage /></RequireTeacher>} />
        <Route path="/admin/students/:id"           element={<RequireTeacher><AdminStudentDetailPage /></RequireTeacher>} />
        <Route path="/admin/groups"                 element={<RequireTeacher><AdminGroupsPage /></RequireTeacher>} />
        <Route path="/admin/courses"                element={<RequireTeacher><AdminCoursesPage /></RequireTeacher>} />
        <Route path="/admin/content"                element={<RequireTeacher><AdminContentPage /></RequireTeacher>} />
        <Route path="/admin/homeworks"              element={<RequireTeacher><AdminHomeworksPage /></RequireTeacher>} />
        <Route path="/admin/messages"               element={<RequireTeacher><AdminMessagesPage /></RequireTeacher>} />
        <Route path="/admin/broadcasts"             element={<RequireTeacher><AdminBroadcastsPage /></RequireTeacher>} />
        <Route path="/admin/sessions"               element={<RequireTeacher><AdminSessionsPage /></RequireTeacher>} />
        <Route path="/admin/revenue"                element={<RequireTeacher><AdminRevenuePage /></RequireTeacher>} />
        <Route path="/admin/reports"                element={<RequireTeacher><AdminReportsPage /></RequireTeacher>} />
        <Route path="/admin/questions"              element={<RequireTeacher><AdminQuestionsPage /></RequireTeacher>} />
        <Route path="/admin/lessons/:lessonId/edit" element={<RequireTeacher><ErrorBoundary><LessonEditorPage /></ErrorBoundary></RequireTeacher>} />
        <Route path="/admin/lessons/:lessonId/print" element={<RequireTeacher><LessonPrintPage /></RequireTeacher>} />
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
