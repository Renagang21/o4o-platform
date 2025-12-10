/**
 * LmsMemberRequiredCourses
 *
 * 약사 회원용 필수 교육 페이지
 * - 필수 교육 목록
 * - 진행 상태별 필터링
 * - 마감일 기준 정렬
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import { PageHeader, PageLoading, EmptyState } from '@/components/common';
import { RequiredCourseCard } from '@/components/lms-yaksa';
import type { CourseAssignment } from '@/lib/api/lmsYaksaMember';

type FilterStatus = 'all' | 'pending' | 'in_progress' | 'completed' | 'overdue';

export function LmsMemberRequiredCourses() {
  const [assignments, setAssignments] = useState<CourseAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [statistics, setStatistics] = useState<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
  } | null>(null);

  const loadAssignments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authClient.api.get('/lms/yaksa/member/assignments', {
        params: { mandatory: true },
      });

      const data = response.data.items || response.data || [];
      setAssignments(data);

      // 통계 계산
      const now = new Date();
      const stats = {
        total: data.length,
        pending: data.filter((a: CourseAssignment) => a.status === 'pending').length,
        inProgress: data.filter((a: CourseAssignment) => a.status === 'in_progress').length,
        completed: data.filter((a: CourseAssignment) => a.isCompleted).length,
        overdue: data.filter(
          (a: CourseAssignment) => a.dueDate && new Date(a.dueDate) < now && !a.isCompleted
        ).length,
      };
      setStatistics(stats);
    } catch (err: any) {
      console.error('Failed to load required courses:', err);
      setError('필수 교육 정보를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  // 필터링된 목록
  const filteredAssignments = assignments.filter((assignment) => {
    const now = new Date();
    const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < now && !assignment.isCompleted;

    switch (filter) {
      case 'pending':
        return assignment.status === 'pending';
      case 'in_progress':
        return assignment.status === 'in_progress';
      case 'completed':
        return assignment.isCompleted;
      case 'overdue':
        return isOverdue;
      default:
        return true;
    }
  });

  // 마감일 기준 정렬 (가까운 순)
  const sortedAssignments = [...filteredAssignments].sort((a, b) => {
    // 완료된 것은 뒤로
    if (a.isCompleted && !b.isCompleted) return 1;
    if (!a.isCompleted && b.isCompleted) return -1;

    // 마감일 기준 정렬
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;

    return 0;
  });

  const handleStartCourse = (courseId: string) => {
    window.location.href = `/lms/course/${courseId}`;
  };

  if (isLoading) {
    return <PageLoading message="필수 교육 정보를 불러오는 중..." />;
  }

  // 이수율 계산
  const completionRate = statistics
    ? statistics.total > 0
      ? Math.round((statistics.completed / statistics.total) * 100)
      : 100
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="필수 교육"
        subtitle="필수 이수 강좌 목록"
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '회원', href: '/member' },
          { label: '교육 대시보드', href: '/member/lms/dashboard' },
          { label: '필수 교육' },
        ]}
        actions={
          <Link
            to="/member/lms/dashboard"
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            ← 대시보드로
          </Link>
        }
      />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
            <button
              type="button"
              onClick={loadAssignments}
              className="ml-4 text-red-600 underline hover:no-underline"
            >
              다시 시도
            </button>
          </div>
        ) : (
          <>
            {/* 이수율 진행 바 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">전체 이수율</h3>
                  <p className="text-sm text-gray-500">
                    {statistics?.completed || 0}개 완료 / {statistics?.total || 0}개 전체
                  </p>
                </div>
                <div className="text-4xl font-bold text-blue-600">{completionRate}%</div>
              </div>
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    completionRate === 100 ? 'bg-green-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              {completionRate === 100 && (
                <p className="mt-3 text-sm text-green-600 font-medium">
                  ✅ 모든 필수 교육을 이수하셨습니다!
                </p>
              )}
            </div>

            {/* 통계 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`p-4 rounded-lg border transition-all ${
                  filter === 'all'
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="text-xs text-gray-500 mb-1">전체</p>
                <p className="text-2xl font-bold text-gray-900">{statistics?.total || 0}</p>
              </button>
              <button
                type="button"
                onClick={() => setFilter('pending')}
                className={`p-4 rounded-lg border transition-all ${
                  filter === 'pending'
                    ? 'bg-gray-100 border-gray-400'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="text-xs text-gray-500 mb-1">대기</p>
                <p className="text-2xl font-bold text-gray-600">{statistics?.pending || 0}</p>
              </button>
              <button
                type="button"
                onClick={() => setFilter('in_progress')}
                className={`p-4 rounded-lg border transition-all ${
                  filter === 'in_progress'
                    ? 'bg-blue-100 border-blue-400'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="text-xs text-gray-500 mb-1">진행중</p>
                <p className="text-2xl font-bold text-blue-600">{statistics?.inProgress || 0}</p>
              </button>
              <button
                type="button"
                onClick={() => setFilter('completed')}
                className={`p-4 rounded-lg border transition-all ${
                  filter === 'completed'
                    ? 'bg-green-100 border-green-400'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="text-xs text-gray-500 mb-1">완료</p>
                <p className="text-2xl font-bold text-green-600">{statistics?.completed || 0}</p>
              </button>
              <button
                type="button"
                onClick={() => setFilter('overdue')}
                className={`p-4 rounded-lg border transition-all ${
                  filter === 'overdue'
                    ? 'bg-red-100 border-red-400'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="text-xs text-gray-500 mb-1">기한 초과</p>
                <p className="text-2xl font-bold text-red-600">{statistics?.overdue || 0}</p>
              </button>
            </div>

            {/* 필수 교육 목록 */}
            {sortedAssignments.length === 0 ? (
              <EmptyState
                icon={filter === 'completed' ? '✅' : '📚'}
                title={
                  filter === 'completed'
                    ? '완료된 교육이 없습니다'
                    : filter === 'overdue'
                    ? '기한 초과된 교육이 없습니다'
                    : '필수 교육이 없습니다'
                }
                description={
                  filter === 'all'
                    ? '현재 배정된 필수 교육이 없습니다.'
                    : '해당 조건의 교육이 없습니다.'
                }
                action={
                  filter !== 'all' ? (
                    <button
                      type="button"
                      onClick={() => setFilter('all')}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                    >
                      전체 보기
                    </button>
                  ) : undefined
                }
              />
            ) : (
              <div className="space-y-4">
                {sortedAssignments.map((assignment) => (
                  <RequiredCourseCard
                    key={assignment.id}
                    assignment={assignment}
                    onStartCourse={handleStartCourse}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default LmsMemberRequiredCourses;
