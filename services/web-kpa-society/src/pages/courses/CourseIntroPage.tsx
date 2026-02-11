/**
 * CourseIntroPage - Course 공개 소개 페이지
 *
 * WO-CONTENT-COURSE-INTRO-PAGE-UI-DESIGN-V1
 *
 * Course를 플랫폼 콘텐츠로 노출하는 소개 페이지.
 * - /courses/:courseId 경로
 * - 미인증: 로그인 유도
 * - 인증: 강좌 소개 + CTA
 * - Core/DB/API 변경 없음, UI 레이어만
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';
import { lmsApi } from '../../api';
import { useAuth } from '../../contexts';
import { useAuthModal } from '../../contexts/LoginModalContext';
import { colors, typography } from '../../styles/theme';
import type { Course, Lesson, Enrollment } from '../../types';

const LESSON_TYPE_ICONS: Record<string, string> = {
  video: '🎬',
  article: '📄',
  quiz: '❓',
  assignment: '📝',
  live: '🔴',
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: '입문',
  intermediate: '중급',
  advanced: '고급',
};

export function CourseIntroPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { openLoginModal } = useAuthModal();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonsAvailable, setLessonsAvailable] = useState(true);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  const loadData = useCallback(async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      setError(null);

      // 1. Course 데이터 (필수)
      const courseRes = await lmsApi.getCourse(courseId);
      setCourse(courseRes.data);

      // 2. Lessons (별도 try — 유료 미등록 시 403 가능)
      try {
        const lessonsRes = await lmsApi.getLessons(courseId);
        setLessons(Array.isArray(lessonsRes.data) ? lessonsRes.data : []);
        setLessonsAvailable(true);
      } catch {
        setLessons([]);
        setLessonsAvailable(false);
      }

      // 3. Enrollment (별도 try — 미등록 시 실패)
      try {
        const enrollmentRes = await lmsApi.getEnrollment(courseId);
        setEnrollment(enrollmentRes.data);
      } catch {
        setEnrollment(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '강좌 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (isAuthenticated && courseId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, courseId, loadData]);

  const handleEnroll = async () => {
    if (!courseId) return;
    try {
      setEnrolling(true);
      const res = await lmsApi.enrollCourse(courseId);
      setEnrollment(res.data);
      // 등록 성공 후 lessons 재조회
      try {
        const lessonsRes = await lmsApi.getLessons(courseId);
        setLessons(Array.isArray(lessonsRes.data) ? lessonsRes.data : []);
        setLessonsAvailable(true);
      } catch { /* ignore */ }
    } catch {
      alert('수강 신청에 실패했습니다.');
    } finally {
      setEnrolling(false);
    }
  };

  const getCTA = (): { label: string; action: () => void; disabled?: boolean } => {
    if (!course) return { label: '로딩중...', action: () => {}, disabled: true };

    const isFree = !course.isPaid;

    if (isFree) {
      return { label: '학습 시작', action: () => navigate(`/lms/course/${courseId}`) };
    }

    if (!enrollment) {
      return { label: '수강 신청', action: handleEnroll };
    }

    if (enrollment.status === 'pending') {
      return { label: '승인 대기중', action: () => {}, disabled: true };
    }

    if (enrollment.status === 'rejected') {
      return { label: '신청 거절됨', action: () => {}, disabled: true };
    }

    if (['approved', 'in_progress', 'completed'].includes(enrollment.status || '')) {
      return { label: '학습 시작', action: () => navigate(`/lms/course/${courseId}`) };
    }

    return { label: '수강 신청', action: handleEnroll };
  };

  // 미인증 상태: 로그인 유도
  if (!isAuthenticated && !loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loginPrompt}>
          <div style={styles.loginIcon}>📚</div>
          <h2 style={styles.loginTitle}>강좌 정보를 확인하려면</h2>
          <p style={styles.loginSubtitle}>로그인이 필요합니다</p>
          <div style={styles.loginActions}>
            <button style={styles.loginButton} onClick={openLoginModal}>
              로그인
            </button>
            <Link to="/lms/courses" style={styles.backLink}>
              목록으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="강좌 정보를 불러오는 중..." />;
  }

  if (error || !course) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="⚠️"
          title="강좌를 찾을 수 없습니다"
          description={error || '삭제되었거나 존재하지 않는 강좌입니다.'}
          action={{ label: '목록으로', onClick: () => navigate('/lms/courses') }}
        />
      </div>
    );
  }

  const cta = getCTA();
  const isFree = !course.isPaid;
  const durationHours = Math.floor(course.duration / 60);
  const durationMins = course.duration % 60;
  const durationText = durationHours > 0
    ? `${durationHours}시간${durationMins > 0 ? ` ${durationMins}분` : ''}`
    : `${durationMins}분`;

  return (
    <div style={styles.container}>
      <PageHeader
        title=""
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '교육', href: '/lms/courses' },
          { label: course.title },
        ]}
      />

      <div className="course-intro-layout">
        {/* Main Content */}
        <div>
          {/* A. Hero */}
          <Card padding="large">
            <div style={styles.badges}>
              <span style={styles.levelBadge}>{LEVEL_LABELS[course.level] || course.level}</span>
              {isFree ? (
                <span style={styles.freeBadge}>무료</span>
              ) : (
                <span style={styles.paidBadge}>
                  유료{course.price ? ` ₩${course.price.toLocaleString()}` : ''}
                </span>
              )}
              {course.category && (
                <span style={styles.categoryBadge}>{course.category}</span>
              )}
            </div>

            <h1 style={styles.title}>{course.title}</h1>

            <p style={styles.heroDescription}>{course.description}</p>

            <div style={styles.meta}>
              <span>👤 {course.instructorName || course.instructor?.name || '강사 미정'}</span>
              <span style={styles.metaDot}>·</span>
              <span>📖 {course.lessonCount}개 강의</span>
              <span style={styles.metaDot}>·</span>
              <span>⏱ {durationText}</span>
              {course.enrollmentCount > 0 && (
                <>
                  <span style={styles.metaDot}>·</span>
                  <span>{course.enrollmentCount}명 수강중</span>
                </>
              )}
            </div>
          </Card>

          {/* B. 강좌 개요 */}
          <Card padding="large" style={{ marginTop: '24px' }}>
            <h2 style={styles.sectionTitle}>강좌 개요</h2>
            <p style={styles.descriptionText}>{course.description}</p>
            {course.credits != null && course.credits > 0 && (
              <div style={styles.creditsInfo}>
                📜 이수 학점: {course.credits}점
              </div>
            )}
          </Card>

          {/* C. 커리큘럼 */}
          <Card padding="large" style={{ marginTop: '24px' }}>
            <h2 style={styles.sectionTitle}>
              커리큘럼 {lessonsAvailable && lessons.length > 0 && `(${lessons.length}개 강의)`}
            </h2>

            {lessonsAvailable && lessons.length > 0 ? (
              <div style={styles.lessonList}>
                {lessons
                  .sort((a, b) => a.order - b.order)
                  .map((lesson, index) => {
                    const isLessonFree = lesson.isFree || lesson.isPreview;
                    const typeIcon = LESSON_TYPE_ICONS[lesson.type || ''] || '📄';

                    return (
                      <div key={lesson.id} style={styles.lessonItem}>
                        <div style={styles.lessonNumber}>{index + 1}</div>
                        <div style={styles.lessonInfo}>
                          <div style={styles.lessonHeader}>
                            <span style={styles.lessonTypeIcon}>{typeIcon}</span>
                            <span style={styles.lessonTitle}>{lesson.title}</span>
                            {isLessonFree && (
                              <span style={styles.lessonFreeBadge}>무료</span>
                            )}
                            {!isFree && !isLessonFree && (
                              <span style={styles.lessonLockIcon}>🔒</span>
                            )}
                          </div>
                          {lesson.duration > 0 && (
                            <span style={styles.lessonDuration}>{lesson.duration}분</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div style={styles.lessonsFallback}>
                <p style={styles.lessonsFallbackText}>
                  이 강좌는 {course.lessonCount}개의 강의로 구성되어 있습니다.
                </p>
                {!isFree && !enrollment && (
                  <p style={styles.lessonsFallbackHint}>
                    수강 등록 후 상세 커리큘럼을 확인할 수 있습니다.
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* D. 강사 정보 */}
          <Card padding="large" style={{ marginTop: '24px' }}>
            <h2 style={styles.sectionTitle}>강사</h2>
            <div style={styles.instructorCard}>
              {course.instructor?.avatar ? (
                <img
                  src={course.instructor.avatar}
                  alt={course.instructorName}
                  style={styles.instructorAvatar}
                />
              ) : (
                <div style={styles.instructorAvatarPlaceholder}>👤</div>
              )}
              <span style={styles.instructorName}>
                {course.instructorName || course.instructor?.name || '강사 미정'}
              </span>
            </div>
          </Card>
        </div>

        {/* E. Sidebar */}
        <div className="course-intro-sidebar" style={styles.sidebar}>
          <Card padding="large">
            {course.thumbnail ? (
              <img src={course.thumbnail} alt={course.title} style={styles.thumbnail} />
            ) : (
              <div style={styles.thumbnailPlaceholder}>📚</div>
            )}

            {enrollment && (
              <div style={styles.enrollmentStatus}>
                <div style={styles.progressBar}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${enrollment.progress || 0}%`,
                    }}
                  />
                </div>
                <p style={styles.progressText}>진도율: {enrollment.progress || 0}%</p>
              </div>
            )}

            <button
              style={{
                ...styles.ctaButton,
                ...(cta.disabled ? styles.ctaButtonDisabled : {}),
              }}
              onClick={cta.action}
              disabled={cta.disabled || enrolling}
            >
              {enrolling ? '처리 중...' : cta.label}
            </button>

            {course.enrollmentCount > 0 && (
              <p style={styles.enrollmentCountText}>
                {course.enrollmentCount}명이 수강하고 있습니다
              </p>
            )}

            {course.tags && course.tags.length > 0 && (
              <div style={styles.tagList}>
                {course.tags.map((tag) => (
                  <span key={tag} style={styles.tag}>#{tag}</span>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// Responsive CSS injection
if (typeof document !== 'undefined') {
  const id = 'course-intro-responsive';
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      .course-intro-layout {
        display: grid;
        grid-template-columns: 1fr 320px;
        gap: 24px;
      }
      @media (max-width: 768px) {
        .course-intro-layout {
          grid-template-columns: 1fr;
        }
        .course-intro-sidebar {
          position: static !important;
          order: -1;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },

  // Login prompt
  loginPrompt: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    textAlign: 'center',
  },
  loginIcon: {
    fontSize: '64px',
    marginBottom: '24px',
  },
  loginTitle: {
    ...typography.headingL,
    color: colors.neutral900,
    margin: 0,
    marginBottom: '8px',
  },
  loginSubtitle: {
    ...typography.bodyL,
    color: colors.neutral500,
    margin: 0,
    marginBottom: '32px',
  },
  loginActions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  loginButton: {
    padding: '14px 48px',
    backgroundColor: colors.primary,
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  backLink: {
    ...typography.bodyM,
    color: colors.neutral500,
    textDecoration: 'none',
  },

  // Badges
  badges: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  levelBadge: {
    padding: '4px 12px',
    backgroundColor: colors.primary,
    color: '#ffffff',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 500,
  },
  freeBadge: {
    padding: '4px 12px',
    backgroundColor: '#ecfdf5',
    color: '#059669',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 500,
  },
  paidBadge: {
    padding: '4px 12px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 500,
  },
  categoryBadge: {
    padding: '4px 12px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    borderRadius: '4px',
    fontSize: '13px',
  },

  // Hero
  title: {
    ...typography.headingXL,
    color: colors.neutral900,
    margin: 0,
    marginBottom: '12px',
  },
  heroDescription: {
    ...typography.bodyL,
    color: colors.neutral600,
    margin: 0,
    marginBottom: '16px',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    ...typography.bodyM,
    color: colors.neutral500,
    flexWrap: 'wrap',
  },
  metaDot: {
    color: colors.neutral300,
  },

  // Description
  sectionTitle: {
    ...typography.headingM,
    color: colors.neutral900,
    margin: 0,
    marginBottom: '16px',
  },
  descriptionText: {
    ...typography.bodyL,
    color: colors.neutral700,
    lineHeight: 1.8,
    whiteSpace: 'pre-wrap',
    margin: 0,
  },
  creditsInfo: {
    marginTop: '16px',
    padding: '12px 16px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    ...typography.bodyM,
    color: colors.neutral700,
  },

  // Curriculum
  lessonList: {
    display: 'flex',
    flexDirection: 'column',
  },
  lessonItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '14px 0',
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  lessonNumber: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: colors.neutral100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral700,
    flexShrink: 0,
  },
  lessonInfo: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  lessonHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flex: 1,
  },
  lessonTypeIcon: {
    fontSize: '14px',
    flexShrink: 0,
  },
  lessonTitle: {
    ...typography.bodyM,
    color: colors.neutral800,
    fontWeight: 500,
  },
  lessonFreeBadge: {
    padding: '1px 6px',
    backgroundColor: '#ecfdf5',
    color: '#059669',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
    flexShrink: 0,
  },
  lessonLockIcon: {
    fontSize: '12px',
    flexShrink: 0,
  },
  lessonDuration: {
    ...typography.bodyS,
    color: colors.neutral500,
    flexShrink: 0,
  },
  lessonsFallback: {
    padding: '24px',
    textAlign: 'center',
  },
  lessonsFallbackText: {
    ...typography.bodyL,
    color: colors.neutral600,
    margin: 0,
    marginBottom: '8px',
  },
  lessonsFallbackHint: {
    ...typography.bodyM,
    color: colors.neutral400,
    margin: 0,
  },

  // Instructor
  instructorCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  instructorAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  instructorAvatarPlaceholder: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: colors.neutral100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  },
  instructorName: {
    ...typography.bodyL,
    color: colors.neutral800,
    fontWeight: 500,
  },

  // Sidebar
  sidebar: {
    position: 'sticky',
    top: '24px',
    height: 'fit-content',
  },
  thumbnail: {
    width: '100%',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '160px',
    backgroundColor: colors.neutral100,
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48px',
    marginBottom: '20px',
  },
  enrollmentStatus: {
    marginBottom: '16px',
  },
  progressBar: {
    height: '8px',
    backgroundColor: colors.neutral100,
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#059669',
    transition: 'width 0.3s',
  },
  progressText: {
    ...typography.bodyS,
    color: colors.neutral500,
    textAlign: 'center',
    margin: 0,
  },
  ctaButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: colors.primary,
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'center',
  },
  ctaButtonDisabled: {
    backgroundColor: colors.neutral300,
    cursor: 'not-allowed',
  },
  enrollmentCountText: {
    ...typography.bodyS,
    color: colors.neutral400,
    textAlign: 'center',
    margin: 0,
    marginTop: '12px',
  },
  tagList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '16px',
  },
  tag: {
    padding: '4px 8px',
    backgroundColor: colors.neutral50,
    color: colors.neutral500,
    borderRadius: '4px',
    fontSize: '12px',
  },
};
