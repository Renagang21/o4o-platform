import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components';
import { AuthProvider } from './contexts';
import { DashboardPage } from './pages/DashboardPage';

// Forum pages
import { ForumListPage, ForumDetailPage, ForumWritePage } from './pages/forum';

// LMS pages
import { LmsCoursesPage, LmsCourseDetailPage, LmsLessonPage, LmsCertificatesPage } from './pages/lms';

// Participation pages (WO-KPA-PARTICIPATION-APP-V1)
import {
  ParticipationListPage,
  ParticipationCreatePage,
  ParticipationRespondPage,
  ParticipationResultPage,
} from './pages/participation';

// Groupbuy pages
import { GroupbuyListPage, GroupbuyDetailPage, GroupbuyHistoryPage } from './pages/groupbuy';

// News pages
import { NewsListPage, NewsDetailPage, GalleryPage } from './pages/news';

// Resources pages
import { ResourcesListPage } from './pages/resources';

// Organization pages
import { OrganizationAboutPage, BranchesPage, BranchDetailPage, OfficersPage, ContactPage } from './pages/organization';

// MyPage pages
import { MyDashboardPage, MyProfilePage, MySettingsPage, MyCertificatesPage, PersonalStatusReportPage, AnnualReportFormPage } from './pages/mypage';

// Branch Routes (분회 서브디렉토리)
import { BranchRoutes } from './routes/BranchRoutes';

// Branch Admin Routes (분회 관리자)
import { BranchAdminRoutes } from './routes/BranchAdminRoutes';

// Admin Routes (지부 관리자)
import { AdminRoutes } from './routes/AdminRoutes';

// Operator Routes (서비스 운영자)
import { OperatorRoutes } from './routes/OperatorRoutes';

// Intranet Routes (인트라넷)
import { IntranetRoutes } from './routes/IntranetRoutes';

// Login & Register pages
import { LoginPage } from './pages/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import RegisterPendingPage from './pages/auth/RegisterPendingPage';

// Test Guide Pages
import { TestGuidePage, PharmacistManualPage, DistrictOfficerManualPage, BranchOfficerManualPage, AdminManualPage } from './pages/test-guide';

// Platform Home (WO-KPA-HOME-FOUNDATION-V1)
import { HomePage } from './pages/platform';
import TestCenterPage from './pages/TestCenterPage';

// Service Detail Pages (WO-KPA-HOME-SERVICE-SECTION-V1)
import { BranchServicePage, DivisionServicePage, PharmacyServicePage, ForumServicePage, LmsServicePage } from './pages/services';

// Join/Participation Pages (WO-KPA-HOME-SERVICE-SECTION-V1)
import { BranchJoinPage, DivisionJoinPage, PharmacyJoinPage } from './pages/join';

// Pharmacy Management (WO-KPA-PHARMACY-MANAGEMENT-V1, WO-KPA-PHARMACY-DEPTH-V1, WO-KPA-PHARMACY-B2B-FUNCTION-V1)
import { PharmacyPage, PharmacyB2BPage, PharmacyStorePage, PharmacyServicesPage, ServiceLoginPage, ServiceDashboardPage } from './pages/pharmacy';
import { SupplierListPage, SupplierDetailPage } from './pages/pharmacy/b2b';

// Phase 2-b: Service User Protected Route (WO-AUTH-SERVICE-IDENTITY-PHASE2B-KPA-PHARMACY)
import { useAuth } from './contexts';

// Work Pages (WO-KPA-WORK-IMPLEMENT-V1) - 근무약사 전용 업무 화면
import { WorkPage, WorkTasksPage, WorkLearningPage, WorkDisplayPage, WorkCommunityPage } from './pages/work';

// Function Gate (WO-KPA-FUNCTION-GATE-V1)
import { FunctionGatePage } from './pages/FunctionGatePage';

// Legacy pages (for backward compatibility)
import {
  MemberApplyPage,
  MyApplicationsPage,
  EventsPage,
} from './pages';

/**
 * KPA Society - 약사회 SaaS
 *
 * WO-KPA-DEMO-ROUTE-ISOLATION-V1
 * - 기존 약사회 서비스 전체를 /demo 하위로 이동
 * - / 경로는 플랫폼 홈용으로 비워둠
 * - 기존 서비스 코드 변경 없이 라우팅만 이동
 */

const SERVICE_NAME = '청명광역약사회';

