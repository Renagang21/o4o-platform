/**
 * App — KPA Branch (분회 홈페이지 SaaS)
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1
 *
 * 라우트 (공용 도메인):
 *   /                                 분회 찾기 (registry)
 *   /login                            로그인 (serviceKey='kpa-branch')
 *   /me                               내 분회 / 전입·전출 이력
 *   /:branchSlug                      분회 홈 (고정 템플릿)
 *   /:branchSlug/notices              공지
 *   /:branchSlug/resources            자료실
 *   /:branchSlug/operator/site        홈페이지 설정 (운영자)
 *   /:branchSlug/operator/posts       글쓰기·글 관리 (운영자)
 *   /:branchSlug/operator/domains     자체 도메인 연결 (운영자)
 *
 * 자체 도메인으로 들어오면 같은 트리를 slug 세그먼트 없이 루트에 붙인다
 * (분회별 별도 배포·별도 백엔드 없음 — 번들 하나가 두 진입 방식을 모두 처리한다).
 *
 * 프론트 라우트는 UX 안내이며 권한 판정 근거가 아니다.
 * 실제 경계는 backend 의 requireKpaBranchScope + resolveBranch + requireBranchScope 가 강제한다.
 */
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider, useTenant } from './lib/tenant';
import { BranchLayout } from './layouts/BranchLayout';
import DirectoryPage from './pages/DirectoryPage';
import LoginPage from './pages/LoginPage';
import MyBranchPage from './pages/MyBranchPage';
import BranchHomePage from './pages/BranchHomePage';
import BranchPostsPage from './pages/BranchPostsPage';
import SiteSettingsPage from './pages/operator/SiteSettingsPage';
import PostsAdminPage from './pages/operator/PostsAdminPage';
import DomainsPage from './pages/operator/DomainsPage';
import NotFoundPage from './pages/NotFoundPage';

/** 분회 하위 화면 — slug 는 상위(URL 또는 Host)에서 결정되어 내려온다. */
function BranchSection({ slug, basePath }: { slug: string; basePath: string }) {
  return (
    <Routes>
      <Route element={<BranchLayout slug={slug} basePath={basePath} />}>
        <Route index element={<BranchHomePage slug={slug} basePath={basePath} />} />
        <Route path="notices" element={<BranchPostsPage slug={slug} category="notice" />} />
        <Route path="resources" element={<BranchPostsPage slug={slug} category="resource" />} />
        <Route path="operator/site" element={<SiteSettingsPage slug={slug} />} />
        <Route path="operator/posts" element={<PostsAdminPage slug={slug} />} />
        <Route path="operator/domains" element={<DomainsPage slug={slug} />} />
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
        <Route path="/me" element={<MyBranchPage />} />
        <Route path="/*" element={<BranchSection slug={hostBranch.slug} basePath="" />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<DirectoryPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/me" element={<MyBranchPage />} />
      <Route path="/:branchSlug/*" element={<BranchBySlug />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TenantProvider>
          <AppRoutes />
        </TenantProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
