/**
 * SupplierContentApprovalPage — 공급자 콘텐츠 승인 (운영자)
 *
 * WO-O4O-KPA-OPERATOR-ACTION-INTEGRITY-AND-APPROVAL-FLOW-COMPLETION-V1
 *
 * 공급자 자료 제출(hub_content_submission) + 사이니지 캠페인 요청(signage_campaign_request)을
 * 검토·승인·반려한다. 백엔드는 이미 존재하나(운영자 스코프) KPA 웹에는 진입 화면이 없어
 * 공급자 CMS → HUB 승인 업무가 도달 불가였다. admin-dashboard ContentApprovalsPage 를
 * KPA 웹 컨벤션(apiClient + useCallback + DataTable + BaseDetailDrawer)으로 재구성한다.
 *
 * Backend: GET /api/v1/kpa/operator/approvals (requireKpaScope 'kpa:operator')
 *          GET/POST .../:id, .../:id/approve, .../:id/reject
 * Route: /operator/approvals
 */

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { RowActionMenu, BaseDetailDrawer } from '@o4o/ui';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { apiClient } from '../../api/client';
import { colors } from '../../styles/theme';

// ─── 타입 ────────────────────────────────────────────────────────────────────

type ApprovalStatus = 'pending' | 'approved' | 'rejected';
type EntityType = 'hub_content_submission' | 'signage_campaign_request';

