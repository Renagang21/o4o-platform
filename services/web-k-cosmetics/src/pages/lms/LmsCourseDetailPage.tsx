/**
 * LmsCourseDetailPage — K-Cosmetics 강의 상세 페이지
 *
 * WO-KCOS-KPA-LMS-STEP3-LESSON-PLAYER-V1
 *
 * KPA-Society LmsCourseDetailPage 구조 기준.
 * KPA 대비 차이: 문구 치환 + 스타일 인라인화 + 수료증 링크 안전 처리.
 */

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { lmsApi } from '../../api/lms';
import { useAuth } from '../../contexts/AuthContext';
import type { LmsCourse, LmsLesson, LmsEnrollment } from '../../api/lms';

// ─── 색상/타이포 (KPA colors/typography 대응) ────────────────────────────────

const C = {
  primary: '#db2777',
  white: '#ffffff',
  neutral900: '#0f172a', neutral800: '#1e293b', neutral700: '#334155',
  neutral600: '#475569', neutral500: '#64748b', neutral400: '#94a3b8',
  neutral300: '#cbd5e1', neutral200: '#e2e8f0', neutral100: '#f1f5f9',
  neutral50: '#f8fafc',
  accentGreen: '#22c55e',
};

// ─── Page Component ──────────────────────────────────────────────────────────

