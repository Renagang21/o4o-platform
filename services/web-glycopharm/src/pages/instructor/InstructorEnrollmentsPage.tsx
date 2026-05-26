/**
 * InstructorEnrollmentsPage — 수강자 관리 (참여자 목록 + 요약)
 *
 * WO-O4O-GLYCOPHARM-LMS-PHASE3-INSTRUCTOR-PARITY-V1
 * 경로: /instructor/courses/:courseId/enrollments
 *
 * KPA ContentParticipantsPage 기준 정렬.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lmsApi, type ParticipantItem, type ParticipantSummary } from '@/api/lms';

const C = { primary: '#16a34a' };

type StatusFilter = 'all' | 'in_progress' | 'completed' | 'cancelled' | 'pending';

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
    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600, backgroundColor: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div style={{ backgroundColor: '#fff', borderRadius: 10, padding: '16px 20px', borderLeft: `4px solid ${accent}`, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
      <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

const FILTER_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all',         label: '전체' },
  { value: 'in_progress', label: '진행중' },
  { value: 'completed',   label: '완료' },
  { value: 'pending',     label: '대기' },
  { value: 'cancelled',   label: '취소' },
];

export default function InstructorEnrollmentsPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [nameSearchInput, setNameSearchInput] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ParticipantItem[]>([]);
  const [summary, setSummary] = useState<ParticipantSummary>({ total: 0, inProgress: 0, completed: 0, cancelled: 0 });
  const [rewardSummary, setRewardSummary] = useState<ParticipantSummary | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const LIMIT = 20;

  // Debounced name search
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => { setNameSearch(nameSearchInput); setPage(1); }, 400);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [nameSearchInput]);

  // Load reward summary
  useEffect(() => {
    if (!courseId) return;
    lmsApi.instructorGetParticipantsSummary(courseId)
      .then((res: any) => setRewardSummary(res?.data ?? null))
      .catch(() => {});
  }, [courseId]);

  const load = useCallback(async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, unknown> = { page, limit: LIMIT };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (nameSearch) params.query = nameSearch;

      const res = await lmsApi.instructorGetParticipants(courseId, params as any);
      const d = (res as any)?.data ?? res;
      setCourseTitle(d.course?.title ?? '');
      setSummary(d.summary ?? { total: 0, inProgress: 0, completed: 0, cancelled: 0 });
      setItems(d.items ?? []);
      const total = d.pagination?.total ?? 0;
      setTotalPages(Math.max(1, Math.ceil(total / LIMIT)));
    } catch {
      setError('수강자 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [courseId, statusFilter, nameSearch, page]);

  useEffect(() => { load(); }, [load]);

  const fmt = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate(courseId ? `/instructor/courses/${courseId}` : '/instructor/courses')}
          style={{ padding: '8px 12px', backgroundColor: 'transparent', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: '#6b7280', marginTop: 4, whiteSpace: 'nowrap' }}
        >
          ← 강의 편집으로
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>수강자 관리</h1>
          {courseTitle && (
            <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>{courseTitle}</p>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <SummaryCard label="총 수강자" value={summary.total} accent={C.primary} />
        <SummaryCard label="진행중" value={summary.inProgress} accent="#3b82f6" />
        <SummaryCard label="완료" value={summary.completed} accent="#10b981" />
        <SummaryCard label="보상 지급" value={rewardSummary?.creditedCount ?? '-'} accent="#0369a1" />
        <SummaryCard
          label="총 지급 Credit"
          value={rewardSummary ? `${(rewardSummary.totalCredits ?? 0).toLocaleString()} C` : '-'}
          accent="#8b5cf6"
        />
      </div>

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 8 }}>
        <input
          type="text"
          placeholder="이름 검색..."
          value={nameSearchInput}
          onChange={(e) => setNameSearchInput(e.target.value)}
          style={{ padding: '7px 12px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6, width: 200, outline: 'none', color: '#111827' }}
        />
      </div>

      {/* Status Filter Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: 20, gap: 4, overflowX: 'auto' }}>
        {FILTER_TABS.map(({ value, label }) => {
          const active = statusFilter === value;
          const count = value === 'all' ? summary.total
            : value === 'in_progress' ? summary.inProgress
            : value === 'completed' ? summary.completed
            : value === 'cancelled' ? summary.cancelled
            : undefined;
          return (
            <button
              key={value}
              onClick={() => { setStatusFilter(value); setPage(1); }}
              style={{ padding: '8px 16px', border: 'none', borderBottom: active ? `2px solid ${C.primary}` : '2px solid transparent', backgroundColor: 'transparent', cursor: 'pointer', fontSize: 14, fontWeight: active ? 600 : 400, color: active ? C.primary : '#6b7280', whiteSpace: 'nowrap' }}
            >
              {label}{count !== undefined ? ` (${count})` : ''}
            </button>
          );
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>불러오는 중...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ color: '#dc2626' }}>{error}</p>
          <button onClick={load} style={{ marginTop: 12, padding: '8px 20px', backgroundColor: C.primary, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>다시 시도</button>
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>해당 조건의 수강자가 없습니다.</div>
      ) : (
        <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                {['이름', '참여일', '상태', '진도율', '완료일', '수료증', '보상'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.enrollmentId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500, color: '#111827' }}>
                    {item.userName}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>
                    {fmt(item.enrolledAt)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <StatusBadge status={item.status} />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 60, height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${item.progressPercentage}%`, height: '100%', backgroundColor: item.progressPercentage === 100 ? '#10b981' : C.primary, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>{item.progressPercentage}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>
                    {fmt(item.completedAt)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {item.certificateIssued
                      ? <span style={{ color: '#15803d', fontSize: 12, fontWeight: 600 }}>발급됨</span>
                      : <span style={{ color: '#9ca3af', fontSize: 12 }}>없음</span>
                    }
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {item.credited ? (
                      <div>
                        <span style={{ color: '#0369a1', fontSize: 12, fontWeight: 600 }}>
                          지급됨 / {item.creditAmount} C
                        </span>
                        {item.creditedAt && (
                          <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 2 }}>{fmt(item.creditedAt)}</div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: 12 }}>미지급</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 24 }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            style={{ padding: '8px 16px', backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 14, color: '#374151', opacity: page <= 1 ? 0.4 : 1 }}
          >
            ← 이전
          </button>
          <span style={{ fontSize: 14, color: '#6b7280' }}>{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={{ padding: '8px 16px', backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 14, color: '#374151', opacity: page >= totalPages ? 0.4 : 1 }}
          >
            다음 →
          </button>
        </div>
      )}
    </div>
  );
}
