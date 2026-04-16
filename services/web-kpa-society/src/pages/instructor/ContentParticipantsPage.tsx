/**
 * ContentParticipantsPage — 콘텐츠별 참여자 관리
 *
 * WO-O4O-MARKETING-CONTENT-OPERATIONS-MVP-V1
 * 경로: /instructor/contents/:courseId/participants
 * 접근 조건: lms:instructor 역할 보유
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lmsInstructorApi } from '../../api/lms-instructor';
import { colors, typography } from '../../styles/theme';

type StatusFilter = 'all' | 'in_progress' | 'completed' | 'completed_uncredited' | 'cancelled';

interface ParticipantItem {
  enrollmentId: string;
  userId: string;
  userName: string;
  enrolledAt: string;
  status: string;
  progressPercentage: number;
  completedAt: string | null;
  certificateIssued: boolean;
  credited: boolean;
  creditAmount: number | null;
  creditedAt: string | null;
}

interface Summary {
  total: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

// ── 상태 배지 ────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    in_progress: { label: '진행중', bg: '#dbeafe', color: '#1d4ed8' },
    completed:   { label: '완료',   bg: '#dcfce7', color: '#15803d' },
    cancelled:   { label: '취소',   bg: '#fee2e2', color: '#b91c1c' },
    pending:     { label: '대기',   bg: '#fef9c3', color: '#92400e' },
    approved:    { label: '승인',   bg: '#e0f2fe', color: '#0369a1' },
    rejected:    { label: '거절',   bg: '#fce7f3', color: '#9d174d' },
    expired:     { label: '만료',   bg: '#f3f4f6', color: '#6b7280' },
  };
  const s = map[status] ?? { label: status, bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: '10px',
      fontSize: '12px',
      fontWeight: 600,
      backgroundColor: s.bg,
      color: s.color,
    }}>
      {s.label}
    </span>
  );
}

// ── 요약 카드 ─────────────────────────────────────────────────
function SummaryCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div style={{
      backgroundColor: colors.white,
      borderRadius: '10px',
      padding: '16px 20px',
      borderLeft: `4px solid ${accent}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
    }}>
      <p style={{ fontSize: '12px', color: colors.neutral500, margin: '0 0 6px' }}>{label}</p>
      <p style={{ fontSize: '26px', fontWeight: 700, color: colors.neutral900, margin: 0 }}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

// ── 필터 탭 ──────────────────────────────────────────────────
function FilterTab({
  value, current, label, count, onChange,
}: {
  value: StatusFilter; current: StatusFilter; label: string; count?: number; onChange: (v: StatusFilter) => void;
}) {
  const active = value === current;
  return (
    <button
      onClick={() => onChange(value)}
      style={{
        padding: '8px 16px',
        border: 'none',
        borderBottom: active ? `2px solid ${colors.primary}` : '2px solid transparent',
        backgroundColor: 'transparent',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: active ? 600 : 400,
        color: active ? colors.primary : colors.neutral600,
        transition: 'all 0.15s',
      }}
    >
      {label}{count !== undefined ? ` (${count})` : ''}
    </button>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────
export default function ContentParticipantsPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ParticipantItem[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, inProgress: 0, completed: 0, cancelled: 0 });
  const [courseTitle, setCourseTitle] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const LIMIT = 20;

  const load = useCallback(async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      setError(null);
      const apiParams: Parameters<typeof lmsInstructorApi.participants>[1] = {
        status: statusFilter === 'completed_uncredited' ? 'completed' : statusFilter,
        page,
        limit: LIMIT,
      };
      if (statusFilter === 'completed_uncredited') apiParams.credited = false;
      const res = await lmsInstructorApi.participants(courseId, apiParams);
      const d = (res as any).data;
      setCourseTitle(d.course?.title ?? '');
      setSummary(d.summary ?? { total: 0, inProgress: 0, completed: 0, cancelled: 0 });
      setItems(d.items ?? []);
      const t = d.pagination?.total ?? 0;
      setTotalPages(Math.max(1, Math.ceil(t / LIMIT)));
    } catch {
      setError('참여자 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [courseId, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const handleFilterChange = (f: StatusFilter) => {
    setStatusFilter(f);
    setPage(1);
  };

  const fmt = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <div style={styles.header}>
        <button
          onClick={() => navigate('/instructor/dashboard')}
          style={styles.backBtn}
        >
          ← 대시보드로
        </button>
        <div>
          <h1 style={styles.pageTitle}>참여자 관리</h1>
          {courseTitle && (
            <p style={{ ...typography.bodyM, color: colors.neutral500, margin: '4px 0 0' }}>
              {courseTitle}
            </p>
          )}
        </div>
      </div>

      {/* 요약 카드 */}
      <div style={styles.summaryGrid}>
        <SummaryCard label="전체 참여자" value={summary.total} accent={colors.primary} />
        <SummaryCard label="진행중" value={summary.inProgress} accent="#f59e0b" />
        <SummaryCard label="완료" value={summary.completed} accent="#10b981" />
        <SummaryCard label="취소" value={summary.cancelled} accent="#ef4444" />
      </div>

      {/* 상태 필터 탭 */}
      <div style={styles.tabBar}>
        <FilterTab value="all"                current={statusFilter} label="전체"       count={summary.total}       onChange={handleFilterChange} />
        <FilterTab value="in_progress"        current={statusFilter} label="진행중"     count={summary.inProgress}   onChange={handleFilterChange} />
        <FilterTab value="completed"          current={statusFilter} label="완료"       count={summary.completed}    onChange={handleFilterChange} />
        <FilterTab value="completed_uncredited" current={statusFilter} label="완료(미지급)"              onChange={handleFilterChange} />
        <FilterTab value="cancelled"          current={statusFilter} label="취소"       count={summary.cancelled}    onChange={handleFilterChange} />
      </div>

      {/* 테이블 */}
      {loading ? (
        <div style={styles.centerMsg}>
          <p style={{ color: colors.neutral500 }}>불러오는 중...</p>
        </div>
      ) : error ? (
        <div style={styles.centerMsg}>
          <p style={{ color: '#dc2626' }}>{error}</p>
          <button onClick={load} style={styles.retryBtn}>다시 시도</button>
        </div>
      ) : items.length === 0 ? (
        <div style={styles.centerMsg}>
          <p style={{ color: colors.neutral500 }}>해당 상태의 참여자가 없습니다.</p>
        </div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr style={{ backgroundColor: colors.neutral50 }}>
                {['이름', '참여일', '상태', '진도율', '완료일', '수료증', '보상'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.enrollmentId} style={styles.tr}>
                  <td style={styles.td}>
                    <span style={{ fontWeight: 500, color: colors.neutral900 }}>{item.userName}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ color: colors.neutral600, fontSize: '13px' }}>{fmt(item.enrolledAt)}</span>
                  </td>
                  <td style={styles.td}>
                    <StatusBadge status={item.status} />
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '60px',
                        height: '6px',
                        backgroundColor: colors.neutral200,
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${item.progressPercentage}%`,
                          height: '100%',
                          backgroundColor: item.progressPercentage === 100 ? '#10b981' : colors.primary,
                          borderRadius: '3px',
                        }} />
                      </div>
                      <span style={{ fontSize: '12px', color: colors.neutral600 }}>
                        {item.progressPercentage}%
                      </span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={{ color: colors.neutral600, fontSize: '13px' }}>{fmt(item.completedAt)}</span>
                  </td>
                  <td style={styles.td}>
                    {item.certificateIssued ? (
                      <span style={{ color: '#15803d', fontSize: '12px', fontWeight: 600 }}>발급됨</span>
                    ) : (
                      <span style={{ color: colors.neutral400, fontSize: '12px' }}>없음</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    {item.credited ? (
                      <div>
                        <span style={{ color: '#0369a1', fontSize: '12px', fontWeight: 600 }}>
                          지급됨 / {item.creditAmount} Credit
                        </span>
                        {item.creditedAt && (
                          <div style={{ color: colors.neutral400, fontSize: '11px', marginTop: '2px' }}>
                            {fmt(item.creditedAt)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: colors.neutral400, fontSize: '12px' }}>미지급</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            style={{ ...styles.pageBtn, opacity: page <= 1 ? 0.4 : 1 }}
          >
            ← 이전
          </button>
          <span style={{ fontSize: '14px', color: colors.neutral600 }}>
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            style={{ ...styles.pageBtn, opacity: page >= totalPages ? 0.4 : 1 }}
          >
            다음 →
          </button>
        </div>
      )}
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
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '28px',
  },
  backBtn: {
    padding: '8px 12px',
    backgroundColor: 'transparent',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    color: colors.neutral600,
    marginTop: '4px',
    whiteSpace: 'nowrap',
  },
  pageTitle: {
    margin: 0,
    fontSize: '22px',
    fontWeight: 700,
    color: colors.neutral900,
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '28px',
  },
  tabBar: {
    display: 'flex',
    borderBottom: `1px solid ${colors.neutral200}`,
    marginBottom: '20px',
    gap: '4px',
  },
  tableWrap: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    overflow: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '700px',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: 600,
    color: colors.neutral600,
    borderBottom: `1px solid ${colors.neutral200}`,
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  td: {
    padding: '12px 16px',
    fontSize: '14px',
    color: colors.neutral700,
    verticalAlign: 'middle',
  },
  centerMsg: {
    textAlign: 'center',
    padding: '60px 0',
  },
  retryBtn: {
    marginTop: '12px',
    padding: '8px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginTop: '24px',
  },
  pageBtn: {
    padding: '8px 16px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    color: colors.neutral700,
  },
};
