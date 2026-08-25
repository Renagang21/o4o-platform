/**
 * App — Pharmacy-Hub Foundation
 *
 * WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1
 * WO-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1
 * WO-PHARMACY-HUB-STORE-SHELL-AND-MENU-CONFIG-V1 — /store-owner 하위를 공통 매장 셸로 편입
 * WO-O4O-PHARMACY-HUB-OPERATOR-SHELL-COMMON-CORE-ADOPTION-V1 — /operator 하위를 공통 운영자 셸로 편입
 * WO-O4O-PHARMACYHUB-SERVICE-MODEL-REALIGNMENT-AND-SUPPLIER-ROLE-REMOVAL-V1 — /supplier 셸 제거
 *   (공급자는 Pharmacy-Hub 회원이 아니다. 제공 설정은 Neture 공급자 화면에 있다.)
 *
 * 라우트:
 *   /                            홈 (브랜드 표시 + 역할별 진입점)
 *   /login                       로그인 (serviceKey='pharmacy-hub')
 *   /join                        가입 신청 (public)
 *   /join/status                 내 가입 상태
 *   /forum                       커뮤니티 홈 (MembershipGate + 공통 ForumHubTemplate)
 *   /forum/posts                 게시글 목록
 *   /forum/posts/:postId         게시글 상세 (WO-O4O-FORUM-SERVICE-SCOPE-DETAIL-AND-WRITE-COMMONIZATION-V1)
 *   /forum/write                 글쓰기      (동일 WO · write 권한은 backend guard 가 강제)
 *   /forum/my-posts              내가 쓴 글 (WO-O4O-COMMUNITY-PHARMACYHUB-BASELINE-AND-CROSSSERVICE-MYPOSTS-ADOPTION-V1 §9)
 *   /forum/request               포럼 개설 신청 (WO-O4O-PHARMACYHUB-COMMUNITY-CAPABILITY-FULL-ADOPTION-V1 §5)
 *   /forum/my-dashboard          내 포럼 · 내 신청 현황 (동일 WO §5·§7)
 *   /forum/my-dashboard/:forumId/members  포럼 회원 관리 (동일 WO §8)
 *   /                            커뮤니티 홈 (canonical · 공통 CommunityServiceHome)
 *   /community                   → `/` redirect (기존 링크 보존)
 *   /community/search            커뮤니티 검색 (동일 WO §6 — forum 중심)
 *   /education                   교육 허브 (동일 WO §7 — 공통 LmsHubTemplate)
 *   /education/course/:id        강의 상세 (공통 CourseDetailView · 수강신청 활성 — LMS learner adoption WO §6)
 *   /education/course/:courseId/lesson/:lessonId  레슨 (공통 LessonPlayerView)
 *   /operator                    운영자 셸 (OperatorLayoutWrapper — 공통 OperatorAreaShell)
 *     ├ (index)                  서비스 운영자 진입점
 *     ├ /memberships             가입 신청 관리 목록
 *     └ /memberships/:id         가입 신청 상세
 *   /admin                       관리자 셸 (AdminLayoutWrapper — 공통 OperatorAreaShell + admin 가드)
 *     ├ (index)                  관리자 대시보드 (공통 4-Block @o4o/admin-ux-core)
 *     └ /settings/legal-terms    법정정보·약관 설정 (공통 service-legal 컴포넌트)
 *
 *   /store-hub                   매장허브 홈 — 자원 탐색 진입점 (공통 StoreHubTemplate)
 *
 *   /store-owner                 매장 경영 셸 (StoreDashboardLayout — 공통)
 *     ├ (index)                  매장 경영 홈
 *     ├ /products                공급 상품 목록
 *     ├ /products/:offerId       공급 상품 상세
 *     ├ /cart                    장바구니
 *     ├ /orders                  주문 내역
 *     ├ /orders/:orderId         주문 상세
 *     ├ /handled-products        매장 경영활용 제품 (WO-...-STORE-HANDLED-PRODUCTS-V1)
 *     ├ /local-products          매장 자체 상품 (동일 WO)
 *     ├ /content                 매장 콘텐츠 (WO-...-STORE-CONTENT-LIBRARY-V1)
 *     ├ /library                 자료함 — 제작 자료 목록 (동일 WO)
 *     ├ /library/resources       자료 등록·관리 (동일 WO)
 *     ├ /blog                    매장 블로그 목록 (동일 WO)
 *     ├ /blog/new                블로그 글쓰기 (동일 WO)
 *     ├ /blog/:id/edit           블로그 글 수정 (동일 WO)
 *     ├ /info                  매장 정보 (조직 · WO-...-STORE-INFO-AND-ACCOUNT-V1)
 *     └ /account                 내 계정 (사용자 · 동일 WO)
 *        ├ /account/enrollments   내 수강 목록 (LMS learner adoption WO §7)
 *        ├ /account/certificates  내 수료증 (동일 WO §11)
 *        └ /account/credits       내 크레딧 (동일 WO §15)
 *   /certificate/verify/:id      수료증 공개 검증 (동일 WO §10 · 인증 없음)
 *   /store-owner/payment         결제 (셸 동일 · 사이드바 메뉴 미노출 deep route)
 *     ├ /success                 PG 성공 callback
 *     └ /fail                    PG 실패 callback
 *
 * URL 은 전부 기존과 동일하다 (결제 callback 은 PG 등록 URL 이라 불변이어야 한다).
 * React Router 는 정적 세그먼트가 더 구체적인 `/store-owner/payment` 를
 * `/store-owner` 보다 우선 매칭하므로 두 부모 라우트가 충돌하지 않는다.
 *
 * 운영자 콘솔의 실제 권한 경계는 backend guard(pharmacy-hub:operator scope)가 강제한다.
 * 프론트 라우트는 UX 안내이며 권한 판정 근거가 아니다.
 */

