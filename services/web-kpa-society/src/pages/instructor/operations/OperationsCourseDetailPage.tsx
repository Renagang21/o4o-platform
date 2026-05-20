/**
 * OperationsCourseDetailPage — 선택한 강의 운영 화면
 *
 * WO-O4O-KPA-LMS-INSTRUCTOR-OPERATIONS-MENU-REFACTOR-V1 (초기 구조)
 * WO-O4O-KPA-LMS-INSTRUCTOR-OPERATIONS-PARTICIPANTS-LIST-V1 (수강회원 리스트 연결)
 *
 * 경로: /instructor/operations/:courseId
 * 접근 조건: lms:instructor 역할 보유 (App.tsx RoleGuard)
 *
 * 책임:
 *  - 선택한 강의의 기본 운영 지표 표시 (KPI)
 *  - 수강 회원 리스트 표시 (인라인 BaseTable)
 *  - 추후 진도 / 퀴즈 / 수료증 기능 확장을 위한 섹션 placeholder
 *
 * 본 WO 범위: 수강회원 리스트 표시까지. row click 상세는 미구현 (placeholder).
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { BaseTable, type O4OColumn } from '@o4o/ui';
import { lmsInstructorApi } from '../../../api/lms-instructor';
import { colors, typography } from '../../../styles/theme';

type CourseHeader = {
  courseId: string;
  title: string;
  status: string;
};

type CourseStats = {
  totalEnrollments: number;
  inProgressCount: number;
  completedCount: number;
  completionRate: number;
  averageProgress: number;
  quizPassRate: number;
  averageQuizScore: number;
  certificateIssuedCount: number;
};

// 수강 회원 — participants API items (status는 enrollment status enum)
type Participant = {
  enrollmentId: string;
  userId: string;
  userName: string;
  enrolledAt: string;
  status: string;
  progressPercentage: number;
};

// enrollment status → 수강 상태 label
const ENROLLMENT_LABEL: Record<string, string> = {
  pending: '대기',
  approved: '준비',
  in_progress: '진행 중',
  completed: '완료',
  cancelled: '취소',
  rejected: '거절',
  expired: '만료',
};
const ENROLLMENT_COLOR: Record<string, { bg: string; color: string }> = {
  pending:     { bg: '#fef3c7', color: '#92400e' },
  approved:    { bg: '#e0f2fe', color: '#0369a1' },
  in_progress: { bg: '#dbeafe', color: '#1d4ed8' },
  completed:   { bg: '#dcfce7', color: '#15803d' },
  cancelled:   { bg: '#fee2e2', color: '#b91c1c' },
  rejected:    { bg: '#fce7f3', color: '#9d174d' },
  expired:     { bg: '#f3f4f6', color: '#6b7280' },
};

// enrollment status → 승인 상태 (파생)
function approvalLabel(status: string): { label: string; bg: string; color: string } {
  if (status === 'pending') return { label: '승인 대기', bg: '#fef3c7', color: '#92400e' };
  if (status === 'rejected') return { label: '거절됨', bg: '#fce7f3', color: '#9d174d' };
  return { label: '승인됨', bg: '#dcfce7', color: '#15803d' };
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('ko-KR'); } catch { return '-'; }
}

function shortId(id: string): string {
  if (!id) return '-';
  return id.length > 8 ? id.slice(-8) : id;
}

function KpiCard({ label, value, sub, accent }: {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
}) {
  return (
    <div style={{
      backgroundColor: colors.white,
      borderRadius: '10px',
      padding: '16px 20px',
      borderLeft: `4px solid ${accent}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
    }}>
      <p style={{ fontSize: '12px', color: colors.neutral500, margin: '0 0 6px' }}>{label}</p>
      <p style={{ fontSize: '24px', fontWeight: 700, color: colors.neutral900, margin: 0, lineHeight: 1 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {sub && <p style={{ fontSize: '11px', color: colors.neutral400, margin: '6px 0 0' }}>{sub}</p>}
    </div>
  );
}

function SectionCard({
  title,
  description,
  action,
  status,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  status?: 'ready' | 'planned';
}) {
  return (
    <div style={{
      backgroundColor: colors.white,
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: colors.neutral900, margin: 0 }}>{title}</h3>
        {status === 'planned' && (
          <span style={{
            fontSize: '11px',
            padding: '2px 8px',
            border: `1px solid ${colors.neutral200}`,
            color: colors.neutral500,
            borderRadius: '10px',
          }}>
            준비중
          </span>
        )}
      </div>
      <p style={{ fontSize: '13px', color: colors.neutral500, margin: 0, flex: 1 }}>{description}</p>
      {action && <div style={{ marginTop: '6px' }}>{action}</div>}
    </div>
  );
}

export default function OperationsCourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [header, setHeader] = useState<CourseHeader | null>(null);
  const [stats, setStats] = useState<CourseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 수강 회원 리스트 상태
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(true);
  const [participantsError, setParticipantsError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const res = await lmsInstructorApi.dashboardCourses();
        if (cancelled) return;
        const list = res.data?.data?.courses ?? [];
        const found = list.find((c: { courseId: string }) => c.courseId === courseId);
        if (!found) {
          setError('강의를 찾을 수 없습니다.');
          return;
        }
        setHeader({ courseId: found.courseId, title: found.title, status: found.status });
      } catch {
        if (!cancelled) setError('강의 정보를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    (async () => {
      try {
        setStatsLoading(true);
        const res = await lmsInstructorApi.dashboardStats(courseId);
        if (cancelled) return;
        setStats(res.data?.data ?? null);
      } catch {
        if (!cancelled) setStats(null);
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    })();

    // 수강 회원 리스트 — status 미지정 시 모든 enrollment (pending 포함) 반환
    (async () => {
      try {
        setParticipantsLoading(true);
        setParticipantsError(null);
        const res = await lmsInstructorApi.participants(courseId, { limit: 100 });
        if (cancelled) return;
        const items = res.data?.data?.items ?? [];
        // pending(승인 대기) 우선 → 최신 신청 순
        const sorted = [...items].sort((a, b) => {
          const aPending = a.status === 'pending' ? 0 : 1;
          const bPending = b.status === 'pending' ? 0 : 1;
          if (aPending !== bPending) return aPending - bPending;
          return new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime();
        });
        setParticipants(sorted);
      } catch {
        if (!cancelled) setParticipantsError('수강 회원 목록을 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setParticipantsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [courseId]);

  // BaseTable 컬럼 정의 (회원명/식별/수강상태/승인상태/진도율/신청일/최근학습일)
  const participantColumns = useMemo<O4OColumn<Participant>[]>(() => [
    {
      key: 'userName',
      header: '회원명',
      render: (_v, row) => (
        <span style={{ fontWeight: 600, color: colors.neutral900 }}>
          {row.userName || '(이름 없음)'}
        </span>
      ),
    },
    {
      key: 'userId',
      header: '식별 ID',
      width: '120px',
      render: (_v, row) => (
        <span style={{ fontSize: '12px', color: colors.neutral500, fontFamily: 'monospace' }}>
          {shortId(row.userId)}
        </span>
      ),
    },
    {
      key: 'status',
      header: '수강 상태',
      width: '100px',
      align: 'center',
      render: (_v, row) => {
        const c = ENROLLMENT_COLOR[row.status] ?? { bg: '#f3f4f6', color: '#374151' };
        return (
          <span style={{
            display: 'inline-block',
            padding: '2px 10px',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: c.bg,
            color: c.color,
          }}>
            {ENROLLMENT_LABEL[row.status] ?? row.status}
          </span>
        );
      },
    },
    {
      key: '_approval',
      header: '승인 상태',
      width: '100px',
      align: 'center',
      render: (_v, row) => {
        const a = approvalLabel(row.status);
        return (
          <span style={{
            display: 'inline-block',
            padding: '2px 10px',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: a.bg,
            color: a.color,
          }}>
            {a.label}
          </span>
        );
      },
    },
    {
      key: 'progressPercentage',
      header: '진도율',
      width: '80px',
      align: 'right',
      render: (_v, row) => (
        <span style={{ fontSize: '13px', color: colors.neutral700 }}>
          {(row.progressPercentage ?? 0).toFixed(1)}%
        </span>
      ),
    },
    {
      key: 'enrolledAt',
      header: '신청일',
      width: '110px',
      align: 'center',
      render: (_v, row) => (
        <span style={{ fontSize: '12px', color: colors.neutral500 }}>
          {formatDate(row.enrolledAt)}
        </span>
      ),
    },
    {
      // 최근 학습일: 백엔드 participants API 미노출 (lms_progress.lastAccessedAt 집계 필요).
      // 본 WO 범위 밖 — placeholder '-' 로 표시.
      key: '_lastStudiedAt',
      header: '최근 학습일',
      width: '110px',
      align: 'center',
      render: () => (
        <span style={{ fontSize: '12px', color: colors.neutral300 }} title="추후 backend 확장 예정">
          -
        </span>
      ),
    },
  ], []);

  // 회원 row click — 본 WO 범위 밖 (상세 미구현)
  const handleParticipantClick = () => {
    alert('회원 상세 화면은 추후 단계에서 제공됩니다.');
  };

  const pendingCount = useMemo(
    () => participants.filter(p => p.status === 'pending').length,
    [participants],
  );

  if (loading) {
    return <div style={styles.stateBox}>강의 정보를 불러오는 중...</div>;
  }

  if (error || !header) {
    return (
      <div style={styles.container}>
        <div style={styles.breadcrumb}>
          <Link to="/instructor/operations" style={styles.breadcrumbLink}>강의 운영</Link>
          <span style={styles.breadcrumbSep}>/</span>
          <span style={styles.breadcrumbCurrent}>알 수 없는 강의</span>
        </div>
        <div style={styles.errorBanner}>{error ?? '강의 정보를 불러오지 못했습니다.'}</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Breadcrumb */}
      <div style={styles.breadcrumb}>
        <Link to="/instructor/operations" style={styles.breadcrumbLink}>강의 운영</Link>
        <span style={styles.breadcrumbSep}>/</span>
        <span style={styles.breadcrumbCurrent}>{header.title}</span>
      </div>

      {/* 헤더 */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>{header.title}</h1>
          <p style={styles.subtitle}>강의별 운영 지표와 기능을 이곳에서 관리합니다.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            style={styles.secondaryBtn}
            onClick={() => navigate(`/instructor/courses/${header.courseId}`)}
          >
            강의 편집
          </button>
        </div>
      </div>

      {/* KPI */}
      {statsLoading ? (
        <div style={styles.stateBox}>운영 지표를 불러오는 중...</div>
      ) : stats ? (
        <div style={styles.kpiGrid}>
          <KpiCard
            label="전체 수강자"
            value={stats.totalEnrollments}
            sub={`진행 중 ${stats.inProgressCount} · 완료 ${stats.completedCount}`}
            accent="#2563eb"
          />
          <KpiCard
            label="완료율"
            value={`${stats.completionRate.toFixed(1)}%`}
            sub="강의 완료 비율"
            accent="#10b981"
          />
          <KpiCard
            label="평균 진도"
            value={`${stats.averageProgress.toFixed(1)}%`}
            sub="수강자 평균"
            accent="#f59e0b"
          />
          <KpiCard
            label="퀴즈 통과율"
            value={`${stats.quizPassRate.toFixed(1)}%`}
            sub={`평균 점수 ${stats.averageQuizScore.toFixed(1)}점`}
            accent="#8b5cf6"
          />
          <KpiCard
            label="수료증 발급"
            value={stats.certificateIssuedCount}
            sub="발급 누계"
            accent="#06b6d4"
          />
        </div>
      ) : (
        <div style={styles.stateBox}>운영 지표를 불러올 수 없습니다.</div>
      )}

      {/* 수강 회원 리스트 */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <div>
            <h2 style={styles.sectionTitle}>수강 회원</h2>
            <p style={styles.sectionHint}>
              {participantsLoading
                ? '불러오는 중...'
                : `총 ${participants.length}명${pendingCount > 0 ? ` · 승인 대기 ${pendingCount}명` : ''}`}
            </p>
          </div>
          <button
            style={styles.secondaryBtn}
            onClick={() => navigate(`/instructor/contents/${header.courseId}/participants`)}
          >
            고급 회원관리 / CSV
          </button>
        </div>

        {participantsError && (
          <div style={styles.errorBanner}>{participantsError}</div>
        )}

        {!participantsError && participantsLoading && (
          <div style={styles.stateBox}>수강 회원을 불러오는 중...</div>
        )}

        {!participantsError && !participantsLoading && (
          <BaseTable<Participant>
            columns={participantColumns}
            data={participants}
            rowKey={(row) => row.enrollmentId}
            emptyMessage={
              <div style={{ textAlign: 'center', padding: '40px 0', color: colors.neutral400 }}>
                아직 수강 회원이 없습니다.
              </div>
            }
            onRowClick={handleParticipantClick}
          />
        )}
      </div>

      {/* 운영 기능 섹션 (canonical extension points) */}
      <div style={styles.sectionGrid}>
        <SectionCard
          title="진도 관리"
          description="레슨별 진행 현황과 미진행 수강자를 추적합니다."
          status="planned"
        />
        <SectionCard
          title="퀴즈 / 평가"
          description="퀴즈 응시 결과, 평균 점수, 통과율을 관리합니다."
          status="planned"
        />
        <SectionCard
          title="수료증"
          description="수료 조건 검토와 수료증 발급/재발급을 진행합니다."
          status="planned"
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: 0 },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: colors.neutral500,
    marginBottom: '12px',
  },
  breadcrumbLink: { color: colors.primary, textDecoration: 'none' },
  breadcrumbSep: { color: colors.neutral400 },
  breadcrumbCurrent: { color: colors.neutral700, fontWeight: 500 },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    flexWrap: 'wrap',
    marginBottom: '20px',
  },
  pageTitle: { ...typography.headingL, color: colors.neutral900, margin: 0 },
  subtitle: { fontSize: '14px', color: colors.neutral500, marginTop: '4px' },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    marginBottom: '24px',
  },
  sectionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '12px',
  },
  tableCard: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    padding: '20px',
    marginBottom: '24px',
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '12px',
  },
  sectionTitle: { ...typography.headingS, color: colors.neutral900, margin: 0 },
  sectionHint: { fontSize: '12px', color: colors.neutral500, margin: '4px 0 0' },
  stateBox: { padding: '40px', textAlign: 'center' as const, color: colors.neutral500 },
  errorBanner: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '14px',
  },
  secondaryBtn: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 500,
    color: colors.primary,
    backgroundColor: 'transparent',
    border: `1px solid ${colors.primary}`,
    borderRadius: '6px',
    cursor: 'pointer',
  },
};
