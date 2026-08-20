/**
 * Router Configuration
 *
 * 앱 전체 라우팅 설정
 */

import { lazy, Suspense } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { RequireAuth } from '@/context';
import { PageLoading } from '@/components/common';

// Lazy load pages
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));

// Forum pages
const ForumListPage = lazy(() => import('@/pages/forum/ForumListPage'));
const ForumDetailPage = lazy(() => import('@/pages/forum/ForumDetailPage'));

// LMS pages
const MyCoursesPage = lazy(() => import('@/pages/lms/MyCoursesPage'));
const CourseDetailPage = lazy(() => import('@/pages/lms/CourseDetailPage'));
const LessonPage = lazy(() => import('@/pages/lms/LessonPage'));

// WO-O4O-MAIN-SITE-UNIQUE-VIEWER-MIGRATION-AND-PREVIEW-LINK-CLOSURE-V1
//   `/lms/bundle/:bundleId` · `/marketing/product/:id` · `/marketing/quiz/:id` 3개 viewer 를 제거했다.
//   backend `@o4o/lms-marketing` 은 Phase R7 에서 삭제됐고 entity 등록도 해제돼
//   `/api/v1/lms/marketing/*` · `/api/v1/lms/bundles` 는 프로덕션에서 404 다.
//   외부 진입 소비처도 0 이라 DEAD_FEATURE 로 판정해 이전 대신 제거했다.

// Member Portal
// WO-O4O-LEGACY-YAKSA-ADMIN-AND-DOMAIN-FEATURES-FULL-REMOVAL-V1
//   `/member` 회원 포털(내 자격·회비·교육 4탭) · `/member/lms/*` · `/member/notifications`
//   화면은 모두 membership-yaksa · annualfee-yaksa · lms-yaksa 전용 도메인 화면이라 제거했다.
//   알림 화면은 6개 알림 타입(면허·회비·교육)이 전부 제거된 scheduler Job 산출물이었고,
//   유일한 진입점(MemberHome) 과 복귀 링크(`/member`) 가 함께 사라져 도달 불가 화면이 된다.
//   공용 알림 백엔드(`/api/v2/notifications`) 자체는 변경하지 않는다.

// Seller pages
const SellerDashboardPage = lazy(() =>
  import('@/pages/seller/dashboard').then((m) => ({ default: m.SellerDashboard }))
);

// Loading fallback
function PageFallback() {
  return <PageLoading message="페이지를 불러오는 중..." />;
}

// Seller Dashboard Wrapper (URL 파라미터에서 sellerId 추출)
function SellerDashboardWrapper() {
  const { sellerId } = useParams<{ sellerId: string }>();
  return <SellerDashboardPage sellerId={sellerId || 'test-seller-001'} />;
}

export function AppRouter() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* 인증 페이지 (레이아웃 없음) */}
        <Route path="/login" element={<LoginPage />} />

        {/* 메인 레이아웃 적용 페이지 */}
        <Route
          path="/*"
          element={
            <MainLayout>
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  {/* 대시보드 / 홈 */}
                  <Route path="/" element={<DashboardPage />} />

                  {/* 조직별 홈 */}
                  <Route path="/org/:orgId" element={<DashboardPage />} />

                  {/* 포럼 */}
                  <Route path="/forum" element={<ForumListPage />} />
                  <Route path="/forum/post/:slug" element={<ForumDetailPage />} />
                  <Route
                    path="/forum/write"
                    element={
                      <RequireAuth>
                        <div className="min-h-screen flex items-center justify-center">
                          <p className="text-gray-500">글쓰기 페이지 준비 중...</p>
                        </div>
                      </RequireAuth>
                    }
                  />

                  {/* LMS */}
                  <Route
                    path="/lms"
                    element={
                      <RequireAuth>
                        <MyCoursesPage />
                      </RequireAuth>
                    }
                  />
                  <Route path="/lms/courses" element={<MyCoursesPage />} />
                  <Route path="/lms/course/:id" element={<CourseDetailPage />} />
                  <Route
                    path="/lms/course/:courseId/lesson/:lessonId"
                    element={
                      <RequireAuth>
                        <LessonPage />
                      </RequireAuth>
                    }
                  />
                  {/* Seller Dashboard (관리자/판매원 접근 가능) */}
                  <Route
                    path="/seller/dashboard"
                    element={
                      <RequireAuth>
                        <SellerDashboardPage sellerId="test-seller-001" />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/seller/dashboard/:sellerId"
                    element={
                      <RequireAuth>
                        <SellerDashboardWrapper />
                      </RequireAuth>
                    }
                  />

                  {/* 마이페이지 (준비 중) */}
                  <Route
                    path="/mypage/*"
                    element={
                      <RequireAuth>
                        <div className="min-h-screen flex items-center justify-center">
                          <p className="text-gray-500">마이페이지 준비 중...</p>
                        </div>
                      </RequireAuth>
                    }
                  />

                  {/* 404 */}
                  <Route
                    path="*"
                    element={
                      <div className="min-h-screen flex flex-col items-center justify-center">
                        <span className="text-6xl mb-4">🔍</span>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                          페이지를 찾을 수 없습니다
                        </h1>
                        <p className="text-gray-500 mb-6">
                          요청하신 페이지가 존재하지 않거나 이동되었습니다.
                        </p>
                        <a
                          href="/"
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          홈으로 돌아가기
                        </a>
                      </div>
                    }
                  />
                </Routes>
              </Suspense>
            </MainLayout>
          }
        />
      </Routes>
    </Suspense>
  );
}

export default AppRouter;
