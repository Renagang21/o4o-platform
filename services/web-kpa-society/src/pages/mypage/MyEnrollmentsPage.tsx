/**
 * MyEnrollmentsPage — 내 수강 목록
 * WO-O4O-ENROLLMENT-SYSTEM-V1
 * WO-O4O-KPA-MYPAGE-ENROLLMENTS-LAYOUT-ALIGN-V1 — 외곽 레이아웃을 /mypage 프로필 공통 패턴으로 정렬
 *   (실제 코드 변경은 commit 64b567eca 에 함께 묶여 push 되었음 — parallel-session 동시 commit 사고)
 * WO-O4O-KPA-MY-ENROLLMENTS-HYBRID-LIST-ALIGN-V1 — pure card → hybrid (card+meta row).
 *   IR-O4O-COMMUNITY-LIST-UX-CANONICAL-AUDIT-V1 의 medium drift 1건 정비.
 *   - thumbnail / identity / meta / progress / action 영역 분리
 *   - desktop 에서 정보 밀도 ↑, mobile 에서 카드 wrap 유지
 *   - 명시적 action 버튼 (이어서 학습 / 다시 보기 / 수료증 보기)
 *
 * Route: /mypage/enrollments
 * API: GET /lms/enrollments/me
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MyPageLayout } from '../../layouts/MyPageLayout';
import { MyPageLoadingState, MyPageEmptyState } from '@o4o/account-ui';
import { useAuth } from '../../contexts';
import { lmsApi } from '../../api/lms';
import { colors } from '../../styles/theme';

/* ── 타입 ──────────────────────────────── */
type EnrollmentStatus =
  | 'pending' | 'approved' | 'rejected'
  | 'in_progress' | 'completed' | 'cancelled' | 'expired';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string | null;
  duration: number;
  instructorId: string;
}

interface Enrollment {
  id: string;
  courseId: string;
  status: EnrollmentStatus;
  progressPercentage: number;
  completedLessons: number;
  totalLessons: number;
  enrolledAt: string | null;
  completedAt: string | null;
  course: Course;
}

/* ── 상수 ──────────────────────────────── */
const STATUS_LABEL: Record<EnrollmentStatus, string> = {
  pending: '승인 대기 중',
  approved: '수강 중',
  rejected: '신청 거절',
  in_progress: '수강 중',
  completed: '수강 완료',
  cancelled: '취소됨',
  expired: '만료됨',
};

const STATUS_COLOR: Record<EnrollmentStatus, string> = {
  pending: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
  in_progress: '#10b981',
  completed: '#6366f1',
  cancelled: '#9ca3af',
  expired: '#9ca3af',
};

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'in_progress', label: '수강 중' },
  { value: 'pending', label: '대기 중' },
  { value: 'completed', label: '완료' },
  { value: 'cancelled', label: '취소' },
];

/* ── 진도 바 ───────────────────────────── */
function ProgressBar({ value }: { value: number }) {
  return (
    <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6, overflow: 'hidden' }}>
      <div style={{
        width: `${Math.min(100, Math.max(0, value))}%`,
        height: '100%',
        background: value >= 100 ? '#6366f1' : '#10b981',
        borderRadius: 4,
        transition: 'width 0.3s',
      }} />
    </div>
  );
}

/* ── Action 정책 — 상태별 다음 행동 ───── */
type EnrollmentAction = {
  key: string;
  label: string;
  variant: 'primary' | 'secondary';
  onClick: () => void;
};

function buildEnrollmentActions(
  enrollment: Enrollment,
  navigate: ReturnType<typeof useNavigate>,
): EnrollmentAction[] {
  const { status, courseId } = enrollment;
  const goCourse = () => navigate(`/lms/course/${courseId}`);
  const goCertificate = () => navigate('/mypage/certificates');

  switch (status) {
    case 'in_progress':
    case 'approved':
      return [{ key: 'continue', label: '이어서 학습', variant: 'primary', onClick: goCourse }];
    case 'completed':
      return [
        { key: 'certificate', label: '수료증 보기', variant: 'primary', onClick: goCertificate },
        { key: 'review',      label: '다시 보기',   variant: 'secondary', onClick: goCourse },
      ];
    case 'pending':
      return [{ key: 'detail', label: '신청 상세', variant: 'secondary', onClick: goCourse }];
    case 'rejected':
    case 'cancelled':
    case 'expired':
    default:
      return [{ key: 'view', label: '강의 보기', variant: 'secondary', onClick: goCourse }];
  }
}

/* ── 수강 카드 (hybrid row) ───────────────
   Desktop: [thumb] [identity + meta + progress] [actions]  3-column row
   Mobile : flex-wrap 으로 actions 가 아래로 wrap 되는 card 형태 유지   */
