import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout, DemoLayout } from './components';
import { AuthProvider, OrganizationProvider } from './contexts';
import { LoginModalProvider, useAuthModal } from './contexts/LoginModalContext';
import LoginModal from './components/LoginModal';
import RegisterModal from './components/RegisterModal';
import { DashboardPage } from './pages/DashboardPage';

// Forum pages
import { ForumHomePage, ForumListPage, ForumDetailPage, ForumWritePage } from './pages/forum';

// LMS pages
import { EducationPage, LmsCoursesPage, LmsCourseDetailPage, LmsLessonPage, LmsCertificatesPage } from './pages/lms';

// Events pages (WO-KPA-COMMUNITY-HOME-V1)
import { EventsHomePage } from './pages/events/EventsHomePage';

// Organization Service page (WO-KPA-COMMUNITY-HOME-V1)
import { OrganizationServicePage } from './pages/OrganizationServicePage';

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
import { ResourcesListPage, ResourcesHomePage } from './pages/resources';

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

// Login & Register pages - legacy imports (페이지는 제거, 모달로 대체)
// WO-O4O-AUTH-LEGACY-LOGIN-REGISTER-PAGE-REMOVAL-V1
import RegisterPendingPage from './pages/auth/RegisterPendingPage';

// Test Guide Pages
import { TestGuidePage, PharmacistManualPage, DistrictOfficerManualPage, BranchOfficerManualPage, AdminManualPage } from './pages/test-guide';

// Platform Home (WO-KPA-HOME-FOUNDATION-V1) - legacy, kept for reference
// import { HomePage } from './pages/platform';
import TestCenterPage from './pages/TestCenterPage';

// Community Home (WO-KPA-COMMUNITY-HOME-V1)
import { CommunityHomePage } from './pages/CommunityHomePage';

// Service Detail Pages (WO-KPA-HOME-SERVICE-SECTION-V1)
import { BranchServicePage, DivisionServicePage, PharmacyServicePage, ForumServicePage, LmsServicePage } from './pages/services';

// Join/Participation Pages (WO-KPA-HOME-SERVICE-SECTION-V1)
import { BranchJoinPage, DivisionJoinPage, PharmacyJoinPage } from './pages/join';

// Pharmacy Management (WO-KPA-PHARMACY-MANAGEMENT-V1, WO-KPA-UNIFIED-AUTH-PHARMACY-GATE-V1)
import { PharmacyPage, PharmacyB2BPage, PharmacyStorePage, PharmacyServicesPage, PharmacyApprovalGatePage, PharmacyDashboardPage } from './pages/pharmacy';
import { SupplierListPage, SupplierDetailPage } from './pages/pharmacy/b2b';

// Work Pages (WO-KPA-WORK-IMPLEMENT-V1) - 근무약사 전용 업무 화면
import { WorkPage, WorkTasksPage, WorkLearningPage, WorkDisplayPage, WorkCommunityPage } from './pages/work';

// Function Gate (WO-KPA-FUNCTION-GATE-V1)
import { FunctionGatePage } from './pages/FunctionGatePage';

// Legacy pages (for backward compatibility)
import {
  MemberApplyPage,
  MyApplicationsPage,
} from './pages';

/**
 * KPA Society - 약사회 SaaS
 *
 * WO-KPA-DEMO-ROUTE-ISOLATION-V1
 * - 기존 약사회 서비스 전체를 /demo 하위로 이동
 * - / 경로는 플랫폼 홈용으로 비워둠
 * - 기존 서비스 코드 변경 없이 라우팅만 이동
 */

const SERVICE_NAME = 'KPA-Society';

// ServiceUserProtectedRoute removed — WO-KPA-UNIFIED-AUTH-PHARMACY-GATE-V1
// Service User 인증 제거, Platform User 단일 인증으로 통합

/**
 * WO-O4O-AUTH-LEGACY-LOGIN-REGISTER-PAGE-REMOVAL-V1
 * /login, /register URL 접근 시 홈으로 리다이렉트 + 모달 오픈
 */
function LoginRedirect() {
  const navigate = useNavigate();
  const { openLoginModal } = useAuthModal();

  useEffect(() => {
    navigate('/', { replace: true });
    openLoginModal();
  }, [navigate, openLoginModal]);

  return null;
}

