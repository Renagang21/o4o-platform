/**
 * TabletRequestsPage — Staff Consultation Request Management
 *
 * WO-STORE-TABLET-REQUEST-CHANNEL-V1
 * WO-O4O-TABLET-INTEREST-UX-REFACTOR-V1: Interest-only view
 * WO-O4O-STORE-TABLET-LEGACY-CLEANUP-V1: Removed legacy service request tab
 * WO-O4O-STORE-REQUESTS-UNIFIED-MENU-V1: 상담 요청 통합 메뉴 승격
 * WO-O4O-KPA-TABLET-REQUESTS-STANDARD-TABLE-V1 (2026-05-24):
 *   카드형 → @o4o/ui DataTable + ActionBar. urgency 시각 단서는 **첫 컬럼 badge**로 보존
 *   (긴급 10분+ red / 주의 5분+ orange / NEW yellow / 확인됨 blue).
 *   bulk 3종 (acknowledge/complete/cancel) fan-out.
 *   5초 polling + 10초 elapsed tick 유지.
 *
 * 구조:
 * └─ 상담 요청 목록 (5초 polling)
 */

import { useEffect, useState, useRef, useCallback, useMemo, type CSSProperties } from 'react';
import { CheckCircle2, Send, X, Trash2 } from 'lucide-react';
import { DataTable, type Column, ActionBar, BulkResultModal } from '@o4o/ui';
import { useBatchAction } from '@o4o/operator-ux-core';
import { GuideEditableSection } from '../../components/guide';
import {
  fetchStaffInterestRequests,
  updateInterestAction,
  type StaffInterestRequest,
} from '../../api/tabletStaff';

function formatElapsed(createdAt: string): string {
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  if (diff < 60) return `${diff}초 전`;
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  return `${Math.floor(diff / 3600)}시간 전`;
}

function formatDuration(from: string, to: string): string {
  const diff = Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 1000);
  if (diff < 60) return `${diff}초`;
  if (diff < 3600) return `${Math.floor(diff / 60)}분`;
  return `${Math.floor(diff / 3600)}시간`;
}

// WO-O4O-KPA-TABLET-REQUESTS-STANDARD-TABLE-V1:
//   urgency 계산 — 기존 카드형 line 134-136 의 로직 그대로 유지.
//   REQUESTED 상태에서만 경과 시간 기반 urgent/warning/normal 분류.
type Urgency = 'urgent' | 'warning' | 'newest' | 'acknowledged' | 'normal';
function calcUrgency(req: StaffInterestRequest): Urgency {
  if (req.status === 'ACKNOWLEDGED') return 'acknowledged';
  if (req.status !== 'REQUESTED') return 'normal';
  const elapsed = Math.floor((Date.now() - new Date(req.createdAt).getTime()) / 1000);
  if (elapsed >= 600) return 'urgent';
  if (elapsed >= 300) return 'warning';
  return 'newest';
}

const URGENCY_BADGE: Record<Urgency, { label: string; bg: string; color: string; weight?: number }> = {
  urgent:       { label: '10분+',  bg: '#fef2f2', color: '#dc2626', weight: 700 },
  warning:      { label: '5분+',   bg: '#fff7ed', color: '#ea580c', weight: 700 },
  newest:       { label: 'NEW',    bg: '#fef3c7', color: '#d97706', weight: 700 },
  acknowledged: { label: '확인됨', bg: '#dbeafe', color: '#2563eb', weight: 700 },
  normal:       { label: '-',      bg: '#f1f5f9', color: '#94a3b8', weight: 500 },
};

