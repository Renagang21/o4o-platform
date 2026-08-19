/**
 * @o4o/lms-ui — 강의 상세 공통 View
 *
 * WO-O4O-COMMUNITY-LMS-COURSE-DETAIL-AND-LESSON-PLAYER-COMMONIZATION-V1
 *
 * KPA / K-Cosmetics / GlycoPharm 의 강의 상세 화면을 한 벌로 수렴한다.
 * 데이터 IO 는 `LmsLearnerPort`, 경로·라벨·accent 는 `LmsViewConfig`,
 * 서비스 고유 영역(감사 포인트 패널 · 수료증 다운로드 등)은 slot 으로 주입한다.
 */

import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { DEFAULT_ACCENT } from '../types';
import { CourseVisibilityBadge } from '../components/CourseVisibilityBadge';
import { NoPaymentNotice } from '../components/NoPaymentNotice';
import { LessonList } from '../components/LessonList';
import { CourseProgressBar } from '../components/CourseProgressBar';
import {
  LmsCard,
  LmsEmptyState,
  LmsLoading,
  NavLink,
  pageContainerStyle,
  primaryButtonStyle,
  sectionTitleStyle,
} from './primitives';
import type {
  LmsCourseDetailData,
  LmsEnrollmentData,
  LmsLearnerPort,
  LmsLessonData,
  LmsViewConfig,
} from './contracts';
import {
  extractErrorMessage,
  isMembersOnlyError,
  resolveLessonPath,
} from './contracts';

export interface CourseDetailSlotContext {
  course: LmsCourseDetailData;
  lessons: LmsLessonData[];
  enrollment: LmsEnrollmentData | null;
  reload: () => void;
}

export interface CourseDetailViewProps {
  courseId: string;
  port: LmsLearnerPort;
  config: LmsViewConfig;
  /** 강의 정보 카드 바로 아래 — 예: 감사 포인트 패널. */
  renderAfterCourseCard?: (ctx: CourseDetailSlotContext) => ReactNode;
  /** 사이드바 CTA 카드 아래 — 예: 수료증 발급/다운로드 카드. */
  renderSidebarExtra?: (ctx: CourseDetailSlotContext) => ReactNode;
  /** 소개 본문 렌더 override(HTML 콘텐츠를 쓰는 서비스용). 기본은 평문. */
  renderDescription?: (course: LmsCourseDetailData) => ReactNode;
}

