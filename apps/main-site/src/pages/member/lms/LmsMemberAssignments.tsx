/**
 * LmsMemberAssignments
 *
 * 약사 회원용 배정 강좌 페이지
 * - 전체 배정 강좌 목록
 * - 상태별 필터링
 * - 마감일/진행률 표시
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import { PageHeader, PageLoading, EmptyState } from '@/components/common';
import { RequiredCourseCard } from '@/components/lms-yaksa';
import type { CourseAssignment } from '@/lib/api/lmsYaksaMember';

type FilterStatus = 'all' | 'pending' | 'in_progress' | 'completed' | 'mandatory';
type SortBy = 'dueDate' | 'progress' | 'assignedAt';

export function LmsMemberAssignments() {
  const [assignments, setAssignments] = useState<CourseAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortBy>('dueDate');

  const loadAssignments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authClient.api.get('/lms/yaksa/member/assignments');
      const data = response.data.items || response.data || [];
      setAssignments(data);
    } catch (err: any) {
      console.error('Failed to load assignments:', err);
      setError('배정 강좌 정보를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  // 통계 계산
  const statistics = {
    total: assignments.length,
    pending: assignments.filter((a) => a.status === 'pending').length,
    inProgress: assignments.filter((a) => a.status === 'in_progress').length,
    completed: assignments.filter((a) => a.isCompleted).length,
    mandatory: assignments.filter((a) => a.isMandatory).length,
  };

  // 필터링
  const filteredAssignments = assignments.filter((assignment) => {
    switch (filter) {
      case 'pending':
        return assignment.status === 'pending';
      case 'in_progress':
        return assignment.status === 'in_progress';
      case 'completed':
        return assignment.isCompleted;
      case 'mandatory':
        return assignment.isMandatory;
      default:
        return true;
    }
  });

  // 정렬
  const sortedAssignments = [...filteredAssignments].sort((a, b) => {
    switch (sortBy) {
      case 'dueDate':
        // 완료된 것은 뒤로
        if (a.isCompleted && !b.isCompleted) return 1;
        if (!a.isCompleted && b.isCompleted) return -1;
        // 마감일 기준
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        return 0;

      case 'progress':
        return b.progressPercent - a.progressPercent;

      case 'assignedAt':
        return new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime();

      default:
        return 0;
    }
  });

  const handleStartCourse = (courseId: string) => {
    window.location.href = `/lms/course/${courseId}`;
  };

  if (isLoading) {
    return <PageLoading message="배정 강좌 정보를 불러오는 중..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="배정된 강좌"
        subtitle="전체 배정 강좌 목록"
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '회원', href: '/member' },
          { label: '교육 대시보드', href: '/member/lms/dashboard' },
          { label: '배정된 강좌' },
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
            {/* 통계 요약 */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`p-4 rounded-lg border transition-all text-left ${
                  filter === 'all'
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="text-xs text-gray-500 mb-1">전체</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
              </button>
              <button
                type="button"
                onClick={() => setFilter('mandatory')}
                className={`p-4 rounded-lg border transition-all text-left ${
                  filter === 'mandatory'
                    ? 'bg-red-100 border-red-400'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="text-xs text-gray-500 mb-1">필수</p>
                <p className="text-2xl font-bold text-red-600">{statistics.mandatory}</p>
              </button>
              <button
                type="button"
                onClick={() => setFilter('pending')}
                className={`p-4 rounded-lg border transition-all text-left ${
                  filter === 'pending'
                    ? 'bg-gray-100 border-gray-400'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="text-xs text-gray-500 mb-1">대기</p>
                <p className="text-2xl font-bold text-gray-600">{statistics.pending}</p>
              </button>
              <button
                type="button"
                onClick={() => setFilter('in_progress')}
                className={`p-4 rounded-lg border transition-all text-left ${
                  filter === 'in_progress'
                    ? 'bg-blue-100 border-blue-400'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="text-xs text-gray-500 mb-1">진행중</p>
                <p className="text-2xl font-bold text-blue-600">{statistics.inProgress}</p>
              </button>
              <button
                type="button"
                onClick={() => setFilter('completed')}
                className={`p-4 rounded-lg border transition-all text-left ${
                  filter === 'completed'
                    ? 'bg-green-100 border-green-400'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="text-xs text-gray-500 mb-1">완료</p>
                <p className="text-2xl font-bold text-green-600">{statistics.completed}</p>
              </button>
            </div>

            {/* 정렬 옵션 */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">정렬:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="dueDate">마감일순</option>
                    <option value="progress">진행률순</option>
                    <option value="assignedAt">배정일순</option>
                  </select>
                </div>
                <div className="text-sm text-gray-500">
                  {sortedAssignments.length}개 강좌
                </div>
              </div>
            </div>

            {/* 강좌 목록 */}
            {sortedAssignments.length === 0 ? (
              <EmptyState
                icon="📚"
                title={
                  filter === 'all'
                    ? '배정된 강좌가 없습니다'
                    : '해당 조건의 강좌가 없습니다'
                }
                description={
                  filter === 'all'
                    ? '아직 배정된 강좌가 없습니다.'
                    : '다른 필터 조건을 선택해보세요.'
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
                  ) : (
                    <Link
                      to="/lms/courses"
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                    >
                      강좌 둘러보기
                    </Link>
                  )
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

            {/* 하단 안내 */}
            {sortedAssignments.length > 0 && (
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">💡</span>
                  <div>
                    <h4 className="font-medium text-blue-800">학습 안내</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      필수 교육은 마감일 전에 반드시 이수해야 합니다. 기한 초과 시 면허 갱신에
                      영향을 줄 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default LmsMemberAssignments;
