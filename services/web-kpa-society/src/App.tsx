import { pharmacyCollaboratorRoles } from '@o4o/types';
import { BUSINESS_SITE } from './config/businessSite';
import { PharmacyOperatorPage, PharmacyOperatorContentPage } from './pages/business/PharmacyOperatorPages';
import BusinessHomePresentationPage from './pages/business/BusinessHomePresentationPage';
import PharmacyMemberHomePage from './pages/business/PharmacyMemberHomePage';
import PharmacyLegacyRedirect, { LegacyAwareBusinessWorkspace } from './pages/business/PharmacyLegacyRedirect';
import BusinessWorkspace from './pages/business/BusinessWorkspace';
import BusinessParticipationPage from './pages/business/BusinessParticipationPage';
import BusinessMaterialsPage from './pages/business/BusinessMaterialsPage';
import BusinessToolsPage from './pages/business/BusinessToolsPage';
import BusinessForumPage, { BusinessForumBoundary } from './pages/business/BusinessForumPage';
import BusinessForumManagementPage from './pages/business/BusinessForumManagementPage';
import { MyHomeButton, O4OHomeButton } from '@o4o/auth-react';
import { RoleGuard } from './components/auth/RoleGuard';
import { authClient as pharmacyManagementAuthClient } from './contexts/AuthContext';
import { configurePharmacyManagementClient } from '@o4o/operator-core-ui/modules/pharmacy-management';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { toKpaScopedStorePath } from './lib/unifiedStoreScope';
import { useEffect, useState, lazy, Suspense } from 'react';
// WO-O4O-STORE-PRODUCTS-QUERYCLIENT-PROVIDER-ALIGN-V1
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});
import { Layout } from './components';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { AuthProvider } from './contexts';
import { O4OErrorBoundary, O4OToastProvider } from '@o4o/error-handling';
import { TemplateProvider, NotFound } from '@o4o/ui';
import { templates, usePageSeo } from '@o4o/shared-space-ui';
import { kpaConfig } from '@o4o/operator-ux-core';
import { kpaSeoRegistry, KPA_SEO_DEFAULTS, applyPharmacyUrlMeta } from './config/seoRegistry';
import { ServiceProvider } from './contexts/ServiceContext';
import { useAuth } from './contexts/AuthContext';
import { TermsAcceptanceGate } from './components/auth/TermsAcceptanceGate';
import { LoginModalProvider, useAuthModal } from './contexts/LoginModalContext';
import LoginModal from './components/LoginModal';
// WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1: RegisterModal(email+password 가입) 은 은퇴했다.
//   가입은 로그인 모달의 'Google 로 계속하기' 하나가 겸한다.
// WO-O4O-AUTH-REFRESH-TOKEN-FAMILY-CONTINUITY-AND-HANDOFF-STALE-TOKEN-GUARD-V1: 정적 import —
//   lazy 면 AuthProvider 의 세션 복구 effect 가 chunk 로드보다 먼저 실행돼 stale 토큰 guard 가 늦는다.
import HandoffPage from './pages/HandoffPage';

// WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 Phase 2 §14:
// 레거시 LMS 경로는 독립 강의 서비스(LECTURE_SERVICE_URL)로 외부 이동한다.
import { LECTURE_SERVICE_URL } from './config/navigation';

// WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1 §8-4: 매장 진입 → store.neture.co.kr handoff
import { createStoreServicesApi, mapLegacyStorePathToUnified } from '@o4o/store-ui-core';
import { coreApiClient } from './api/client';

// Signage — public rendering only (WO-O4O-SIGNAGE-STRUCTURE-CONSOLIDATION-V1)
const PublicSignagePage = lazy(() => import('./pages/signage/PublicSignagePage'));

