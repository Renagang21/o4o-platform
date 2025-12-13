/**
 * Router Configuration
 *
 * 앱 전체 라우팅 설정
 */

import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { RequireAuth } from '@/context';
import { PageLoading } from '@/components/common';

// Lazy load pages
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));

// Forum pages
const ForumListPage = lazy(() => import('@/pages/forum/ForumListPage'));
const ForumDetailPage = lazy(() => import('@/pages/forum/ForumDetailPage'));

// Groupbuy pages
const GroupbuyListPage = lazy(() => import('@/pages/groupbuy/GroupbuyListPage'));
const GroupbuyDetailPage = lazy(() => import('@/pages/groupbuy/GroupbuyDetailPage'));

// LMS pages
const MyCoursesPage = lazy(() => import('@/pages/lms/MyCoursesPage'));
const CourseDetailPage = lazy(() => import('@/pages/lms/CourseDetailPage'));
const LessonPage = lazy(() => import('@/pages/lms/LessonPage'));
const BundleViewerPage = lazy(() =>
  import('@/pages/lms/bundle/BundleViewerPage').then((m) => ({ default: m.BundleViewerPage }))
);

// Member Portal
const MemberHome = lazy(() =>
  import('@/pages/member/MemberHome').then((m) => ({ default: m.MemberHome }))
);
const MemberNotifications = lazy(() =>
  import('@/pages/member/MemberNotifications').then((m) => ({ default: m.MemberNotifications }))
);

// LMS Member (Yaksa) pages
const LmsMemberDashboard = lazy(() =>
  import('@/pages/member/lms/LmsMemberDashboard').then((m) => ({ default: m.LmsMemberDashboard }))
);
const LmsMemberRequiredCourses = lazy(() =>
  import('@/pages/member/lms/LmsMemberRequiredCourses').then((m) => ({
    default: m.LmsMemberRequiredCourses,
  }))
);
const LmsMemberCredits = lazy(() =>
  import('@/pages/member/lms/LmsMemberCredits').then((m) => ({ default: m.LmsMemberCredits }))
);
const LmsMemberLicense = lazy(() =>
  import('@/pages/member/lms/LmsMemberLicense').then((m) => ({ default: m.LmsMemberLicense }))
);
const LmsMemberAssignments = lazy(() =>
  import('@/pages/member/lms/LmsMemberAssignments').then((m) => ({
    default: m.LmsMemberAssignments,
  }))
);

// Loading fallback
function PageFallback() {
  return <PageLoading message="페이지를 불러오는 중..." />;
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

                  {/* 공동구매 */}
                  <Route path="/groupbuy" element={<GroupbuyListPage />} />
                  <Route path="/groupbuy/:id" element={<GroupbuyDetailPage />} />

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
                  {/* LMS ContentBundle Viewer */}
                  <Route path="/lms/bundle/:bundleId" element={<BundleViewerPage />} />

                  {/* 회원 포털 (Member Portal) */}
                  <Route
                    path="/member"
                    element={
                      <RequireAuth>
                        <MemberHome />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/member/notifications"
                    element={
                      <RequireAuth>
                        <MemberNotifications />
                      </RequireAuth>
                    }
                  />

                  {/* 회원 LMS (약사 교육) */}
                  <Route
                    path="/member/lms/dashboard"
                    element={
                      <RequireAuth>
                        <LmsMemberDashboard />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/member/lms/required-courses"
                    element={
                      <RequireAuth>
                        <LmsMemberRequiredCourses />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/member/lms/credits"
                    element={
                      <RequireAuth>
                        <LmsMemberCredits />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/member/lms/license"
                    element={
                      <RequireAuth>
                        <LmsMemberLicense />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/member/lms/assignments"
                    element={
                      <RequireAuth>
                        <LmsMemberAssignments />
                      </RequireAuth>
                    }
                  />
                  {/* /member/lms → dashboard 리다이렉트 */}
                  <Route
                    path="/member/lms"
                    element={
                      <RequireAuth>
                        <LmsMemberDashboard />
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
