import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Layout, DemoLayout } from './components';
import { AuthProvider, OrganizationProvider } from './contexts';
import { useAuth } from './contexts/AuthContext';
import { LoginModalProvider, useAuthModal } from './contexts/LoginModalContext';
import LoginModal from './components/LoginModal';
import RegisterModal from './components/RegisterModal';
import { DashboardPage } from './pages/DashboardPage';

// Forum pages
import { ForumHomePage, ForumListPage, ForumDetailPage, ForumWritePage } from './pages/forum';

// LMS pages
import { EducationPage, LmsCoursesPage, LmsCourseDetailPage, LmsLessonPage, LmsCertificatesPage } from './pages/lms';

// Course pages (Public-facing) - WO-CONTENT-COURSE-HUB/INTRO
import { CourseHubPage, CourseIntroPage } from './pages/courses';

// Instructor pages - WO-CONTENT-INSTRUCTOR-PUBLIC-PROFILE-V1
import { InstructorProfilePage } from './pages/instructors/InstructorProfilePage';

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

// Signage pages
import ContentHubPage from './pages/signage/ContentHubPage';
import PlaylistDetailPage from './pages/signage/PlaylistDetailPage';
import MediaDetailPage from './pages/signage/MediaDetailPage';

// Resources pages
import { ResourcesListPage, ResourcesHomePage } from './pages/resources';

// Legal pages (WO-KPA-LEGAL-PAGES-V1)
import { PolicyPage, PrivacyPage } from './pages/legal';

// Organization pages
import { OrganizationAboutPage, BranchesPage, BranchDetailPage, OfficersPage, ContactPage } from './pages/organization';

// MyPage pages
import { MyDashboardPage, MyProfilePage, MySettingsPage, MyCertificatesPage, PersonalStatusReportPage, AnnualReportFormPage } from './pages/mypage';

// Branch Routes (분회 서브디렉토리)
import { BranchRoutes } from './routes/BranchRoutes';

// Branch Admin Routes (분회 관리자)
import { BranchAdminRoutes } from './routes/BranchAdminRoutes';

// Branch Operator Routes (분회 운영자) WO-KPA-C-BRANCH-OPERATOR-IMPLEMENTATION-V1
import { BranchOperatorRoutes } from './routes/BranchOperatorRoutes';

// Admin Routes (지부 관리자)
import { AdminRoutes } from './routes/AdminRoutes';

// Operator Routes (서비스 운영자)
import { OperatorRoutes } from './routes/OperatorRoutes';

// Hub Page (WO-KPA-A-HUB-ARCHITECTURE-RESTRUCTURE-V1)
import { HubPage } from './pages/hub';

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

// Branch Services Landing (WO-KPA-SOCIETY-MAIN-NAV-REFINE-V1)
import { BranchServicesPage } from './pages/BranchServicesPage';

// Join/Participation Pages (WO-KPA-HOME-SERVICE-SECTION-V1)
import { BranchJoinPage, DivisionJoinPage, PharmacyJoinPage } from './pages/join';

// Pharmacy Management (WO-KPA-PHARMACY-MANAGEMENT-V1, WO-KPA-UNIFIED-AUTH-PHARMACY-GATE-V1)
import { PharmacyPage, PharmacyB2BPage, PharmacyStorePage, PharmacyServicesPage, PharmacyApprovalGatePage, PharmacyDashboardPage, StoreHubPage, PharmacySellPage, StoreAssetsPage } from './pages/pharmacy';
import { SupplierListPage, SupplierDetailPage } from './pages/pharmacy/b2b';

// Work Pages (WO-KPA-WORK-IMPLEMENT-V1) - 근무약사 전용 업무 화면
import { WorkPage, WorkTasksPage, WorkLearningPage, WorkDisplayPage, WorkCommunityPage } from './pages/work';

