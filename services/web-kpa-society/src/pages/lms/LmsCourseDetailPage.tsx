/**
 * LmsCourseDetailPage - 과정 상세 페이지
 */

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';
import { lmsApi } from '../../api';
import { useAuth } from '../../contexts';
import { colors, typography } from '../../styles/theme';
import type { Course, Lesson, Enrollment } from '../../types';

export function LmsCourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [courseRes, lessonsRes] = await Promise.all([
        lmsApi.getCourse(id!),
        lmsApi.getLessons(id!),
      ]);

      setCourse(courseRes.data);
      setLessons(lessonsRes.data);

      // 수강 정보 확인 (로그인 시)
      if (user) {
        try {
          const enrollmentRes = await lmsApi.getEnrollment(id!);
          setEnrollment(enrollmentRes.data);
        } catch {
          // 미수강 상태
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '과정을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      setEnrolling(true);
      const res = await lmsApi.enrollCourse(id!);
      setEnrollment(res.data);
      alert('수강 신청이 완료되었습니다.');
    } catch (err) {
      alert('수강 신청에 실패했습니다.');
    } finally {
      setEnrolling(false);
    }
  };

  const getLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      beginner: '입문',
      intermediate: '중급',
      advanced: '고급',
    };
    return labels[level] || level;
  };

  if (loading) {
    return <LoadingSpinner message="과정을 불러오는 중..." />;
  }

  if (error || !course) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="⚠️"
          title="과정을 찾을 수 없습니다"
          description={error || '삭제되었거나 존재하지 않는 과정입니다.'}
          action={{ label: '목록으로', onClick: () => navigate('/lms/courses') }}
        />
      </div>
    );
  }

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

      <div style={styles.content}>
        <div style={styles.main}>
          <Card padding="large">
            <div style={styles.courseHeader}>
              <span style={styles.levelBadge}>{getLevelLabel(course.level)}</span>
              <span style={styles.categoryBadge}>{course.category}</span>
            </div>

            <h1 style={styles.title}>{course.title}</h1>

            <div style={styles.meta}>
              <span>👤 {course.instructorName}</span>
              <span>·</span>
              <span>📖 {course.lessonCount}개 강의</span>
              <span>·</span>
              <span>⏱ {Math.floor(course.duration / 60)}시간 {course.duration % 60}분</span>
              <span>·</span>
              <span>{course.enrollmentCount}명 수강</span>
            </div>

            <div style={styles.description}>
              <h2 style={styles.sectionTitle}>과정 소개</h2>
              <p style={styles.descriptionText}>{course.description}</p>
            </div>
          </Card>

          {/* 커리큘럼 */}
          <Card padding="large" style={{ marginTop: '24px' }}>
            <h2 style={styles.sectionTitle}>커리큘럼</h2>
            <div style={styles.lessonList}>
              {lessons.map((lesson, index) => {
                const isCompleted = enrollment?.completedLessons?.includes(lesson.id);
                const canAccess = enrollment || lesson.isPreview;

                return (
                  <div key={lesson.id} style={styles.lessonItem}>
                    <div style={styles.lessonNumber}>
                      {isCompleted ? '✓' : index + 1}
                    </div>
                    <div style={styles.lessonInfo}>
                      <div style={styles.lessonHeader}>
                        <span style={styles.lessonTitle}>{lesson.title}</span>
                        {lesson.isPreview && (
                          <span style={styles.previewBadge}>미리보기</span>
                        )}
                      </div>
                      <span style={styles.lessonDuration}>{lesson.duration}분</span>
                    </div>
                    {canAccess && (
                      <Link
                        to={`/lms/course/${course.id}/lesson/${lesson.id}`}
                        style={styles.lessonLink}
                      >
                        학습하기
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* 사이드바 */}
        <div style={styles.sidebar}>
          <Card padding="large">
            {course.thumbnail ? (
              <img src={course.thumbnail} alt={course.title} style={styles.thumbnail} />
            ) : (
              <div style={styles.thumbnailPlaceholder}>📚</div>
            )}

            {enrollment ? (
              <div style={styles.enrolledInfo}>
                <div style={styles.progressBar}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${enrollment.progress}%`,
                    }}
                  />
                </div>
                <p style={styles.progressText}>진도율: {enrollment.progress}%</p>
                <Link
                  to={`/lms/course/${course.id}/lesson/${lessons[0]?.id || ''}`}
                  style={styles.continueButton}
                >
                  학습 계속하기
                </Link>
              </div>
            ) : (
              <button
                style={styles.enrollButton}
                onClick={handleEnroll}
                disabled={enrolling}
              >
                {enrolling ? '신청 중...' : '수강 신청하기'}
              </button>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: '24px',
  },
  main: {},
  sidebar: {
    position: 'sticky',
    top: '24px',
    height: 'fit-content',
  },
  courseHeader: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  levelBadge: {
    padding: '4px 12px',
    backgroundColor: colors.primary,
    color: colors.white,
    borderRadius: '4px',
    fontSize: '13px',
  },
  categoryBadge: {
    padding: '4px 12px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    borderRadius: '4px',
    fontSize: '13px',
  },
  title: {
    ...typography.headingXL,
    color: colors.neutral900,
    margin: 0,
    marginBottom: '16px',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    ...typography.bodyM,
    color: colors.neutral500,
    flexWrap: 'wrap',
  },
  description: {
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
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
  },
  lessonList: {
    display: 'flex',
    flexDirection: 'column',
  },
  lessonItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 0',
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
  },
  lessonHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  lessonTitle: {
    ...typography.bodyM,
    color: colors.neutral800,
    fontWeight: 500,
  },
  previewBadge: {
    padding: '2px 6px',
    backgroundColor: colors.accentGreen,
    color: colors.white,
    borderRadius: '4px',
    fontSize: '11px',
  },
  lessonDuration: {
    ...typography.bodyS,
    color: colors.neutral500,
  },
  lessonLink: {
    padding: '6px 12px',
    backgroundColor: colors.primary,
    color: colors.white,
    textDecoration: 'none',
    borderRadius: '4px',
    fontSize: '13px',
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
  enrollButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  enrolledInfo: {},
  progressBar: {
    height: '8px',
    backgroundColor: colors.neutral100,
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accentGreen,
    transition: 'width 0.3s',
  },
  progressText: {
    ...typography.bodyS,
    color: colors.neutral500,
    textAlign: 'center',
    marginBottom: '16px',
  },
  continueButton: {
    display: 'block',
    width: '100%',
    padding: '14px',
    backgroundColor: colors.primary,
    color: colors.white,
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
    textAlign: 'center',
    boxSizing: 'border-box',
  },
};
