import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TermsAcceptanceGate } from './components/TermsAcceptanceGate';
import { ToastProvider } from './components/Toast';
import AccessGate from './components/AccessGate';
import SiteShell from './components/SiteShell';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import HandoffPage from './pages/HandoffPage';
import { TermsPage, PrivacyPage } from './pages/legal/PolicyDocumentPage';
import CoursesPage from './pages/learner/CoursesPage';
import CourseDetailPage from './pages/learner/CourseDetailPage';
import LessonPage from './pages/learner/LessonPage';
import MyEnrollmentsPage from './pages/learner/MyEnrollmentsPage';
import MyCertificatesPage from './pages/learner/MyCertificatesPage';
import CertificateVerifyPage from './pages/learner/CertificateVerifyPage';
import InstructorApplyPage from './pages/learner/InstructorApplyPage';
import InstructorCoursesPage from './pages/instructor/InstructorCoursesPage';
import InstructorCourseEditPage, { InstructorAssignmentPage, InstructorQuizPage } from './pages/instructor/InstructorCourseEditPage';
import InstructorEnrollmentsPage from './pages/instructor/InstructorEnrollmentsPage';
import InstructorSubmissionsPage from './pages/instructor/InstructorSubmissionsPage';
import OperatorCoursesPage from './pages/operator/OperatorCoursesPage';
import OperatorCourseReviewPage from './pages/operator/OperatorCourseReviewPage';
import OperatorInstructorsPage from './pages/operator/OperatorInstructorsPage';
import OperatorCertificatesPage from './pages/operator/OperatorCertificatesPage';

/**
 * Lecture 라우트 경계 (WO Phase 2 §7 · §11)
 * - PUBLIC: 강의 목록/상세(visibility 정책은 서버) · 수료증 진위 확인
 * - learner: 활성 lecture membership 필요 (역할 없음)
 * - instructor: membership + lecture:instructor
 * - operator: membership + lecture:operator (lecture:admin ⊇ operator)
 */
export default function App() {
  return <BrowserRouter><AuthProvider><ToastProvider><TermsAcceptanceGate><Routes>
    <Route path="/handoff" element={<HandoffPage />} />
    <Route element={<SiteShell />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/courses" element={<CoursesPage />} />
      <Route path="/courses/:courseId" element={<CourseDetailPage />} />
      <Route path="/courses/:courseId/lesson/:lessonId" element={<LessonPage />} />
      <Route path="/certificates/verify/:code" element={<CertificateVerifyPage />} />
      {/* PDF QR · 기존 서비스(KPA/KCos/PH) 외부 이동 경로 — certificate id 기반 (§17) */}
      <Route path="/certificate/verify/:code" element={<CertificateVerifyPage />} />
      <Route element={<AccessGate area="learner" />}>
        <Route path="/my/enrollments" element={<MyEnrollmentsPage />} />
        <Route path="/my/certificates" element={<MyCertificatesPage />} />
        <Route path="/my/instructor-apply" element={<InstructorApplyPage />} />
      </Route>
      <Route element={<AccessGate area="instructor" />}>
        <Route path="/instructor" element={<InstructorCoursesPage />} />
        <Route path="/instructor/courses/new" element={<InstructorCourseEditPage />} />
        <Route path="/instructor/courses/:courseId/edit" element={<InstructorCourseEditPage />} />
        <Route path="/instructor/enrollments" element={<InstructorEnrollmentsPage />} />
        <Route path="/instructor/lessons/:lessonId/quiz" element={<InstructorQuizPage />} />
        <Route path="/instructor/lessons/:lessonId/assignment" element={<InstructorAssignmentPage />} />
        <Route path="/instructor/lessons/:lessonId/submissions" element={<InstructorSubmissionsPage />} />
      </Route>
      <Route element={<AccessGate area="operator" />}>
        <Route path="/operator" element={<OperatorCoursesPage />} />
        {/* 11차 P2: 운영자 검토 전용 read-only 화면 (수강 등록·편집 권한 없음) */}
        <Route path="/operator/courses/:courseId/review" element={<OperatorCourseReviewPage />} />
        <Route path="/operator/instructors" element={<OperatorInstructorsPage />} />
        <Route path="/operator/certificates" element={<OperatorCertificatesPage />} />
      </Route>
      <Route path="*" element={<main className="center-card"><section className="card"><h1>페이지를 찾을 수 없습니다</h1></section></main>} />
    </Route>
  </Routes></TermsAcceptanceGate></ToastProvider></AuthProvider></BrowserRouter>;
}
