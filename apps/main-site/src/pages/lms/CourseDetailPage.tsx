/**
 * CourseDetailPage
 *
 * LMS 과정 상세 페이지
 * - 과정 정보 표시
 * - 강의 목록
 * - 수강 신청/학습 시작
 */

import { useState, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import { useAuth } from '@/context';
import { PageHeader, PageLoading, EmptyState } from '@/components/common';

// 과정 타입
interface Course {
  id: string;
  title: string;
  slug: string;
  description?: string;
  content?: string;
  thumbnailUrl?: string;
  instructorName?: string;
  instructorBio?: string;
  organizationId?: string;
  organization?: {
    id: string;
    name: string;
  };
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  duration?: number;
  lessonCount: number;
  enrollmentCount: number;
  isPublished: boolean;
  isFree: boolean;
  price?: number;
  createdAt: string;
}

// 강의 타입
interface Lesson {
  id: string;
  title: string;
  slug: string;
  description?: string;
  duration?: number;
  order: number;
  type: 'video' | 'text' | 'quiz' | 'assignment';
  isFree: boolean;
  isCompleted?: boolean;
}

// 수강 정보 타입
interface Enrollment {
  id: string;
  status: 'active' | 'completed' | 'expired';
  progress: number;
  completedLessons: number;
  totalLessons: number;
  currentLessonId?: string;
}

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // 상태
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);

  // 과정 로드
  const loadCourse = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      // 과정 정보 로드
      const courseResponse = await authClient.api.get(`/lms/courses/${id}`);
      setCourse(courseResponse.data);

      // 강의 목록 로드
      const lessonsResponse = await authClient.api.get(`/lms/courses/${id}/lessons`);
      setLessons(lessonsResponse.data.lessons || lessonsResponse.data || []);

      // 수강 정보 로드 (로그인 시)
      if (isAuthenticated) {
        try {
          const enrollmentResponse = await authClient.api.get(
            `/lms/courses/${id}/my-enrollment`
          );
          setEnrollment(enrollmentResponse.data);
        } catch {
          setEnrollment(null);
        }
      }
    } catch (err: any) {
      console.error('Failed to load course:', err);
      if (err.response?.status === 404) {
        setError('과정을 찾을 수 없습니다.');
      } else {
        setError('과정을 불러오는데 실패했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, isAuthenticated]);

  // 초기 로드
  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  // 수강 신청
  const handleEnroll = async () => {
    if (!course || !isAuthenticated) {
      navigate('/login', { state: { from: `/lms/course/${id}` } });
      return;
    }

    setIsEnrolling(true);

    try {
      const response = await authClient.api.post('/lms/enroll', {
        courseId: course.id,
      });

      setEnrollment(response.data);
      alert('수강 신청이 완료되었습니다!');
    } catch (err: any) {
      console.error('Failed to enroll:', err);
      alert(err.response?.data?.message || '수강 신청에 실패했습니다.');
    } finally {
      setIsEnrolling(false);
    }
  };

  // 학습 시작/이어서 학습
  const handleStartLearning = () => {
    if (!course) return;

    const lessonId = enrollment?.currentLessonId || lessons[0]?.id;
    if (lessonId) {
      navigate(`/lms/course/${course.id}/lesson/${lessonId}`);
    }
  };

  // 시간 포맷
  const formatDuration = (minutes?: number): string => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
    }
    return `${mins}분`;
  };

  // 난이도 라벨
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

  if (isLoading) {
    return <PageLoading message="과정 정보를 불러오는 중..." />;
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader
          title="과정"
          breadcrumb={[
            { label: '홈', href: '/' },
            { label: '내 학습', href: '/lms' },
            { label: '과정' },
          ]}
        />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <EmptyState
            icon="😕"
            title={error || '과정을 찾을 수 없습니다'}
            action={
              <Link
                to="/lms"
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                돌아가기
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={course.title}
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '내 학습', href: '/lms' },
          { label: course.title },
        ]}
      />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* 왼쪽: 과정 정보 */}
          <div className="flex-1">
            {/* 히어로 */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
              <div className="aspect-video bg-gray-100">
                {course.thumbnailUrl ? (
                  <img
                    src={course.thumbnailUrl}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-6xl">📚</span>
                  </div>
                )}
              </div>
            </div>

            {/* 과정 설명 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">과정 소개</h2>

              {course.content ? (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(course.content) }}
                />
              ) : course.description ? (
                <p className="text-gray-700 whitespace-pre-wrap">{course.description}</p>
              ) : (
                <p className="text-gray-500">과정 소개가 없습니다.</p>
              )}
            </div>

            {/* 강사 정보 */}
            {course.instructorName && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">강사 소개</h2>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">👨‍🏫</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{course.instructorName}</h3>
                    {course.instructorBio && (
                      <p className="text-sm text-gray-600 mt-1">{course.instructorBio}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 강의 목록 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                강의 목록 ({lessons.length}개)
              </h2>

              {lessons.length === 0 ? (
                <p className="text-gray-500">등록된 강의가 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {lessons.map((lesson, index) => (
                    <div
                      key={lesson.id}
                      className={`flex items-center gap-4 p-3 rounded-lg ${
                        lesson.isCompleted ? 'bg-green-50' : 'bg-gray-50'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                        {lesson.isCompleted ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-sm text-gray-600">{index + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {lesson.title}
                          </span>
                          {lesson.isFree && !enrollment && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-xs rounded">
                              무료
                            </span>
                          )}
                        </div>
                        {lesson.duration && (
                          <span className="text-xs text-gray-500">
                            {formatDuration(lesson.duration)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {lesson.type === 'video' && '🎬'}
                          {lesson.type === 'text' && '📝'}
                          {lesson.type === 'quiz' && '❓'}
                          {lesson.type === 'assignment' && '📋'}
                        </span>
                        {(enrollment || lesson.isFree) && (
                          <Link
                            to={`/lms/course/${course.id}/lesson/${lesson.id}`}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            보기
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 오른쪽: 수강 카드 */}
          <div className="w-full lg:w-80 flex-shrink-0">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6">
              {/* 배지 */}
              <div className="flex items-center gap-2 mb-4">
                {course.difficulty && (
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      difficultyColors[course.difficulty]
                    }`}
                  >
                    {difficultyLabels[course.difficulty]}
                  </span>
                )}
                {course.category && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    {course.category}
                  </span>
                )}
              </div>

              {/* 제목 */}
              <h2 className="text-xl font-bold text-gray-900 mb-2">{course.title}</h2>

              {course.organization && (
                <p className="text-sm text-gray-500 mb-4">{course.organization.name}</p>
              )}

              {/* 통계 */}
              <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-200 mb-4">
                <div>
                  <div className="text-sm text-gray-500">강의 수</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {course.lessonCount}개
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">총 시간</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatDuration(course.duration)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">수강생</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {course.enrollmentCount}명
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">강사</div>
                  <div className="text-lg font-semibold text-gray-900 truncate">
                    {course.instructorName || '-'}
                  </div>
                </div>
              </div>

              {/* 수강 정보 또는 가격 */}
              {enrollment ? (
                <>
                  {/* 진도율 */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600">진도율</span>
                      <span className="font-bold text-blue-600">{enrollment.progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          enrollment.progress >= 100 ? 'bg-green-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${enrollment.progress}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1 text-right">
                      {enrollment.completedLessons}/{enrollment.totalLessons} 강의 완료
                    </div>
                  </div>

                  {/* 학습 버튼 */}
                  <button
                    type="button"
                    onClick={handleStartLearning}
                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {enrollment.progress > 0 ? '이어서 학습' : '학습 시작'}
                  </button>
                </>
              ) : (
                <>
                  {/* 가격 */}
                  <div className="mb-4">
                    {course.isFree ? (
                      <div className="text-2xl font-bold text-green-600">무료</div>
                    ) : (
                      <div className="text-2xl font-bold text-gray-900">
                        {course.price?.toLocaleString() || 0}원
                      </div>
                    )}
                  </div>

                  {/* 수강 신청 버튼 */}
                  <button
                    type="button"
                    onClick={handleEnroll}
                    disabled={isEnrolling}
                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isEnrolling ? '처리 중...' : course.isFree ? '무료 수강 신청' : '수강 신청'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 목록으로 버튼 */}
        <div className="mt-8 flex justify-center">
          <Link
            to="/lms"
            className="px-6 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            목록으로
          </Link>
        </div>
      </div>
    </div>
  );
}

export default CourseDetailPage;