// WO-O4O-WEB-CATCH-ALL-ROUTE-CROSS-SERVICE-V1: catch-all 은 Navigate 가 아니라 NotFoundPage 다.
// WO-O4O-PHARMACYHUB-GUIDE-ADOPTION-V1: `/guide` → `/guide/intro` canonical 수렴에만 Navigate 를 쓴다.
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { O4OErrorBoundary, O4OToastProvider } from '@o4o/error-handling';
import { AuthProvider } from './contexts/AuthContext';
import { StoreOwnerShell, StoreOwnerChromeFreeGuard } from './layouts/StoreOwnerShell';
// WO-O4O-PHARMACY-HUB-OPERATOR-SHELL-COMMON-CORE-ADOPTION-V1
import { OperatorLayoutWrapper } from './layouts/OperatorLayoutWrapper';
import { AdminLayoutWrapper } from './layouts/AdminLayoutWrapper';
// WO-O4O-CROSSSERVICE-HEADER-MENU-FOOTER-UI-COMPLETION-V1 — 공개 영역 공통 셸(헤더·푸터)
import { PublicLayout } from './layouts/PublicLayout';
import { TermsPage, PrivacyPage } from './pages/legal/PolicyDocumentPage';
// WO-O4O-PHARMACYHUB-GUIDE-ADOPTION-V1
// 공통 Guide View(@o4o/shared-space-ui) 를 그대로 채택한다. PharmacyHub 전용 Guide page 파일은 만들지 않는다.
import {
  GuideServiceIntroPage,
  GuideIntroPage,
  GuideIntroStructurePage,
  GuideIntroKpaPage,
  GuideIntroOperationPage,
  GuideIntroConceptPage,
  GuideUsagePage,
  GuideFeaturesPage,
  GuideFeatureManualPage,
  pharmacyHubServiceIntroProps,
  pharmacyHubGuideIntroProps,
  pharmacyHubGuideIntroStructureProps,
  pharmacyHubGuideIntroKpaProps,
  pharmacyHubGuideIntroOperationProps,
  pharmacyHubGuideIntroConceptProps,
  pharmacyHubGuideUsageProps,
  pharmacyHubGuideFeaturesProps,
  pharmacyHubGuideFeatureForumProps,
  pharmacyHubGuideFeatureSupplyOrderProps,
  pharmacyHubGuideFeatureStoreProductsProps,
  pharmacyHubGuideFeatureContentProps,
  pharmacyHubGuideFeatureQrProps,
  pharmacyHubGuideFeaturePopProps,
  pharmacyHubGuideFeatureSignageProps,
  pharmacyHubGuideFeatureTabletProps,
  pharmacyHubGuideFeatureManualsProps,
} from '@o4o/shared-space-ui';
import { MembershipGate } from './components/MembershipGate';
import LoginPage from './pages/LoginPage';
import JoinPage from './pages/JoinPage';
import JoinStatusPage from './pages/JoinStatusPage';
import OperatorDashboardPage from './pages/operator/OperatorDashboardPage';
import ForumHubPage from './pages/forum/ForumHubPage';
import ForumListPage from './pages/forum/ForumListPage';
// WO-O4O-FORUM-SERVICE-SCOPE-DETAIL-AND-WRITE-COMMONIZATION-V1 — 상세 · 작성
import ForumDetailPage from './pages/forum/ForumDetailPage';
import ForumWritePage from './pages/forum/ForumWritePage';
// WO-O4O-COMMUNITY-PHARMACYHUB-BASELINE-AND-CROSSSERVICE-MYPOSTS-ADOPTION-V1 — 커뮤니티 baseline
import MyPostsPage from './pages/forum/MyPostsPage';
// WO-O4O-PHARMACYHUB-COMMUNITY-CAPABILITY-FULL-ADOPTION-V1 §5·§7·§8
import RequestForumPage from './pages/forum/RequestForumPage';
import MyForumDashboardPage from './pages/forum/MyForumDashboardPage';
import ForumMemberManagementPage from './pages/forum/ForumMemberManagementPage';
import CommunityHomePage from './pages/community/CommunityHomePage';
import CommunitySearchPage from './pages/community/CommunitySearchPage';
import PharmacyHubResourcesPage from './pages/resources/PharmacyHubResourcesPage';
import PharmacyHubResourceWritePage from './pages/resources/PharmacyHubResourceWritePage';
// WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §6 — 회원 커뮤니티 콘텐츠 (#20·#21·#22·#23)
import PharmacyHubContentListPage from './pages/content/PharmacyHubContentListPage';
import PharmacyHubContentDetailPage from './pages/content/PharmacyHubContentDetailPage';
// WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 6 (#24)
//   회원 설문 열람·응답. 원장/API 는 공통 /api/v1/surveys (serviceKey='pharmacy-hub').
import PharmacyHubSurveyListPage from './pages/content/PharmacyHubSurveyListPage';
import PharmacyHubSurveyDetailPage from './pages/content/PharmacyHubSurveyDetailPage';
import PharmacyHubContentWritePage from './pages/content/PharmacyHubContentWritePage';
import EducationPage from './pages/education/EducationPage';
import LmsCourseDetailPage from './pages/education/LmsCourseDetailPage';
import LmsLessonPage from './pages/education/LmsLessonPage';
import MembershipsPage from './pages/operator/MembershipsPage';
// WO-O4O-PHARMACY-HUB-SERVICE-LEGAL-SETTINGS-ADOPTION-V1 — 공통 법정정보 설정 채택
import PharmacyHubAdminDashboard from './pages/admin/PharmacyHubAdminDashboard';
import ServiceLegalSettingsPage from './pages/admin/ServiceLegalSettingsPage';
import MembershipDetailPage from './pages/operator/MembershipDetailPage';
// WO-O4O-PHARMACYHUB-OPERATOR-COMMUNITY-AND-COMMON-CAPABILITY-FULL-ADOPTION-V1
//   공통 Operator Core (@o4o/operator-core-ui · @o4o/ui) 채택 화면 8종
import OperatorMembersPage from './pages/operator/MembersPage';
// WO-O4O-OPERATOR-CROSSSERVICE-MEMBER-DETAIL-ID-AND-STATUS-CONTRACT-CLOSURE-V1
//   회원 상세 = 공통 @o4o/ui UserDetailPage wrapper (deep link `/operator/members/:id`)
import OperatorUserDetailPage from './pages/operator/UserDetailPage';
import OperatorForumPage from './pages/operator/OperatorForumPage';
import OperatorForumRequestsPage from './pages/operator/ForumRequestsPage';
import OperatorForumCategoriesPage from './pages/operator/ForumCategoriesManagementPage';
import OperatorForumDeleteRequestsPage from './pages/operator/ForumDeleteRequestsPage';
import OperatorForumAnalyticsPage from './pages/operator/ForumAnalyticsPage';
import OperatorAnalyticsPage from './pages/operator/AnalyticsPage';
// WO-O4O-OPERATOR-CROSSSERVICE-CAPABILITY-ADOPTION-FINAL-AUDIT-AND-GAP-CLOSURE-V1:
//   자료실 관리 (공통 CMS `/cms/contents` · serviceKey=pharmacy-hub · type=knowledge)
import OperatorResourcesPage from './pages/operator/ResourcesPage';
import OperatorCommunityContentsPage from './pages/operator/CommunityContentsPage';
// WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 4 (#97)
//   설문조사 관리 — 화면 본체는 공통 @o4o/operator-core-ui Surveys module.
import OperatorSurveyListPage from './pages/operator/survey/OperatorSurveyListPage';
import OperatorSurveyCreatePage from './pages/operator/survey/OperatorSurveyCreatePage';
// WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4 (#95)
//   강의 운영 관리 — 공통 @o4o/operator-core-ui OperatorLmsCoursesManager.
import OperatorLmsCoursesPage from './pages/operator/OperatorLmsCoursesPage';
// 동일 WO §4 (#96) — 안내 문구 관리 (공통 GuideContentsConsolePage).
import OperatorGuideContentsPage from './pages/operator/OperatorGuideContentsPage';

// WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4 (#42)
//   강사 운영 콘솔. 화면 본체는 공통 @o4o/operator-core-ui instructor 모듈이고
//   backend 는 서비스 중립 `/api/v1/lms/instructor/*` (requireInstructor) 이다.
import InstructorGate from './pages/instructor/InstructorGate';
import InstructorDashboardPage from './pages/instructor/InstructorDashboardPage';
import InstructorCoursesPage from './pages/instructor/InstructorCoursesPage';
import InstructorCourseEditPage from './pages/instructor/InstructorCourseEditPage';
import InstructorEnrollmentsPage from './pages/instructor/InstructorEnrollmentsPage';
import InstructorSubmissionsPage from './pages/instructor/InstructorSubmissionsPage';
// WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4:
//   공지/뉴스 관리 (공통 @o4o/operator-core-ui CmsContentManager · /pharmacy-hub/news)
import OperatorContentPage from './pages/operator/ContentPage';
import OperatorRoleManagementPage from './pages/operator/RoleManagementPage';
// WO-O4O-PHARMACY-HUB-STORE-HUB-HOME-INTRODUCTION-V1 — 매장허브 홈 (공통 StoreHubTemplate)
import StoreHubPage from './pages/store-hub/StoreHubPage';
import StoreOwnerHomePage from './pages/store-owner/HomePage';
import StoreOwnerProductsPage from './pages/store-owner/ProductsPage';
import StoreOwnerProductDetailPage from './pages/store-owner/ProductDetailPage';
// WO-PHARMACY-HUB-STORE-OWNER-CHECKOUT-AND-PAYMENT-UI-V1
import CartPage from './pages/store-owner/CartPage';
import OrdersPage from './pages/store-owner/OrdersPage';
import OrderDetailPage from './pages/store-owner/OrderDetailPage';
import PaymentPage from './pages/store-owner/PaymentPage';
import PaymentSuccessPage from './pages/store-owner/PaymentSuccessPage';
import PaymentFailPage from './pages/store-owner/PaymentFailPage';
// WO-PHARMACY-HUB-STORE-HANDLED-PRODUCTS-V1
import HandledProductsPage from './pages/store-owner/HandledProductsPage';
import LocalProductsPage from './pages/store-owner/LocalProductsPage';
// WO-PHARMACY-HUB-STORE-CONTENT-LIBRARY-V1
import ContentPage from './pages/store-owner/ContentPage';
import LibraryPage from './pages/store-owner/LibraryPage';
import LibraryResourcesPage from './pages/store-owner/LibraryResourcesPage';
import BlogPage from './pages/store-owner/BlogPage';
import BlogEditorPage from './pages/store-owner/BlogEditorPage';
// WO-PHARMACY-HUB-STORE-INFO-AND-ACCOUNT-V1
import StoreInfoPage from './pages/store-owner/StoreInfoPage';
import AccountPage from './pages/store-owner/AccountPage';
// WO-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1 — 역할 무관 개인 프로필 (canonical /account)
import MyProfilePage from './pages/account/MyProfilePage';
// WO-O4O-PHARMACYHUB-LMS-LEARNER-FULL-ADOPTION-V1 §7·§11·§15 — LMS learner 개인 화면
import MyEnrollmentsPage from './pages/account/MyEnrollmentsPage';
import MyCertificatesPage from './pages/account/MyCertificatesPage';
import MyRequestsPage from './pages/account/MyRequestsPage';
import MyCreditsPage from './pages/account/MyCreditsPage';
// 동일 WO §10 — 수료증 공개 검증 (인증 불필요)
import CertificateVerifyPage from './pages/education/CertificateVerifyPage';
// WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1 — 매장 실행 자산 (QR · POP · 사이니지 · 상품 설명서)
import QrPage from './pages/store-owner/QrPage';
import PopPage from './pages/store-owner/PopPage';
import SignagePage from './pages/store-owner/SignagePage';
// WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §7·§8 — 공통 View 채택
import StoreProductDescriptionsPage from './pages/store-owner/ProductDescriptionsPage';
import StoreMarketingAnalyticsPage from './pages/store-owner/MarketingAnalyticsPage';
// WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §8 (#76) 다국어 상품 콘텐츠
import MultilingualContentsMyPage from './pages/store-owner/MultilingualContentsMyPage';
import StoreProductMultilingualContentPage from './pages/store-owner/StoreProductMultilingualContentPage';
import MultilingualProductPublicLandingPage from './pages/public/MultilingualProductPublicLandingPage';
// WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §8 (#79) 외국인 여행객 판매지원
import ForeignVisitorSalesSupportPage from './pages/store-owner/ForeignVisitorSalesSupportPage';
import ForeignVisitorPartnersPage from './pages/store-owner/ForeignVisitorPartnersPage';
import ForeignVisitorPartnerQrCodesPage from './pages/store-owner/ForeignVisitorPartnerQrCodesPage';
import {
  ForeignVisitorSalesSupportPaymentSuccessPage,
  ForeignVisitorSalesSupportPaymentFailPage,
} from './pages/store-owner/ForeignVisitorSalesSupportPaymentResultPage';
import ForeignVisitorAffiliatePublicLandingPage from './pages/public/ForeignVisitorAffiliatePublicLandingPage';
import StoreRecruitmentApplicationsPage from './pages/store-owner/RecruitmentApplicationsPage';
import SignagePlayerSelectPage from './pages/store-owner/SignagePlayerSelectPage';
import SignagePlaybackPage from './pages/store-owner/SignagePlaybackPage';
import ManualsPage from './pages/store-owner/ManualsPage';
import ManualDetailPage from './pages/store-owner/ManualDetailPage';
import QrLandingPage from './pages/QrLandingPage';
// WO-O4O-WEB-CATCH-ALL-ROUTE-CROSS-SERVICE-V1 — 없는 경로 404 안내 (redirect 아님)
import NotFoundPage from './pages/NotFoundPage';
// WO-PHARMACY-HUB-STORE-TABLET-SERVICE-SCOPED-INTEGRATION-V1 — 태블릿 · 화면 세트
import TabletsPage from './pages/store-owner/TabletsPage';