/**
 * Service User Protected Route
 * Phase 2-b: WO-AUTH-SERVICE-IDENTITY-PHASE2B-KPA-PHARMACY
 *
 * Protects routes that require Service User authentication.
 * Redirects to /pharmacy/service-login if not authenticated.
 */
function ServiceUserProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isServiceUserAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isServiceUserAuthenticated) {
    return <Navigate to="/pharmacy/service-login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ========================================
           * 플랫폼 홈 (/ 경로)
           * WO-KPA-HOME-FOUNDATION-V1: 실제 홈 페이지
           * ======================================== */}
          <Route path="/" element={<HomePage />} />

          {/* Test Center (WO-TEST-CENTER-SEPARATION-V1) */}
          <Route path="/test-center" element={<TestCenterPage />} />

          {/* Service Detail Pages (WO-KPA-HOME-SERVICE-SECTION-V1) */}
          <Route path="/services/branch" element={<BranchServicePage />} />
          <Route path="/services/division" element={<DivisionServicePage />} />
          <Route path="/services/pharmacy" element={<PharmacyServicePage />} />
          <Route path="/services/forum" element={<ForumServicePage />} />
          <Route path="/services/lms" element={<LmsServicePage />} />

          {/* Join/Participation Pages (WO-KPA-HOME-SERVICE-SECTION-V1) */}
          <Route path="/join/branch" element={<BranchJoinPage />} />
          <Route path="/join/division" element={<DivisionJoinPage />} />
          <Route path="/join/pharmacy" element={<PharmacyJoinPage />} />

          {/* ========================================
           * 약국 경영지원 (실 서비스 경로)
           * WO-KPA-PHARMACY-LOCATION-V1: /pharmacy를 단일 기준 경로로
           * WO-KPA-PHARMACY-DEPTH-V1: 깊이 화면 추가
           * ======================================== */}
          <Route path="/pharmacy" element={<Layout serviceName={SERVICE_NAME}><PharmacyPage /></Layout>} />
          <Route path="/pharmacy/b2b" element={<Layout serviceName={SERVICE_NAME}><PharmacyB2BPage /></Layout>} />
          <Route path="/pharmacy/b2b/suppliers" element={<Layout serviceName={SERVICE_NAME}><SupplierListPage /></Layout>} />
          <Route path="/pharmacy/b2b/suppliers/:supplierId" element={<Layout serviceName={SERVICE_NAME}><SupplierDetailPage /></Layout>} />
          <Route path="/pharmacy/store" element={<Layout serviceName={SERVICE_NAME}><PharmacyStorePage /></Layout>} />
          <Route path="/pharmacy/services" element={<Layout serviceName={SERVICE_NAME}><PharmacyServicesPage /></Layout>} />

          {/* ========================================
           * 약국 Service User 인증 (Phase 2-b)
           * WO-AUTH-SERVICE-IDENTITY-PHASE2B-KPA-PHARMACY
           * - Platform User와 완전 분리된 Service User 로그인
           * - /pharmacy/service-login: 서비스 사용자 로그인
           * - /pharmacy/service/*: 서비스 사용자 전용 영역
           * ======================================== */}
          <Route path="/pharmacy/service-login" element={<ServiceLoginPage />} />
          <Route path="/pharmacy/service" element={<ServiceUserProtectedRoute><ServiceDashboardPage /></ServiceUserProtectedRoute>} />
          <Route path="/pharmacy/service/dashboard" element={<ServiceUserProtectedRoute><ServiceDashboardPage /></ServiceUserProtectedRoute>} />

          {/* ========================================
           * 근무약사 업무 화면 (개인 기준)
           * WO-KPA-WORK-IMPLEMENT-V1
           * - /pharmacy와 명확히 분리된 개인 업무 화면
           * - 경영/결정 기능 배제
           * ======================================== */}
          <Route path="/work" element={<Layout serviceName={SERVICE_NAME}><WorkPage /></Layout>} />
          <Route path="/work/tasks" element={<Layout serviceName={SERVICE_NAME}><WorkTasksPage /></Layout>} />
          <Route path="/work/learning" element={<Layout serviceName={SERVICE_NAME}><WorkLearningPage /></Layout>} />
          <Route path="/work/display" element={<Layout serviceName={SERVICE_NAME}><WorkDisplayPage /></Layout>} />
          <Route path="/work/community" element={<Layout serviceName={SERVICE_NAME}><WorkCommunityPage /></Layout>} />

          {/* ========================================
           * 약사회 데모 서비스 (/demo 하위)
           * WO-KPA-DEMO-ROUTE-ISOLATION-V1
           * ======================================== */}

          {/* Login & Register Pages (레이아웃 없음) */}
          <Route path="/demo/login" element={<LoginPage />} />
          <Route path="/demo/register" element={<RegisterPage />} />
          <Route path="/demo/register/pending" element={<RegisterPendingPage />} />

          {/* Function Gate (WO-KPA-FUNCTION-GATE-V1) */}
          <Route path="/demo/select-function" element={<FunctionGatePage />} />

          {/* Test Guide (레이아웃 없음) */}
          <Route path="/demo/test-guide" element={<TestGuidePage />} />
          <Route path="/demo/test-guide/manual/pharmacist" element={<PharmacistManualPage />} />
          <Route path="/demo/test-guide/manual/district_officer" element={<DistrictOfficerManualPage />} />
          <Route path="/demo/test-guide/manual/branch_officer" element={<BranchOfficerManualPage />} />
          <Route path="/demo/test-guide/manual/admin" element={<AdminManualPage />} />

          {/* Admin Routes (지부 관리자 - 별도 레이아웃) */}
          <Route path="/demo/admin/*" element={<AdminRoutes />} />

          {/* Operator Routes (서비스 운영자 - 별도 레이아웃) */}
          <Route path="/demo/operator/*" element={<OperatorRoutes />} />

          {/* Intranet Routes (인트라넷 - 별도 레이아웃) */}
          <Route path="/demo/intranet/*" element={<IntranetRoutes />} />

          {/* Branch Routes (분회 서브디렉토리 - 별도 레이아웃) */}
          <Route path="/demo/branch/:branchId/admin/*" element={<BranchAdminRoutes />} />
          <Route path="/demo/branch/:branchId/*" element={<BranchRoutes />} />

          {/* /demo/branch (branchId 없음) - 인트라넷으로 리다이렉트 */}
          <Route path="/demo/branch" element={<Navigate to="/demo/intranet" replace />} />

          {/* Main Layout Routes - /demo 하위 나머지 경로 */}
          <Route path="/demo/*" element={<DemoLayoutRoutes />} />

          {/* ========================================
           * 레거시 경로 리다이렉트 (기존 북마크 지원)
           * ======================================== */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<Navigate to="/demo/register" replace />} />
          <Route path="/admin/*" element={<Navigate to="/demo/admin" replace />} />
          <Route path="/operator/*" element={<Navigate to="/demo/operator" replace />} />
          <Route path="/intranet/*" element={<Navigate to="/demo/intranet" replace />} />
          <Route path="/branch/*" element={<Navigate to="/demo/branch" replace />} />
          <Route path="/test-guide/*" element={<Navigate to="/demo/test-guide" replace />} />

          {/* 그 외 기존 경로들도 /demo로 리다이렉트 */}
          <Route path="/news/*" element={<Navigate to="/demo/news" replace />} />
          <Route path="/forum/*" element={<Navigate to="/demo/forum" replace />} />
          <Route path="/lms/*" element={<Navigate to="/demo/lms" replace />} />
          <Route path="/groupbuy/*" element={<Navigate to="/demo/groupbuy" replace />} />
          <Route path="/docs/*" element={<Navigate to="/demo/docs" replace />} />
          <Route path="/organization/*" element={<Navigate to="/demo/organization" replace />} />
          <Route path="/mypage/*" element={<Navigate to="/demo/mypage" replace />} />
          <Route path="/participation/*" element={<Navigate to="/demo/participation" replace />} />

          {/* 404 - 알 수 없는 경로 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

/**
 * /demo 하위 Main Layout을 사용하는 라우트들
 * 기존 MainLayoutRoutes와 동일 (경로만 /demo 하위로 이동)
 */
function DemoLayoutRoutes() {
  return (
    <Layout serviceName={SERVICE_NAME}>
      <Routes>
        {/* Home / Dashboard */}
        <Route path="/" element={<DashboardPage />} />

        {/* News (공지/소식) */}
        <Route path="/news" element={<NewsListPage />} />
        <Route path="/news/notice" element={<NewsListPage />} />
        <Route path="/news/branch-news" element={<NewsListPage />} />
        <Route path="/news/kpa-news" element={<NewsListPage />} />
        <Route path="/news/gallery" element={<GalleryPage />} />
        <Route path="/news/press" element={<NewsListPage />} />
        <Route path="/news/:id" element={<NewsDetailPage />} />

        {/* Forum (포럼) */}
        <Route path="/forum" element={<ForumListPage />} />
        <Route path="/forum/category/:id" element={<ForumListPage />} />
        <Route path="/forum/post/:id" element={<ForumDetailPage />} />
        <Route path="/forum/write" element={<ForumWritePage />} />
        <Route path="/forum/edit/:id" element={<ForumWritePage />} />

        {/* LMS (교육) */}
        <Route path="/lms" element={<LmsCoursesPage />} />
        <Route path="/lms/courses" element={<LmsCoursesPage />} />
        <Route path="/lms/course/:id" element={<LmsCourseDetailPage />} />
        <Route path="/lms/course/:courseId/lesson/:lessonId" element={<LmsLessonPage />} />
        <Route path="/lms/certificate" element={<LmsCertificatesPage />} />

        {/* Participation (참여 - 설문/퀴즈) WO-KPA-PARTICIPATION-APP-V1 */}
        <Route path="/participation" element={<ParticipationListPage />} />
        <Route path="/participation/create" element={<ParticipationCreatePage />} />
        <Route path="/participation/:id/respond" element={<ParticipationRespondPage />} />
        <Route path="/participation/:id/results" element={<ParticipationResultPage />} />

        {/* Groupbuy (공동구매) */}
        <Route path="/groupbuy" element={<GroupbuyListPage />} />
        <Route path="/groupbuy/history" element={<GroupbuyHistoryPage />} />
        <Route path="/groupbuy/:id" element={<GroupbuyDetailPage />} />

        {/* Pharmacy Management - 실경로로 리다이렉트 (WO-KPA-PHARMACY-LOCATION-V1) */}
        <Route path="/pharmacy" element={<Navigate to="/pharmacy" replace />} />
        <Route path="/pharmacy/*" element={<Navigate to="/pharmacy" replace />} />

        {/* Docs (자료실) */}
        <Route path="/docs" element={<ResourcesListPage />} />
        <Route path="/docs/forms" element={<ResourcesListPage />} />
        <Route path="/docs/guidelines" element={<ResourcesListPage />} />
        <Route path="/docs/policies" element={<ResourcesListPage />} />

        {/* Organization (조직소개) */}
        <Route path="/organization" element={<OrganizationAboutPage />} />
        <Route path="/organization/branches" element={<BranchesPage />} />
        <Route path="/organization/branches/:id" element={<BranchDetailPage />} />
        <Route path="/organization/officers" element={<OfficersPage />} />
        <Route path="/organization/contact" element={<ContactPage />} />

        {/* MyPage (마이페이지) */}
        <Route path="/mypage" element={<MyDashboardPage />} />
        <Route path="/mypage/profile" element={<MyProfilePage />} />
        <Route path="/mypage/settings" element={<MySettingsPage />} />
        <Route path="/mypage/certificates" element={<MyCertificatesPage />} />
        <Route path="/mypage/status-report" element={<PersonalStatusReportPage />} />
        <Route path="/mypage/annual-report" element={<AnnualReportFormPage />} />

        {/* Legacy routes (for backward compatibility) */}
        <Route path="/member/apply" element={<MemberApplyPage />} />
        <Route path="/applications" element={<MyApplicationsPage />} />
        <Route path="/events" element={<EventsPage />} />

        {/* 404 */}
        <Route path="*" element={<DemoNotFoundPage />} />
      </Routes>
    </Layout>
  );
}

/**
 * 404 페이지 (플랫폼 전체)
 */
function NotFoundPage() {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '4rem', margin: 0, color: '#2563EB' }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', marginTop: '16px', color: '#0F172A' }}>
        페이지를 찾을 수 없습니다
      </h2>
      <p style={{ color: '#64748B', marginTop: '8px' }}>
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>
      <a
        href="/"
        style={{
          display: 'inline-block',
          marginTop: '24px',
          padding: '12px 24px',
          backgroundColor: '#2563EB',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: '6px',
        }}
      >
        홈으로 돌아가기
      </a>
    </div>
  );
}

/**
 * 404 페이지 (/demo 내부)
 */
function DemoNotFoundPage() {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '4rem', margin: 0, color: '#2563EB' }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', marginTop: '16px', color: '#0F172A' }}>
        페이지를 찾을 수 없습니다
      </h2>
      <p style={{ color: '#64748B', marginTop: '8px' }}>
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>
      <a
        href="/demo"
        style={{
          display: 'inline-block',
          marginTop: '24px',
          padding: '12px 24px',
          backgroundColor: '#2563EB',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: '6px',
        }}
      >
        데모 홈으로 돌아가기
      </a>
    </div>
  );
}

export default App;
