/**
 * LmsCourseDetailPage - 안내 흐름 상세 페이지
 *
 * 핵심 원칙:
 * - 이 기능은 교육이나 평가를 위한 것이 아닙니다
 * - 콘텐츠를 순서대로 안내하기 위한 도구입니다
 */

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
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
  // WO-KPA-LMS-COURSE-VISIBILITY-ACCESS-POLICY-V1: 회원제 강의 + 비로그인 → 로그인 유도
  const [needLogin, setNeedLogin] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (id) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      setNeedLogin(false);

      // 1) 코스 조회 — 회원제 강의 + 비로그인 시 401(MEMBERS_ONLY) 발생
      const courseRes = await lmsApi.getCourse(id!);
      // WO-O4O-LMS-ROUTING-INTEGRATION-FIX-V1: extract from nested response shapes
      setCourse((courseRes as any).data?.course ?? (courseRes as any).data ?? null);

      // 2) 레슨 조회 — /lessons는 여전히 인증 필요. 비로그인은 빈 목록으로 폴백.
      //    (별도 try/catch로 코스 표시는 항상 보장)
      try {
        const lessonsRes = await lmsApi.getLessons(id!);
        setLessons(Array.isArray((lessonsRes as any).data) ? (lessonsRes as any).data : []);
      } catch {
        setLessons([]);
      }

      // 진행 정보 확인 (로그인 시)
      if (user) {
        try {
          const enrollmentRes = await lmsApi.getEnrollmentByCourse(id!);
          setEnrollment((enrollmentRes as any).data?.enrollment ?? (enrollmentRes as any).data ?? null);
        } catch {
          // 미시작 상태
        }
      }
    } catch (err: any) {
      // WO-KPA-LMS-COURSE-VISIBILITY-ACCESS-POLICY-V1
      if (err?.code === 'MEMBERS_ONLY') {
        setNeedLogin(true);
      } else {
        setError(err instanceof Error ? err.message : '안내 흐름을 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    // WO-LMS-ARCHIVED-COURSE-ACCESS-POLICY-V1: archived 강의 수강 신청 차단
    if ((course as any)?.status === 'archived') {
      toast.error('종료된 강의는 새로 수강 신청할 수 없습니다.');
      return;
    }

    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    try {
      setEnrolling(true);
      const res = await lmsApi.enrollCourse(id!);
      setEnrollment((res as any).data?.enrollment ?? (res as any).data ?? null);
      toast.success('시작 등록이 완료되었습니다.');
    } catch (err) {
      toast.error('시작 등록에 실패했습니다.');
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
    return <LoadingSpinner message="안내 흐름을 불러오는 중..." />;
  }

  // WO-KPA-LMS-COURSE-VISIBILITY-ACCESS-POLICY-V1: 회원 전용 강의 + 비로그인
  if (needLogin) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="🔒"
          title="회원 전용 강의입니다"
          description="이 강의는 로그인한 회원만 볼 수 있습니다. 로그인 후 다시 시도해 주세요."
          action={{
            label: '로그인하기',
            onClick: () => navigate('/login', { state: { from: `/lms/course/${id}` } }),
          }}
        />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="⚠️"
          title="안내 흐름을 찾을 수 없습니다"
          description={error || '삭제되었거나 존재하지 않는 안내 흐름입니다.'}
          action={{ label: '목록으로', onClick: () => navigate('/lms/courses') }}
        />
      </div>
    );
  }

  // WO-LMS-ARCHIVED-COURSE-ACCESS-POLICY-V1
  const isArchived = (course as any).status === 'archived';

  return (
    <div style={styles.container}>
      <PageHeader
        title=""
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '안내', href: '/lms/courses' },
          { label: course.title },
        ]}
      />

      {/* WO-LMS-ARCHIVED-COURSE-ACCESS-POLICY-V1: 종료 배너 */}
      {isArchived && (
        <div style={styles.archivedBanner}>
          <span style={{ fontSize: '18px' }}>🔒</span>
          <div>
            <strong style={{ fontSize: '15px' }}>이 강의는 종료된 강의입니다.</strong>
            <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.85 }}>
              기존 수강 기록은 보존되며 신규 신청은 불가합니다.
            </p>
          </div>
        </div>
      )}

      <div style={styles.content}>
        <div style={styles.main}>
          <Card padding="large">
            <div style={styles.courseHeader}>
              <span style={styles.levelBadge}>{getLevelLabel(course.level)}</span>
              <span style={styles.categoryBadge}>{course.category}</span>
              {isArchived && (
                <span style={styles.archivedBadge}>종료</span>
              )}
            </div>

            <h1 style={styles.title}>{course.title}</h1>

            <div style={styles.meta}>
              <span>👤 {course.instructorName}</span>
              <span>·</span>
              <span>📖 {course.lessonCount}개 단계</span>
              <span>·</span>
              <span>⏱ {Math.floor(course.duration / 60)}시간 {course.duration % 60}분</span>
              <span>·</span>
              <span>{course.enrollmentCount}명 진행중</span>
            </div>

            <div style={styles.description}>
              <h2 style={styles.sectionTitle}>소개</h2>
              <p style={styles.descriptionText}>{course.description}</p>
            </div>
          </Card>

          {/* 순서 목록 */}
          <Card padding="large" style={{ marginTop: '24px' }}>
            <h2 style={styles.sectionTitle}>순서 목록</h2>
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
                        보기
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

            {/* WO-LMS-ARCHIVED-COURSE-ACCESS-POLICY-V1: archived → 모든 CTA 비활성화 */}
            {isArchived ? (
              <div style={styles.archivedCtaBox}>
                <p style={styles.archivedCtaText}>이 강의는 종료되어 수강 신청이 불가합니다.</p>
                {enrollment && (
                  <>
                    <div style={styles.progressBar}>
                      <div style={{ ...styles.progressFill, width: `${enrollment.progress}%` }} />
                    </div>
                    <p style={styles.progressText}>진도율: {enrollment.progress}%</p>
                    {/* WO-KPA-LMS-UX-QUICK-WINS-V1 */}
                    <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const, marginBottom: '8px' }}>
                      {(enrollment as any).completedLessons ?? 0} / {lessons.length} 레슨 완료
                    </p>
                    {(enrollment as any).status === 'completed' && (
                      <Link to="/mypage/certificates" style={styles.certButton}>수료증 보기</Link>
                    )}
                  </>
                )}
              </div>
            ) : enrollment ? (
              // WO-LMS-COMPLETION-AND-CERTIFICATE-UX-REFINEMENT-V1
              (enrollment as any).status === 'completed' ? (
                <div style={styles.enrolledInfo}>
                  <div style={styles.completedBadge}>수료 완료</div>
                  <p style={styles.progressText}>진도율: 100%</p>
                  <Link
                    to="/mypage/certificates"
                    style={styles.certButton}
                  >
                    수료증 보기
                  </Link>
                </div>
              ) : (
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
                  {/* WO-KPA-LMS-UX-QUICK-WINS-V1: 완료 레슨 수 표시 */}
                  <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const, marginBottom: '16px' }}>
                    {(enrollment as any).completedLessons ?? 0} / {lessons.length} 레슨 완료
                  </p>
                  <Link
                    to={`/lms/course/${course.id}/lesson/${lessons[0]?.id || ''}`}
                    style={styles.continueButton}
                  >
                    계속 보기
                  </Link>
                </div>
              )
            ) : (
              <button
                style={styles.enrollButton}
                onClick={handleEnroll}
                disabled={enrolling}
              >
                {enrolling ? '시작 중...' : '시작하기'}
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
  // WO-LMS-ARCHIVED-COURSE-ACCESS-POLICY-V1
  archivedBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '14px 20px',
    backgroundColor: '#fef3c7',
    border: '1px solid #fde68a',
    borderRadius: '10px',
    marginBottom: '20px',
    color: '#92400e',
  },
  archivedBadge: {
    padding: '4px 10px',
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 500,
  },
  archivedCtaBox: {
    padding: '16px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    textAlign: 'center' as const,
  },
  archivedCtaText: {
    fontSize: '13px',
    color: '#64748b',
    margin: '0 0 12px',
    lineHeight: 1.5,
  },
  // WO-LMS-COMPLETION-AND-CERTIFICATE-UX-REFINEMENT-V1
  completedBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '10px',
    backgroundColor: '#ecfdf5',
    color: '#059669',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  certButton: {
    display: 'block',
    width: '100%',
    padding: '14px',
    backgroundColor: '#059669',
    color: colors.white,
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
    textAlign: 'center',
    boxSizing: 'border-box',
  },
};