function RegisterRedirect() {
  const navigate = useNavigate();
  const { openRegisterModal } = useAuthModal();

  useEffect(() => {
    navigate('/', { replace: true });
    openRegisterModal();
  }, [navigate, openRegisterModal]);

  return null;
}

function App() {
  return (
    <AuthProvider>
      <LoginModalProvider>
      <OrganizationProvider>
      <BrowserRouter>
        {/* 전역 인증 모달 (WO-O4O-AUTH-MODAL-LOGIN-AND-ACCOUNT-STANDARD-V1, WO-O4O-AUTH-MODAL-REGISTER-STANDARD-V1) */}
        <LoginModal />
        <RegisterModal />
        <Routes>
          {/* =========================================================
           * P2-T3: Service A - 메인 커뮤니티 (Main Community)
           * WO-KPA-SOCIETY-P2-STRUCTURE-REFINE-V1
           *
           * SCOPE: 분회 서비스 데모 (Community Demo)
           * 단일 조직, 커뮤니티 중심 서비스
           * - / : 커뮤니티 홈
           * - /test-center : 테스트 센터
           * - /services/* : 서비스 소개 페이지
           * - /join/* : 서비스 참여 페이지
           * - /pharmacy/* : 약국 경영지원 (실 서비스)
           * - /work/* : 근무약사 업무
           *
           * WO-KPA-DEMO-SCOPE-SEPARATION-AND-IMPLEMENTATION-V1
           * ========================================================= */}
          <Route path="/" element={<Layout serviceName={SERVICE_NAME}><CommunityHomePage /></Layout>} />

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
          {/* WO-PHARMACY-CONTEXT-MVP-V1: 약국경영 대시보드 (Context 기반 보호) */}
          <Route path="/pharmacy/dashboard" element={<Layout serviceName={SERVICE_NAME}><PharmacyDashboardPage /></Layout>} />
          <Route path="/pharmacy/b2b" element={<Layout serviceName={SERVICE_NAME}><PharmacyB2BPage /></Layout>} />
          <Route path="/pharmacy/b2b/suppliers" element={<Layout serviceName={SERVICE_NAME}><SupplierListPage /></Layout>} />
          <Route path="/pharmacy/b2b/suppliers/:supplierId" element={<Layout serviceName={SERVICE_NAME}><SupplierDetailPage /></Layout>} />
          <Route path="/pharmacy/store" element={<Layout serviceName={SERVICE_NAME}><PharmacyStorePage /></Layout>} />
          <Route path="/pharmacy/services" element={<Layout serviceName={SERVICE_NAME}><PharmacyServicesPage /></Layout>} />

          {/* ========================================
           * 약국 서비스 신청 게이트
           * WO-KPA-UNIFIED-AUTH-PHARMACY-GATE-V1
           * - Service User 로그인 제거, Platform User 단일 인증
           * - 약국 승인 미완료 시 신청 폼 표시
           * ======================================== */}
          <Route path="/pharmacy/approval" element={<Layout serviceName={SERVICE_NAME}><PharmacyApprovalGatePage /></Layout>} />

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

          {/* =========================================================
           * P2-T3: Service B - 지부/분회 연동 서비스 (District/Branch Demo)
           * WO-KPA-SOCIETY-P2-STRUCTURE-REFINE-V1
           *
           * SCOPE: 지부/분회 서비스 데모 (District/Branch Admin Demo)
           * 조직 관리 중심 서비스 — 커뮤니티 홈(/)과 혼합 금지
           * - /demo : 조직 대시보드 (DashboardPage)
           * - /demo/admin/* : 지부 관리자
           * - /demo/operator/* : 서비스 운영자
           * - /demo/intranet/* : 인트라넷
           * - /demo/branch/:branchId/* : 분회 서비스 (⚠️ Service C 흡수됨)
           * - /demo/branch/:branchId/admin/* : 분회 관리자
           * - /demo/login, /demo/register : 데모 인증
           *
           * P2-T3 주의사항:
           * - Service C (분회 독립 서비스)는 현재 /demo/branch/:branchId/* 에 흡수됨
           * - 향후 분리 시 BranchRoutes, BranchProvider, BranchLayout 독립 검토 필요
           *
           * WO-KPA-DEMO-ROUTE-ISOLATION-V1
           * WO-KPA-DEMO-SCOPE-SEPARATION-AND-IMPLEMENTATION-V1
           * ========================================================= */}

          {/* Login & Register - 모달로 대체 (WO-O4O-AUTH-LEGACY-LOGIN-REGISTER-PAGE-REMOVAL-V1) */}
          <Route path="/demo/login" element={<LoginRedirect />} />
          <Route path="/demo/register" element={<RegisterRedirect />} />
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

          {/* ===================================================
           * P2-T3: Service C - 분회 독립 서비스 (현재 흡수 상태)
           * WO-KPA-SOCIETY-P2-STRUCTURE-REFINE-V1
           *
           * 현재 상태: Service B (/demo) 내부에 흡수됨
           * 향후 분리 시나리오: 독립 도메인 또는 서브도메인
           * 분리 대상 컴포넌트:
           * - BranchRoutes (routes/BranchRoutes.tsx)
           * - BranchProvider (contexts/BranchContext.tsx)
           * - BranchLayout (components/branch/BranchLayout.tsx)
           *
           * 분리 작업 없음 (P2-T3: 구조만 준비)
           * =================================================== */}
          <Route path="/demo/branch/:branchId/admin/*" element={<BranchAdminRoutes />} />
          <Route path="/demo/branch/:branchId/*" element={<BranchRoutes />} />

          {/* /demo/branch (branchId 없음) - 인트라넷으로 리다이렉트 */}
          <Route path="/demo/branch" element={<Navigate to="/demo/intranet" replace />} />

          {/* Main Layout Routes - /demo 하위 나머지 경로 */}
          <Route path="/demo/*" element={<DemoLayoutRoutes />} />

          {/* =========================================================
           * SCOPE: 레거시 경로 리다이렉트 (Legacy Redirects)
           * 기존 북마크 호환용, 신규 코드에서 참조 금지
           * WO-O4O-AUTH-LEGACY-LOGIN-REGISTER-PAGE-REMOVAL-V1
           * ========================================================= */}
          <Route path="/login" element={<LoginRedirect />} />
          <Route path="/register" element={<RegisterRedirect />} />
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
      </OrganizationProvider>
      </LoginModalProvider>
    </AuthProvider>
  );
}

