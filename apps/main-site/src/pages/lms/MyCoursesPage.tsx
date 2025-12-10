/**
 * MyCoursesPage
 *
 * LMS 내 수강 과정 목록 페이지
 * - 등록된 과정 표시
 * - 진도율 표시
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import { useOrganization } from '@/context';
import { PageHeader, PageLoading, EmptyState } from '@/components/common';

// 과정 타입
interface Course {
  id: string;
  title: string;
  slug: string;
  description?: string;
  thumbnailUrl?: string;
  instructorName?: string;
  organizationId?: string;
  organization?: {
    id: string;
    name: string;
  };
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  duration?: number; // 분 단위
  lessonCount: number;
  enrollmentCount: number;
  isPublished: boolean;
  createdAt: string;
}

// 수강 정보 타입
interface Enrollment {
  id: string;
  courseId: string;
  course: Course;
  userId: string;
  status: 'active' | 'completed' | 'expired';
  progress: number; // 0-100
  completedLessons: number;
  totalLessons: number;
  startedAt: string;
  completedAt?: string;
  lastAccessedAt?: string;
}

export function MyCoursesPage() {
  const { organization, getOrganizationId } = useOrganization();

  // 상태
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  // 수강 목록 로드
  const loadEnrollments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const orgId = getOrganizationId();
      const params = new URLSearchParams();

      if (orgId) params.append('organizationId', orgId);
      if (filter !== 'all') params.append('status', filter);

      const response = await authClient.api.get(`/lms/my-courses?${params}`);
      setEnrollments(response.data.enrollments || response.data || []);
    } catch (err: any) {
      console.error('Failed to load enrollments:', err);
      setError('수강 정보를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [getOrganizationId, filter]);

  // 초기 로드
  useEffect(() => {
    loadEnrollments();
  }, [loadEnrollments, organization?.id]);

  // 필터링된 수강 목록
  const filteredEnrollments = enrollments.filter((enrollment) => {
    if (filter === 'all') return true;
    return enrollment.status === filter;
  });

  if (isLoading) {
    return <PageLoading message="수강 정보를 불러오는 중..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="내 학습"
        subtitle={organization ? `${organization.name} 교육` : '수강 중인 과정'}
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '내 학습' },
        ]}
        actions={
          <Link
            to="/lms/courses"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            과정 둘러보기
          </Link>
        }
      />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500 mb-1">수강 중</div>
            <div className="text-2xl font-bold text-blue-600">
              {enrollments.filter((e) => e.status === 'active').length}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500 mb-1">완료</div>
            <div className="text-2xl font-bold text-green-600">
              {enrollments.filter((e) => e.status === 'completed').length}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500 mb-1">전체 진도율</div>
            <div className="text-2xl font-bold text-gray-900">
              {enrollments.length > 0
                ? Math.round(
                    enrollments.reduce((sum, e) => sum + e.progress, 0) / enrollments.length
                  )
                : 0}
              %
            </div>
          </div>
        </div>

        {/* 필터 */}
        <div className="flex items-center gap-2 mb-6">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            전체 ({enrollments.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('active')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              filter === 'active'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            수강 중 ({enrollments.filter((e) => e.status === 'active').length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              filter === 'completed'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            완료 ({enrollments.filter((e) => e.status === 'completed').length})
          </button>
        </div>

        {/* 수강 목록 */}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
          </div>
        ) : filteredEnrollments.length === 0 ? (
          <EmptyState
            icon="📚"
            title="수강 중인 과정이 없습니다"
            description="새로운 과정을 찾아 수강 신청해보세요."
            action={
              <Link
                to="/lms/courses"
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                과정 둘러보기
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredEnrollments.map((enrollment) => (
              <EnrollmentCard key={enrollment.id} enrollment={enrollment} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 수강 카드 컴포넌트
interface EnrollmentCardProps {
  enrollment: Enrollment;
}

function EnrollmentCard({ enrollment }: EnrollmentCardProps) {
  const { course } = enrollment;

  const difficultyLabels = {
    beginner: '초급',
    intermediate: '중급',
    advanced: '고급',
  };

  const difficultyColors = {
    beginner: 'bg-green-100 text-green-800',
    intermediate: 'bg-yellow-100 text-yellow-800',
    advanced: 'bg-red-100 text-red-800',
  };

  return (
    <Link
      to={`/lms/course/${course.id}`}
      className="block bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
    >
      <div className="flex flex-col sm:flex-row">
        {/* 썸네일 */}
        <div className="sm:w-64 flex-shrink-0">
          <div className="aspect-video sm:aspect-[4/3] bg-gray-100">
            {course.thumbnailUrl ? (
              <img
                src={course.thumbnailUrl}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-4xl">📚</span>
              </div>
            )}
          </div>
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {/* 배지 */}
              <div className="flex items-center gap-2 mb-2">
                {enrollment.status === 'completed' && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                    완료
                  </span>
                )}
                {course.difficulty && (
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded ${
                      difficultyColors[course.difficulty]
                    }`}
                  >
                    {difficultyLabels[course.difficulty]}
                  </span>
                )}
                {course.category && (
                  <span className="text-xs text-gray-500">{course.category}</span>
                )}
              </div>

              {/* 제목 */}
              <h3 className="text-lg font-semibold text-gray-900 mb-1 hover:text-blue-600">
                {course.title}
              </h3>

              {/* 설명 */}
              {course.description && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {course.description}
                </p>
              )}

              {/* 메타 정보 */}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                {course.instructorName && <span>강사: {course.instructorName}</span>}
                <span>{course.lessonCount}개 강의</span>
                {enrollment.lastAccessedAt && (
                  <span>
                    마지막 학습:{' '}
                    {new Date(enrollment.lastAccessedAt).toLocaleDateString('ko-KR')}
                  </span>
                )}
              </div>
            </div>

            {/* 진도율 */}
            <div className="text-right flex-shrink-0">
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {enrollment.progress}%
              </div>
              <div className="text-xs text-gray-500">
                {enrollment.completedLessons}/{enrollment.totalLessons} 강의
              </div>
            </div>
          </div>

          {/* 진행 바 */}
          <div className="mt-4">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  enrollment.progress >= 100 ? 'bg-green-500' : 'bg-blue-600'
                }`}
                style={{ width: `${enrollment.progress}%` }}
              />
            </div>
          </div>

          {/* 이어서 학습 버튼 */}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {enrollment.status === 'completed'
                ? `${new Date(enrollment.completedAt!).toLocaleDateString('ko-KR')} 완료`
                : `${new Date(enrollment.startedAt).toLocaleDateString('ko-KR')} 시작`}
            </span>
            <span className="px-4 py-2 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg">
              {enrollment.status === 'completed' ? '복습하기' : '이어서 학습'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default MyCoursesPage;