// Function Gate (WO-KPA-FUNCTION-GATE-V1)
import { FunctionGatePage } from './pages/FunctionGatePage';
import FunctionGateModal from './components/FunctionGateModal';

// User Dashboard (WO-KPA-SOCIETY-PHASE4-DASHBOARD-IMPLEMENTATION-V1)
import { UserDashboardPage, MyContentPage } from './pages/dashboard';

// WO-KPA-A-ROLE-BASED-REDIRECT-V1
import { getDefaultRouteByRole } from './lib/auth-utils';

// Debug Pages (CLAUDE.md Section 14)
import { ApiDebugPage } from './pages/debug/ApiDebugPage';

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
  const location = useLocation();
  const { openLoginModal } = useAuthModal();

  useEffect(() => {
    // state.from이 있으면 원래 페이지로 복귀, 없으면 홈
    const from = (location.state as { from?: string })?.from || '/';
    navigate(from, { replace: true });
    openLoginModal();
  }, [navigate, openLoginModal, location.state]);

  return null;
}

function RegisterRedirect() {
  const navigate = useNavigate();
  const { openRegisterModal } = useAuthModal();

  useEffect(() => {
    navigate('/dashboard', { replace: true });
    openRegisterModal();
  }, [navigate, openRegisterModal]);

  return null;
}

/**
 * /select-function URL 접근 시 대시보드로 리다이렉트 + 모달 표시
 * (페이지 → 모달 전환 후 하위호환용)
 */
/**
 * WO-KPA-A-ROLE-BASED-REDIRECT-V1
 * / 접근 시 이미 로그인된 admin/operator는 /hub로 자동 리다이렉트
 * 비로그인 상태에서 로그인해도 현재 페이지 유지 (1회 체크)
 */
function RoleBasedHome() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isLoading || checked) return;
    setChecked(true);

    if (user?.roles) {
      const target = getDefaultRouteByRole(user.roles);
      if (target !== '/dashboard') {
        navigate(target, { replace: true });
      }
    }
  }, [user, isLoading, navigate, checked]);

  return <Layout serviceName={SERVICE_NAME}><CommunityHomePage /></Layout>;
}

/**
 * WO-KPA-A-HUB-ARCHITECTURE-RESTRUCTURE-V1
 * Hub Guard: kpa:operator 이상 역할 필요
 */
function HubGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <p style={{ color: '#64748B' }}>권한을 확인하는 중...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <p style={{ fontSize: '18px', color: '#0F172A', fontWeight: 600 }}>로그인이 필요합니다</p>
        <p style={{ color: '#64748B', marginTop: '8px' }}>운영 허브에 접근하려면 로그인이 필요합니다.</p>
        <button
          style={{ marginTop: '20px', padding: '10px 24px', backgroundColor: '#2563EB', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
          onClick={() => navigate('/login', { state: { from: '/hub' } })}
        >
          로그인하기
        </button>
      </div>
    );
  }

  const hasAccess = user.roles?.some(r => ['kpa:admin', 'kpa:operator'].includes(r)) ?? false;
  if (!hasAccess) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <p style={{ fontSize: '18px', color: '#0F172A', fontWeight: 600 }}>접근 권한이 없습니다</p>
        <p style={{ color: '#64748B', marginTop: '8px' }}>운영자 권한이 필요합니다.</p>
        <button
          style={{ marginTop: '20px', padding: '10px 24px', backgroundColor: '#E2E8F0', color: '#334155', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
          onClick={() => navigate('/')}
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

function FunctionGateRedirect() {
  const navigate = useNavigate();
  const { openFunctionGateModal } = useAuthModal();

  useEffect(() => {
    navigate('/dashboard', { replace: true });
    openFunctionGateModal();
  }, [navigate, openFunctionGateModal]);

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
        <FunctionGateModal />
        <Routes>
          {/* =========================================================
           * SVC-A: 커뮤니티 서비스 (Community Service)
           * WO-KPA-SOCIETY-P2-STRUCTURE-REFINE-V1
           *
           * SCOPE: 커뮤니티 중심 서비스
           * - / : 커뮤니티 홈 (공개)
           * - /dashboard : 사용자 대시보드 (로그인 필수)
           * - /forum/* : 커뮤니티 포럼 (/demo/forum과 별도)
           * - /services/* : 서비스 소개 페이지
           * - /join/* : 서비스 참여 페이지
           * - /pharmacy/* : 약국 경영지원 (실 서비스)
           * - /work/* : 근무약사 업무
           *
           * NOTE: 커뮤니티 UX에서 /demo/*로 연결 금지
           * /demo는 지부/분회 서비스(SVC-B) 전용 영역
           *
           * WO-KPA-DEMO-SCOPE-SEPARATION-AND-IMPLEMENTATION-V1
           * WO-KPA-SOCIETY-PHASE4-ADJUSTMENT-V1
           * ========================================================= */}
          <Route path="/" element={<RoleBasedHome />} />
          <Route path="/dashboard" element={<Layout serviceName={SERVICE_NAME}><UserDashboardPage /></Layout>} />

          {/* ========================================
           * 커뮤니티 포럼 (메인 서비스)
           * WO-KPA-COMMUNITY-FORUM-ROUTES-V1
           *
           * / 경로의 커뮤니티 홈에서 접근하는 포럼
           * /demo/forum과 별도의 URL 구조
           * ======================================== */}
          <Route path="/forum" element={<Layout serviceName={SERVICE_NAME}><ForumHomePage /></Layout>} />
          <Route path="/forum/all" element={<Layout serviceName={SERVICE_NAME}><ForumListPage /></Layout>} />
          <Route path="/forum/post/:id" element={<Layout serviceName={SERVICE_NAME}><ForumDetailPage /></Layout>} />
          <Route path="/forum/write" element={<Layout serviceName={SERVICE_NAME}><ForumWritePage /></Layout>} />
          <Route path="/forum/edit/:id" element={<Layout serviceName={SERVICE_NAME}><ForumWritePage /></Layout>} />

          {/* Debug Pages (CLAUDE.md Section 14) */}
          <Route path="/__debug__/api" element={<ApiDebugPage />} />

          {/* Test Center (WO-TEST-CENTER-SEPARATION-V1) */}
          <Route path="/test-center" element={<TestCenterPage />} />

          {/* =========================================================
           * Service C - 분회 서비스 (Branch Services)
           * WO-KPA-BRANCH-SERVICE-ROUTE-MIGRATION-V1
           *
           * 분회 서비스는 /branch-services 아래에서 독립 운영
           * - /branch-services : 분회 서비스 홈 (허브)
           * - /branch-services/demo : 분회 서비스 데모
           * - /branch-services/:branchId/* : 실제 분회 서비스
           *
           * 이 구조는 /demo/* (Service B)와 완전히 분리됨
           * ========================================================= */}
          <Route path="/branch-services" element={<BranchServicesPage />} />
          {/* SVC-C: 분회 Admin 대시보드 (WO-KPA-C-BRANCH-ADMIN-IMPLEMENTATION-V1) */}
          <Route path="/branch-services/:branchId/admin/*" element={<BranchAdminRoutes />} />
          {/* SVC-C: 분회 Operator 대시보드 (WO-KPA-C-BRANCH-OPERATOR-IMPLEMENTATION-V1) */}
          <Route path="/branch-services/:branchId/operator/*" element={<BranchOperatorRoutes />} />
          <Route path="/branch-services/:branchId/*" element={<BranchRoutes />} />

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
          {/* WO-PHARMACY-HUB-REALIGN-PHASEH1-V1: 약국 운영 허브 (dashboard → hub 개념 전환) */}
          <Route path="/pharmacy/hub" element={<Layout serviceName={SERVICE_NAME}><PharmacyDashboardPage /></Layout>} />
          {/* 기존 /pharmacy/dashboard 하위호환 리다이렉트 */}
          <Route path="/pharmacy/dashboard" element={<Navigate to="/pharmacy/hub" replace />} />
          <Route path="/pharmacy/b2b" element={<Layout serviceName={SERVICE_NAME}><PharmacyB2BPage /></Layout>} />
          <Route path="/pharmacy/b2b/suppliers" element={<Layout serviceName={SERVICE_NAME}><SupplierListPage /></Layout>} />
          <Route path="/pharmacy/b2b/suppliers/:supplierId" element={<Layout serviceName={SERVICE_NAME}><SupplierDetailPage /></Layout>} />
          <Route path="/pharmacy/store" element={<Layout serviceName={SERVICE_NAME}><PharmacyStorePage /></Layout>} />
          {/* WO-STORE-HUB-UNIFIED-RENDERING-PHASE1-V1: 통합 매장 허브 */}
          <Route path="/pharmacy/store-hub" element={<Layout serviceName={SERVICE_NAME}><StoreHubPage /></Layout>} />
          {/* WO-KPA-A-ASSET-COPY-ENGINE-PILOT-V1: 매장 복사 자산 목록 */}
          <Route path="/pharmacy/store-assets" element={<Layout serviceName={SERVICE_NAME}><StoreAssetsPage /></Layout>} />
          <Route path="/pharmacy/services" element={<Layout serviceName={SERVICE_NAME}><PharmacyServicesPage /></Layout>} />
          {/* WO-PHARMACY-PRODUCT-LISTING-APPROVAL-PHASE1-V1: 상품 판매 관리 */}
          <Route path="/pharmacy/sell" element={<Layout serviceName={SERVICE_NAME}><PharmacySellPage /></Layout>} />

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
           * SVC-B: 지부/분회 데모 서비스 (District/Branch Demo)
           * WO-KPA-SOCIETY-PHASE6-SVC-B-DEMO-UX-REFINE-V1
           *
           * ⚠️ 삭제 대상: 실제 지부/분회 서비스가 독립 도메인으로
           * 제공되면 이 블록(/demo/*)의 모든 라우트는 전체 삭제 대상.
           * 삭제 시 관련 파일: DemoLayout, DemoHeader, DashboardPage,
           * DemoLayoutRoutes 함수, 그리고 /demo/* 전용 페이지들.
           *
           * SCOPE: 순수 데모 서비스 (실운영 아님)
           * 조직 관리 중심 서비스 — 커뮤니티 홈(/)과 혼합 금지
           * - /demo : 데모 대시보드 (DashboardPage)
           * - /demo/admin/* : 지부 관리자 데모
           * - /demo/operator/* : 서비스 운영자 데모
           * - /demo/intranet/* : 인트라넷 데모
           * - /demo/forum/* : 지부/분회 포럼 데모 (NOT /forum)
           * - /demo/branch/:branchId/* : 분회 서비스 데모 (레거시)
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

          {/* Operator Routes — /demo/operator → /hub 리다이렉트 */}
          <Route path="/demo/operator/*" element={<Navigate to="/hub" replace />} />

          {/* Intranet Routes (인트라넷 - 별도 레이아웃) */}
          <Route path="/demo/intranet/*" element={<IntranetRoutes />} />

          {/* ===================================================
           * Legacy: /demo/branch/* → /branch-services/* 리다이렉트
           * WO-KPA-BRANCH-SERVICE-ROUTE-MIGRATION-V1
           *
           * 분회 서비스는 이제 /branch-services/* 에서 운영
           * 기존 /demo/branch/* 경로는 호환성을 위해 리다이렉트
           * =================================================== */}
          <Route path="/demo/branch/:branchId/admin/*" element={<BranchAdminRoutes />} />
          <Route path="/demo/branch/:branchId/*" element={<BranchRoutes />} />
          <Route path="/demo/branch" element={<Navigate to="/branch-services" replace />} />

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
          {/* Hub (통합 운영 허브 - WO-KPA-A-HUB-ARCHITECTURE-RESTRUCTURE-V1) */}
          <Route path="/hub" element={<Layout serviceName={SERVICE_NAME}><HubGuard><HubPage /></HubGuard></Layout>} />
          {/* Operator Routes — /operator root → /hub 리다이렉트, 서브페이지는 Layout 래핑 */}
          <Route path="/operator/*" element={<Layout serviceName={SERVICE_NAME}><OperatorRoutes /></Layout>} />
          <Route path="/intranet/*" element={<Navigate to="/demo/intranet" replace />} />
          <Route path="/branch/*" element={<Navigate to="/branch-services" replace />} />
          <Route path="/test-guide/*" element={<Navigate to="/demo/test-guide" replace />} />

          {/* ========================================
           * 커뮤니티 서비스 라우트 (메인 서비스)
           * WO-KPA-COMMUNITY-ROOT-ROUTES-V1
           *
           * / 경로의 커뮤니티 홈에서 접근하는 서비스들
           * /demo/* 와 분리된 실제 라우트
           * ======================================== */}

          {/* My Content (내 콘텐츠 관리) - WO-APP-DATA-HUB-TO-DASHBOARD-PHASE3-V1 */}
          <Route path="/my-content" element={<Layout serviceName={SERVICE_NAME}><MyContentPage /></Layout>} />

          {/* News (공지/소식) - WO-FIX-NEWS-ROUTES: 모든 콘텐츠 타입 라우트 추가 */}
          <Route path="/news" element={<Layout serviceName={SERVICE_NAME}><NewsListPage /></Layout>} />
          <Route path="/news/notice" element={<Layout serviceName={SERVICE_NAME}><NewsListPage /></Layout>} />
          <Route path="/news/hero" element={<Layout serviceName={SERVICE_NAME}><NewsListPage /></Layout>} />
          <Route path="/news/promo" element={<Layout serviceName={SERVICE_NAME}><NewsListPage /></Layout>} />
          <Route path="/news/news" element={<Layout serviceName={SERVICE_NAME}><NewsListPage /></Layout>} />
          <Route path="/news/:id" element={<Layout serviceName={SERVICE_NAME}><NewsDetailPage /></Layout>} />

          {/* Course Hub & Intro (Public-facing) - WO-CONTENT-COURSE-HUB/INTRO */}
          <Route path="/courses" element={<Layout serviceName={SERVICE_NAME}><CourseHubPage /></Layout>} />
          <Route path="/courses/:courseId" element={<Layout serviceName={SERVICE_NAME}><CourseIntroPage /></Layout>} />

          {/* Instructor Public Profile - WO-CONTENT-INSTRUCTOR-PUBLIC-PROFILE-V1 */}
          <Route path="/instructors/:userId" element={<Layout serviceName={SERVICE_NAME}><InstructorProfilePage /></Layout>} />

          {/* LMS (교육/강의) */}
          <Route path="/lms" element={<Layout serviceName={SERVICE_NAME}><EducationPage /></Layout>} />
          <Route path="/lms/courses" element={<Layout serviceName={SERVICE_NAME}><LmsCoursesPage /></Layout>} />
          <Route path="/lms/course/:id" element={<Layout serviceName={SERVICE_NAME}><LmsCourseDetailPage /></Layout>} />
          <Route path="/lms/course/:courseId/lesson/:lessonId" element={<Layout serviceName={SERVICE_NAME}><LmsLessonPage /></Layout>} />
          <Route path="/lms/certificate" element={<Layout serviceName={SERVICE_NAME}><LmsCertificatesPage /></Layout>} />

          {/* Signage (디지털 사이니지) */}
          <Route path="/signage" element={<Layout serviceName={SERVICE_NAME}><ContentHubPage /></Layout>} />
          <Route path="/signage/playlist/:id" element={<Layout serviceName={SERVICE_NAME}><PlaylistDetailPage /></Layout>} />
          <Route path="/signage/media/:id" element={<Layout serviceName={SERVICE_NAME}><MediaDetailPage /></Layout>} />

          {/* Events (이벤트) */}
          <Route path="/events" element={<Layout serviceName={SERVICE_NAME}><EventsHomePage /></Layout>} />

          {/* Docs (자료실) */}
          <Route path="/docs" element={<Layout serviceName={SERVICE_NAME}><ResourcesHomePage /></Layout>} />
          <Route path="/docs/list" element={<Layout serviceName={SERVICE_NAME}><ResourcesListPage /></Layout>} />

          {/* Organization (약사회 소개) */}
          <Route path="/organization" element={<Layout serviceName={SERVICE_NAME}><OrganizationAboutPage /></Layout>} />
          <Route path="/organization/branches" element={<Layout serviceName={SERVICE_NAME}><BranchesPage /></Layout>} />
          <Route path="/organization/branch/:id" element={<Layout serviceName={SERVICE_NAME}><BranchDetailPage /></Layout>} />
          <Route path="/organization/officers" element={<Layout serviceName={SERVICE_NAME}><OfficersPage /></Layout>} />
          <Route path="/organization/contact" element={<Layout serviceName={SERVICE_NAME}><ContactPage /></Layout>} />

          {/* MyPage (마이페이지) */}
          <Route path="/mypage" element={<Layout serviceName={SERVICE_NAME}><MyDashboardPage /></Layout>} />
          <Route path="/mypage/profile" element={<Layout serviceName={SERVICE_NAME}><MyProfilePage /></Layout>} />
          <Route path="/mypage/settings" element={<Layout serviceName={SERVICE_NAME}><MySettingsPage /></Layout>} />
          <Route path="/mypage/certificates" element={<Layout serviceName={SERVICE_NAME}><MyCertificatesPage /></Layout>} />

          {/* Participation (참여) */}
          <Route path="/participation" element={<Layout serviceName={SERVICE_NAME}><ParticipationListPage /></Layout>} />
          <Route path="/participation/:id/respond" element={<Layout serviceName={SERVICE_NAME}><ParticipationRespondPage /></Layout>} />
          <Route path="/participation/:id/results" element={<Layout serviceName={SERVICE_NAME}><ParticipationResultPage /></Layout>} />

          {/* Groupbuy (공동구매) */}
          <Route path="/groupbuy" element={<Layout serviceName={SERVICE_NAME}><GroupbuyListPage /></Layout>} />
          <Route path="/groupbuy/:id" element={<Layout serviceName={SERVICE_NAME}><GroupbuyDetailPage /></Layout>} />

          {/* Function Gate - SVC-A: 직능/직역 선택 모달로 전환 (WO-KPA-FUNCTION-GATE-V1) */}
          <Route path="/select-function" element={<FunctionGateRedirect />} />

          {/* Legal (이용약관/개인정보처리방침) - WO-KPA-LEGAL-PAGES-V1 */}
          <Route path="/policy" element={<Layout serviceName={SERVICE_NAME}><PolicyPage /></Layout>} />
          <Route path="/privacy" element={<Layout serviceName={SERVICE_NAME}><PrivacyPage /></Layout>} />

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
 * SVC-B: 지부/분회 데모 서비스 — DemoLayout 하위 라우트
 *
 * ⚠️ 삭제 대상: 실제 지부/분회 서비스가 독립 도메인으로 제공되면
 * 이 함수와 모든 하위 라우트는 전체 삭제 대상.
 *
 * WO-KPA-DEMO-HEADER-SEPARATION-V1: DemoLayout 사용
 * WO-KPA-SOCIETY-PHASE6-SVC-B-DEMO-UX-REFINE-V1
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
