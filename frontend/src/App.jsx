import { Component, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PeriodicTableOverlay from './components/PeriodicTableOverlay';
import AppShell from './components/AppShell';
import TeacherShell from './components/TeacherShell';
import { isAuthenticated, getToken } from './api/client';

// ─── Lazy page imports (route-level code splitting) ───────────────────────────

const CoursesPage            = lazy(() => import('./pages/CoursesPage'));
const CourseDetailPage       = lazy(() => import('./pages/CourseDetailPage'));
const LessonPage             = lazy(() => import('./pages/LessonPage'));
const QuizPage               = lazy(() => import('./pages/QuizPage'));
const QuizzesPage            = lazy(() => import('./pages/QuizzesPage'));
const DashboardPage          = lazy(() => import('./pages/DashboardPage'));
const ProgressPage           = lazy(() => import('./pages/ProgressPage'));
const MessagesPage           = lazy(() => import('./pages/MessagesPage'));
const SchedulePage           = lazy(() => import('./pages/SchedulePage'));
const SettingsPage           = lazy(() => import('./pages/SettingsPage'));
const StudentHomeworksPage   = lazy(() => import('./pages/StudentHomeworksPage'));
const LoginPage              = lazy(() => import('./pages/LoginPage'));
const ForgotPasswordPage     = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage      = lazy(() => import('./pages/ResetPasswordPage'));
const PrivacyPage            = lazy(() => import('./pages/PrivacyPage'));
const TermsPage              = lazy(() => import('./pages/TermsPage'));
const LandingPage            = lazy(() => import('./pages/LandingPage'));
const OnboardingPage         = lazy(() => import('./pages/OnboardingPage'));
const AdminDashboardPage     = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminStudentsPage      = lazy(() => import('./pages/admin/AdminStudentsPage'));
const AdminStudentDetailPage = lazy(() => import('./pages/admin/AdminStudentDetailPage'));
const AdminGroupsPage        = lazy(() => import('./pages/admin/AdminGroupsPage'));
const AdminCoursesPage       = lazy(() => import('./pages/admin/AdminCoursesPage'));
const AdminContentPage       = lazy(() => import('./pages/admin/AdminContentPage'));
const AdminHomeworksPage     = lazy(() => import('./pages/admin/AdminHomeworksPage'));
const AdminMessagesPage      = lazy(() => import('./pages/admin/AdminMessagesPage'));
const AdminBroadcastsPage    = lazy(() => import('./pages/admin/AdminBroadcastsPage'));
const AdminSessionsPage      = lazy(() => import('./pages/admin/AdminSessionsPage'));
const AdminRevenuePage       = lazy(() => import('./pages/admin/AdminRevenuePage'));
const AdminReportsPage       = lazy(() => import('./pages/admin/AdminReportsPage'));
const AdminQuestionsPage     = lazy(() => import('./pages/admin/AdminQuestionsPage'));
const LessonEditorPage       = lazy(() => import('./pages/admin/LessonEditorPage'));
const LessonPrintPage        = lazy(() => import('./pages/admin/LessonPrintPage'));

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
      <PeriodicTableOverlay />
      <Suspense fallback={<div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: 'var(--ink-faint)', fontSize: 14 }}>Učitavanje…</div>}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
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
      </Suspense>
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
