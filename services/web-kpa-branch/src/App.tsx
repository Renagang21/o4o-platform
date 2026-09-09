/**
 * App — KPA Branch (분회 홈페이지 SaaS)
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1
 *
 * 라우트 (공용 경로 — https://kpa-society.co.kr/kpa 아래, router basename='/kpa'):
 *   /                                 분회 찾기 (registry)
 *   /login                            로그인 (serviceKey='kpa-branch')
 *   /reset-password                   비밀번호 재설정 (메일 링크 착지점 — 분회 축 아님)
 *   /me                               내 분회 / 전입·전출 이력
 *   /:branchSlug                      분회 홈 (고정 템플릿)
 *   /:branchSlug/notices              공지
 *   /:branchSlug/resources            자료실
 *   /:branchSlug/officers             임원·위원회 명부 (공개/회원)
 *   /:branchSlug/mypage/annual-report 신상신고 작성·제출 (회원)
 *   /:branchSlug/mypage/fees          내 회비 조회 (회원)
 *   /:branchSlug/mypage/education     내 연수교육 조회 (회원)
 *   /:branchSlug/mypage/events        분회 행사·참가 응답 (회원)
 *   /:branchSlug/operator/site        홈페이지 설정 (운영자)
 *   /:branchSlug/operator/posts       글쓰기·글 관리 (운영자)
 *   /:branchSlug/operator/domains     자체 도메인 연결 (운영자)
 *   /:branchSlug/operator/annual-reports 신상신고 검수·승인 (운영자)
 *   /:branchSlug/operator/fees        연회비 정책·원장 (운영자)
 *   /:branchSlug/operator/education   연수교육 평점 원장 (운영자)
 *   /:branchSlug/operator/members     회원 업무 콘솔 (운영자)
 *   /:branchSlug/operator/events      행사 관리 (운영자)
 *   /:branchSlug/operator/officers    임원 명부 관리 (운영자)
 *
 * 자체 도메인으로 들어오면 같은 트리를 slug 세그먼트 없이 루트에 붙인다
 * (분회별 별도 배포·별도 백엔드 없음 — 번들 하나가 두 진입 방식을 모두 처리한다).
 *
 * WO-O4O-KPA-BRANCH-PUBLIC-PATH-ROUTING-AND-CUSTOM-DOMAIN-BASELINE-V1:
 *   공용 진입은 `kpa-society.co.kr/kpa/{slug}` 다. `/kpa` 는 router basename 으로만
 *   흡수하므로 아래 라우트 트리는 그대로 유지된다 (basePath 는 여전히 `/{slug}`).
 *
 * 프론트 라우트는 UX 안내이며 권한 판정 근거가 아니다.
 * 실제 경계는 backend 의 requireKpaBranchScope + resolveBranch + requireBranchScope 가 강제한다.
 */
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider, useTenant, detectBasename } from './lib/tenant';
import { BranchLayout } from './layouts/BranchLayout';
import DirectoryPage from './pages/DirectoryPage';
import LoginPage from './pages/LoginPage';
import MyBranchPage from './pages/MyBranchPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import BranchHomePage from './pages/BranchHomePage';
import BranchPostsPage from './pages/BranchPostsPage';
import SiteSettingsPage from './pages/operator/SiteSettingsPage';
import PostsAdminPage from './pages/operator/PostsAdminPage';
import DomainsPage from './pages/operator/DomainsPage';
import AnnualReportsReviewPage from './pages/operator/AnnualReportsReviewPage';
import AnnualReportPage from './pages/annual-report/AnnualReportPage';
import MyFeePage from './pages/annual-report/MyFeePage';
import FeeLedgerPage from './pages/operator/FeeLedgerPage';
import MyEducationPage from './pages/annual-report/MyEducationPage';
import EducationCreditsPage from './pages/operator/EducationCreditsPage';
import MembersConsolePage from './pages/operator/MembersConsolePage';
import EventsPage from './pages/operator/EventsPage';
import OfficersPage from './pages/operator/OfficersPage';
import BranchOfficersPage from './pages/BranchOfficersPage';
import MyEventsPage from './pages/annual-report/MyEventsPage';
import NotFoundPage from './pages/NotFoundPage';

/** 분회 하위 화면 — slug 는 상위(URL 또는 Host)에서 결정되어 내려온다. */
function BranchSection({ slug, basePath }: { slug: string; basePath: string }) {
  return (
    <Routes>
      <Route element={<BranchLayout slug={slug} basePath={basePath} />}>
        <Route index element={<BranchHomePage slug={slug} basePath={basePath} />} />
        <Route path="notices" element={<BranchPostsPage slug={slug} category="notice" />} />
        <Route path="resources" element={<BranchPostsPage slug={slug} category="resource" />} />
        <Route path="officers" element={<BranchOfficersPage slug={slug} />} />
        <Route path="mypage/annual-report" element={<AnnualReportPage slug={slug} />} />
        <Route path="mypage/fees" element={<MyFeePage slug={slug} />} />
        <Route path="mypage/education" element={<MyEducationPage slug={slug} />} />
        <Route path="mypage/events" element={<MyEventsPage slug={slug} />} />
        <Route path="operator/site" element={<SiteSettingsPage slug={slug} />} />
        <Route path="operator/posts" element={<PostsAdminPage slug={slug} />} />
        <Route path="operator/domains" element={<DomainsPage slug={slug} />} />
        <Route path="operator/annual-reports" element={<AnnualReportsReviewPage slug={slug} />} />
        <Route path="operator/fees" element={<FeeLedgerPage slug={slug} />} />
        <Route path="operator/education" element={<EducationCreditsPage slug={slug} />} />
        <Route path="operator/members" element={<MembersConsolePage slug={slug} basePath={basePath} />} />
        <Route path="operator/events" element={<EventsPage slug={slug} />} />
        <Route path="operator/officers" element={<OfficersPage slug={slug} />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

/** 공용 도메인: /:branchSlug/* */
function BranchBySlug() {
  const { branchSlug = '' } = useParams();
  return <BranchSection slug={branchSlug} basePath={`/${branchSlug}`} />;
}

function AppRoutes() {
  const { isCustomDomain, hostBranch, isLoading, error } = useTenant();

  if (isCustomDomain) {
    if (isLoading) {
      return <div className="p-10 text-center text-gray-500">분회 정보를 불러오는 중입니다…</div>;
    }
    if (error || !hostBranch?.slug) {
      return (
        <div className="p-10 text-center">
          <p className="text-lg font-semibold text-gray-900">분회를 찾을 수 없습니다</p>
          <p className="mt-2 text-sm text-gray-500">{error ?? '도메인 연결이 아직 완료되지 않았습니다.'}</p>
        </div>
      );
    }
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/me" element={<MyBranchPage />} />
        <Route path="/*" element={<BranchSection slug={hostBranch.slug} basePath="" />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<DirectoryPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/me" element={<MyBranchPage />} />
      <Route path="/:branchSlug/*" element={<BranchBySlug />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  // basename 은 진입 시점의 host/pathname 으로 한 번만 정한다 (SPA 내 이동은 basename 을 바꾸지 않는다).
  const basename = detectBasename();
  return (
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <TenantProvider>
          <AppRoutes />
        </TenantProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