function EnrollmentCard({ enrollment, actions }: { enrollment: Enrollment; actions: EnrollmentAction[] }) {
  const { course, status, progressPercentage, completedLessons, totalLessons, enrolledAt, completedAt } = enrollment;

  const isActive = status === 'in_progress' || status === 'approved';
  const isCompleted = status === 'completed';
  const showProgress = isActive || isCompleted;

  return (
    <div
      style={{
        background: colors.white,
        border: `1px solid ${colors.neutral200}`,
        borderRadius: 12,
        padding: '20px 24px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'stretch',
        gap: 20,
        transition: 'box-shadow 0.15s',
      }}
    >
      {/* 1. Thumbnail */}
      <div style={{
        width: 112, height: 80, borderRadius: 8, flexShrink: 0,
        background: course.thumbnail ? undefined : '#e5e7eb',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {course.thumbnail
          ? <img src={course.thumbnail} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 32 }} aria-hidden>📚</span>
        }
      </div>

      {/* 2. Identity + Meta + Progress */}
      <div style={{ flex: '1 1 280px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* identity row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3 style={{
            fontSize: 15, fontWeight: 600, color: colors.neutral900, margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0,
          }}>
            {course.title}
          </h3>
          <span style={{
            flexShrink: 0,
            padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
            color: '#fff', background: STATUS_COLOR[status],
          }}>
            {STATUS_LABEL[status]}
          </span>
        </div>

        {/* meta row — duration / enrolled / completed */}
        <div style={{ display: 'flex', gap: 10, fontSize: 12, color: colors.neutral500, flexWrap: 'wrap' }}>
          {course.duration > 0 && <span>⏱ {course.duration}분</span>}
          {enrolledAt && <span>📝 신청 {new Date(enrolledAt).toLocaleDateString('ko-KR')}</span>}
          {isCompleted && completedAt && (
            <span style={{ color: '#6366f1', fontWeight: 600 }}>
              🎓 수료 {new Date(completedAt).toLocaleDateString('ko-KR')}
            </span>
          )}
        </div>

        {/* progress row */}
        {showProgress && (
          <div style={{ marginTop: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: colors.neutral500, marginBottom: 4 }}>
              <span>{completedLessons}/{totalLessons} 레슨 완료</span>
              <span style={{ fontWeight: 600, color: isCompleted ? '#6366f1' : colors.neutral700 }}>
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <ProgressBar value={progressPercentage} />
          </div>
        )}
      </div>

      {/* 3. Action stack */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        alignSelf: 'center',
        flexShrink: 0,
        minWidth: 120,
      }}>
        {actions.map((action) => (
          <button
            key={action.key}
            onClick={action.onClick}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 8,
              cursor: 'pointer',
              border: action.variant === 'primary' ? 'none' : `1px solid ${colors.neutral200}`,
              background: action.variant === 'primary' ? colors.primary : colors.white,
              color: action.variant === 'primary' ? '#fff' : colors.neutral700,
              whiteSpace: 'nowrap',
              transition: 'opacity 0.15s',
            }}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── 메인 페이지 ───────────────────────── */
export function MyEnrollmentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // WO-O4O-LMS-V2-COMMONIZATION-CLEANUP-V1: lmsApi.getMyEnrollments factory 경유로 전환.
      // 기존: authClient.api.get('/lms/enrollments/me') 직접. lmsApi 가 동일 endpoint 사용.
      const res: any = await lmsApi.getMyEnrollments();
      // API envelope: { success, data: Enrollment[], pagination }
      const data = res?.data;
      setEnrollments(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError('수강 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === 'all'
    ? enrollments
    : enrollments.filter((e) => {
        if (filter === 'in_progress') return e.status === 'in_progress' || e.status === 'approved';
        if (filter === 'cancelled') return e.status === 'cancelled' || e.status === 'rejected' || e.status === 'expired';
        return e.status === filter;
      });

  return (
    <MyPageLayout
      title="내 수강 목록"
      description="신청하거나 진행 중인 강의를 확인하세요."
      breadcrumb={[{ label: '홈', href: '/' }, { label: '마이페이지', href: '/mypage' }, { label: '내 수강' }]}
      width="wide"
    >
      {/* 필터 탭 */}
      <div style={{ display: 'flex', gap: 8, margin: '20px 0', flexWrap: 'wrap' }}>
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            style={{
              padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: filter === opt.value ? 600 : 400,
              border: `1px solid ${filter === opt.value ? colors.primary : colors.neutral200}`,
              background: filter === opt.value ? colors.primary : colors.white,
              color: filter === opt.value ? '#fff' : colors.neutral600,
              cursor: 'pointer',
            }}
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
            {opt.value !== 'all' && (
              <span style={{ marginLeft: 4, opacity: 0.8 }}>
                ({enrollments.filter((e) => {
                  if (opt.value === 'in_progress') return e.status === 'in_progress' || e.status === 'approved';
                  if (opt.value === 'cancelled') return e.status === 'cancelled' || e.status === 'rejected' || e.status === 'expired';
                  return e.status === opt.value;
                }).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 목록 */}
      {loading && <MyPageLoadingState />}

      {!loading && error && (
        <div style={{ padding: '20px', color: '#ef4444', background: '#fef2f2', borderRadius: 8, fontSize: 14 }}>
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <MyPageEmptyState
          title={filter === 'all' ? '수강 중인 강의가 없습니다' : '해당 상태의 강의가 없습니다'}
          description={filter === 'all' ? '강의 목록에서 관심 있는 강의를 찾아보세요.' : undefined}
          actionLabel={filter === 'all' ? '강의 둘러보기' : undefined}
          onAction={filter === 'all' ? () => navigate('/courses') : undefined}
        />
      )}

      {!loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((enrollment) => (
            <EnrollmentCard
              key={enrollment.id}
              enrollment={enrollment}
              actions={buildEnrollmentActions(enrollment, navigate)}
            />
          ))}
        </div>
      )}

      {/* 총 수 */}
      {!loading && enrollments.length > 0 && (
        <div style={{ marginTop: 20, fontSize: 13, color: colors.neutral400, textAlign: 'right' }}>
          전체 {enrollments.length}개 · 표시 {filtered.length}개
        </div>
      )}
    </MyPageLayout>
  );
}
