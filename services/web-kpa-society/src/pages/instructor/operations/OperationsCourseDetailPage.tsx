/**
 * OperationsCourseDetailPage — 선택한 강의 운영 화면
 *
 * WO-O4O-KPA-LMS-INSTRUCTOR-OPERATIONS-MENU-REFACTOR-V1
 * 경로: /instructor/operations/:courseId
 * 접근 조건: lms:instructor 역할 보유 (App.tsx RoleGuard)
 *
 * 책임 (canonical 구조):
 *  - 선택한 강의의 기본 운영 지표 표시 (KPI)
 *  - 추후 회원관리 / 진도 / 퀴즈 / 수료증 기능 확장을 위한 섹션 placeholder
 *
 * 본 WO에서는 내부 운영 기능 전체 구현은 하지 않는다.
 * 회원관리(참여자)는 기존 /instructor/contents/:courseId/participants 로 연결한다.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
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

    return () => { cancelled = true; };
  }, [courseId]);

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

      {/* 운영 기능 섹션 (canonical extension points) */}
      <div style={styles.sectionGrid}>
        <SectionCard
          title="회원 관리"
          description="수강 신청·승인/거절·진도·수료 여부를 한 곳에서 관리합니다."
          status="ready"
          action={
            <button
              style={styles.primaryBtn}
              onClick={() => navigate(`/instructor/contents/${header.courseId}/participants`)}
            >
              회원 관리 열기
            </button>
          }
        />
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
  stateBox: { padding: '40px', textAlign: 'center' as const, color: colors.neutral500 },
  errorBanner: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '14px',
  },
  primaryBtn: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 500,
    color: colors.white,
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
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