// Legal (WO-KPA-LEGAL-PAGES-V1) · Contact (WO-O4O-KPA-CONTACT-PAGE-IMPLEMENTATION-V1)
const PolicyPage = lazy(() => import('./pages/legal/PolicyPage').then(m => ({ default: m.PolicyPage })));
const PrivacyPage = lazy(() => import('./pages/legal/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const ContactPage = lazy(() => import('./pages/contact/ContactPage'));

// Tablet Kiosk — public
const TabletStorePage = lazy(() => import('./pages/tablet/TabletStorePage').then(m => ({ default: m.TabletStorePage })));
// WO-O4O-STORE-TABLET-LOCATION-CONTENT-RUNTIME-MANAGEMENT-V1: 실제 태블릿 연결(6자리 코드) 온보딩
const TabletSetupPage = lazy(() => import('./pages/tablet/TabletSetupPage').then(m => ({ default: m.TabletSetupPage })));

// Store Blog — public
const StoreBlogPage = lazy(() => import('./pages/store/StoreBlogPage').then(m => ({ default: m.StoreBlogPage })));
const StoreBlogPostPage = lazy(() => import('./pages/store/StoreBlogPostPage').then(m => ({ default: m.StoreBlogPostPage })));

// WO-O4O-KPA-INTERNAL-STOREFRONT-RETIREMENT-V1: StorefrontProductDetailPage 만 QR 제품 랜딩(landingType='product') 전용으로 존치한다.
const StorefrontProductDetailPage = lazy(() => import('./pages/storefront/StorefrontProductDetailPage').then(m => ({ default: m.StorefrontProductDetailPage })));

// Public Content View (WO-KPA-A-CONTENT-USAGE-MODE-EXTENSION-V1)
const PublicContentViewPage = lazy(() => import('./pages/content/PublicContentViewPage'));
const PrintContentPage = lazy(() => import('./pages/content/PrintContentPage'));

// QR Landing Page (WO-O4O-QR-LANDING-PAGE-V1) — public
const QrLandingPage = lazy(() => import('./pages/qr/QrLandingPage'));
// WO-O4O-MULTILINGUAL-PRODUCT-QR-LANDING-V1: 외국인 고객용 다국어 상품 안내 (public, no auth)
const MultilingualProductPublicLandingPage = lazy(() => import('./pages/public/MultilingualProductPublicLandingPage').then(m => ({ default: m.MultilingualProductPublicLandingPage })));
// WO-O4O-FOREIGN-VISITOR-AFFILIATE-LANDING-V1: 외국인 관광객 제휴 QR 랜딩 (public, no auth)
const ForeignVisitorAffiliatePublicLandingPage = lazy(() => import('./pages/public/ForeignVisitorAffiliatePublicLandingPage').then(m => ({ default: m.ForeignVisitorAffiliatePublicLandingPage })));

/**
 * 약국 협력사업 사이트 (pharmacy.neture.co.kr · megapharm 호스트)
 *
 * WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1 D7:
 *   옛 KPA 운영 · 관리 · 매장 · 마이페이지 화면은 이전 없이 삭제했다. 남는 것은
 *   사업 화면(semi_franchises.key 기준) · 인증 · 사업 운영(/operator/semi-franchises) ·
 *   매장 handoff(store.neture.co.kr) · 외부 서비스 이동 · 법정 화면 · 공개 랜딩(QR · 태블릿 · 블로그 등)뿐이다.
 */

const SERVICE_NAME = BUSINESS_SITE.name;

/**
 * WO-O4O-KPA-REGISTER-CANONICAL-CLEANUP-V1
 * /login, /register 는 canonical URL 유지.
 * 공개 홈(CommunityHomePage) 위에 모달을 오픈한다.
 *
 * 이전(WO-O4O-AUTH-LEGACY-LOGIN-REGISTER-PAGE-REMOVAL-V1):
 *   /register → /mypage replace + 모달 / /login → / replace + 모달
 * 변경:
 *   URL 변경 없음 → URL과 화면 흐름 정렬, 북마크/공유 가능
 */
function LoginRoute() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { openLoginModal, setOnLoginSuccess } = useAuthModal();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    const returnTo = searchParams.get('returnTo') ||
                     (location.state as { from?: string })?.from;
    // WO-O4O-CROSS-SERVICE-LOGIN-ENTRY-AND-RETURN-FLOW-FIX-V1: 이미 로그인했으면 모달 없이 목적지로.
    if (isAuthenticated) {
      navigate(returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/', { replace: true });
      return;
    }
    if (returnTo) {
      setOnLoginSuccess(() => {
        navigate(returnTo, { replace: true });
      });
    }
    openLoginModal();
  }, [openLoginModal, location.state, searchParams, setOnLoginSuccess, navigate, isAuthenticated, isLoading]);

  return <Layout serviceName={SERVICE_NAME}><p className="mx-auto max-w-4xl px-4 py-12">약국 협력사업을 이용하려면 로그인해 주세요.</p></Layout>;
}

/**
 * WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
 *   /register 는 기존 진입 URL 을 유지하며 공통 계정 가입 화면으로 연결한다.
 */
