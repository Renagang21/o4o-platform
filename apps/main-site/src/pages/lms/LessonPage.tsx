/**
 * LessonPage
 *
 * LMS 강의 학습 페이지
 * - 강의 콘텐츠 표시
 * - 진도 업데이트
 * - 이전/다음 강의 이동
 */

import { useState, useEffect, useCallback } from 'react';
import { sanitizeHtml } from '@o4o/content-editor';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import { useAuth } from '@/context';
import { PageLoading, EmptyState } from '@/components/common';

// 강의 타입
interface Lesson {
  id: string;
  title: string;
  slug: string;
  description?: string;
  content?: string;
  videoUrl?: string;
  duration?: number;
  order: number;
  type: 'video' | 'text' | 'quiz' | 'assignment';
  isFree: boolean;
  isCompleted?: boolean;
}

// 과정 타입 (간략)
interface Course {
  id: string;
  title: string;
  slug: string;
}

// 이전/다음 강의
interface AdjacentLesson {
  id: string;
  title: string;
  order: number;
}

export function LessonPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // 상태
  const [course, setCourse] = useState<Course | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prevLesson, setPrevLesson] = useState<AdjacentLesson | null>(null);
  const [nextLesson, setNextLesson] = useState<AdjacentLesson | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  // 강의 로드
  const loadLesson = useCallback(async () => {
    if (!courseId || !lessonId) return;

    setIsLoading(true);
    setError(null);

    try {
      // 과정 정보 로드
      const courseResponse = await authClient.api.get(`/lms/courses/${courseId}`);
      setCourse(courseResponse.data);

      // 강의 정보 로드
      const lessonResponse = await authClient.api.get(
        `/lms/courses/${courseId}/lessons/${lessonId}`
      );
      setLesson(lessonResponse.data);

      // 이전/다음 강의 로드
      try {
        const adjacentResponse = await authClient.api.get(
          `/lms/courses/${courseId}/lessons/${lessonId}/adjacent`
        );
        setPrevLesson(adjacentResponse.data.prev);
        setNextLesson(adjacentResponse.data.next);
      } catch {
        setPrevLesson(null);
        setNextLesson(null);
      }

      // 진도 기록 (로그인 시)
      if (isAuthenticated) {
        try {
          await authClient.api.post(`/lms/progress`, {
            courseId,
            lessonId,
            action: 'start',
          });
        } catch {
          // 진도 기록 실패는 무시
        }
      }
    } catch (err: any) {
      console.error('Failed to load lesson:', err);
      if (err.response?.status === 404) {
        setError('강의를 찾을 수 없습니다.');
      } else if (err.response?.status === 403) {
        setError('이 강의에 접근할 권한이 없습니다. 수강 신청이 필요합니다.');
      } else {
        setError('강의를 불러오는데 실패했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [courseId, lessonId, isAuthenticated]);

  // 초기 로드
  useEffect(() => {
    loadLesson();
  }, [loadLesson]);

  // 강의 완료 처리
  const handleComplete = async () => {
    if (!courseId || !lessonId || !isAuthenticated) return;

    setIsCompleting(true);

    try {
      await authClient.api.post(`/lms/progress`, {
        courseId,
        lessonId,
        action: 'complete',
      });

      // 강의 정보 업데이트
      setLesson((prev) => (prev ? { ...prev, isCompleted: true } : prev));

      // 다음 강의로 이동
      if (nextLesson) {
        navigate(`/lms/course/${courseId}/lesson/${nextLesson.id}`);
      }
    } catch (err: any) {
      console.error('Failed to complete lesson:', err);
      alert(err.response?.data?.message || '완료 처리에 실패했습니다.');
    } finally {
      setIsCompleting(false);
    }
  };

  // 시간 포맷
  const formatDuration = (minutes?: number): string => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
    }
    return `${mins}분`;
  };

  if (isLoading) {
    return <PageLoading message="강의를 불러오는 중..." />;
  }

  if (error || !lesson || !course) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <EmptyState
          icon="😕"
          title={error || '강의를 찾을 수 없습니다'}
          action={
            <Link
              to={courseId ? `/lms/course/${courseId}` : '/lms'}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              돌아가기
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* 헤더 */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to={`/lms/course/${course.id}`}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </Link>
              <div>
                <p className="text-sm text-gray-400">{course.title}</p>
                <h1 className="text-white font-medium">{lesson.title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              {lesson.duration && <span>{formatDuration(lesson.duration)}</span>}
              {lesson.isCompleted && (
                <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded">완료</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 콘텐츠 영역 */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* 비디오 플레이어 */}
        {lesson.type === 'video' && lesson.videoUrl && (
          <div className="aspect-video bg-black rounded-lg overflow-hidden mb-6">
            <video
              src={lesson.videoUrl}
              controls
              className="w-full h-full"
              poster={`/api/lessons/${lesson.id}/thumbnail`}
            >
              <source src={lesson.videoUrl} type="video/mp4" />
              브라우저가 비디오를 지원하지 않습니다.
            </video>
          </div>
        )}

        {/* 텍스트 콘텐츠 */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">{lesson.title}</h2>

          {lesson.description && (
            <p className="text-gray-300 mb-4">{lesson.description}</p>
          )}

          {lesson.content && (
            <div
              className="prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(lesson.content) }}
            />
          )}

          {lesson.type === 'text' && !lesson.content && (
            <p className="text-gray-500">콘텐츠가 없습니다.</p>
          )}

          {lesson.type === 'quiz' && (
            <div className="p-4 bg-gray-700 rounded-lg text-center">
              <p className="text-gray-300">퀴즈 기능은 준비 중입니다.</p>
            </div>
          )}

          {lesson.type === 'assignment' && (
            <div className="p-4 bg-gray-700 rounded-lg text-center">
              <p className="text-gray-300">과제 기능은 준비 중입니다.</p>
            </div>
          )}
        </div>

        {/* 완료 버튼 */}
        {isAuthenticated && !lesson.isCompleted && (
          <div className="flex justify-center mb-6">
            <button
              type="button"
              onClick={handleComplete}
              disabled={isCompleting}
              className="px-8 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCompleting ? '처리 중...' : '학습 완료'}
            </button>
          </div>
        )}

        {/* 이전/다음 강의 네비게이션 */}
        <nav className="flex items-center justify-between">
          {prevLesson ? (
            <Link
              to={`/lms/course/${course.id}/lesson/${prevLesson.id}`}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <div className="text-left">
                <p className="text-xs text-gray-500">이전 강의</p>
                <p className="text-sm truncate max-w-[150px]">{prevLesson.title}</p>
              </div>
            </Link>
          ) : (
            <div />
          )}

          {nextLesson ? (
            <Link
              to={`/lms/course/${course.id}/lesson/${nextLesson.id}`}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <div className="text-right">
                <p className="text-xs text-gray-500">다음 강의</p>
                <p className="text-sm truncate max-w-[150px]">{nextLesson.title}</p>
              </div>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          ) : (
            <Link
              to={`/lms/course/${course.id}`}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <span>과정 완료!</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </Link>
          )}
        </nav>
      </main>
    </div>
  );
}

export default LessonPage;