/**
 * SCOPE: 지부/분회 서비스 데모 — Main Layout 하위 라우트
 *
 * WO-KPA-DEMO-HEADER-SEPARATION-V1: DemoLayout 사용
 *
 * /demo 하위에서 DemoLayout을 사용하는 라우트들.
 * 이 라우트들은 지부/분회 조직 관리 데모 범위에 속합니다.
 * 커뮤니티 홈(/)과는 별도 스코프이며, 시각적으로도 분리됩니다.
 */
function DemoLayoutRoutes() {
  return (
    <DemoLayout serviceName={SERVICE_NAME}>
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

        {/* Forum (포럼) - WO-KPA-COMMUNITY-HOME-V1 */}
        <Route path="/forum" element={<ForumHomePage />} />
        <Route path="/forum/all" element={<ForumListPage />} />
        <Route path="/forum/category/:id" element={<ForumListPage />} />
        <Route path="/forum/post/:id" element={<ForumDetailPage />} />
        <Route path="/forum/write" element={<ForumWritePage />} />
        <Route path="/forum/edit/:id" element={<ForumWritePage />} />

        {/* LMS (교육) - WO-KPA-COMMUNITY-HOME-V1 */}
        <Route path="/lms" element={<EducationPage />} />
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

        {/* Docs (자료실) - WO-KPA-LMS-RESTRUCTURE-APPLY-V1: Content 집중 */}
        <Route path="/docs" element={<ResourcesHomePage />} />
        <Route path="/docs/list" element={<ResourcesListPage />} />
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

        {/* Events (이벤트) - WO-KPA-COMMUNITY-HOME-V1 */}
        <Route path="/events" element={<EventsHomePage />} />

        {/* Organization Service (약사회 서비스 데모) - WO-KPA-COMMUNITY-HOME-V1 */}
        <Route path="/organization-service" element={<OrganizationServicePage />} />

        {/* Legacy routes (for backward compatibility) */}
        <Route path="/member/apply" element={<MemberApplyPage />} />
        <Route path="/applications" element={<MyApplicationsPage />} />

        {/* 404 */}
        <Route path="*" element={<DemoNotFoundPage />} />
      </Routes>
    </DemoLayout>
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
