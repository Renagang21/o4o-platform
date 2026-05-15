/**
 * DashboardPage
 *
 * 사용자 대시보드 (홈) 페이지
 * - 조직별 콘텐츠 표시
 * - 최근 활동 요약
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import { useAuth, useOrganization } from '@/context';
import { OrganizationBadge, OrganizationSelector, PageLoading } from '@/components/common';

// 대시보드 데이터 타입
interface DashboardData {
  recentPosts: Array<{
    id: string;
    title: string;
    slug: string;
    createdAt: string;
  }>;
  activeCampaigns: Array<{
    id: string;
    title: string;
    progress: number;
    endDate: string;
  }>;
  myEnrollments: Array<{
    id: string;
    courseTitle: string;
    courseId: string;
    progress: number;
  }>;
  stats: {
    forumPosts: number;
    forumComments: number;
    coursesCompleted: number;
  };
}

export function DashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const { organization, memberships } = useOrganization();

  // 상태
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 대시보드 데이터 로드
  const loadDashboard = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await authClient.api.get('/dashboard', {
        params: {
          organizationId: organization?.id,
        },
      });
      setDashboardData(response.data);
    } catch {
      // 대시보드 API가 없으면 기본 데이터 사용
      setDashboardData({
        recentPosts: [],
        activeCampaigns: [],
        myEnrollments: [],
        stats: {
          forumPosts: 0,
          forumComments: 0,
          coursesCompleted: 0,
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, organization?.id]);

  // 초기 로드
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // 비로그인 상태
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* 히어로 */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
          <div className="max-w-6xl mx-auto px-4 py-16">
            <div className="text-center">
              <span className="text-6xl mb-4 block">💊</span>
              <h1 className="text-4xl font-bold mb-4">약사회 커뮤니티</h1>
              <p className="text-xl text-blue-100 mb-8">
                약사 회원을 위한 포럼, 공동구매, 교육 플랫폼
              </p>
              <div className="flex justify-center gap-4">
                <Link
                  to="/login"
                  className="px-6 py-3 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors"
                >
                  로그인
                </Link>
                <Link
                  to="/register"
                  className="px-6 py-3 bg-blue-700 text-white font-medium rounded-lg hover:bg-blue-800 transition-colors"
                >
                  회원가입
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 기능 소개 */}
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <span className="text-4xl mb-4 block">💬</span>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">커뮤니티</h3>
              <p className="text-gray-600">
                약사 회원들과 정보를 공유하고 소통하세요
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <span className="text-4xl mb-4 block">📚</span>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">교육</h3>
              <p className="text-gray-600">
                전문 교육 과정으로 역량을 강화하세요
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <PageLoading message="대시보드를 불러오는 중..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                안녕하세요, {user?.name || user?.email}님!
              </h1>
              <p className="text-gray-600 mt-1">오늘도 좋은 하루 되세요</p>
            </div>
            <OrganizationSelector />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* 조직 정보 */}
        {organization && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 mb-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <OrganizationBadge organization={organization} />
                </div>
                <h2 className="text-xl font-bold">{organization.name}</h2>
                <p className="text-blue-100 text-sm mt-1">
                  {organization.path.split('/').filter(Boolean).join(' > ')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-blue-100 text-sm">소속 조직</p>
                <p className="text-2xl font-bold">{memberships.length}개</p>
              </div>
            </div>
          </div>
        )}

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">작성 글</p>
            <p className="text-2xl font-bold text-gray-900">
              {dashboardData?.stats.forumPosts || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">작성 댓글</p>
            <p className="text-2xl font-bold text-gray-900">
              {dashboardData?.stats.forumComments || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">완료한 과정</p>
            <p className="text-2xl font-bold text-gray-900">
              {dashboardData?.stats.coursesCompleted || 0}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 바로가기 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">바로가기</h3>
            <div className="space-y-3">
              <Link
                to="/forum"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-2xl">💬</span>
                <div>
                  <p className="font-medium text-gray-900">커뮤니티</p>
                  <p className="text-sm text-gray-500">게시글 보기 및 작성</p>
                </div>
              </Link>
              <Link
                to="/lms"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-2xl">📚</span>
                <div>
                  <p className="font-medium text-gray-900">내 학습</p>
                  <p className="text-sm text-gray-500">수강 중인 과정 보기</p>
                </div>
              </Link>
            </div>
          </div>

          {/* 최근 게시글 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">최근 게시글</h3>
              <Link to="/forum" className="text-sm text-blue-600 hover:underline">
                더보기
              </Link>
            </div>
            {dashboardData?.recentPosts && dashboardData.recentPosts.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.recentPosts.slice(0, 5).map((post) => (
                  <Link
                    key={post.id}
                    to={`/forum/post/${post.slug}`}
                    className="block p-2 rounded hover:bg-gray-50 transition-colors"
                  >
                    <p className="text-sm text-gray-900 truncate">{post.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">게시글이 없습니다</p>
            )}
          </div>

          {/* 진행 중인 학습 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">진행 중인 학습</h3>
              <Link to="/lms" className="text-sm text-blue-600 hover:underline">
                더보기
              </Link>
            </div>
            {dashboardData?.myEnrollments && dashboardData.myEnrollments.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.myEnrollments.slice(0, 3).map((enrollment) => (
                  <Link
                    key={enrollment.id}
                    to={`/lms/course/${enrollment.courseId}`}
                    className="block p-2 rounded hover:bg-gray-50 transition-colors"
                  >
                    <p className="text-sm text-gray-900 truncate">{enrollment.courseTitle}</p>
                    <div className="mt-1">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>진도율</span>
                        <span>{enrollment.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${enrollment.progress}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">수강 중인 과정이 없습니다</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