export function TabletRequestsPage() {
  const [interestRequests, setInterestRequests] = useState<StaffInterestRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // WO-O4O-KPA-TABLET-REQUESTS-STANDARD-TABLE-V1: 표준 테이블 selection + bulk
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const batch = useBatchAction();

  const fetchInterests = useCallback(async () => {
    try {
      const data = await fetchStaffInterestRequests();
      setInterestRequests(data);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll every 5 seconds — WO 명시 유지
  useEffect(() => {
    setLoading(true);
    fetchInterests();
    pollRef.current = setInterval(fetchInterests, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchInterests]);

  // 단건 액션 — 기존 흐름 보존
  const handleInterestAction = async (id: string, action: 'acknowledge' | 'complete' | 'cancel') => {
    try {
      await updateInterestAction(id, action);
      await fetchInterests();
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Force re-render elapsed times every 10s — urgency badge / "N초 전" 갱신
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 10_000);
    return () => clearInterval(t);
  }, []);

  // ── Bulk action — Promise.allSettled fan-out (backend 신규 없음) ──
  type BulkOp = 'acknowledge' | 'complete' | 'cancel';
  const batchInterestOp = useCallback(
    async (
      ids: string[],
      options?: Record<string, unknown>,
    ): Promise<{ data: { results: Array<{ id: string; status: 'success' | 'failed'; error?: string }> } }> => {
      const op = options?.op as BulkOp | undefined;
      if (!op) {
        return { data: { results: ids.map((id) => ({ id, status: 'failed' as const, error: 'op missing' })) } };
      }
      const settled = await Promise.allSettled(ids.map((id) => updateInterestAction(id, op)));
      const results = settled.map((r, i) => {
        const id = ids[i];
        if (r.status === 'fulfilled') return { id, status: 'success' as const };
        const err = r.reason as { message?: string } | null;
        return { id, status: 'failed' as const, error: err?.message || 'Network error' };
      });
      return { data: { results } };
    },
    [],
  );

  const runBulk = useCallback(
    async (ids: string[], op: BulkOp, confirmMsg?: string) => {
      if (ids.length === 0) return;
      if (confirmMsg && !window.confirm(confirmMsg)) return;
      const result = await batch.executeBatch(batchInterestOp, ids, { op });
      if (result.successCount > 0) {
        setSelectedKeys([]);
        await fetchInterests();
      }
    },
    [batch, batchInterestOp, fetchInterests],
  );

  // status별 selection 분류 (서버 거절 사전 차단)
  // - acknowledge: 'REQUESTED' 만 의미 있음 (기존 단건 노출 조건과 동일)
  // - complete / cancel: 모든 상태 가능 (기존 단건 무조건 노출)
  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);
  const selectedRequestedIds = useMemo(
    () => interestRequests.filter((r) => selectedSet.has(r.id) && r.status === 'REQUESTED').map((r) => r.id),
    [interestRequests, selectedSet],
  );
  const selectedAllIds = useMemo(
    () => interestRequests.filter((r) => selectedSet.has(r.id)).map((r) => r.id),
    [interestRequests, selectedSet],
  );

  const handleBulkAcknowledge = () => runBulk(selectedRequestedIds, 'acknowledge');
  const handleBulkComplete = () =>
    runBulk(selectedAllIds, 'complete', `선택한 ${selectedAllIds.length}개 요청을 완료 처리하시겠습니까?`);
  const handleBulkCancel = () =>
    runBulk(selectedAllIds, 'cancel', `선택한 ${selectedAllIds.length}개 요청을 취소 처리하시겠습니까?`);

  // ── DataTable columns ──
  const columns = useMemo<Column<StaffInterestRequest>[]>(() => [
    {
      key: 'urgency',
      title: '긴급도',
      align: 'center',
      render: (_v, req) => {
        const u = calcUrgency(req);
        const cfg = URGENCY_BADGE[u];
        return (
          <span
            style={{
              display: 'inline-block',
              fontSize: '11px',
              fontWeight: cfg.weight,
              backgroundColor: cfg.bg,
              color: cfg.color,
              padding: '3px 10px',
              borderRadius: '4px',
              minWidth: '52px',
              textAlign: 'center',
            }}
            title={
              u === 'urgent' ? '10분 이상 미응대' :
              u === 'warning' ? '5분 이상 미응대' :
              u === 'newest' ? '신규 요청' :
              u === 'acknowledged' ? '응대 확인됨' : ''
            }
          >
            {cfg.label}
          </span>
        );
      },
    },
    {
      key: 'product',
      title: '요청 상품',
      render: (_v, req) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {req.productName}
          </span>
          {req.customerNote && (
            <span style={{ fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {req.customerNote}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'customer',
      title: '요청자',
      render: (_v, req) => (
        <span style={{ fontSize: '13px', color: '#1e293b' }}>
          {req.customerName || '-'}
        </span>
      ),
    },
    {
      key: 'elapsed',
      title: '경과',
      align: 'right',
      render: (_v, req) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>{formatElapsed(req.createdAt)}</span>
          {req.status === 'ACKNOWLEDGED' && req.acknowledgedAt && (
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              응답 {formatDuration(req.createdAt, req.acknowledgedAt)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      title: '액션',
      align: 'right',
      render: (_v, req) => (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {req.status === 'REQUESTED' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleInterestAction(req.id, 'acknowledge'); }}
              style={{ ...rowBtn, backgroundColor: '#3b82f6', color: '#fff' }}
              title="확인"
            >
              확인
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); handleInterestAction(req.id, 'complete'); }}
            style={{ ...rowBtn, backgroundColor: '#22c55e', color: '#fff' }}
            title="완료"
          >
            완료
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleInterestAction(req.id, 'cancel'); }}
            style={{ ...rowBtn, backgroundColor: '#fff', color: '#ef4444', border: '1px solid #fecaca' }}
            title="취소"
          >
            취소
          </button>
        </div>
      ),
    },
  // urgency calc + formatElapsed 는 매 render 호출 — tick state 갱신으로 자동 재렌더
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>상담 요청</h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
          <GuideEditableSection
            pageKey="store/requests"
            sectionKey="hero-description"
            defaultContent="매장에서 접수된 상담 요청을 관리합니다."
          />
        </p>
      </div>

      {/* WO-O4O-STORE-REQUEST-CONTEXT-LIGHT-V1: 요약 카운트 바 (보존) */}
      {!loading && interestRequests.length > 0 && (() => {
        const pendingCount = interestRequests.filter(r => r.status === 'REQUESTED').length;
        const acknowledgedCount = interestRequests.filter(r => r.status === 'ACKNOWLEDGED').length;
        return (
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', fontSize: '14px', color: '#475569' }}>
            {pendingCount > 0 && (
              <span style={{ fontWeight: 600, color: '#d97706' }}>대기 {pendingCount}건</span>
            )}
            {pendingCount > 0 && acknowledgedCount > 0 && <span>·</span>}
            {acknowledgedCount > 0 && (
              <span style={{ fontWeight: 600, color: '#2563eb' }}>확인 {acknowledgedCount}건</span>
            )}
          </div>
        );
      })()}

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '14px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* WO-O4O-KPA-TABLET-REQUESTS-STANDARD-TABLE-V1: ActionBar — bulk 3종 */}
      <div style={{ marginBottom: '12px' }}>
        <ActionBar
          selectedCount={selectedKeys.length}
          onClearSelection={() => setSelectedKeys([])}
          actions={[
            {
              key: 'bulk-acknowledge',
              label: `일괄 확인 (${selectedRequestedIds.length})`,
              onClick: handleBulkAcknowledge,
              variant: 'primary' as const,
              icon: <Send className="w-3.5 h-3.5" />,
              loading: batch.loading,
              group: 'actions',
              visible: selectedRequestedIds.length > 0,
              tooltip: '선택한 대기 요청(REQUESTED)을 일괄 확인 처리합니다',
            },
            {
              key: 'bulk-complete',
              label: `일괄 완료 (${selectedAllIds.length})`,
              onClick: handleBulkComplete,
              variant: 'default' as const,
              icon: <CheckCircle2 className="w-3.5 h-3.5" />,
              loading: batch.loading,
              group: 'actions',
              visible: selectedAllIds.length > 0,
              tooltip: '선택한 요청을 일괄 완료 처리',
            },
            {
              key: 'bulk-cancel',
              label: `일괄 취소 (${selectedAllIds.length})`,
              onClick: handleBulkCancel,
              variant: 'danger' as const,
              icon: <Trash2 className="w-3.5 h-3.5" />,
              loading: batch.loading,
              group: 'actions',
              visible: selectedAllIds.length > 0,
              tooltip: '선택한 요청을 일괄 취소',
            },
            {
              key: 'clear',
              label: '선택 해제',
              onClick: () => setSelectedKeys([]),
              variant: 'default' as const,
              icon: <X className="w-3.5 h-3.5" />,
              group: 'meta',
              visible: selectedKeys.length > 0,
            },
          ]}
        />
      </div>

      <BulkResultModal
        open={batch.showResult}
        onClose={() => batch.clearResult()}
        result={batch.result}
        onRetry={() => batch.retryFailed()}
      />

      {/* WO-O4O-KPA-TABLET-REQUESTS-STANDARD-TABLE-V1:
          DataTable emptyText 가 string 만 허용 → GuideEditableSection (편집 가능 텍스트)
          을 보존하기 위해 empty 시 별도 panel 분기 (기존 카드형 panel 유지). */}
      {!loading && interestRequests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>💡</div>
          <p style={{ color: '#94a3b8', fontSize: '15px' }}>
            <GuideEditableSection
              pageKey="store/requests"
              sectionKey="empty-description"
              defaultContent="현재 대기 중인 상담 요청이 없습니다"
            />
          </p>
        </div>
      ) : (
        <DataTable<StaffInterestRequest>
          rowSelection={{
            selectedRowKeys: selectedKeys,
            onChange: setSelectedKeys,
          }}
          columns={columns}
          dataSource={interestRequests}
          rowKey="id"
          loading={loading}
          emptyText="현재 대기 중인 상담 요청이 없습니다"
        />
      )}
    </div>
  );
}

const rowBtn: CSSProperties = {
  padding: '6px 12px',
  borderRadius: '6px',
  border: 'none',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
};

export default TabletRequestsPage;