export function CourseDetailView({
  courseId,
  port,
  config,
  renderAfterCourseCard,
  renderSidebarExtra,
  renderDescription,
}: CourseDetailViewProps) {
  const { labels, notify } = config;
  const accent = config.accent ?? DEFAULT_ACCENT;
  // WO-O4O-COMMUNITY-PHARMACYHUB-BASELINE-AND-CROSSSERVICE-MYPOSTS-ADOPTION-V1 §8
  const enrollmentEnabled = config.enrollmentEnabled !== false;

  const [course, setCourse] = useState<LmsCourseDetailData | null>(null);
  const [lessons, setLessons] = useState<LmsLessonData[]>([]);
  const [enrollment, setEnrollment] = useState<LmsEnrollmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** 회원 전용 강의 + 비로그인 — 오류가 아니라 로그인 유도 상태. */
  const [needLogin, setNeedLogin] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  const requireLogin = useCallback(() => {
    if (config.onRequireLogin) config.onRequireLogin();
    else config.navigate('/login');
  }, [config]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setNeedLogin(false);

      // 1) 강의 조회 — 회원제 강의 + 비로그인 시 MEMBERS_ONLY.
      const courseData = await port.getCourse(courseId);
      setCourse(courseData);

      // 2) 레슨 목록 — 서비스에 따라 인증/수강 여부에 따라 거부될 수 있다.
      //    강의 표시 자체는 항상 보장하기 위해 별도 try/catch 로 감싼다.
      try {
        setLessons(await port.getLessons(courseId));
      } catch {
        setLessons([]);
      }

      // 3) 수강 정보 — 로그인 상태에서만. 미수강이면 조회 실패가 정상이다.
      if (config.isAuthenticated && config.enrollmentEnabled !== false) {
        try {
          setEnrollment(await port.getEnrollment(courseId));
        } catch {
          setEnrollment(null);
        }
      } else {
        setEnrollment(null);
      }
    } catch (err) {
      if (isMembersOnlyError(err)) setNeedLogin(true);
      else setError(extractErrorMessage(err, labels.courseNotFoundDesc));
    } finally {
      setLoading(false);
    }
    // config 객체는 매 렌더 새로 만들어질 수 있어 의존성에서 제외하고
    // 재조회 트리거는 courseId / 인증 상태로 한정한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, config.isAuthenticated, config.enrollmentEnabled, port]);

  useEffect(() => {
    if (courseId) void loadData();
  }, [courseId, loadData]);

  const handleEnroll = async () => {
    if (course?.status === 'archived') {
      notify.error(`종료된 ${labels.courseWord}는 새로 신청할 수 없습니다.`);
      return;
    }
    if (!config.isAuthenticated) {
      requireLogin();
      return;
    }
    try {
      setEnrolling(true);
      setEnrollment(await port.enroll(courseId));
      notify.success(labels.enrolledMessage);
      // 신청 직후 레슨 목록이 열리는 서비스가 있어 재조회한다.
      try {
        setLessons(await port.getLessons(courseId));
      } catch {
        /* 목록이 여전히 잠겨 있으면 기존 상태 유지 */
      }
    } catch (err) {
      notify.error(extractErrorMessage(err, labels.enrollFailedMessage));
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) return <LmsLoading message={labels.courseLoading} />;

  if (needLogin) {
    return (
      <div style={pageContainerStyle}>
        <LmsEmptyState
          icon="🔒"
          title={labels.membersOnlyTitle}
          description={labels.membersOnlyDesc}
          actionLabel={labels.loginLabel}
          onAction={requireLogin}
          accent={accent}
        />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div style={pageContainerStyle}>
        <LmsEmptyState
          icon="⚠️"
          title={labels.courseNotFoundTitle}
          description={error || labels.courseNotFoundDesc}
          actionLabel={labels.backToHubLabel}
          onAction={() => config.navigate(config.hubPath)}
          accent={accent}
        />
      </div>
    );
  }

  const slotCtx: CourseDetailSlotContext = { course, lessons, enrollment, reload: () => void loadData() };
  const isArchived = course.status === 'archived';
  const completedIds = enrollment?.completedLessonIds ?? [];
  const firstLessonId = lessons[0]?.id ?? '';

  const certificateCta = (() => {
    if (config.certificatesPath) {
      return (
        <NavLink to={config.certificatesPath} navigate={config.navigate} style={certButtonStyle}>
          {labels.certificateLabel}
        </NavLink>
      );
    }
    if (config.onCertificateUnavailable) {
      return (
        <button type="button" onClick={config.onCertificateUnavailable} style={{ ...certButtonStyle, border: 'none', cursor: 'pointer' }}>
          {labels.certificateLabel}
        </button>
      );
    }
    return null;
  })();

  return (
    <div style={pageContainerStyle}>
      <nav style={breadcrumbStyle} aria-label="breadcrumb">
        <NavLink to="/" navigate={config.navigate} style={{ color: '#64748b' }}>
          {labels.breadcrumbHome}
        </NavLink>
        <span style={{ color: '#cbd5e1' }}>/</span>
        <NavLink to={config.hubPath} navigate={config.navigate} style={{ color: '#64748b' }}>
          {labels.breadcrumbHub}
        </NavLink>
        <span style={{ color: '#cbd5e1' }}>/</span>
        <span style={{ color: '#0f172a' }}>{course.title}</span>
      </nav>

      {isArchived && (
        <div style={archivedBannerStyle}>
          <span style={{ fontSize: '18px' }}>🔒</span>
          <div>
            <strong style={{ fontSize: '15px' }}>이 {labels.courseWord}는 종료되었습니다.</strong>
            <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.85 }}>
              기존 수강 기록은 보존되며 신규 신청은 불가합니다.
            </p>
          </div>
        </div>
      )}

      <div style={contentGridStyle}>
        <div>
          <LmsCard>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {course.category && <span style={categoryBadgeStyle}>{course.category}</span>}
              {course.visibility && (
                <CourseVisibilityBadge visibility={course.visibility === 'public' ? 'public' : 'members'} />
              )}
              {course.visibility && course.visibility !== 'public' && course.requiresApproval && (
                <span style={detailBadge('approval')}>승인 필요</span>
              )}
              {course.isPaid && <span style={detailBadge('paid')}>유료</span>}
              {isArchived && <span style={detailBadge('archived')}>종료</span>}
            </div>

            <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>
              {course.title}
            </h1>

            <div style={metaStyle}>
              {course.instructorName && <span>👤 {course.instructorName}</span>}
              {typeof course.lessonCount === 'number' && (
                <span>📖 {course.lessonCount}개 {labels.lessonWord}</span>
              )}
              {typeof course.durationMinutes === 'number' && course.durationMinutes > 0 && (
                <span>
                  ⏱ {Math.floor(course.durationMinutes / 60)}시간 {course.durationMinutes % 60}분
                </span>
              )}
              {typeof course.enrollmentCount === 'number' && <span>👥 {course.enrollmentCount}명</span>}
            </div>

            {course.description && (
              <div style={descriptionBoxStyle}>
                <h2 style={sectionTitleStyle}>{labels.introSectionTitle}</h2>
                {renderDescription ? (
                  renderDescription(course)
                ) : (
                  <p style={{ fontSize: '15px', color: '#334155', lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>
                    {course.description}
                  </p>
                )}
              </div>
            )}
          </LmsCard>

          {renderAfterCourseCard && <div style={{ marginTop: '16px' }}>{renderAfterCourseCard(slotCtx)}</div>}

          <LmsCard style={{ marginTop: '24px' }}>
            <h2 style={sectionTitleStyle}>{labels.lessonsSectionTitle}</h2>
            {lessons.length === 0 ? (
              <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>
                {enrollment || !enrollmentEnabled
                  ? `등록된 ${labels.lessonWord}이 아직 없습니다.`
                  : `수강 신청 후 ${labels.lessonWord} 목록을 볼 수 있습니다.`}
              </p>
            ) : (
              <LessonList
                style={{ display: 'flex', flexDirection: 'column' }}
                rowClickMode="row"
                accent={accent}
                hrefFor={(l) => resolveLessonPath(config, course.id, l.id)}
                onLessonClick={(l) => config.navigate(resolveLessonPath(config, course.id, l.id))}
                lessons={lessons.map((lesson, index) => ({
                  id: lesson.id,
                  title: lesson.title,
                  order: lesson.order ?? index + 1,
                  kind: toLessonKind(lesson.type),
                  durationMinutes: lesson.durationMinutes,
                  completed: completedIds.includes(lesson.id),
                  isPreview: lesson.isPreview,
                  locked: enrollmentEnabled ? !(enrollment || lesson.isPreview) : false,
                }))}
              />
            )}
          </LmsCard>
        </div>

        <div style={sidebarStyle}>
          <LmsCard>
            {course.thumbnail ? (
              <img src={course.thumbnail} alt={course.title} style={{ width: '100%', borderRadius: '8px', marginBottom: '20px' }} />
            ) : (
              <div style={thumbnailPlaceholderStyle}>📚</div>
            )}

            {enrollmentEnabled && !enrollment && !isArchived && course.visibility && course.visibility !== 'public' && (
              <div style={accessPolicyNoteStyle}>
                {course.isPaid ? (
                  <NoPaymentNotice paid variant="plain" />
                ) : course.requiresApproval ? (
                  '강사 승인 후 이용 가능합니다.'
                ) : (
                  '수강 신청 후 이용 가능합니다.'
                )}
              </div>
            )}

            {isArchived ? (
              <div style={archivedCtaBoxStyle}>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px', lineHeight: 1.5 }}>
                  이 {labels.courseWord}는 종료되어 신규 신청이 불가합니다.
                </p>
                {enrollment && (
                  <>
                    <CourseProgressBar
                      percent={enrollment.progress}
                      completedCount={enrollment.completedLessons ?? completedIds.length}
                      totalCount={lessons.length}
                      accent={accent}
                      style={{ marginBottom: '12px' }}
                    />
                    {enrollment.status === 'completed' && certificateCta}
                  </>
                )}
              </div>
            ) : enrollment ? (
              enrollment.status === 'pending' ? (
                <div>
                  <button type="button" disabled style={primaryButtonStyle(accent, true)}>
                    승인 대기 중
                  </button>
                  <p style={sidebarNoteStyle}>강사 승인 후 수강이 가능합니다.</p>
                </div>
              ) : enrollment.status === 'rejected' ? (
                <div>
                  <button type="button" disabled style={{ ...primaryButtonStyle('#ef4444', true) }}>
                    수강 거절됨
                  </button>
                  <p style={sidebarNoteStyle}>강사에게 문의하세요.</p>
                </div>
              ) : enrollment.status === 'completed' ? (
                <div>
                  <div style={completedBadgeStyle}>수료 완료</div>
                  <p style={{ ...sidebarNoteStyle, marginBottom: '12px' }}>진도율: 100%</p>
                  {certificateCta}
                </div>
              ) : (
                <div>
                  <CourseProgressBar
                    percent={enrollment.progress}
                    completedCount={enrollment.completedLessons ?? completedIds.length}
                    totalCount={lessons.length}
                    accent={accent}
                    style={{ marginBottom: '16px' }}
                  />
                  {firstLessonId ? (
                    <NavLink
                      to={resolveLessonPath(config, course.id, nextLessonId(lessons, completedIds) || firstLessonId)}
                      navigate={config.navigate}
                      style={primaryButtonStyle(accent)}
                    >
                      {labels.continueLabel}
                    </NavLink>
                  ) : (
                    <p style={sidebarNoteStyle}>{labels.lessonWord}이 아직 등록되지 않았습니다.</p>
                  )}
                </div>
              )
            ) : !enrollmentEnabled ? (
              /* Enrollment 미사용 서비스 — 바로 학습(조회) 진입만 제공한다. */
              firstLessonId ? (
                <NavLink
                  to={resolveLessonPath(config, course.id, firstLessonId)}
                  navigate={config.navigate}
                  style={primaryButtonStyle(accent)}
                >
                  {labels.continueLabel}
                </NavLink>
              ) : (
                <p style={sidebarNoteStyle}>{labels.lessonWord}이 아직 등록되지 않았습니다.</p>
              )
            ) : (
              <button
                type="button"
                style={primaryButtonStyle(accent, enrolling)}
                onClick={handleEnroll}
                disabled={enrolling}
              >
                {enrolling ? labels.enrollingLabel : labels.enrollLabel}
              </button>
            )}
          </LmsCard>

          {renderSidebarExtra && <div style={{ marginTop: '16px' }}>{renderSidebarExtra(slotCtx)}</div>}
        </div>
      </div>
    </div>
  );
}

/** 미완료 레슨 중 첫 번째 — '이어서 학습하기' 대상. */
function nextLessonId(lessons: LmsLessonData[], completedIds: string[]): string | null {
  const next = lessons.find((l) => !completedIds.includes(l.id));
  return next?.id ?? null;
}

function toLessonKind(type?: string): 'video' | 'article' | 'quiz' | 'assignment' | undefined {
  if (type === 'video' || type === 'article' || type === 'quiz' || type === 'assignment') return type;
  return undefined;
}

const breadcrumbStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '13px',
  padding: '16px 0',
  flexWrap: 'wrap',
};

const contentGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 320px',
  gap: '24px',
  alignItems: 'start',
};

const sidebarStyle: CSSProperties = {
  position: 'sticky',
  top: '24px',
  height: 'fit-content',
};

const metaStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  fontSize: '14px',
  color: '#64748b',
  flexWrap: 'wrap',
};

const descriptionBoxStyle: CSSProperties = {
  marginTop: '28px',
  paddingTop: '24px',
  borderTop: '1px solid #e2e8f0',
};

const categoryBadgeStyle: CSSProperties = {
  padding: '4px 12px',
  background: '#f1f5f9',
  color: '#334155',
  borderRadius: '4px',
  fontSize: '13px',
};

const thumbnailPlaceholderStyle: CSSProperties = {
  width: '100%',
  height: '160px',
  background: '#f1f5f9',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '48px',
  marginBottom: '20px',
};

const accessPolicyNoteStyle: CSSProperties = {
  padding: '10px 14px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 13,
  color: '#475569',
  marginBottom: 12,
  textAlign: 'center',
};

const archivedBannerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '12px',
  padding: '14px 20px',
  background: '#fef3c7',
  border: '1px solid #fde68a',
  borderRadius: '10px',
  marginBottom: '20px',
  color: '#92400e',
};

const archivedCtaBoxStyle: CSSProperties = {
  padding: '16px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  textAlign: 'center',
};

const completedBadgeStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  padding: '10px',
  background: '#ecfdf5',
  color: '#059669',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: 600,
  marginBottom: '8px',
};

const certButtonStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '14px',
  background: '#059669',
  color: '#fff',
  borderRadius: '8px',
  fontSize: '16px',
  fontWeight: 600,
  textAlign: 'center',
  boxSizing: 'border-box',
};

const sidebarNoteStyle: CSSProperties = {
  fontSize: '12px',
  color: '#94a3b8',
  textAlign: 'center',
  marginTop: '8px',
  marginBottom: 0,
};

function detailBadge(type: 'approval' | 'paid' | 'archived'): CSSProperties {
  const map: Record<string, { bg: string; color: string }> = {
    approval: { bg: '#fef3c7', color: '#92400e' },
    paid: { bg: '#fee2e2', color: '#991b1b' },
    archived: { bg: '#f1f5f9', color: '#64748b' },
  };
  const { bg, color } = map[type];
  return {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    background: bg,
    color,
  };
}
