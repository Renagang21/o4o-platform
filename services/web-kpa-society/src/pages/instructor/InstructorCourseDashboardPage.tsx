/**
 * InstructorCourseDashboardPage — 강의 운영 대시보드
 *
 * WO-O4O-LMS-INSTRUCTOR-DASHBOARD-MVP-V1
 * 경로: /instructor/dashboard
 * 접근 조건: lms:instructor 역할 보유
 */

import { useState, useEffect } from 'react';
import { lmsInstructorApi } from '../../api/lms-instructor';
import { colors, typography } from '../../styles/theme';

// ── 공통 카드 ────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div style={{
      backgroundColor: colors.white,
      borderRadius: '12px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      padding: '24px',
      borderLeft: `4px solid ${accent || colors.primary}`,
    }}>
      <p style={{ ...typography.bodyS, color: colors.neutral500, marginBottom: '8px' }}>{label}</p>
      <p style={{ fontSize: '32px', fontWeight: 700, color: colors.neutral900, lineHeight: 1 }}>
        {value}
      </p>
      {sub && (
        <p style={{ ...typography.bodyS, color: colors.neutral400, marginTop: '6px' }}>{sub}</p>
      )}
    </div>
  );
}

// ── 강의 선택 드롭다운 ────────────────────────────────────────
function CourseSelector({
  courses,
  selected,
  onChange,
}: {
  courses: Array<{ courseId: string; title: string; status: string }>;
  selected: string;
  onChange: (id: string) => void;
}) {
  return (
    <select
      value={selected}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '10px 16px',
        borderRadius: '8px',
        border: `1px solid ${colors.neutral300}`,
        fontSize: '14px',
        color: colors.neutral800,
        backgroundColor: colors.white,
        cursor: 'pointer',
        minWidth: '280px',
      }}
    >
      {courses.map(c => (
        <option key={c.courseId} value={c.courseId}>
          {c.title} {c.status !== 'published' ? `(${c.status})` : ''}
        </option>
      ))}
    </select>
  );
}