function RegisterRoute() {
  useEffect(() => {
    // Automatic legacy redirect must not trap Back navigation on /register.
    window.location.replace('https://neture.co.kr/signup');
  }, []);

  return <Layout serviceName={SERVICE_NAME}><p className="mx-auto max-w-4xl px-4 py-12">O4O 회원가입 화면으로 이동합니다.</p></Layout>;
}

/** /api/v1 루트 클라이언트 → work-scope/store-services · auth/handoff */
const kpaStoreServicesApi = createStoreServicesApi({
  get: (url) => coreApiClient.get(url),
  post: (url, body) => coreApiClient.post(url, body),
});

/**
 * WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1 §8-4 · WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1 D7:
 *   /store · /hub · /store-hub 진입은 모두 store.neture.co.kr 통합 Store Workspace 로 handoff 한다.
 *   이 사이트에는 매장 화면이 없다. 매장 접근 판정은 목적지의 조직 · 원장 게이트가 한다.
 */
function KpaUnifiedStoreHandoff() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (isLoading) return;
    let active = true;
    setError(false);
    const legacyHub = location.pathname.match(/^\/(?:hub|store-hub)(?:\/(.*))?$/);
    const resource = legacyHub?.[1] ?? '';
    const libraryResources = ['content', 'supplier-library', 'multilingual-product-contents', 'blog', 'pop', 'qr', 'video', 'signage', 'screen-set', 'contents'];
    const hubPath = ['b2b', 'event-offers'].includes(resource) ? '/store/pharmacy/supply'
      : resource === 'cart' ? '/store/pharmacy/cart'
        : libraryResources.includes(resource.split('/')[0]) ? `/store/library/${resource}` : '/store/pharmacy/contents';
    const returnPath = (legacyHub ? hubPath + location.search : mapLegacyStorePathToUnified('kpa-society', location.pathname, location.search)) + location.hash;
    /** 공통 매장 화면(/store/...) returnPath → KPA 서비스 지정 매장 화면(/work/kpa-society/store/...) — §21-13 */
    const scopedPath = toKpaScopedStorePath(returnPath);
    if (!user) { window.location.replace(`https://store.neture.co.kr${scopedPath}`); return; }
    kpaStoreServicesApi.resolveWorkspaceEntryUrl(scopedPath).then(url => {
      if (!active) return;
      const target = new URL(url);
      if (target.origin !== 'https://store.neture.co.kr' || target.pathname !== '/handoff') throw new Error('Invalid target');
      window.location.replace(target.href);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [isLoading, user?.id, location.pathname, location.search, location.hash, attempt]);
  return error ? <main className="p-8"><p role="alert">내 매장으로 로그인 상태를 전달하지 못했습니다.</p><button onClick={() => setAttempt(v => v + 1)}>다시 시도</button></main> : <p className="p-8">내 매장으로 이동하는 중입니다…</p>;
}

function PharmacistCommunityRedirect() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (isLoading) return;
    let active = true;
    setFailed(false);
    const base = '/communities/community/forum';
    const suffix = location.pathname.startsWith('/mypage/my-forums')
      ? '/owned' + location.pathname.slice('/mypage/my-forums'.length)
      : location.pathname.slice('/forum'.length);
    const query = new URLSearchParams(location.search);
    let path = base + suffix;
    if (suffix === '/all') path = `${base}/posts`;
    else if (suffix.startsWith('/edit/')) { path = `${base}/write`; query.set('edit', suffix.slice(6)); }
    else if (suffix && !/^\/(post|write|my-posts|request|owned)(?:\/|$)/.test(suffix)) {
      const writing = suffix.endsWith('/write');
      path = `${base}/${writing ? 'write' : 'posts'}`;
      query.set(writing ? 'forum' : 'board', suffix.slice(1).replace(/\/write$/, ''));
    }
    const returnPath = `${path}${query.size ? `?${query}` : ''}${location.hash}`;
    if (!user) { window.location.replace(`https://community.neture.co.kr${returnPath}`); return; }
    coreApiClient.post('/auth/handoff', { targetServiceKey: 'community', returnPath }).then((r: any) => {
      if (!active) return;
      const issued = new URL(r.data?.data?.targetUrl ?? r.data?.targetUrl);
      if (issued.origin !== 'https://community.neture.co.kr' || issued.pathname !== '/handoff') throw new Error('Invalid target');
      window.location.replace(issued.href);
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [location.pathname, location.search, location.hash, user?.id, isLoading, attempt]);
  return failed ? <main className="p-8"><p role="alert">커뮤니티로 로그인 상태를 전달하지 못했습니다.</p><button onClick={() => setAttempt(v => v + 1)}>다시 시도</button></main> : <p className="p-8">커뮤니티로 이동하는 중입니다…</p>;
}