interface ApprovalRequest {
  id: string;
  entity_type: EntityType;
  organization_id: string;
  payload: Record<string, any>;
  status: ApprovalStatus | string;
  requester_id: string;
  requester_name: string;
  requester_email: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ListResponse {
  success: boolean;
  data: ApprovalRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── 상수 ────────────────────────────────────────────────────────────────────

const BASE = '/operator/approvals';

const ENTITY_TYPE_TABS = [
  { value: 'all', label: '전체' },
  { value: 'hub_content_submission', label: '공급자 자료' },
  { value: 'signage_campaign_request', label: '사이니지 캠페인' },
] as const;

const STATUS_FILTERS = [
  { value: 'pending', label: '대기중' },
  { value: 'approved', label: '승인됨' },
  { value: 'rejected', label: '반려됨' },
  { value: 'all', label: '전체' },
] as const;

const ENTITY_TYPE_LABEL: Record<string, string> = {
  hub_content_submission: '공급자 자료',
  signage_campaign_request: '사이니지 캠페인',
};

const STATUS_CONFIG: Record<string, { text: string; cls: string }> = {
  pending: { text: '대기중', cls: 'bg-amber-100 text-amber-700' },
  approved: { text: '승인', cls: 'bg-green-100 text-green-700' },
  rejected: { text: '반려', cls: 'bg-red-100 text-red-700' },
};

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export default function SupplierContentApprovalPage() {
  const [items, setItems] = useState<ApprovalRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [entityTypeTab, setEntityTypeTab] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  const [selected, setSelected] = useState<ApprovalRequest | null>(null);
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [note, setNote] = useState('');
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const lifecycle = useRef({ mounted: true, sequence: 0, writing: false });
  useLayoutEffect(() => {
    const scope = { mounted: true, sequence: 0, writing: false };
    lifecycle.current = scope;
    return () => { scope.mounted = false; scope.sequence++; };
  }, []);
  const queryKey = `${entityTypeTab}:${statusFilter}:${page}`;
  const currentQuery = useRef(queryKey);
  currentQuery.current = queryKey;
  const loadedQuery = useRef<string | null>(null);

  const load = useCallback(async () => {
    const scope = lifecycle.current;
    const sequence = ++scope.sequence;
    const current = () => scope.mounted && sequence === scope.sequence && currentQuery.current === queryKey;
    setLoading(true); setError(null);
    try {
      const params: Record<string, string | number> = { status: statusFilter, page, limit: 20 };
      if (entityTypeTab !== 'all') params.entity_type = entityTypeTab;
      const res = await apiClient.get<ListResponse>(BASE, params);
      if (!res?.success || !Array.isArray(res.data)) throw new Error('승인 요청 응답이 올바르지 않습니다.');
      if (!current()) return false;
      if (page > Math.max(1, res.totalPages)) {
        setPage(Math.max(1, res.totalPages));
        return false;
      }
      setItems(res.data); setTotal(res.total); setTotalPages(Math.max(1, res.totalPages));
      loadedQuery.current = queryKey;
      setRefreshFailed(false);
      return true;
    } catch {
      if (current()) setError('승인 요청을 불러오지 못했습니다.');
      return false;
    } finally { if (current()) setLoading(false); }
  }, [entityTypeTab, statusFilter, page, queryKey]);

  useEffect(() => { void load(); }, [load]);
  // Explicit view changes end the old decision and receipt; automatic last-page correction keeps the receipt.
  const changeView = (change: () => void) => {
    if (lifecycle.current.writing) return;
    lifecycle.current.sequence++; loadedQuery.current = null;
    setSelected(null); setDecision(null); setNote(''); setSuccess(null); setActionError(null); setRefreshFailed(false);
    change();
  };
  const openDetail = (item: ApprovalRequest) => {
    if (lifecycle.current.writing || loading || error || loadedQuery.current !== queryKey) return;
    setSelected(item); setDecision(null); setNote(''); setActionError(null); setSuccess(null);
  };
  const openDecision = (item: ApprovalRequest, action: 'approve' | 'reject') => {
    if (lifecycle.current.writing || loading || error || loadedQuery.current !== queryKey || item.status !== 'pending') return;
    setSelected(item); setDecision(action); setNote(''); setActionError(null); setSuccess(null);
  };
  const executeDecision = async () => {
    const scope = lifecycle.current;
    if (!selected || !decision || scope.writing || loading || error || loadedQuery.current !== queryKey) return;
    const target = selected; const action = decision; const comment = note;
    scope.writing = true; setActing(true); setActionError(null); setSuccess(null);
    try {
      const res = await apiClient.post<{ success: boolean }>(`${BASE}/${target.id}/${action}`, action === 'approve'
        ? { comment: comment || undefined } : { reason: comment || undefined });
      if (!res?.success) throw new Error('처리에 실패했습니다.');
      if (!scope.mounted) return;
      setSuccess(action === 'approve' ? '승인이 완료되었습니다.' : '반려 처리가 완료되었습니다.');
      setSelected(null); setDecision(null); setNote('');
      const refreshed = await load();
      if (scope.mounted) setRefreshFailed(!refreshed);
    } catch (err: any) {
      if (scope.mounted) setActionError(err?.data?.error || err?.message || '처리 중 오류가 발생했습니다.');
    } finally {
      scope.writing = false;
      if (scope.mounted) setActing(false);
    }
  };

  // ─── 컬럼 ────────────────────────────────────────────────────────────────────

  const columns: ListColumnDef<ApprovalRequest>[] = [
    {
      key: 'entity_type',
      header: '유형',
      render: (value) => (
        <span style={styles.typeTag}>{ENTITY_TYPE_LABEL[value as string] ?? String(value)}</span>
      ),
    },
    {
      key: 'title',
      header: '제목 / 상세',
      render: (_v, row) => {
        const title = row.payload?.title ?? '(제목 없음)';
        if (row.entity_type === 'signage_campaign_request') {
          const services: string[] = row.payload?.targetServices ?? [];
          return (
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: colors.neutral900, margin: 0 }}>{title}</p>
              <p style={{ fontSize: '12px', color: colors.neutral500, margin: 0 }}>
                서비스: {services.join(', ') || '-'}
              </p>
            </div>
          );
        }
        return (
          <span style={{ fontSize: '14px', fontWeight: 600, color: colors.neutral900 }}>{title}</span>
        );
      },
    },
    {
      key: 'requester_name',
      header: '요청자',
      render: (_v, row) => (
        <div>
          <p style={{ fontSize: '14px', color: colors.neutral800, margin: 0 }}>{row.requester_name}</p>
          {row.requester_email && (
            <p style={{ fontSize: '12px', color: colors.neutral500, margin: 0 }}>{row.requester_email}</p>
          )}
        </div>
      ),
    },
    {
      key: 'created_at',
      header: '생성일',
      render: (value) => (
        <span style={styles.cellMuted}>{new Date(value as string).toLocaleDateString('ko-KR')}</span>
      ),
    },
    {
      key: 'status',
      header: '상태',
      align: 'center' as const,
      render: (value) => {
        const cfg = STATUS_CONFIG[value as string] ?? { text: String(value), cls: 'bg-slate-100 text-slate-600' };
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
      render: (_v, row) => {
        const isPending = row.status === 'pending';
        return (
          <RowActionMenu
            actions={[
              { key: 'detail', label: '상세보기', onClick: () => openDetail(row) },
              { key: 'approve', label: '승인', variant: 'primary', disabled: !isPending || acting || loading || !!error, onClick: () => openDecision(row, 'approve') },
              { key: 'reject', label: '반려', variant: 'danger', disabled: !isPending || acting || loading || !!error, onClick: () => openDecision(row, 'reject') },
            ]}
          />
        );
      },
    },
  ];

  // ─── 렌더 ────────────────────────────────────────────────────────────────────

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>공급자 콘텐츠 승인</h1>
      <p style={styles.subtitle}>공급자 자료 제출과 사이니지 캠페인 요청을 검토하고 승인·반려합니다.</p>

      {error && <div role="alert" style={styles.errorBanner}>{refreshFailed ? '처리는 완료됐지만 목록 갱신에 실패했습니다. ' : ''}{error} <button onClick={() => { if (!lifecycle.current.writing) void load(); }} disabled={acting}>목록 다시 조회</button></div>}
      {actionError && !selected && <div role="alert" style={styles.errorBanner}>{actionError}</div>}
      {success && <div style={styles.successBanner}>{success}</div>}

      <fieldset disabled={acting} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      {/* entity_type 탭 */}
      <div style={styles.tabs}>
        {ENTITY_TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            style={{ ...styles.tab, ...(entityTypeTab === tab.value ? styles.tabActive : {}) }}
            onClick={() => { if (entityTypeTab !== tab.value || page !== 1) changeView(() => { setEntityTypeTab(tab.value); setPage(1); }); }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 상태 필터 + 요약 */}
      <div style={styles.filters}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              style={{ ...styles.pill, ...(statusFilter === f.value ? styles.pillActive : {}) }}
              onClick={() => { if (statusFilter !== f.value || page !== 1) changeView(() => { setStatusFilter(f.value); setPage(1); }); }}
            >
              {f.label}
            </button>
          ))}
        </div>
        {statusFilter === 'pending' && total > 0 && (
          <span style={styles.totalBadge}>대기 중 {total}건</span>
        )}
      </div>

      <DataTable<ApprovalRequest>
        columns={columns}
        data={items}
        rowKey="id"
        loading={loading}
        emptyMessage={error ? '목록을 다시 조회해 주세요.' : statusFilter === 'pending' ? '대기 중인 승인 요청이 없습니다.' : '해당 조건의 요청이 없습니다.'}
        tableId="kpa-supplier-content-approvals"
        onRowClick={openDetail}
      />

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button style={styles.pageBtn} onClick={() => changeView(() => setPage((p) => Math.max(1, p - 1)))} disabled={page <= 1}>
            이전
          </button>
          <span style={styles.pageInfo}>{page} / {totalPages}</span>
          <button style={styles.pageBtn} onClick={() => changeView(() => setPage((p) => Math.min(totalPages, p + 1)))} disabled={page >= totalPages}>
            다음
          </button>
        </div>
      )}

      </fieldset>
      {/* 상세 + 승인/반려 Drawer */}
      <BaseDetailDrawer
        open={!!selected}
        onClose={() => { if (!lifecycle.current.writing) { setSelected(null); setDecision(null); setNote(''); } }}
        title={decision === 'approve' ? '승인 확인' : decision === 'reject' ? '반려 확인' : '승인 요청 상세'}
        width={520}
        actions={[]}
      >
        {selected && (
          <div>
            {actionError && <div role="alert" style={styles.errorBanner}>{actionError}</div>}
            <div style={styles.infoBox}>
              <p style={styles.infoBoxLabel}>유형</p>
              <p style={styles.infoBoxValue}>{ENTITY_TYPE_LABEL[selected.entity_type] ?? selected.entity_type}</p>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>제목</span>
              <span style={styles.detailValue}>{selected.payload?.title ?? '(제목 없음)'}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>요청자</span>
              <span style={styles.detailValue}>{selected.requester_name}{selected.requester_email ? ` (${selected.requester_email})` : ''}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>생성일</span>
              <span style={styles.detailValue}>{new Date(selected.created_at).toLocaleString('ko-KR')}</span>
            </div>
            {selected.review_comment && (
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>검토 메모</span>
                <span style={styles.detailValue}>{selected.review_comment}</span>
              </div>
            )}

            {decision ? (
              <div style={styles.statusSection}>
                <p style={styles.statusLabel}>{decision === 'approve' ? '승인 메모 (선택)' : '반려 사유 (선택)'}</p>
                <textarea
                  style={styles.textarea}
                  rows={3}
                  placeholder={decision === 'approve' ? '승인 메모를 입력하세요' : '반려 사유를 입력하세요'}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={acting}
                />
                <div style={styles.statusBtns}>
                  <button style={styles.statusBtn} disabled={acting} onClick={() => { setDecision(null); setNote(''); }}>
                    취소
                  </button>
                  <button
                    style={{ ...styles.statusBtn, ...(decision === 'approve' ? styles.approveBtn : styles.rejectBtn) }}
                    disabled={acting}
                    onClick={executeDecision}
                  >
                    {acting ? '처리 중…' : decision === 'approve' ? '승인' : '반려'}
                  </button>
                </div>
              </div>
            ) : (
              selected.status === 'pending' && (
                <div style={styles.statusSection}>
                  <div style={styles.statusBtns}>
                    <button style={{ ...styles.statusBtn, ...styles.approveBtn }} onClick={() => setDecision('approve')}>
                      승인
                    </button>
                    <button style={{ ...styles.statusBtn, ...styles.rejectBtn }} onClick={() => setDecision('reject')}>
                      반려
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </BaseDetailDrawer>
    </div>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '24px 32px' },
  title: { fontSize: '22px', fontWeight: 700, color: colors.neutral900, marginBottom: '4px' },
  subtitle: { fontSize: '14px', color: colors.neutral500, marginBottom: '20px' },

  errorBanner: { padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', marginBottom: '16px', fontSize: '14px' },
  successBanner: { padding: '12px 16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#16a34a', marginBottom: '16px', fontSize: '14px' },

  tabs: { display: 'flex', gap: '4px', borderBottom: `1px solid ${colors.neutral200}`, marginBottom: '16px' },
  tab: { padding: '8px 16px', fontSize: '14px', fontWeight: 500, color: colors.neutral500, background: 'none', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer' },
  tabActive: { color: '#2563eb', borderBottom: '2px solid #2563eb' },

  filters: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
  pill: { padding: '4px 12px', fontSize: '12px', fontWeight: 500, borderRadius: '9999px', border: 'none', backgroundColor: colors.neutral100, color: colors.neutral600, cursor: 'pointer' },
  pillActive: { backgroundColor: '#2563eb', color: '#fff' },
  totalBadge: { fontSize: '14px', color: '#d97706' },

  cellMuted: { fontSize: '14px', color: colors.neutral500 },
  typeTag: { fontSize: '12px', fontWeight: 600, padding: '2px 8px', backgroundColor: '#ede9fe', color: '#6d28d9', borderRadius: '10px' },

  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '20px' },
  pageBtn: { padding: '8px 16px', fontSize: '14px', border: `1px solid ${colors.neutral300}`, borderRadius: '6px', cursor: 'pointer', backgroundColor: '#fff' },
  pageInfo: { fontSize: '14px', color: colors.neutral600 },

  infoBox: { padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '16px' },
  infoBoxLabel: { fontSize: '12px', fontWeight: 600, color: '#64748b', margin: '0 0 4px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  infoBoxValue: { fontSize: '15px', fontWeight: 600, color: '#1e293b', margin: 0 },

  detailRow: { display: 'flex', gap: '12px', marginBottom: '12px', fontSize: '14px' },
  detailLabel: { fontWeight: 600, color: colors.neutral600, minWidth: '80px' },
  detailValue: { color: colors.neutral700, flex: 1 },

  statusSection: { borderTop: `1px solid ${colors.neutral200}`, paddingTop: '20px', marginTop: '8px' },
  statusLabel: { fontSize: '14px', fontWeight: 600, color: colors.neutral700, marginBottom: '8px' },
  textarea: { width: '100%', padding: '8px 12px', fontSize: '14px', border: `1px solid ${colors.neutral300}`, borderRadius: '6px', marginBottom: '12px', boxSizing: 'border-box' as const },
  statusBtns: { display: 'flex', gap: '8px' },
  statusBtn: { padding: '8px 16px', fontSize: '14px', border: `1px solid ${colors.neutral300}`, borderRadius: '6px', cursor: 'pointer', backgroundColor: '#fff', color: colors.neutral700 },
  approveBtn: { backgroundColor: '#16a34a', color: '#fff', border: '1px solid #16a34a' },
  rejectBtn: { backgroundColor: '#dc2626', color: '#fff', border: '1px solid #dc2626' },
};
