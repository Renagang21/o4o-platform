/**
 * MyEnrollmentsPage — 내 수강 목록
 * WO-O4O-ENROLLMENT-SYSTEM-V1
 *
 * Route: /mypage/enrollments
 * API: GET /lms/enrollments/me
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState } from '../../components/common';
import { MyPageNavigation } from '@o4o/account-ui';
import { KPA_MYPAGE_NAV_ITEMS } from './navItems';
import { authClient } from '../../contexts/AuthContext';
import { useAuth } from '../../contexts';
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

/* ── 수강 카드 ─────────────────────────── */
function EnrollmentCard({ enrollment, onNavigate }: { enrollment: Enrollment; onNavigate: () => void }) {
  const { course, status, progressPercentage, completedLessons, totalLessons, enrolledAt } = enrollment;

  const isActive = status === 'in_progress' || status === 'approved';
  const isCompleted = status === 'completed';

  return (
    <div
      style={{
        background: colors.white,
        border: `1px solid ${colors.neutral200}`,
        borderRadius: 12,
        padding: '20px 24px',
        display: 'flex',
        gap: 16,
        cursor: isActive || isCompleted ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s',
      }}
      onClick={isActive || isCompleted ? onNavigate : undefined}
    >
      {/* 썸네일 */}
      <div style={{
        width: 80, height: 60, borderRadius: 8, flexShrink: 0,
        background: course.thumbnail ? undefined : '#e5e7eb',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {course.thumbnail
          ? <img src={course.thumbnail} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 24 }}>📚</span>
        }
      </div>

      {/* 본문 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: colors.neutral900, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

        <div style={{ display: 'flex', gap: 10, fontSize: 12, color: colors.neutral500, marginBottom: 10 }}>
          {course.duration > 0 && <span>{course.duration}분</span>}
          {course.duration > 0 && enrolledAt && <span>·</span>}
          {enrolledAt && <span>신청일: {new Date(enrolledAt).toLocaleDateString('ko-KR')}</span>}
        </div>

        {/* 진도 */}
        {(isActive || isCompleted) && (
          <div>
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
      const res: any = await authClient.api.get('/lms/enrollments/me');
      // API: { success, data: Enrollment[], pagination }
      const data = res.data?.data;
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
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px', display: 'flex', gap: 28 }}>

        {/* 사이드바 */}
        <div style={{ flexShrink: 0, width: 200 }}>
          <MyPageNavigation items={KPA_MYPAGE_NAV_ITEMS} />
        </div>

        {/* 메인 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <PageHeader title="내 수강 목록" description="신청하거나 진행 중인 강의를 확인하세요." />

          {/* 필터 탭 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
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
          {loading && <LoadingSpinner />}

          {!loading && error && (
            <div style={{ padding: '20px', color: '#ef4444', background: '#fef2f2', borderRadius: 8, fontSize: 14 }}>
              {error}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <EmptyState
              title={filter === 'all' ? '수강 중인 강의가 없습니다' : '해당 상태의 강의가 없습니다'}
              description={filter === 'all' ? '강의 목록에서 관심 있는 강의를 찾아보세요.' : undefined}
              action={filter === 'all' ? { label: '강의 둘러보기', onClick: () => navigate('/courses') } : undefined}
            />
          )}

          {!loading && !error && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map((enrollment) => (
                <EnrollmentCard
                  key={enrollment.id}
                  enrollment={enrollment}
                  onNavigate={() => navigate(`/lms/course/${enrollment.courseId}`)}
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
        </div>
      </div>
    </div>
  );
}