/** WO-STORE-SLUG-UNIFICATION-V1: /kpa/store/:slug → /store/:slug redirect */
function KpaRedirect({ to, suffix }: { to: string; suffix?: string }) {
  const { slug, postSlug } = useParams<{ slug: string; postSlug: string }>();
  let target = `${to}/${slug}`;
  if (suffix) target += suffix.replace(':postSlug', postSlug || '');
  return <Navigate to={target} replace />;
}

// WO-KPA-SOCIETY-APP-ROUTE-CODE-SPLITTING-V1: lazy fallback
function PageLoader() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <LoadingSpinner size="large" />
    </div>
  );
}

// WO-O4O-KPA-NETURE-SEO-REGISTRY-USEPAGESEO-V1: 페이지별 메타 동적 적용 (브라우저/SNS 보조용)
function SeoWatcher() {
  const { pathname } = useLocation();
  usePageSeo({ registry: kpaSeoRegistry, pathname, defaults: KPA_SEO_DEFAULTS });
  // WO-O4O-CROSS-SERVICE-PUBLIC-DESIGN-AND-BRAND-REFRESH-V1: og:url · canonical = pharmacy.neture.co.kr 기준
  useEffect(() => { applyPharmacyUrlMeta(pathname); }, [pathname]);
  return null;
}

/**
 * WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 Phase 2 §14·§15
 * 레거시 LMS 경로 → 독립 강의 서비스(study.neture.co.kr) 외부 이동. 서비스 간 이동은 public link 로만 한다.
 */
