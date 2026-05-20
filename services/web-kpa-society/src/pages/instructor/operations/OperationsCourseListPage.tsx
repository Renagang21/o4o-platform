/**
 * OperationsCourseListPage — 강의 운영 진입 페이지 (강의 목록)
 *
 * WO-O4O-KPA-LMS-INSTRUCTOR-OPERATIONS-MENU-REFACTOR-V1
 * 경로: /instructor/operations
 * 접근 조건: lms:instructor 역할 보유 (App.tsx RoleGuard)
 *
 * 책임:
 *  - 강사 강의 목록 표시 (요약 통계 포함)
 *  - 강의 선택 → /instructor/operations/:courseId 로 이동
 *
 * 본 페이지는 운영 진입 hub이며, 강의별 운영 내부 기능은 detail 페이지에서 확장된다.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { lmsInstructorApi, type CourseStatus } from '../../../api/lms-instructor';
import { colors, typography } from '../../../styles/theme';

type OperationsCourse = {
  courseId: string;
  title: string;
  status: CourseStatus | string;
  totalEnrollments: number;
  completionRate: number;
  averageProgress: number;
};

const STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  pending_review: '검토 대기',
  published: '공개',
  rejected: '반려됨',
  archived: '종료',
};
const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  draft:          { bg: '#f3f4f6', color: '#374151' },
  pending_review: { bg: '#dbeafe', color: '#1d4ed8' },
  published:      { bg: '#dcfce7', color: '#15803d' },
  rejected:       { bg: '#fee2e2', color: '#b91c1c' },
  archived:       { bg: '#f3f4f6', color: '#6b7280' },
};

export default function OperationsCourseListPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<OperationsCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await lmsInstructorApi.dashboardCourses();
        if (cancelled) return;
        setCourses(res.data?.data?.courses ?? []);
      } catch {
        if (!cancelled) setError('강의 목록을 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>강의 운영</h1>
          <p style={styles.subtitle}>
            운영할 강의를 선택하세요. 강의별 회원관리 · 진도 · 퀴즈 · 수료증 기능으로 이동합니다.
          </p>
        </div>
      </div>

      {loading && (
        <div style={styles.stateBox}>강의 목록을 불러오는 중...</div>
      )}

      {!loading && error && (
        <div style={styles.errorBanner}>{error}</div>
      )}

      {!loading && !error && courses.length === 0 && (
        <div style={styles.emptyBox}>
          <p style={{ ...typography.bodyM, color: colors.neutral600, marginBottom: '12px' }}>
            등록된 강의가 없습니다.
          </p>
          <button style={styles.primaryBtn} onClick={() => navigate('/instructor/courses/new')}>
            + 강의 등록
          </button>
        </div>
      )}

      {!loading && !error && courses.length > 0 && (
        <div style={styles.card}>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={{ backgroundColor: colors.neutral50 }}>
                  {['강의명', '상태', '수강자', '완료율', '평균 진도', ''].map((h, i) => (
                    <th key={i} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {courses.map(c => {
                  const sc = STATUS_COLOR[c.status] ?? { bg: '#f3f4f6', color: '#374151' };
                  return (
                    <tr
                      key={c.courseId}
                      onClick={() => navigate(`/instructor/operations/${c.courseId}`)}
                      style={styles.row}
                    >
                      <td style={{ ...styles.td, fontWeight: 600, color: colors.neutral900 }}>{c.title}</td>
                      <td style={styles.td}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: sc.bg,
                          color: sc.color,
                        }}>
                          {STATUS_LABEL[c.status] ?? c.status}
                        </span>
                      </td>
                      <td style={styles.td}>{(c.totalEnrollments ?? 0).toLocaleString()}명</td>
                      <td style={styles.td}>{(c.completionRate ?? 0).toFixed(1)}%</td>
                      <td style={styles.td}>{(c.averageProgress ?? 0).toFixed(1)}%</td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <span style={styles.selectHint}>운영 →</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: 0 },
  header: { marginBottom: '20px' },
  pageTitle: { ...typography.headingL, color: colors.neutral900, margin: 0 },
  subtitle: { fontSize: '14px', color: colors.neutral500, marginTop: '4px' },
  card: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: {
    padding: '12px 16px',
    textAlign: 'left' as const,
    fontSize: '12px',
    fontWeight: 600,
    color: colors.neutral600,
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  td: {
    padding: '12px 16px',
    fontSize: '14px',
    color: colors.neutral800,
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  row: { cursor: 'pointer', transition: 'background 0.1s' },
  selectHint: { fontSize: '13px', color: colors.primary, fontWeight: 500 },
  stateBox: { padding: '40px', textAlign: 'center' as const, color: colors.neutral500 },
  emptyBox: {
    padding: '60px 24px',
    textAlign: 'center' as const,
    backgroundColor: colors.white,
    borderRadius: '12px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  errorBanner: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '14px',
  },
  primaryBtn: {
    padding: '9px 18px',
    fontSize: '14px',
    fontWeight: 500,
    color: colors.white,
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: '7px',
    cursor: 'pointer',
  },
};