// ── 강의 목록 테이블 ──────────────────────────────────────────
function CourseTable({
  courses,
  selectedId,
  onSelect,
}: {
  courses: Array<{
    courseId: string;
    title: string;
    status: string;
    totalEnrollments: number;
    completionRate: number;
    averageProgress: number;
  }>;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div style={{
      backgroundColor: colors.white,
      borderRadius: '12px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      overflow: 'hidden',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: colors.neutral50 }}>
            {['강의명', '상태', '수강자', '완료율', '평균 진도율'].map(h => (
              <th key={h} style={{
                padding: '12px 16px',
                textAlign: 'left',
                ...typography.bodyS,
                fontWeight: 600,
                color: colors.neutral600,
                borderBottom: `1px solid ${colors.neutral200}`,
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {courses.map(c => (
            <tr
              key={c.courseId}
              onClick={() => onSelect(c.courseId)}
              style={{
                cursor: 'pointer',
                backgroundColor: c.courseId === selectedId ? '#eff6ff' : undefined,
                transition: 'background 0.1s',
              }}
            >
              <td style={{ padding: '12px 16px', ...typography.bodyM, color: colors.neutral900, fontWeight: c.courseId === selectedId ? 600 : 400 }}>
                {c.title}
              </td>
              <td style={{ padding: '12px 16px' }}>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  backgroundColor: c.status === 'published' ? '#dcfce7' : colors.neutral100,
                  color: c.status === 'published' ? '#15803d' : colors.neutral600,
                }}>
                  {c.status === 'published' ? '공개' : c.status === 'draft' ? '초안' : c.status}
                </span>
              </td>
              <td style={{ padding: '12px 16px', ...typography.bodyM, color: colors.neutral700 }}>
                {c.totalEnrollments.toLocaleString()}명
              </td>
              <td style={{ padding: '12px 16px', ...typography.bodyM, color: colors.neutral700 }}>
                {c.completionRate.toFixed(1)}%
              </td>
              <td style={{ padding: '12px 16px', ...typography.bodyM, color: colors.neutral700 }}>
                {c.averageProgress.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────
export default function InstructorCourseDashboardPage() {
  const [courseList, setCourseList] = useState<Array<{
    courseId: string;
    title: string;
    status: string;
    totalEnrollments: number;
    completionRate: number;
    averageProgress: number;
  }>>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [stats, setStats] = useState<{
    totalEnrollments: number;
    inProgressCount: number;
    completedCount: number;
    completionRate: number;
    averageProgress: number;
    quizPassRate: number;
    averageQuizScore: number;
    certificateIssuedCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 강의 목록 로드
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await lmsInstructorApi.dashboardCourses();
        const list = (res as any).data?.courses ?? [];
        setCourseList(list);
        if (list.length > 0) setSelectedCourseId(list[0].courseId);
      } catch {
        setError('강의 목록을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // 선택된 강의 통계 로드
  useEffect(() => {
    if (!selectedCourseId) return;
    const loadStats = async () => {
      try {
        setStatsLoading(true);
        const res = await lmsInstructorApi.dashboardStats(selectedCourseId);
        setStats((res as any).data ?? null);
      } catch {
        setStats(null);
      } finally {
        setStatsLoading(false);
      }
    };
    loadStats();
  }, [selectedCourseId]);

  if (loading) {
    return (
      <div style={styles.container}>
        <p style={{ color: colors.neutral500 }}>대시보드를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <p style={{ color: '#dc2626' }}>{error}</p>
      </div>
    );
  }

  if (courseList.length === 0) {
    return (
      <div style={styles.container}>
        <h1 style={styles.pageTitle}>강의 운영 대시보드</h1>
        <div style={{ textAlign: 'center', padding: '60px 0', color: colors.neutral500 }}>
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>📚</p>
          <p>등록된 강의가 없습니다.</p>
        </div>
      </div>
    );
  }

  const selectedCourse = courseList.find(c => c.courseId === selectedCourseId);

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>강의 운영 대시보드</h1>
        <CourseSelector
          courses={courseList}
          selected={selectedCourseId}
          onChange={setSelectedCourseId}
        />
      </div>

      {/* 선택된 강의명 */}
      {selectedCourse && (
        <p style={{ ...typography.bodyM, color: colors.neutral600, marginBottom: '24px' }}>
          {selectedCourse.title}
        </p>
      )}

      {/* 통계 카드 5개 */}
      {statsLoading ? (
        <p style={{ color: colors.neutral500 }}>통계를 불러오는 중...</p>
      ) : stats ? (
        <div style={styles.cardGrid}>
          <StatCard
            label="전체 수강자"
            value={`${stats.totalEnrollments.toLocaleString()}명`}
            sub={`진행 중 ${stats.inProgressCount}명 · 완료 ${stats.completedCount}명`}
            accent={colors.primary}
          />
          <StatCard
            label="완료율"
            value={`${stats.completionRate.toFixed(1)}%`}
            sub={`완료 ${stats.completedCount}명 / 전체 ${stats.totalEnrollments}명`}
            accent="#10b981"
          />
          <StatCard
            label="진행 중 수강자"
            value={`${stats.inProgressCount.toLocaleString()}명`}
            sub={`평균 진도율 ${stats.averageProgress.toFixed(1)}%`}
            accent="#f59e0b"
          />
          <StatCard
            label="퀴즈 통과율"
            value={`${stats.quizPassRate.toFixed(1)}%`}
            sub={`평균 점수 ${stats.averageQuizScore.toFixed(1)}점`}
            accent="#8b5cf6"
          />
          <StatCard
            label="수료증 발행"
            value={`${stats.certificateIssuedCount.toLocaleString()}건`}
            accent="#06b6d4"
          />
        </div>
      ) : (
        <p style={{ color: colors.neutral500 }}>통계를 불러올 수 없습니다.</p>
      )}

      {/* 강의 목록 테이블 */}
      <div style={{ marginTop: '40px' }}>
        <h2 style={styles.sectionTitle}>강의별 현황</h2>
        <CourseTable
          courses={courseList}
          selectedId={selectedCourseId}
          onSelect={setSelectedCourseId}
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '32px 24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  pageTitle: {
    ...typography.headingL,
    color: colors.neutral900,
  },
  sectionTitle: {
    ...typography.headingS,
    color: colors.neutral800,
    marginBottom: '16px',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
  },
};