export default function LmsCourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<LmsCourse | null>(null);
  const [lessons, setLessons] = useState<LmsLesson[]>([]);
  const [enrollment, setEnrollment] = useState<LmsEnrollment | null>(null);
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

      setCourse((courseRes as any).data?.course ?? (courseRes as any).data ?? null);
      setLessons(Array.isArray((lessonsRes as any).data) ? (lessonsRes as any).data : []);

      if (user) {
        try {
          const enrollmentRes = await lmsApi.getEnrollmentByCourse(id!);
          setEnrollment((enrollmentRes as any).data?.enrollment ?? (enrollmentRes as any).data ?? null);
        } catch {
          // 미시작 상태
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '강의를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
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
      toast.success('수강 등록이 완료되었습니다.');
    } catch {
      toast.error('수강 등록에 실패했습니다.');
    } finally {
      setEnrolling(false);
    }
  };

  // ─── Loading / Error ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', color: C.neutral500 }}>
        강의를 불러오는 중...
      </div>
    );
  }

  if (error || !course) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: C.neutral500 }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h2 style={{ fontSize: '18px', color: C.neutral900, marginBottom: '8px' }}>강의를 찾을 수 없습니다</h2>
        <p style={{ marginBottom: '24px' }}>{error || '삭제되었거나 존재하지 않는 강의입니다.'}</p>
        <button onClick={() => navigate('/lms')} style={{ ...S.enrollButton, width: 'auto', padding: '10px 24px' }}>
          목록으로
        </button>
      </div>
    );
  }

  const isArchived = (course as any).status === 'archived';

  return (
    <div style={S.container}>
      {/* 브레드크럼 */}
      <nav style={{ fontSize: '14px', color: C.neutral500, marginBottom: '24px' }}>
        <Link to="/" style={{ color: C.neutral500, textDecoration: 'none' }}>홈</Link>
        {' / '}
        <Link to="/lms" style={{ color: C.neutral500, textDecoration: 'none' }}>강의</Link>
        {' / '}
        <span style={{ color: C.neutral700 }}>{course.title}</span>
      </nav>

      {/* 종료 배너 */}
      {isArchived && (
        <div style={S.archivedBanner}>
          <span style={{ fontSize: '18px' }}>🔒</span>
          <div>
            <strong style={{ fontSize: '15px' }}>이 강의는 종료된 강의입니다.</strong>
            <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.85 }}>
              기존 수강 기록은 보존되며 신규 신청은 불가합니다.
            </p>
          </div>
        </div>
      )}

      <div style={S.content}>
        <div style={S.main}>
          {/* 강의 정보 카드 */}
          <div style={S.card}>
            <div style={S.courseHeader}>
              {course.category && <span style={S.categoryBadge}>{course.category}</span>}
              {isArchived && <span style={S.archivedBadge}>종료</span>}
            </div>

            <h1 style={S.title}>{course.title}</h1>

            <div style={S.meta}>
              {course.instructorName && <><span>👤 {course.instructorName}</span><span>·</span></>}
              <span>📖 {course.lessonCount}개 레슨</span>
              <span>·</span>
              <span>⏱ {Math.floor((course.duration || 0) / 60)}시간 {(course.duration || 0) % 60}분</span>
              {course.enrollmentCount != null && <><span>·</span><span>{course.enrollmentCount}명 수강중</span></>}
            </div>

            {course.description && (
              <div style={S.description}>
                <h2 style={S.sectionTitle}>소개</h2>
                <p style={S.descriptionText}>{course.description}</p>
              </div>
            )}
          </div>

          {/* 레슨 목록 */}
          <div style={{ ...S.card, marginTop: '24px' }}>
            <h2 style={S.sectionTitle}>레슨 목록</h2>
            <div style={{ display: 'flex', flexDirection: 'column' as const }}>
              {lessons.map((lesson, index) => {
                const isCompleted = enrollment?.completedLessons?.includes(lesson.id);
                const canAccess = enrollment || lesson.isPreview;

                return (
                  <div key={lesson.id} style={S.lessonItem}>
                    <div style={S.lessonNumber}>{isCompleted ? '✓' : index + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: C.neutral800 }}>{lesson.title}</span>
                        {lesson.isPreview && <span style={S.previewBadge}>미리보기</span>}
                      </div>
                      <span style={{ fontSize: '13px', color: C.neutral500 }}>{lesson.duration}분</span>
                    </div>
                    {canAccess && (
                      <Link to={`/lms/course/${course.id}/lesson/${lesson.id}`} style={S.lessonLink}>보기</Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 사이드바 */}
        <div style={S.sidebar}>
          <div style={S.card}>
            {course.thumbnail ? (
              <img src={course.thumbnail} alt={course.title} style={S.thumbnail} />
            ) : (
              <div style={S.thumbnailPlaceholder}>📚</div>
            )}

            {isArchived ? (
              <div style={S.archivedCtaBox}>
                <p style={S.archivedCtaText}>이 강의는 종료되어 수강 신청이 불가합니다.</p>
                {enrollment && (
                  <>
                    <div style={S.progressBar}>
                      <div style={{ ...S.progressFill, width: `${enrollment.progress}%` }} />
                    </div>
                    <p style={S.progressText}>진도율: {enrollment.progress}%</p>
                  </>
                )}
              </div>
            ) : enrollment ? (
              (enrollment as any).status === 'completed' ? (
                <div>
                  <div style={S.completedBadge}>수료 완료</div>
                  <p style={S.progressText}>진도율: 100%</p>
                  <button
                    onClick={() => toast.info('수료증 기능은 준비 중입니다.')}
                    style={S.certButton}
                  >
                    수료증 보기
                  </button>
                </div>
              ) : (
                <div>
                  <div style={S.progressBar}>
                    <div style={{ ...S.progressFill, width: `${enrollment.progress}%` }} />
                  </div>
                  <p style={S.progressText}>진도율: {enrollment.progress}%</p>
                  <Link to={`/lms/course/${course.id}/lesson/${lessons[0]?.id || ''}`} style={S.continueButton}>
                    계속 보기
                  </Link>
                </div>
              )
            ) : (
              <button style={S.enrollButton} onClick={handleEnroll} disabled={enrolling}>
                {enrolling ? '등록 중...' : '수강 시작'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Styles (KPA styles 기준, colors/typography 인라인화) ────────────────────

const S: Record<string, React.CSSProperties> = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '0 20px 40px' },
  content: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' },
  main: {},
  sidebar: { position: 'sticky', top: '24px', height: 'fit-content' },
  card: { backgroundColor: C.white, border: `1px solid ${C.neutral200}`, borderRadius: '12px', padding: '28px' },
  courseHeader: { display: 'flex', gap: '8px', marginBottom: '16px' },
  categoryBadge: { padding: '4px 12px', backgroundColor: C.neutral100, color: C.neutral700, borderRadius: '4px', fontSize: '13px' },
  title: { fontSize: '24px', fontWeight: 700, color: C.neutral900, margin: 0, marginBottom: '16px' },
  meta: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: C.neutral500, flexWrap: 'wrap' as const },
  description: { marginTop: '32px', paddingTop: '24px', borderTop: `1px solid ${C.neutral200}` },
  sectionTitle: { fontSize: '18px', fontWeight: 600, color: C.neutral900, margin: 0, marginBottom: '16px' },
  descriptionText: { fontSize: '15px', color: C.neutral700, lineHeight: 1.8 },
  lessonItem: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 0', borderBottom: `1px solid ${C.neutral100}` },
  lessonNumber: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: C.neutral100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 500, color: C.neutral700, flexShrink: 0 },
  previewBadge: { padding: '2px 6px', backgroundColor: C.accentGreen, color: C.white, borderRadius: '4px', fontSize: '11px' },
  lessonLink: { padding: '6px 12px', backgroundColor: C.primary, color: C.white, textDecoration: 'none', borderRadius: '4px', fontSize: '13px' },
  thumbnail: { width: '100%', borderRadius: '8px', marginBottom: '20px' },
  thumbnailPlaceholder: { width: '100%', height: '160px', backgroundColor: C.neutral100, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', marginBottom: '20px' },
  enrollButton: { width: '100%', padding: '14px', backgroundColor: C.primary, color: C.white, border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 500, cursor: 'pointer' },
  progressBar: { height: '8px', backgroundColor: C.neutral100, borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' },
  progressFill: { height: '100%', backgroundColor: C.accentGreen, transition: 'width 0.3s' },
  progressText: { fontSize: '13px', color: C.neutral500, textAlign: 'center' as const, marginBottom: '16px' },
  continueButton: { display: 'block', width: '100%', padding: '14px', backgroundColor: C.primary, color: C.white, textDecoration: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 500, textAlign: 'center' as const, boxSizing: 'border-box' as const },
  archivedBanner: { display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 20px', backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', marginBottom: '20px', color: '#92400e' },
  archivedBadge: { padding: '4px 10px', backgroundColor: '#f1f5f9', color: '#64748b', borderRadius: '4px', fontSize: '13px', fontWeight: 500 },
  archivedCtaBox: { padding: '16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', textAlign: 'center' as const },
  archivedCtaText: { fontSize: '13px', color: '#64748b', margin: '0 0 12px', lineHeight: 1.5 },
  completedBadge: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', backgroundColor: '#ecfdf5', color: '#059669', borderRadius: '8px', fontSize: '15px', fontWeight: 600, marginBottom: '8px' },
  certButton: { display: 'block', width: '100%', padding: '14px', backgroundColor: '#059669', color: C.white, border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 500, textAlign: 'center' as const, cursor: 'pointer', boxSizing: 'border-box' as const },
};
