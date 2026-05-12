/**
 * CollaborationRequestsPage — 협업 문의 관리 (운영자)
 *
 * WO-O4O-KPA-OPERATOR-COLLABORATION-INBOX-V1
 *
 * Contact 페이지에서 접수된 협업·강의 문의를 목록·상세·상태 변경으로 처리한다.
 */

import { useState, useEffect, useCallback } from 'react';
import { RowActionMenu, BaseDetailDrawer } from '@o4o/ui';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import {
  collaborationRequestApi,
  type ContactRequestItem,
  type ContactRequestStatus,
} from '../../api/contactRequest';
import { colors } from '../../styles/theme';

// ─── 상수 ────────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  partner:   '운영자/단체 협력',
  education: '강의 개설/협업',
};

const STATUS_CONFIG: Record<ContactRequestStatus, { text: string; cls: string }> = {
  pending:   { text: '접수 대기', cls: 'bg-amber-100 text-amber-700' },
  reviewing: { text: '검토 중',   cls: 'bg-blue-100 text-blue-700' },
  done:      { text: '완료',      cls: 'bg-green-100 text-green-700' },
};

const STATUS_OPTIONS: { value: ContactRequestStatus; label: string }[] = [
  { value: 'pending',   label: '접수 대기' },
  { value: 'reviewing', label: '검토 중' },
  { value: 'done',      label: '완료' },
];

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export default function CollaborationRequestsPage() {
  const [items, setItems]           = useState<ContactRequestItem[]>([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter]     = useState('');

  const [selected, setSelected]     = useState<ContactRequestItem | null>(null);
  const [updating, setUpdating]     = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await collaborationRequestApi.list({
        page,
        limit: 20,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
      });
      if (res.success) {
        setItems(res.data.items);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      }
    } catch {
      setError('데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (newStatus: ContactRequestStatus) => {
    if (!selected) return;
    setUpdating(true);
    setError(null);
    try {
      const res = await collaborationRequestApi.updateStatus(selected.id, newStatus);
      if (res.success) {
        setSuccess('상태가 변경되었습니다.');
        setSelected(prev => prev ? { ...prev, status: newStatus } : null);
        await load();
      }
    } catch (err: any) {
      setError(err?.data?.error || err?.message || '상태 변경 중 오류가 발생했습니다.');
    } finally {
      setUpdating(false);
    }
  };

  // ─── 컬럼 정의 ───────────────────────────────────────────────────────────────

  const columns: ListColumnDef<ContactRequestItem>[] = [
    {
      key: 'type',
      header: '문의 유형',
      render: (value) => (
        <span style={styles.typeTag}>
          {TYPE_LABELS[value as string] ?? value}
        </span>
      ),
    },
    {
      key: 'name',
      header: '이름/단체명',
      render: (_v, row) => (
        <div>
          <p style={{ fontSize: '14px', fontWeight: 600, color: colors.neutral900, margin: 0 }}>
            {row.name}
          </p>
          {row.organization_name && (
            <p style={{ fontSize: '12px', color: colors.neutral500, margin: 0 }}>
              {row.organization_name}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'email',
      header: '이메일',
      render: (value) => <span style={styles.cell}>{value as string}</span>,
    },
    {
      key: 'createdAt',
      header: '등록일',
      render: (value) => (
        <span style={styles.cellMuted}>
          {new Date(value as string).toLocaleDateString('ko-KR')}
        </span>
      ),
    },
    {
      key: 'status',
      header: '상태',
      align: 'center' as const,
      render: (value) => {
        const cfg = STATUS_CONFIG[value as ContactRequestStatus] ?? { text: String(value), cls: 'bg-slate-100 text-slate-600' };
        return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>{cfg.text}</span>;
      },
    },
    {
      key: '_actions',
      header: '액션',
      align: 'center' as const,
      width: '60px',
      system: true,
      onCellClick: () => {},
      render: (_v, row) => (
        <RowActionMenu
          actions={[
            { key: 'detail', label: '상세보기', onClick: () => { setSelected(row); setSuccess(null); setError(null); } },
          ]}
        />
      ),
    },
  ];

  // ─── 렌더 ────────────────────────────────────────────────────────────────────

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>협업 문의</h1>

      {error   && <div style={styles.errorBanner}>{error}</div>}
      {success && <div style={styles.successBanner}>{success}</div>}

      {/* 필터 */}
      <div style={styles.filters}>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={styles.select}
        >
          <option value="">전체 상태</option>
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          style={styles.select}
        >
          <option value="">전체 유형</option>
          <option value="partner">운영자/단체 협력</option>
          <option value="education">강의 개설/협업</option>
        </select>
        <span style={styles.totalBadge}>총 {total}건</span>
      </div>

      <DataTable<ContactRequestItem>
        columns={columns}
        data={items}
        rowKey="id"
        loading={loading}
        emptyMessage="접수된 협업 문의가 없습니다"
        tableId="kpa-collaboration-requests"
        onRowClick={(row) => { setSelected(row); setSuccess(null); setError(null); }}
      />

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            style={styles.pageBtn}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            이전
          </button>
          <span style={styles.pageInfo}>{page} / {totalPages}</span>
          <button
            style={styles.pageBtn}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            다음
          </button>
        </div>
      )}

      {/* 상세 Drawer */}
      <BaseDetailDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title="협업 문의 상세"
        width={520}
        actions={[]}
      >
        {selected && (
          <div>
            {/* 기본 정보 */}
            <div style={styles.infoBox}>
              <p style={styles.infoBoxLabel}>문의 유형</p>
              <p style={styles.infoBoxValue}>{TYPE_LABELS[selected.type] ?? selected.type}</p>
            </div>

            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>이름</span>
              <span style={styles.detailValue}>{selected.name}</span>
            </div>
            {selected.organization_name && (
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>단체명</span>
                <span style={styles.detailValue}>{selected.organization_name}</span>
              </div>
            )}
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>이메일</span>
              <span style={styles.detailValue}>{selected.email}</span>
            </div>
            {selected.phone && (
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>연락처</span>
                <span style={styles.detailValue}>{selected.phone}</span>
              </div>
            )}
            {selected.subject && (
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>강의 주제</span>
                <span style={styles.detailValue}>{selected.subject}</span>
              </div>
            )}
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>등록일</span>
              <span style={styles.detailValue}>
                {new Date(selected.createdAt).toLocaleString('ko-KR')}
              </span>
            </div>

            {/* 문의 내용 */}
            <div style={styles.messageBox}>
              <p style={styles.infoBoxLabel}>문의 내용</p>
              <p style={styles.messageText}>{selected.message}</p>
            </div>

            {/* 상태 변경 */}
            <div style={styles.statusSection}>
              <p style={styles.statusLabel}>상태 변경</p>
              <div style={styles.statusBtns}>
                {STATUS_OPTIONS.map(o => {
                  const isActive = selected.status === o.value;
                  return (
                    <button
                      key={o.value}
                      style={{
                        ...styles.statusBtn,
                        ...(isActive ? styles.statusBtnActive : {}),
                      }}
                      disabled={updating || isActive}
                      onClick={() => handleStatusChange(o.value)}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
              {updating && <p style={styles.updatingText}>상태 변경 중…</p>}
            </div>
          </div>
        )}
      </BaseDetailDrawer>
    </div>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container:    { padding: '24px 32px' },
  title:        { fontSize: '22px', fontWeight: 700, color: colors.neutral900, marginBottom: '20px' },
  errorBanner:  { padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', marginBottom: '16px', fontSize: '14px' },
  successBanner:{ padding: '12px 16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#16a34a', marginBottom: '16px', fontSize: '14px' },

  filters:    { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' as const },
  select:     { padding: '8px 12px', fontSize: '14px', border: `1px solid ${colors.neutral300}`, borderRadius: '6px' },
  totalBadge: { fontSize: '14px', color: colors.neutral500, marginLeft: 'auto' },

  cell:     { fontSize: '14px', color: colors.neutral700 },
  cellMuted:{ fontSize: '14px', color: colors.neutral500 },
  typeTag:  { fontSize: '12px', fontWeight: 600, padding: '2px 8px', backgroundColor: '#ede9fe', color: '#6d28d9', borderRadius: '10px' },

  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '20px' },
  pageBtn:    { padding: '8px 16px', fontSize: '14px', border: `1px solid ${colors.neutral300}`, borderRadius: '6px', cursor: 'pointer', backgroundColor: '#fff' },
  pageInfo:   { fontSize: '14px', color: colors.neutral600 },

  infoBox:       { padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '16px' },
  infoBoxLabel:  { fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: '0 0 4px' },
  infoBoxValue:  { fontSize: '15px', fontWeight: 600, color: '#1e293b', margin: 0 },

  detailRow:   { display: 'flex', gap: '12px', marginBottom: '12px', fontSize: '14px' },
  detailLabel: { fontWeight: 600, color: colors.neutral600, minWidth: '80px' },
  detailValue: { color: colors.neutral700, flex: 1 },

  messageBox:  { padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', marginTop: '16px', marginBottom: '20px' },
  messageText: { fontSize: '14px', color: colors.neutral700, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' as const },

  statusSection: { borderTop: `1px solid ${colors.neutral200}`, paddingTop: '20px' },
  statusLabel:   { fontSize: '14px', fontWeight: 600, color: colors.neutral700, marginBottom: '12px' },
  statusBtns:    { display: 'flex', gap: '8px', flexWrap: 'wrap' as const },
  statusBtn:     {
    padding: '8px 16px',
    fontSize: '14px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    cursor: 'pointer',
    backgroundColor: '#fff',
    color: colors.neutral700,
  },
  statusBtnActive: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: '1px solid #2563eb',
    cursor: 'default',
    fontWeight: 600,
  },
  updatingText: { fontSize: '13px', color: colors.neutral500, marginTop: '8px' },
};