export default function App() {
  return (
    <O4OErrorBoundary>
      <O4OToastProvider />
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          {/*
            공개 영역 셸 (WO-O4O-CROSSSERVICE-HEADER-MENU-FOOTER-UI-COMPLETION-V1)
            PublicLayout = 공통 GlobalHeader(브릿지) + <Outlet/> + 공개 푸터.
            URL 은 하나도 바뀌지 않는다 — pathless layout route 로 감싸기만 한다.
            역할 업무 셸(/store-owner · /store-hub · /operator)과
            공개 QR 랜딩(/qr/:slug)은 자체 상단 계약이 있어 여기 포함하지 않는다.
          */}
          <Route element={<PublicLayout />}>
          {/*
            WO-O4O-KPA-PHARMACYHUB-COMMUNITY-HOME-AND-NAV-CANONICAL-CONVERGENCE-V1 §10·§12
            서비스 루트 = 커뮤니티 홈. KPA-Society 와 같은 canonical 구조다.
            (기존 서비스 소개형 HomePage 는 폐기 — 같은 성격의 홈이 `/` 와 `/community`
             둘로 갈려 있던 구조를 하나로 모았다. 가입 상태 밴드·역할 진입 카드는
             커뮤니티 홈 슬롯으로 이관해 진입점 손실이 없다.)
            공개 홈이다 — MembershipGate 를 걸지 않는다. backend `/home/latest` 는
            optionalAuth, 포럼 읽기도 공개라 미가입 방문자에게도 실제 내용이 보인다.
          */}
          <Route path="/" element={<CommunityHomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/join/status" element={<JoinStatusPage />} />

          {/*
            내 프로필 (WO-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1 — production 잔여 결함)
            개인 계정(users) 화면은 역할 셸에 종속되지 않는다. 기존에는 매장 셸 안의
            `/store-owner/account` 가 유일한 계정 화면이라 운영자·공급자에게는 Profile
            진입점이 아예 없었다. 로그인만 하면 들어올 수 있는 공개 셸 route 로 올린다.
            가입 상태(pending/rejected)와 무관하게 본인 계정 확인·비밀번호 변경은 가능해야
            하므로 MembershipGate 를 걸지 않는다(미인증 안내는 화면이 직접 렌더).
            매장·사업자 정보(organizations)는 이 화면에 없다 — `/store-owner/info` 소관.
          */}
          <Route path="/account" element={<MyProfilePage />} />

          {/*
            WO-O4O-PHARMACYHUB-LMS-LEARNER-FULL-ADOPTION-V1 §7·§11·§15·§17

            LMS learner 개인 화면. 개인 축은 `/account` 이며 `/mypage` 를 새로 만들지
            않는다(§13 계약 유지). 미인증 안내는 화면이 직접 렌더하므로 MembershipGate 를
            걸지 않는다 — 승인 대기·반려 사용자도 자신의 학습 이력을 확인할 수 있어야 한다.
            데이터 경계는 백엔드 serviceKey 스코프가 담당한다(§19).
          */}
          <Route path="/account/enrollments" element={<MyEnrollmentsPage />} />
          <Route path="/account/certificates" element={<MyCertificatesPage />} />
          <Route path="/account/credits" element={<MyCreditsPage />} />
          {/* WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §5 (#19·#51)
              통합 신청함 — KPA `/mypage/my-requests` 와 같은 공통 MyRequestsInbox. */}
          <Route path="/account/my-requests" element={<MyRequestsPage />} />

          {/* 동일 WO §10 — 수료증 공개 검증. 수료증 공유 링크의 착지점이며 인증이 없다.
              이 route 가 없으면 공통 MyCertificatesView 의 "링크 복사" 가 데드링크가 된다. */}
          <Route path="/certificate/verify/:certificateId" element={<CertificateVerifyPage />} />

          {/* WO-O4O-CROSSSERVICE-LEGAL-POLICY-PRODUCTION-COMPLETION-V1:
              공개 정책 문서. 다른 4서비스와 같은 공통 PolicyDocumentViewer 소비(게시 문서만 표시,
              미게시 시 중립 empty). 이 route 가 있어야 운영자 설정의 policies 탭이 데드링크를
              만들지 않는다. */}
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />

          {/*
            WO-O4O-PHARMACYHUB-GUIDE-ADOPTION-V1

            `/service-guide` = 공개 서비스 소개 (이 서비스가 무엇인가)
            `/guide/*`       = 기능 이용 매뉴얼 (이 기능을 어떻게 쓰는가)
            역할이 다르므로 둘 다 유지하고 서로 링크로 연결한다.

            모두 공통 View + PharmacyHub copy config 만 사용한다 (서비스별 View 복제 0).
            공개 문서이므로 MembershipGate 를 걸지 않는다 — 가입 검토 중인 사용자도 읽을 수 있어야 한다.
          */}
          <Route path="/service-guide" element={<GuideServiceIntroPage {...pharmacyHubServiceIntroProps} />} />
          <Route path="/guide" element={<Navigate to="/guide/intro" replace />} />
          <Route path="/guide/intro" element={<GuideIntroPage {...pharmacyHubGuideIntroProps} />} />
          <Route
            path="/guide/intro/structure"
            element={<GuideIntroStructurePage {...pharmacyHubGuideIntroStructureProps} />}
          />
          <Route path="/guide/intro/kpa" element={<GuideIntroKpaPage {...pharmacyHubGuideIntroKpaProps} />} />
          <Route
            path="/guide/intro/operation"
            element={<GuideIntroOperationPage {...pharmacyHubGuideIntroOperationProps} />}
          />
          <Route
            path="/guide/intro/concept"
            element={<GuideIntroConceptPage {...pharmacyHubGuideIntroConceptProps} />}
          />
          <Route path="/guide/usage" element={<GuideUsagePage {...pharmacyHubGuideUsageProps} />} />
          <Route path="/guide/features" element={<GuideFeaturesPage {...pharmacyHubGuideFeaturesProps} />} />
          {/* 실제 지원하는 기능만 매뉴얼로 노출한다 (없는 기능을 만들어 넣지 않는다) */}
          <Route
            path="/guide/features/forum"
            element={<GuideFeatureManualPage {...pharmacyHubGuideFeatureForumProps} />}
          />
          <Route
            path="/guide/features/supply-order"
            element={<GuideFeatureManualPage {...pharmacyHubGuideFeatureSupplyOrderProps} />}
          />
          <Route
            path="/guide/features/store-products"
            element={<GuideFeatureManualPage {...pharmacyHubGuideFeatureStoreProductsProps} />}
          />
          <Route
            path="/guide/features/content"
            element={<GuideFeatureManualPage {...pharmacyHubGuideFeatureContentProps} />}
          />
          <Route
            path="/guide/features/qr"
            element={<GuideFeatureManualPage {...pharmacyHubGuideFeatureQrProps} />}
          />
          <Route
            path="/guide/features/pop"
            element={<GuideFeatureManualPage {...pharmacyHubGuideFeaturePopProps} />}
          />
          <Route
            path="/guide/features/signage"
            element={<GuideFeatureManualPage {...pharmacyHubGuideFeatureSignageProps} />}
          />
          <Route
            path="/guide/features/tablet"
            element={<GuideFeatureManualPage {...pharmacyHubGuideFeatureTabletProps} />}
          />
          <Route
            path="/guide/features/manuals"
            element={<GuideFeatureManualPage {...pharmacyHubGuideFeatureManualsProps} />}
          />

          {/* WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4 (#42)
              강사 운영 콘솔. PH 에는 RoleGuard 컴포넌트가 없으므로 서비스 표준대로
              MembershipGate + 역할 확인(InstructorGate)으로 감싼다.
              강사 신청/승인 동선은 두지 않는다 — backend 가 KPA 전용(requireKpaAdmin)이라
              PH 에서는 dead navigation 이 된다. */}
          <Route path="/instructor" element={<InstructorGate><InstructorDashboardPage /></InstructorGate>} />
          <Route path="/instructor/courses" element={<InstructorGate><InstructorCoursesPage /></InstructorGate>} />
          <Route path="/instructor/courses/new" element={<InstructorGate><InstructorCourseEditPage /></InstructorGate>} />
          <Route path="/instructor/courses/:courseId" element={<InstructorGate><InstructorCourseEditPage /></InstructorGate>} />
          <Route
            path="/instructor/courses/:courseId/enrollments"
            element={<InstructorGate><InstructorEnrollmentsPage /></InstructorGate>}
          />
          {/* WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4 (#40)
              과제 제출물 채점 — 공통 `/lms/instructor/*` (requireInstructor) 계약. */}
          <Route
            path="/instructor/courses/:courseId/lessons/:lessonId/submissions"
            element={<InstructorGate><InstructorSubmissionsPage /></InstructorGate>}
          />

          {/* WO-O4O-PHARMACY-HUB-COMMUNITY-HOME-COMMON-CORE-V1 — active PharmacyHub 회원만 */}
          <Route
            path="/forum"
            element={
              <MembershipGate>
                <ForumHubPage />
              </MembershipGate>
            }
          />
          <Route
            path="/forum/posts"
            element={
              <MembershipGate>
                <ForumListPage />
              </MembershipGate>
            }
          />

          {/* WO-O4O-FORUM-SERVICE-SCOPE-DETAIL-AND-WRITE-COMMONIZATION-V1 */}
          <Route
            path="/forum/write"
            element={
              <MembershipGate>
                <ForumWritePage />
              </MembershipGate>
            }
          />
          {/* WO-O4O-COMMUNITY-CROSSSERVICE-FINAL-RECENSUS-AND-RESIDUAL-COMMONIZATION-AUDIT-V1 §7-C */}
          <Route
            path="/forum/edit/:postId"
            element={
              <MembershipGate>
                <ForumWritePage />
              </MembershipGate>
            }
          />
          {/* WO-O4O-PHARMACYHUB-COMMUNITY-CAPABILITY-FULL-ADOPTION-V1 §5·§7·§8·§9
              포럼 개설 신청 → 내 신청 현황/내 포럼 → 회원 관리·삭제 요청.
              화면은 전부 공통 View(@o4o/shared-space-ui) wrapper 다. */}
          <Route
            path="/forum/request"
            element={
              <MembershipGate>
                <RequestForumPage />
              </MembershipGate>
            }
          />
          <Route
            path="/forum/my-dashboard"
            element={
              <MembershipGate>
                <MyForumDashboardPage />
              </MembershipGate>
            }
          />
          <Route
            path="/forum/my-dashboard/:forumId/members"
            element={
              <MembershipGate>
                <ForumMemberManagementPage />
              </MembershipGate>
            }
          />
          {/* WO-O4O-COMMUNITY-PHARMACYHUB-BASELINE-AND-CROSSSERVICE-MYPOSTS-ADOPTION-V1 §9 */}
          <Route
            path="/forum/my-posts"
            element={
              <MembershipGate>
                <MyPostsPage />
              </MembershipGate>
            }
          />
          {/* 동일 WO §4·§6 — 커뮤니티 검색.
              `/community` 는 canonical 홈(`/`) 으로 redirect 한다 (기존 링크 보존). */}
          <Route path="/community" element={<Navigate to="/" replace />} />
          <Route
            path="/community/search"
            element={
              <MembershipGate>
                <CommunitySearchPage />
              </MembershipGate>
            }
          />
          {/* WO-O4O-PHARMACYHUB-COMMUNITY-CONTENT-RESOURCE-TABLE-AND-ADOPTION-V1 §9·§12
              공통 ResourcesHubTemplate 채택 — 원장은 공통 cms_contents(serviceKey='pharmacy-hub') */}
          <Route
            path="/resources"
            element={
              <MembershipGate>
                <PharmacyHubResourcesPage />
              </MembershipGate>
            }
          />
          {/* WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §6 (#27)
              회원 자료 등록·수정. KPA `/resources/new` · `/resources/:id/edit` 와 동일 경로 형태.
              자료 상세는 공통 ResourcesHubTemplate 의 drawer 이므로 `/resources/:id` 는 만들지 않는다
              (KPA 도 동일 — 상세 route 없음). */}
          <Route
            path="/resources/new"
            element={
              <MembershipGate>
                <PharmacyHubResourceWritePage />
              </MembershipGate>
            }
          />
          <Route
            path="/resources/:id/edit"
            element={
              <MembershipGate>
                <PharmacyHubResourceWritePage />
              </MembershipGate>
            }
          />
          {/* WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §6 — 회원 커뮤니티 콘텐츠
              원장은 공통 cms_contents(serviceKey='pharmacy-hub', type='knowledge',
              metadata.subType='content') — 신규 table 0. KPA `/content` 동선과 동일한 경로 형태.
              작성 경로는 `/content/documents/new` 로 3서비스 표준과 맞춘다. */}
          <Route
            path="/content"
            element={
              <MembershipGate>
                <PharmacyHubContentListPage />
              </MembershipGate>
            }
          />
          {/* WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 6 (#24)
              회원 설문. KPA `/content/surveys` 와 같은 경로 형태이며 원장은 공통
              `/api/v1/surveys` (serviceKey='pharmacy-hub') — 신규 table 0.
              정적 세그먼트가 `/content/:id` 보다 우선 매칭된다. */}
          <Route
            path="/content/surveys"
            element={
              <MembershipGate>
                <PharmacyHubSurveyListPage />
              </MembershipGate>
            }
          />
          <Route
            path="/content/surveys/:id"
            element={
              <MembershipGate>
                <PharmacyHubSurveyDetailPage />
              </MembershipGate>
            }
          />
          <Route
            path="/content/documents/new"
            element={
              <MembershipGate>
                <PharmacyHubContentWritePage />
              </MembershipGate>
            }
          />
          <Route
            path="/content/:id/edit"
            element={
              <MembershipGate>
                <PharmacyHubContentWritePage />
              </MembershipGate>
            }
          />
          <Route
            path="/content/:id"
            element={
              <MembershipGate>
                <PharmacyHubContentDetailPage />
              </MembershipGate>
            }
          />

          {/* 동일 WO §7 — 교육(LMS) 조회·학습 baseline */}
          <Route
            path="/education"
            element={
              <MembershipGate>
                <EducationPage />
              </MembershipGate>
            }
          />
          <Route
            path="/education/course/:id"
            element={
              <MembershipGate>
                <LmsCourseDetailPage />
              </MembershipGate>
            }
          />
          <Route
            path="/education/course/:courseId/lesson/:lessonId"
            element={
              <MembershipGate>
                <LmsLessonPage />
              </MembershipGate>
            }
          />
          <Route
            path="/forum/posts/:postId"
            element={
              <MembershipGate>
                <ForumDetailPage />
              </MembershipGate>
            }
          />
          </Route>

          {/*
            /supplier 는 없다 (WO-O4O-PHARMACYHUB-SERVICE-MODEL-REALIGNMENT-AND-SUPPLIER-ROLE-REMOVAL-V1).
            공급자는 Pharmacy-Hub 회원이 아니라 Neture 에서만 활동하는 주체다. 제공 설정·주문 처리는
            Neture 공급자 화면(/supplier/services)에 있고, 그 결과가 매장허브에 자동 노출된다.
            여기에 공급자 셸을 다시 만들지 않는다 — 정본:
            docs/baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md
          */}

          {/*
            운영자 영역 셸 (WO-O4O-PHARMACY-HUB-OPERATOR-SHELL-COMMON-CORE-ADOPTION-V1)
            OperatorLayoutWrapper = MembershipGate + 공통 OperatorAreaShell(@o4o/operator-ux-core)
              + DomainIASidebar. KPA / K-Cosmetics / GlycoPharm 와 같은 구조다.
            URL 3개(/operator · /operator/memberships · /operator/memberships/:membershipId) 는
            그대로 두고 nested route 로만 정리한다 — 하위 화면 컴포넌트도 무변경.
          */}
          <Route path="/operator" element={<OperatorLayoutWrapper />}>
            {/*
              WO-O4O-OPERATOR-CROSSSERVICE-SCREEN-CENSUS-AND-PHARMACYHUB-UX-COMMONIZATION-V1:
                RoleEntryPage placeholder(후속 예정 기능 안내) 제거 →
                실제 구현된 기능(가입 신청 승인)만으로 구성한 공통 5-Block 운영자 홈.
            */}
            <Route index element={<OperatorDashboardPage />} />
            <Route path="memberships" element={<MembershipsPage />} />
            <Route path="memberships/:membershipId" element={<MembershipDetailPage />} />
            {/*
              WO-O4O-PHARMACYHUB-OPERATOR-COMMUNITY-AND-COMMON-CAPABILITY-FULL-ADOPTION-V1:
                공통 Operator capability 실채택 (메뉴만 추가하지 않는다 — 각 route 는
                공통 Core 화면 + 공통 backend 에 연결돼 있다).
            */}
            <Route path="members" element={<OperatorMembersPage />} />
            <Route path="members/:id" element={<OperatorUserDetailPage />} />
            <Route path="forum" element={<OperatorForumPage />} />
            <Route path="forum-requests" element={<OperatorForumRequestsPage />} />
            <Route path="forum-categories" element={<OperatorForumCategoriesPage />} />
            <Route path="forum-delete-requests" element={<OperatorForumDeleteRequestsPage />} />
            <Route path="forum-analytics" element={<OperatorForumAnalyticsPage />} />
            <Route path="analytics" element={<OperatorAnalyticsPage />} />
            <Route path="content" element={<OperatorContentPage />} />
            <Route path="resources" element={<OperatorResourcesPage />} />
            {/* WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4 (#93)
                회원 콘텐츠 검토 큐. 자료실 관리와 같은 공통 console, subType 축만 다르다. */}
            <Route path="community-contents" element={<OperatorCommunityContentsPage />} />
            {/* 동일 WO 4 (#97) — KPA/GP/KCos 와 같은 공통 설문 콘솔. */}
            <Route path="surveys" element={<OperatorSurveyListPage />} />
            <Route path="surveys/new" element={<OperatorSurveyCreatePage />} />
            {/* 동일 WO §4 (#95) — 공통 LMS 운영 콘솔. 서비스 경계는 backend 가
                course.serviceKey 로 강제한다(isCourseAccessibleByOperator). */}
            <Route path="lms" element={<OperatorLmsCoursesPage />} />
            {/* 동일 WO §4 (#96) */}
            <Route path="guide-contents" element={<OperatorGuideContentsPage />} />
            <Route path="roles" element={<OperatorRoleManagementPage />} />
          </Route>

          {/*
            관리자 영역 셸 (WO-O4O-PHARMACYHUB-ADMIN-OPERATOR-DUAL-AREA-ADOPTION-AND-PRODUCTION-CLOSURE-V1)
            AdminLayoutWrapper = MembershipGate + 역할 가드(admin | platform:super_admin)
              + 공통 OperatorAreaShell. K-Cosmetics / GlycoPharm / Neture / KPA 의 `/admin` 과 같은 축이다.
            admin 이 operator API 를 쓸 수 있다는 이유로 두 영역을 합치지 않는다.

            법정정보·약관 설정은 저장이 `pharmacy-hub:admin` 권한이므로 다른 4서비스와 동일하게
            관리자 영역으로 이동했다 (기존 `/operator/settings/legal` 제거 — 이중 진입점 방지).
          */}
          <Route path="/admin" element={<AdminLayoutWrapper />}>
            <Route index element={<PharmacyHubAdminDashboard />} />
            <Route path="settings/legal-terms" element={<ServiceLegalSettingsPage />} />
          </Route>

          {/*
            매장허브 홈 (WO-O4O-PHARMACY-HUB-STORE-HUB-HOME-INTRODUCTION-V1)
            `/store-hub` = 공급자·플랫폼 자원 **탐색** 진입점 / `/store-owner` = 매장 **운영·주문·관리**.
            셸은 StoreOwnerShell 을 그대로 재사용한다 — Pharmacy-Hub 전용 Hub 레이아웃 사본을 만들지 않으며
            가드(StoreOwnerGuard + MembershipGate)도 매장 화면과 동일 기준을 쓴다.
            기존 `/store-owner/*` URL 은 이동·redirect 없이 그대로 유지한다.
          */}
          <Route path="/store-hub" element={<StoreOwnerShell />}>
            <Route index element={<StoreHubPage />} />
          </Route>

          {/*
            매장 경영 셸 (WO-PHARMACY-HUB-STORE-SHELL-AND-MENU-CONFIG-V1)
            StoreOwnerShell = StoreOwnerGuard(pharmacy-hub) + MembershipGate + 공통 StoreDashboardLayout.
            하위 화면은 URL·컴포넌트 그대로 셸의 <Outlet/> 안으로 편입한다 (이중 운영 없음).
          */}
          {/* WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §8
              실제 송출(매장 화면) — KPA 선례와 동일하게 매장 셸 wrapper 밖 top-level route 로 격리한다.
              header/sidebar/footer 가 송출 화면에 mount 되지 않는다 (CSS 덮기 의존 제거).
              React Router 는 더 구체적인 정적 세그먼트를 먼저 매칭하므로 `/store-owner` 와 충돌하지 않는다. */}
          <Route
            path="/store-owner/signage/play/:playlistId"
            element={<StoreOwnerChromeFreeGuard><SignagePlaybackPage /></StoreOwnerChromeFreeGuard>}
          />
          <Route path="/store-owner" element={<StoreOwnerShell />}>
            <Route index element={<StoreOwnerHomePage />} />
            <Route path="products" element={<StoreOwnerProductsPage />} />
            <Route path="products/:offerId" element={<StoreOwnerProductDetailPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:orderId" element={<OrderDetailPage />} />
            {/* WO-PHARMACY-HUB-STORE-HANDLED-PRODUCTS-V1 — 매장 제품 (공급 상품과 다른 축) */}
            <Route path="handled-products" element={<HandledProductsPage />} />
            <Route path="local-products" element={<LocalProductsPage />} />
            {/* WO-PHARMACY-HUB-STORE-CONTENT-LIBRARY-V1 — 콘텐츠 · 자료함 · 블로그 (공통 원장 재사용) */}
            <Route path="content" element={<ContentPage />} />
            <Route path="library" element={<LibraryPage />} />
            <Route path="library/resources" element={<LibraryResourcesPage />} />
            <Route path="blog" element={<BlogPage />} />
            <Route path="blog/new" element={<BlogEditorPage />} />
            <Route path="blog/:id/edit" element={<BlogEditorPage />} />
            {/* WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1 — 매장 실행 자산 (출력·실행) */}
            <Route path="qr" element={<QrPage />} />
            <Route path="pop" element={<PopPage />} />
            <Route path="signage" element={<SignagePage />} />
            {/* WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §8 (#69·#70)
                동영상·편성은 같은 화면의 탭이지만, KPA 와 동일하게 경로를 나눠 사이드바·딥링크가 짝을 이룬다. */}
            <Route path="signage/media" element={<SignagePage />} />
            <Route path="signage/schedules" element={<SignagePage />} />
            {/* WO-O4O-PHARMACYHUB-...-PARITY-CLOSURE-V1 §8: TV 재생 대상 선택.
                실제 송출 화면(/store-owner/signage/play/:playlistId)은 매장 셸 밖 top-level route 다. */}
            <Route path="signage/player" element={<SignagePlayerSelectPage />} />
            <Route path="tablets" element={<TabletsPage />} />
            <Route path="manuals" element={<ManualsPage />} />
            <Route path="manuals/:listingId" element={<ManualDetailPage />} />
            {/* WO-O4O-PHARMACYHUB-...-PARITY-CLOSURE-V1 §7: 상품 설명 / 신청·승인 현황 / 마케팅 분석 */}
            <Route path="product-descriptions" element={<StoreProductDescriptionsPage />} />
            <Route path="recruitment-applications" element={<StoreRecruitmentApplicationsPage />} />
            <Route path="analytics/marketing" element={<StoreMarketingAnalyticsPage />} />
            {/* WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §8 (#76)
                다국어 상품 콘텐츠 — 목록(내 매장) + 상품별 저작. 공통 controller·원장 재사용.
                HUB 가져오기 축은 PH 에 운영자 원본이 없어(#85·#86) 만들지 않는다. */}
            <Route path="multilingual-product-contents" element={<MultilingualContentsMyPage />} />
            <Route
              path="products/multilingual/:targetKind/:targetId"
              element={<StoreProductMultilingualContentPage />}
            />
            {/* WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §8 (#79)
                외국인 여행객 판매지원 — 이용권(월 구독) 게이트 + 유입 파트너 + 파트너별 제휴 QR.
                backend 는 서비스 공용 /foreign-visitor · /store-entitlements 를 serviceKey 로 스코프한다.
                payment/success|fail 은 Toss 리다이렉트 착지점이라 경로가 계약의 일부다. */}
            <Route path="foreign-visitor" element={<ForeignVisitorSalesSupportPage />} />
            <Route path="foreign-visitor/partners" element={<ForeignVisitorPartnersPage />} />
            <Route
              path="foreign-visitor/partners/:partnerId/qr-codes"
              element={<ForeignVisitorPartnerQrCodesPage />}
            />
            <Route
              path="foreign-visitor/payment/success"
              element={<ForeignVisitorSalesSupportPaymentSuccessPage />}
            />
            <Route
              path="foreign-visitor/payment/fail"
              element={<ForeignVisitorSalesSupportPaymentFailPage />}
            />
            {/* WO-PHARMACY-HUB-STORE-INFO-AND-ACCOUNT-V1 — 설정 (매장 정보 / 내 계정) */}
            <Route path="info" element={<StoreInfoPage />} />
            <Route path="account" element={<AccountPage />} />
          </Route>

          {/*
            결제 (WO-PHARMACY-HUB-STORE-OWNER-CHECKOUT-AND-PAYMENT-UI-V1)
            success/fail 은 PG 리다이렉트 대상이라 URL 에 결제 파라미터가 실려 온다.
            StoreOwnerGuard 는 미인증 시 /login 으로 navigate 하며 LoginPage 는 returnUrl 을
            복원하지 않으므로 callback 파라미터가 소실된다. 따라서 결제 서브트리는 기존과
            동일하게 MembershipGate 만 적용한다(같은 URL 에서 안내). 셸은 동일하게 렌더한다.
          */}
          <Route path="/store-owner/payment" element={<StoreOwnerShell requireStoreOwnerRole={false} />}>
            <Route index element={<PaymentPage />} />
            <Route path="success" element={<PaymentSuccessPage />} />
            <Route path="fail" element={<PaymentFailPage />} />
          </Route>

          {/*
            공개 QR 랜딩 (WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1)
            매장 QR payload = https://pharmacyhub.co.kr/qr/{slug}. 소비자가 스캔하는 화면이라
            로그인·매장 셸을 요구하지 않는다.
          */}
          <Route path="/qr/:slug" element={<QrLandingPage />} />

          {/*
            공개 다국어 상품 안내 랜딩 (WO-O4O-PHARMACYHUB-...-PARITY-CLOSURE-V1 §8 #76)
            QR payload = https://pharmacyhub.co.kr/multilingual-products/{publicKey}.
            외국인 고객이 스캔하는 화면이라 로그인·매장 셸을 요구하지 않는다.
          */}
          <Route path="/multilingual-products/:publicKey" element={<MultilingualProductPublicLandingPage />} />

          {/*
            공개 제휴 QR 랜딩 (WO-O4O-PHARMACYHUB-...-PARITY-CLOSURE-V1 §8 #79)
            QR payload = https://pharmacyhub.co.kr/foreign-visitor/affiliate/{shortCode}.
            외국인 고객이 스캔하는 화면이라 로그인·매장 셸을 요구하지 않는다.
          */}
          <Route
            path="/foreign-visitor/affiliate/:shortCode"
            element={<ForeignVisitorAffiliatePublicLandingPage />}
          />

          {/*
            catch-all — 반드시 마지막
            WO-O4O-WEB-CATCH-ALL-ROUTE-CROSS-SERVICE-V1:
              기존에는 `<Navigate to="/" replace />` 로 홈에 흡수했다. 없는 주소를 입력하면
              안내 없이 홈으로 튕겨 요청 URL 이 사라졌다. redirect 대신 404 안내를 그 자리에
              render 하여 주소를 보존한다. 위 route 는 전부 이보다 구체적이라 영향이 없다.
          */}
          {/*
            WO-O4O-CROSSSERVICE-HEADER-MENU-FOOTER-UI-COMPLETION-V1:
              404 도 공개 셸 안에서 렌더한다 — 없는 주소에 도착한 사용자가 헤더/푸터로
              바로 복귀할 수 있어야 한다. 주소 보존 계약(redirect 아님)은 그대로다.
          */}
          <Route element={<PublicLayout />}>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
        </BrowserRouter>
      </AuthProvider>
    </O4OErrorBoundary>
  );
}