function LectureExternalRedirect({ path = '' }: { path?: string }) {
  useEffect(() => { window.location.replace(`${LECTURE_SERVICE_URL}${path}`); }, [path]);
  return null;
}
function LectureCertificateVerifyRedirect() {
  const { certificateId } = useParams<{ certificateId: string }>();
  useEffect(() => {
    window.location.replace(`${LECTURE_SERVICE_URL}/certificates/verify/${encodeURIComponent(certificateId ?? '')}`);
  }, [certificateId]);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <O4OErrorBoundary>
    <AuthProvider>
      <LoginModalProvider>
      <BrowserRouter>
        <SeoWatcher />
        <ServiceProvider>
        {/* WO-O4O-TEMPLATE-PROVIDER-V1: 서비스 디자인 토큰 자동 주입 */}
        <TemplateProvider template={templates[kpaConfig.template]}>
        <O4OToastProvider />
        {/* 전역 인증 모달 (WO-O4O-AUTH-MODAL-LOGIN-AND-ACCOUNT-STANDARD-V1) */}
        <LoginModal />
        {/* WO-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1 §17: 기존 회원 약관 재동의 게이트 */}
        <TermsAcceptanceGate>
        <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* 사업 화면 — 호스트 사업(BUSINESS_SITE.key) · /businesses/:businessKey */}
          <Route element={<Layout serviceName={SERVICE_NAME}><BusinessWorkspace defaultBusinessKey={BUSINESS_SITE.key} memberLayout /></Layout>}>
            <Route path="/" element={<PharmacyMemberHomePage />} />
            <Route path="/my/participation" element={<BusinessParticipationPage />} />
            <Route path="/home-presentation" element={<BusinessHomePresentationPage />} />
            <Route path="/materials" element={<BusinessMaterialsPage />} />
            <Route path="/tools" element={<BusinessToolsPage />} />
            <Route path="/community" element={<BusinessForumBoundary />}>
              <Route index element={<BusinessForumPage />} />
              <Route path="posts" element={<BusinessForumPage />} />
              <Route path="write" element={<BusinessForumPage view="write" />} />
              <Route path="post/:slug" element={<BusinessForumPage view="post" />} />
              <Route path="my-posts" element={<BusinessForumPage view="mine" />} />
              <Route path="request" element={<BusinessForumManagementPage view="request" />} />
              <Route path="owned" element={<BusinessForumManagementPage view="owned" />} />
              <Route path="owned/:forumId/members" element={<BusinessForumManagementPage view="members" />} />
              <Route path="manage" element={<BusinessForumManagementPage view="manage" />} />
            </Route>
          </Route>
          {BUSINESS_SITE.key === 'pharmacy' && <Route path="/businesses/pharmacy/*" element={<PharmacyLegacyRedirect />} />}
          <Route path="/businesses/:businessKey" element={<Layout serviceName={SERVICE_NAME}><LegacyAwareBusinessWorkspace /></Layout>}>
            <Route index element={<PharmacyMemberHomePage />} />
            <Route path="home-presentation" element={<BusinessHomePresentationPage />} />
            <Route path="participation" element={<BusinessParticipationPage />} />
            <Route path="materials" element={<BusinessMaterialsPage />} />
            <Route path="tools" element={<BusinessToolsPage />} />
            <Route path="forum" element={<BusinessForumBoundary />}>
              <Route index element={<BusinessForumPage />} />
              <Route path="posts" element={<BusinessForumPage />} />
              <Route path="write" element={<BusinessForumPage view="write" />} />
              <Route path="post/:slug" element={<BusinessForumPage view="post" />} />
              <Route path="my-posts" element={<BusinessForumPage view="mine" />} />
              <Route path="request" element={<BusinessForumManagementPage view="request" />} />
              <Route path="owned" element={<BusinessForumManagementPage view="owned" />} />
              <Route path="owned/:forumId/members" element={<BusinessForumManagementPage view="members" />} />
              <Route path="manage" element={<BusinessForumManagementPage view="manage" />} />
            </Route>
          </Route>

          {/* 인증 — /login, /register canonical URL 유지 (모달 오버레이) */}
          <Route path="/handoff" element={<HandoffPage />} />
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/register" element={<RegisterRoute />} />
          {/* WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1: 계정 찾기 · 비밀번호 재설정 경로는 은퇴했다. */}
          <Route path="/forgot-password" element={<Navigate to="/login" replace />} />
          <Route path="/reset-password" element={<Navigate to="/login" replace />} />

          {/* 사업 운영 — semi_franchises 기준. 옛 /operator/* · /admin/* 콘솔은 삭제 (D7) */}
          <Route path="/operator/semi-franchises" element={<RoleGuard allowedRoles={['neture:operator','neture:admin', ...pharmacyCollaboratorRoles(BUSINESS_SITE.key)]} enforceMembership={false}><Layout serviceName={SERVICE_NAME}><PharmacyOperatorPage /></Layout></RoleGuard>} />
          <Route path="/operator/semi-franchises/:key/contents/new" element={<RoleGuard allowedRoles={['neture:operator','neture:admin', ...pharmacyCollaboratorRoles(BUSINESS_SITE.key)]} enforceMembership={false}><Layout serviceName={SERVICE_NAME}><PharmacyOperatorContentPage /></Layout></RoleGuard>} />
          <Route path="/operator/semi-franchises/:key/contents/:id/edit" element={<RoleGuard allowedRoles={['neture:operator','neture:admin', ...pharmacyCollaboratorRoles(BUSINESS_SITE.key)]} enforceMembership={false}><Layout serviceName={SERVICE_NAME}><PharmacyOperatorContentPage /></Layout></RoleGuard>} />

          {/* 내 매장 — store.neture.co.kr handoff 전용 (송출 화면 포함, web-store 가 호스팅) */}
          <Route path="/store/*" element={<KpaUnifiedStoreHandoff />} />
          <Route path="/hub/*" element={<KpaUnifiedStoreHandoff />} />
          <Route path="/store-hub/*" element={<KpaUnifiedStoreHandoff />} />
          <Route path="/pharmacy/*" element={<Navigate to="/store" replace />} />
          {/* WO-O4O-STORE-WORKSPACE-INTEGRATION-AND-MY-SERVICES-V1: COMPAT_REDIRECT */}
          <Route path="/mobile/pharmacy" element={<Navigate to="/store/workspace" replace />} />

          {/* 약사 커뮤니티 · 강의 — 외부 서비스 이동 */}
          <Route path="/forum/*" element={<PharmacistCommunityRedirect />} />
          <Route path="/mypage/my-forums" element={<PharmacistCommunityRedirect />} />
          <Route path="/mypage/my-forums/:forumId/members" element={<PharmacistCommunityRedirect />} />
          <Route path="/courses/*" element={<LectureExternalRedirect />} />
          <Route path="/instructors/*" element={<LectureExternalRedirect />} />
          <Route path="/instructor/*" element={<LectureExternalRedirect />} />
          <Route path="/lms/*" element={<LectureExternalRedirect />} />
          <Route path="/mypage/certificates" element={<LectureExternalRedirect path="/my/certificates" />} />
          <Route path="/mypage/enrollments" element={<LectureExternalRedirect path="/my/enrollments" />} />
          <Route path="/mypage/completions" element={<LectureExternalRedirect path="/my/certificates" />} />
          {/* Phase 2 §17: 수료증 진위 확인은 독립 강의 서비스 소유 */}
          <Route path="/certificate/verify/:certificateId" element={<LectureCertificateVerifyRedirect />} />

          {/* 법정 · 문의 */}
          <Route path="/contact" element={<Layout serviceName={SERVICE_NAME}><ContactPage /></Layout>} />
          <Route path="/policy" element={<Layout serviceName={SERVICE_NAME}><PolicyPage /></Layout>} />
          <Route path="/privacy" element={<Layout serviceName={SERVICE_NAME}><PrivacyPage /></Layout>} />

          {/* 공개 랜딩 — 매장 QR · 태블릿 · 블로그 · 콘텐츠 링크가 이 호스트로 발급된다 (no auth) */}
          <Route path="/tablet/setup" element={<TabletSetupPage />} />
          <Route path="/tablet/:slug" element={<TabletStorePage />} />
          <Route path="/store/:slug/products/:id" element={<StorefrontProductDetailPage />} />
          <Route path="/store/:slug/blog" element={<Layout serviceName={SERVICE_NAME}><StoreBlogPage /></Layout>} />
          <Route path="/store/:slug/blog/:postSlug" element={<Layout serviceName={SERVICE_NAME}><StoreBlogPostPage /></Layout>} />
          {/* WO-STORE-SLUG-UNIFICATION-V1: 인쇄된 옛 주소 보호 */}
          <Route path="/kpa/tablet/:slug" element={<KpaRedirect to="/tablet" />} />
          <Route path="/kpa/store/:slug/blog/:postSlug" element={<KpaRedirect to="/store" suffix="/blog/:postSlug" />} />
          <Route path="/kpa/store/:slug/blog" element={<KpaRedirect to="/store" suffix="/blog" />} />
          <Route path="/view/:snapshotId/print" element={<PrintContentPage />} />
          <Route path="/view/:snapshotId" element={<PublicContentViewPage />} />
          <Route path="/qr/:slug" element={<QrLandingPage />} />
          <Route path="/multilingual-products/:publicKey" element={<MultilingualProductPublicLandingPage />} />
          <Route path="/foreign-visitor/affiliate/:shortCode" element={<ForeignVisitorAffiliatePublicLandingPage />} />
          <Route path="/public/signage" element={<PublicSignagePage />} />

          {/* 404 - 알 수 없는 경로 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
        </TermsAcceptanceGate>
        </TemplateProvider>
        </ServiceProvider>
      </BrowserRouter>
      </LoginModalProvider>
    </AuthProvider>
    </O4OErrorBoundary>
    </QueryClientProvider>
  );
}

/**
 * 404 페이지 (플랫폼 전체)
 *
 * WO-O4O-WEB-UX-STANDARDIZATION-BATCH-V1: canonical 404 형태로 정렬.
 * WO-O4O-WEB-COMMON-UX-COMPONENT-PROMOTION-BATCH-V1:
 *   복제 마크업을 공통 @o4o/ui NotFound 로 교체. 보조 링크(사업 홈 · 커뮤니티)는 children 유지.
 *
 * 선행: WO-O4O-SERVICE-PAGE-FOOTER-COVERAGE-AUDIT-AND-FIX-V1 (404 = minimal nav)
 */
function NotFoundPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  return (
    <NotFound>
      <span className="inline-flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3"><MyHomeButton accountId={user?.id} api={pharmacyManagementAuthClient.api} isAuthenticated={isAuthenticated} authLoading={isLoading} className="o4o-home-link" /><O4OHomeButton api={pharmacyManagementAuthClient.api} isAuthenticated={isAuthenticated} authLoading={isLoading} className="o4o-home-link" /></span>
      <Link to="/" className="text-slate-500 no-underline hover:underline">
        사업 홈
      </Link>
      <Link to="/community" className="text-slate-500 no-underline hover:underline">
        커뮤니티
      </Link>
    </NotFound>
  );
}

export default App;

configurePharmacyManagementClient(pharmacyManagementAuthClient.api);
