/**
 * LmsMemberDashboard
 *
 * 약사 회원용 LMS 대시보드
 * - 필수 교육 이수율
 * - 총 평점 / 연도별 평점
 * - 필수 교육 미이수 강좌 리스트 (Top 3)
 * - 최근 학습 강좌
 * - 면허 정보 요약
 * - 알림 (필수 교육 마감 등)
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import { PageHeader, PageLoading, EmptyState } from '@/components/common';
import { RequiredCourseCard, LicenseProfileCard, CreditSummaryCard } from '@/components/lms-yaksa';
import type { MemberDashboardData } from '@/lib/api/lmsYaksaMember';

export function LmsMemberDashboard() {
  const [dashboardData, setDashboardData] = useState<MemberDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 대시보드 데이터 로드
      const response = await authClient.api.get('/lms/yaksa/member/dashboard');
      setDashboardData(response.data);
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      setError('대시보드 정보를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (isLoading) {
    return <PageLoading message="대시보드 정보를 불러오는 중..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader
          title="약사 교육 대시보드"
          subtitle="필수 교육 및 평점 관리"
          breadcrumb={[
            { label: '홈', href: '/' },
            { label: '회원', href: '/member' },
            { label: '교육 대시보드' },
          ]}
        />
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
            <button
              type="button"
              onClick={loadDashboard}
              className="ml-4 text-red-600 underline hover:no-underline"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 필수 교육 미이수 강좌 (Top 3)
  const pendingRequiredCourses = dashboardData?.pendingAssignments
    ?.filter((a) => a.isMandatory && !a.isCompleted)
    .slice(0, 3) || [];

  // 최근 학습 강좌
  const recentCourses = dashboardData?.recentEnrollments?.slice(0, 3) || [];

  // 알림 생성
  const notifications = generateNotifications(dashboardData);

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="약사 교육 대시보드"
        subtitle="필수 교육 및 평점 관리"
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '회원', href: '/member' },
          { label: '교육 대시보드' },
        ]}
      />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* 알림 섹션 */}
        {notifications.length > 0 && (
          <div className="mb-6 space-y-2">
            {notifications.map((notification, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-4 rounded-lg border ${
                  notification.type === 'warning'
                    ? 'bg-orange-50 border-orange-200 text-orange-800'
                    : notification.type === 'error'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}
              >
                <span className="text-xl">{notification.icon}</span>
                <span className="flex-1">{notification.message}</span>
                {notification.action && (
                  <Link
                    to={notification.action.href}
                    className="text-sm font-medium underline hover:no-underline"
                  >
                    {notification.action.label}
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 상단 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* 필수 교육 이수율 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">필수 교육 이수율</span>
              <span className="text-2xl">📊</span>
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {dashboardData?.statistics?.completionRate?.toFixed(0) || 0}%
            </div>
            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${dashboardData?.statistics?.completionRate || 0}%` }}
              />
            </div>
          </div>

          {/* 총 누적 평점 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">총 누적 평점</span>
              <span className="text-2xl">🏆</span>
            </div>
            <div className="text-3xl font-bold text-green-600">
              {dashboardData?.creditSummary?.totalCredits?.toFixed(1) || '0.0'}
            </div>
            <p className="text-xs text-gray-500 mt-1">전체 취득 평점</p>
          </div>

          {/* 당해년도 평점 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">당해년도 평점</span>
              <span className="text-2xl">📅</span>
            </div>
            <div className="text-3xl font-bold text-purple-600">
              {dashboardData?.creditSummary?.currentYearCredits?.toFixed(1) || '0.0'}
            </div>
            <p className="text-xs text-gray-500 mt-1">{new Date().getFullYear()}년 취득</p>
          </div>

          {/* 미이수 필수 교육 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">미이수 필수 교육</span>
              <span className="text-2xl">⚠️</span>
            </div>
            <div className={`text-3xl font-bold ${
              (dashboardData?.statistics?.pendingCount || 0) > 0 ? 'text-orange-600' : 'text-gray-400'
            }`}>
              {dashboardData?.statistics?.pendingCount || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">이수 대기 중</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 좌측: 면허 정보 & 평점 현황 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 면허 정보 */}
            {dashboardData?.licenseProfile && (
              <LicenseProfileCard
                profile={dashboardData.licenseProfile}
                showDetails
              />
            )}

            {/* 평점 현황 */}
            {dashboardData?.creditSummary && (
              <CreditSummaryCard
                summary={dashboardData.creditSummary}
                showChart
              />
            )}
          </div>

          {/* 우측: 필수 교육 & 최근 학습 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 필수 교육 미이수 */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">필수 교육 미이수</h3>
                <Link
                  to="/member/lms/required-courses"
                  className="text-sm text-blue-600 hover:underline"
                >
                  전체 보기 →
                </Link>
              </div>

              {pendingRequiredCourses.length === 0 ? (
                <EmptyState
                  icon="✅"
                  title="모든 필수 교육을 이수했습니다"
                  description="훌륭합니다! 계속해서 학습을 이어가세요."
                />
              ) : (
                <div className="space-y-3">
                  {pendingRequiredCourses.map((assignment) => (
                    <RequiredCourseCard
                      key={assignment.id}
                      assignment={assignment}
                      onStartCourse={(courseId) => {
                        window.location.href = `/lms/course/${courseId}`;
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 최근 학습 */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">최근 학습</h3>
                <Link
                  to="/lms/my-courses"
                  className="text-sm text-blue-600 hover:underline"
                >
                  전체 보기 →
                </Link>
              </div>

              {recentCourses.length === 0 ? (
                <EmptyState
                  icon="📚"
                  title="학습 기록이 없습니다"
                  description="새로운 과정을 시작해보세요."
                  action={
                    <Link
                      to="/lms/courses"
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                    >
                      과정 둘러보기
                    </Link>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {recentCourses.map((enrollment) => (
                    <Link
                      key={enrollment.id}
                      to={`/lms/course/${enrollment.courseId}`}
                      className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-16 h-12 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                        {enrollment.course?.thumbnailUrl ? (
                          <img
                            src={enrollment.course.thumbnailUrl}
                            alt={enrollment.course.title}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <span className="text-xl">📖</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {enrollment.course?.title || '강좌'}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600"
                              style={{ width: `${enrollment.progressPercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {enrollment.progressPercent}%
                          </span>
                        </div>
                      </div>
                      <span className="text-blue-600 text-sm font-medium flex-shrink-0">
                        이어서 →
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 빠른 메뉴 */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/member/lms/required-courses"
            className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <span className="text-2xl">📋</span>
            <div>
              <h4 className="font-medium text-gray-900">필수 교육</h4>
              <p className="text-xs text-gray-500">필수 이수 강좌 목록</p>
            </div>
          </Link>
          <Link
            to="/member/lms/credits"
            className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <span className="text-2xl">🏅</span>
            <div>
              <h4 className="font-medium text-gray-900">평점 관리</h4>
              <p className="text-xs text-gray-500">평점 현황 및 내역</p>
            </div>
          </Link>
          <Link
            to="/member/lms/license"
            className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <span className="text-2xl">🪪</span>
            <div>
              <h4 className="font-medium text-gray-900">면허 정보</h4>
              <p className="text-xs text-gray-500">면허 및 갱신 현황</p>
            </div>
          </Link>
          <Link
            to="/member/lms/assignments"
            className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <span className="text-2xl">📚</span>
            <div>
              <h4 className="font-medium text-gray-900">배정된 강좌</h4>
              <p className="text-xs text-gray-500">전체 배정 강좌</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

// 알림 타입
interface Notification {
  type: 'info' | 'warning' | 'error';
  icon: string;
  message: string;
  action?: {
    label: string;
    href: string;
  };
}

// 알림 생성 함수
function generateNotifications(data: MemberDashboardData | null): Notification[] {
  if (!data) return [];

  const notifications: Notification[] = [];

  // 면허 갱신 필요
  if (data.licenseProfile?.isRenewalRequired) {
    notifications.push({
      type: 'error',
      icon: '⚠️',
      message: '면허 갱신이 필요합니다. 필수 교육을 이수해주세요.',
      action: {
        label: '필수 교육 보기',
        href: '/member/lms/required-courses',
      },
    });
  }

  // 면허 만료 임박 (90일 이내)
  if (data.licenseProfile?.licenseExpiresAt) {
    const expiresAt = new Date(data.licenseProfile.licenseExpiresAt);
    const daysUntilExpiry = Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry > 0 && daysUntilExpiry <= 90) {
      notifications.push({
        type: 'warning',
        icon: '📅',
        message: `면허 만료까지 ${daysUntilExpiry}일 남았습니다.`,
        action: {
          label: '면허 정보 확인',
          href: '/member/lms/license',
        },
      });
    }
  }

  // 마감 임박 필수 교육
  const urgentAssignments = data.pendingAssignments?.filter((a) => {
    if (!a.dueDate || a.isCompleted) return false;
    const daysUntilDue = Math.floor(
      (new Date(a.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilDue > 0 && daysUntilDue <= 7;
  });

  if (urgentAssignments && urgentAssignments.length > 0) {
    notifications.push({
      type: 'warning',
      icon: '⏰',
      message: `${urgentAssignments.length}개의 필수 교육 마감이 7일 이내입니다.`,
      action: {
        label: '확인하기',
        href: '/member/lms/required-courses',
      },
    });
  }

  // 기한 초과 필수 교육
  const overdueAssignments = data.pendingAssignments?.filter((a) => {
    if (!a.dueDate || a.isCompleted) return false;
    return new Date(a.dueDate) < new Date();
  });

  if (overdueAssignments && overdueAssignments.length > 0) {
    notifications.push({
      type: 'error',
      icon: '🚨',
      message: `${overdueAssignments.length}개의 필수 교육이 기한을 초과했습니다.`,
      action: {
        label: '지금 이수하기',
        href: '/member/lms/required-courses',
      },
    });
  }

  return notifications;
}

export default LmsMemberDashboard;
