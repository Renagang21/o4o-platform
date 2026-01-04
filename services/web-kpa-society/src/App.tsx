import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components';
import { AuthProvider } from './contexts';
import { DashboardPage } from './pages/DashboardPage';

// Forum pages
import { ForumListPage, ForumDetailPage, ForumWritePage } from './pages/forum';

// LMS pages
import { LmsCoursesPage, LmsCourseDetailPage, LmsLessonPage, LmsCertificatesPage } from './pages/lms';

// Groupbuy pages
import { GroupbuyListPage, GroupbuyDetailPage, GroupbuyHistoryPage } from './pages/groupbuy';

// News pages
import { NewsListPage, NewsDetailPage, GalleryPage } from './pages/news';

// Resources pages
import { ResourcesListPage } from './pages/resources';

// Organization pages
import { OrganizationAboutPage, BranchesPage, BranchDetailPage, OfficersPage, ContactPage } from './pages/organization';

// MyPage pages
import { MyDashboardPage, MyProfilePage, MySettingsPage, MyCertificatesPage } from './pages/mypage';

// Admin pages (지부 관리자)
import { AdminDashboardPage, BranchManagementPage, BranchFormPage } from './pages/admin';

// Branch Routes (분회 서브디렉토리)
import { BranchRoutes } from './routes/BranchRoutes';

// Branch Admin Routes (분회 관리자)
import { BranchAdminRoutes } from './routes/BranchAdminRoutes';

// Legacy pages (for backward compatibility)
import {
  MemberApplyPage,
  MyApplicationsPage,
  EventsPage,
} from './pages';

/**
 * KPA Society - 약사회 SaaS
 * IA Structure v1 (Design Package)
 */

const SERVICE_NAME = '청명광역약사회';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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

            {/* Groupbuy (공동구매) */}
            <Route path="/groupbuy" element={<GroupbuyListPage />} />
            <Route path="/groupbuy/history" element={<GroupbuyHistoryPage />} />
            <Route path="/groupbuy/:id" element={<GroupbuyDetailPage />} />

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

            {/* Admin (지부 관리자) */}
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/branches" element={<BranchManagementPage />} />
            <Route path="/admin/branches/new" element={<BranchFormPage />} />
            <Route path="/admin/branches/:id/edit" element={<BranchFormPage />} />

            {/* Legacy routes (for backward compatibility) */}
            <Route path="/member/apply" element={<MemberApplyPage />} />
            <Route path="/applications" element={<MyApplicationsPage />} />
            <Route path="/events" element={<EventsPage />} />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Layout>

        {/* Branch Routes (분회 서브디렉토리 - 별도 레이아웃) */}
        <Routes>
          <Route path="/branch/:branchId/admin/*" element={<BranchAdminRoutes />} />
          <Route path="/branch/:branchId/*" element={<BranchRoutes />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

// 404 페이지
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

export default App;
