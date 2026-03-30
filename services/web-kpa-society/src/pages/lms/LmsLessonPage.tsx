/**
 * LmsLessonPage - 단계 보기 페이지
 *
 * 핵심 원칙:
 * - 이 기능은 교육이나 평가를 위한 것이 아닙니다
 * - 콘텐츠를 순서대로 안내하기 위한 도구입니다
 */

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { LoadingSpinner, EmptyState, Card } from '../../components/common';
import { lmsApi } from '../../api';
import { colors, typography } from '../../styles/theme';
import type { Course, Lesson, Enrollment } from '../../types';
import { ContentRenderer } from '@o4o/content-editor';

export function LmsLessonPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (courseId && lessonId) loadData();
  }, [courseId, lessonId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [courseRes, lessonsRes, lessonRes] = await Promise.all([
        lmsApi.getCourse(courseId!),
        lmsApi.getLessons(courseId!),
        lmsApi.getLesson(courseId!, lessonId!),
      ]);

      setCourse(courseRes.data);
      setLessons(lessonsRes.data);
      setCurrentLesson(lessonRes.data);

      try {
        const enrollmentRes = await lmsApi.getEnrollment(courseId!);
        setEnrollment(enrollmentRes.data);
      } catch {
        // 미시작 상태
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '단계를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!courseId || !lessonId) return;

    try {
      const res = await lmsApi.updateProgress(courseId, lessonId, true);
      setEnrollment(res.data);

      // 다음 레슨으로 이동
      const currentIndex = lessons.findIndex(l => l.id === lessonId);
      if (currentIndex < lessons.length - 1) {
        const nextLesson = lessons[currentIndex + 1];
        navigate(`/lms/course/${courseId}/lesson/${nextLesson.id}`);
      } else {
        toast.success('모든 단계를 완료했습니다!');
      }
    } catch (err) {
      toast.error('진도 업데이트에 실패했습니다.');
    }
  };

  if (loading) {
    return <LoadingSpinner message="단계를 불러오는 중..." />;
  }

  if (error || !course || !currentLesson) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="⚠️"
          title="단계를 찾을 수 없습니다"
          description={error || '삭제되었거나 존재하지 않는 단계입니다.'}
          action={{ label: '안내 흐름으로', onClick: () => navigate(`/lms/course/${courseId}`) }}
        />
      </div>
    );
  }

  const currentIndex = lessons.findIndex(l => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  const isCompleted = enrollment?.completedLessons?.includes(currentLesson.id);

  return (
    <div style={styles.wrapper}>
      {/* 사이드바 */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <Link to={`/lms/course/${courseId}`} style={styles.backLink}>
            ← 안내 흐름으로
          </Link>
          <h2 style={styles.courseTitle}>{course.title}</h2>
        </div>

        <div style={styles.lessonList}>
          {lessons.map((lesson, index) => {
            const isActive = lesson.id === lessonId;
            const isLessonCompleted = enrollment?.completedLessons?.includes(lesson.id);

            return (
              <Link
                key={lesson.id}
                to={`/lms/course/${courseId}/lesson/${lesson.id}`}
                style={{
                  ...styles.lessonItem,
                  ...(isActive ? styles.lessonItemActive : {}),
                }}
              >
                <span style={styles.lessonNumber}>
                  {isLessonCompleted ? '✓' : index + 1}
                </span>
                <span style={styles.lessonTitle}>{lesson.title}</span>
                <span style={styles.lessonDuration}>{lesson.duration}분</span>
              </Link>
            );
          })}
        </div>

        {enrollment && (
          <div style={styles.progressInfo}>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${enrollment.progress}%`,
                }}
              />
            </div>
            <span style={styles.progressText}>진도율: {enrollment.progress}%</span>
          </div>
        )}
      </aside>

      {/* 메인 콘텐츠 */}
      <main style={styles.main}>
        <div style={styles.lessonHeader}>
          <span style={styles.lessonOrder}>
            {currentIndex + 1} / {lessons.length}
          </span>
          <h1 style={styles.title}>{currentLesson.title}</h1>
        </div>

        {/* 비디오 영역 */}
        <div style={styles.videoContainer}>
          {currentLesson.videoUrl ? (
            <video
              style={styles.video}
              src={currentLesson.videoUrl}
              controls
              autoPlay
            />
          ) : (
            <div style={styles.videoPlaceholder}>
              <span>🎬</span>
              <p>동영상이 준비 중입니다</p>
            </div>
          )}
        </div>

        {/* 내용 */}
        {currentLesson.content && (
          <Card padding="large" style={{ marginTop: '24px' }}>
            <ContentRenderer html={currentLesson.content} style={styles.content} />
          </Card>
        )}

        {/* 네비게이션 */}
        <div style={styles.navigation}>
          {prevLesson ? (
            <Link
              to={`/lms/course/${courseId}/lesson/${prevLesson.id}`}
              style={styles.navButton}
            >
              ← 이전 단계
            </Link>
          ) : (
            <div />
          )}

          {!isCompleted && enrollment && (
            <button style={styles.completeButton} onClick={handleComplete}>
              ✓ 완료
            </button>
          )}

          {nextLesson ? (
            <Link
              to={`/lms/course/${courseId}/lesson/${nextLesson.id}`}
              style={styles.navButton}
            >
              다음 단계 →
            </Link>
          ) : (
            <Link to={`/lms/course/${courseId}`} style={styles.navButton}>
              안내 흐름으로 →
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    minHeight: '100vh',
  },
  sidebar: {
    width: '320px',
    backgroundColor: colors.neutral900,
    color: colors.white,
    padding: '20px',
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    overflowY: 'auto',
  },
  sidebarHeader: {
    marginBottom: '24px',
  },
  backLink: {
    color: colors.neutral400,
    textDecoration: 'none',
    fontSize: '14px',
  },
  courseTitle: {
    ...typography.headingS,
    color: colors.white,
    marginTop: '12px',
  },
  lessonList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  lessonItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: '8px',
    textDecoration: 'none',
    color: colors.neutral400,
    fontSize: '14px',
  },
  lessonItemActive: {
    backgroundColor: colors.primary,
    color: colors.white,
  },
  lessonNumber: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    flexShrink: 0,
  },
  lessonTitle: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  lessonDuration: {
    fontSize: '12px',
    opacity: 0.7,
  },
  progressInfo: {
    marginTop: '24px',
    padding: '16px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '8px',
  },
  progressBar: {
    height: '6px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accentGreen,
  },
  progressText: {
    fontSize: '13px',
    color: colors.neutral400,
  },
  main: {
    flex: 1,
    marginLeft: '320px',
    padding: '32px',
    maxWidth: '900px',
  },
  lessonHeader: {
    marginBottom: '24px',
  },
  lessonOrder: {
    ...typography.bodyS,
    color: colors.neutral500,
  },
  title: {
    ...typography.headingL,
    color: colors.neutral900,
    marginTop: '8px',
  },
  videoContainer: {
    aspectRatio: '16/9',
    backgroundColor: colors.neutral900,
    borderRadius: '12px',
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.white,
  },
  content: {
    ...typography.bodyL,
    color: colors.neutral700,
    lineHeight: 1.8,
  },
  navigation: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  navButton: {
    padding: '12px 24px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '14px',
  },
  completeButton: {
    padding: '12px 32px',
    backgroundColor: colors.accentGreen,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
