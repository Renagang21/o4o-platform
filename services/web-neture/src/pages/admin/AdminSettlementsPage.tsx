/**
 * AdminSettlementsPage - 운영자 정산 관리
 *
 * Work Order: WO-O4O-SETTLEMENT-ENGINE-OPERATOR-REFACTOR-V1
 *
 * 구성:
 * - KPI 카드 3개: 미정산 / 승인완료 / 지급완료
 * - 정산 계산 섹션: 기간 선택 + 계산 실행
 * - 상태 필터 탭: 전체 / 정산완료 / 승인완료 / 지급완료 / 취소
 * - 정산 목록: 공급자 / 기간 / 매출 / 수수료 / 정산금액 / 주문수 / 상태 / 액션
 * - 상세 확장: 연결 주문 목록
 * - 페이지네이션
 */

import { useState, useEffect, useCallback } from 'react';
import { DataTable, type ListColumnDef } from '@o4o/operator-ux-core';
import { RowActionMenu } from '@o4o/ui';
import { Calculator } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import {
  adminSettlementApi,
  type Settlement,
  type SettlementDetail,
  type AdminSettlementKpi,
  type SettlementStatus,
} from '../../lib/api';

// ============================================================================
// Status Config
// ============================================================================

type StatusConfig = { label: string; bg: string; color: string };

const STATUS_MAP: Record<string, StatusConfig> = {
  pending: { label: '대기', bg: '#fef3c7', color: '#b45309' },
  calculated: { label: '정산완료', bg: '#dbeafe', color: '#1d4ed8' },
  approved: { label: '승인완료', bg: '#e0e7ff', color: '#4338ca' },
  paid: { label: '지급완료', bg: '#dcfce7', color: '#15803d' },
  cancelled: { label: '취소', bg: '#f1f5f9', color: '#64748b' },
};

function getStatus(status: string): StatusConfig {
  return STATUS_MAP[status] || { label: status, bg: '#f1f5f9', color: '#64748b' };
}

// ============================================================================
// Helpers
// ============================================================================

function formatPrice(v: number): string {
  return v.toLocaleString('ko-KR');
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatPeriod(start: string, end: string): string {
  return `${formatDate(start)} ~ ${formatDate(end)}`;
}

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

// ============================================================================
// Filter Tabs
// ============================================================================

const FILTER_TABS: { label: string; value: SettlementStatus | undefined }[] = [
  { label: '전체', value: undefined },
  { label: '정산완료', value: 'calculated' },
  { label: '승인완료', value: 'approved' },
  { label: '지급완료', value: 'paid' },
  { label: '취소', value: 'cancelled' },
];

// ============================================================================
// Main Component
// ============================================================================

export default function AdminSettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [kpi, setKpi] = useState<AdminSettlementKpi>({
    calculated_count: 0, calculated_amount: 0,
    approved_count: 0, approved_amount: 0,
    paid_count: 0, paid_amount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [statusFilter, setStatusFilter] = useState<SettlementStatus | undefined>(undefined);

  // Detail expansion
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SettlementDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Calculate period
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [calcMessage, setCalcMessage] = useState('');

  // Action loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ---- Data Fetching ----

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [listResult, kpiResult] = await Promise.all([
        adminSettlementApi.getSettlements({ page, status: statusFilter }),
        adminSettlementApi.getKpi(),
      ]);
      setSettlements(listResult.data);
      setMeta(listResult.meta);
      setKpi(kpiResult);
    } catch (err) {
      console.error('[AdminSettlements] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ---- Expand detail ----

  const toggleExpand = useCallback(async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setDetail(null);
    setDetailLoading(true);
    const d = await adminSettlementApi.getDetail(id);
    setDetail(d);
    setDetailLoading(false);
  }, [expandedId]);

  // ── WO-O4O-DATATABLE-EXPANDABLE-ROW-…-V1 : 표준 DataTable 어댑터 ──
  //   기존 expandedId(단일 확장 + 확장 시 상세 조회)를 새 Set 계약으로 이전한다.
  //   단일 확장 의미를 유지하기 위해 Set 은 항상 0~1개만 담는다.
  const expandedKeys = new Set(expandedId ? [expandedId] : []);
  const handleExpandedChange = useCallback((keys: Set<string>) => {
    const next = Array.from(keys).find((k) => k !== expandedId) ?? null;
    // toggleExpand 가 상세 fetch/해제를 모두 담당한다(계약 불변).
    void toggleExpand(next ?? expandedId ?? '');
  }, [expandedId, toggleExpand]);

  const renderSettlementDetail = useCallback(() => {
    if (detailLoading) return <p style={styles.detailLoading}>주문 정보 불러오는 중...</p>;
    if (!detail || detail.orders.length === 0) return <p style={styles.detailLoading}>주문 정보가 없습니다.</p>;
    return (
      <table style={styles.detailTable}>
        <thead>
          <tr>
            <th style={styles.detailTh}>주문번호</th>
            <th style={styles.detailTh}>주문자</th>
            <th style={{ ...styles.detailTh, textAlign: 'right' as const }}>매출</th>
            <th style={styles.detailTh}>주문상태</th>
            <th style={styles.detailTh}>주문일</th>
          </tr>
        </thead>
        <tbody>
          {detail.orders.map((o) => (
            <tr key={o.order_id}>
              <td style={styles.detailTd}>{o.order_number}</td>
              <td style={styles.detailTd}>{o.orderer_name || '-'}</td>
              <td style={{ ...styles.detailTd, textAlign: 'right' as const }}>{formatPrice(o.supplier_sales_amount)}원</td>
              <td style={styles.detailTd}>{o.order_status}</td>
              <td style={styles.detailTd}>{formatDate(o.order_date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }, [detail, detailLoading]);

  const columns: ListColumnDef<Settlement>[] = [
    { key: 'supplier_name', header: '공급자', minWidth: 140, render: (_v, s) => s.supplier_name || s.supplier_id.slice(0, 8) },
    { key: 'period', header: '정산 기간', width: '160px', render: (_v, s) => formatPeriod(s.period_start, s.period_end) },
    { key: 'total_sales', header: '매출합계', width: '120px', align: 'right', render: (_v, s) => `${formatPrice(s.total_sales)}원` },
    {
      key: 'platform_fee', header: '수수료', width: '150px', align: 'right',
      render: (_v, s) => <span style={{ color: '#dc2626' }}>-{formatPrice(s.platform_fee)}원 ({formatRate(s.platform_fee_rate)})</span>,
    },
    {
      key: 'supplier_amount', header: '정산금액', width: '130px', align: 'right',
      render: (_v, s) => <span style={{ fontWeight: 600 }}>{formatPrice(s.supplier_amount)}원</span>,
    },
    { key: 'order_count', header: '주문수', width: '80px', align: 'center', render: (_v, s) => s.order_count },
    {
      key: 'status', header: '상태', width: '100px', align: 'center',
      render: (_v, s) => {
        const st = getStatus(s.status);
        return <span style={{ ...styles.badge, backgroundColor: st.bg, color: st.color }}>{st.label}</span>;
      },
    },
    {
      key: '_actions', header: '액션', width: '72px', align: 'center', system: true,
      render: (_v, s) => {
        const actions =
          s.status === 'calculated'
            ? [
                { key: 'approve', label: '승인', onClick: () => handleApprove(s.id) },
                { key: 'cancel', label: '취소', variant: 'danger' as const, onClick: () => handleCancel(s.id) },
              ]
            : s.status === 'approved'
              ? [
                  { key: 'pay', label: '지급', onClick: () => handlePay(s.id) },
                  { key: 'cancel', label: '취소', variant: 'danger' as const, onClick: () => handleCancel(s.id) },
                ]
              : [];
        if (actions.length === 0) return <span style={{ color: '#cbd5e1' }}>—</span>;
        return <RowActionMenu actions={actions} disabled={actionLoading === s.id} />;
      },
    },
  ];

  // ---- Calculate ----

  const handleCalculate = useCallback(async () => {
    if (!periodStart || !periodEnd) return;
    setCalculating(true);
    setCalcMessage('');
    try {
      const result = await adminSettlementApi.calculate(periodStart, periodEnd);
      if (result.success) {
        const count = result.data?.created || 0;
        setCalcMessage(count > 0 ? `${count}건 정산 생성 완료` : '정산 대상 주문이 없습니다.');
        fetchData();
      } else {
        setCalcMessage(result.error === 'DUPLICATE_SETTLEMENT' ? '이미 해당 기간에 정산이 존재합니다.' : (result.message || '정산 계산 실패'));
      }
    } catch {
      setCalcMessage('정산 계산 중 오류 발생');
    } finally {
      setCalculating(false);
    }
  }, [periodStart, periodEnd, fetchData]);

  // ---- Actions ----

  const handleApprove = useCallback(async (id: string) => {
    if (!window.confirm('이 정산을 승인하시겠습니까?')) return;
    setActionLoading(id);
    const ok = await adminSettlementApi.approve(id);
    setActionLoading(null);
    if (ok) fetchData();
    else toast.error('승인 처리 실패');
  }, [fetchData]);

  const handlePay = useCallback(async (id: string) => {
    if (!window.confirm('이 정산을 지급 완료 처리하시겠습니까?')) return;
    setActionLoading(id);
    const ok = await adminSettlementApi.pay(id);
    setActionLoading(null);
    if (ok) fetchData();
    else toast.error('지급 처리 실패');
  }, [fetchData]);

  const handleCancel = useCallback(async (id: string) => {
    if (!window.confirm('이 정산을 취소하시겠습니까? 연결된 주문이 재정산 가능해집니다.')) return;
    setActionLoading(id);
    const ok = await adminSettlementApi.cancel(id);
    setActionLoading(null);
    if (ok) fetchData();
    else toast.error('취소 처리 실패');
  }, [fetchData]);

  // ---- Filter / Page ----

  const handleFilterChange = (status: SettlementStatus | undefined) => {
    setStatusFilter(status);
    setPage(1);
    setExpandedId(null);
    setDetail(null);
  };

  // ---- Render ----

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>정산 관리</h1>
        <p style={styles.subtitle}>정산 계산, 승인, 지급을 관리합니다.</p>
      </div>

      {/* KPI Cards */}
      <div style={styles.kpiRow}>
        <div style={{ ...styles.kpiCard, borderColor: '#dbeafe' }}>
          <p style={{ ...styles.kpiAmount, color: '#1d4ed8' }}>{formatPrice(kpi.calculated_amount)}원</p>
          <p style={styles.kpiLabel}>미정산 ({kpi.calculated_count}건)</p>
        </div>
        <div style={{ ...styles.kpiCard, borderColor: '#e0e7ff' }}>
          <p style={{ ...styles.kpiAmount, color: '#4338ca' }}>{formatPrice(kpi.approved_amount)}원</p>
          <p style={styles.kpiLabel}>승인완료 ({kpi.approved_count}건)</p>
        </div>
        <div style={{ ...styles.kpiCard, borderColor: '#dcfce7' }}>
          <p style={{ ...styles.kpiAmount, color: '#15803d' }}>{formatPrice(kpi.paid_amount)}원</p>
          <p style={styles.kpiLabel}>지급완료 ({kpi.paid_count}건)</p>
        </div>
      </div>

      {/* Calculate Section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>정산 계산</h2>
        <div style={styles.calcRow}>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            style={styles.dateInput}
          />
          <span style={{ color: '#64748b' }}>~</span>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            style={styles.dateInput}
          />
          <button
            onClick={handleCalculate}
            disabled={calculating || !periodStart || !periodEnd}
            style={{
              ...styles.calcButton,
              opacity: calculating || !periodStart || !periodEnd ? 0.5 : 1,
            }}
          >
            <Calculator size={16} />
            {calculating ? '계산 중...' : '정산 계산'}
          </button>
        </div>
        {calcMessage && (
          <p style={{ marginTop: '8px', fontSize: '13px', color: '#475569' }}>{calcMessage}</p>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={styles.filterRow}>
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => handleFilterChange(tab.value)}
            style={{
              ...styles.filterTab,
              ...(statusFilter === tab.value ? styles.filterTabActive : {}),
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Settlement List */}
      {loading ? (
        <p style={styles.emptyText}>불러오는 중...</p>
      ) : settlements.length === 0 ? (
        <p style={styles.emptyText}>정산 내역이 없습니다.</p>
      ) : (
        <div style={styles.tableWrapper}>
          {/* WO-O4O-DATATABLE-EXPANDABLE-ROW-…-V1: raw <table> → 표준 DataTable(행 확장).
              기존 단일 확장 + 확장 시 상세 API 조회 계약(toggleExpand)을 그대로 보존한다. */}
          <DataTable<Settlement>
            columns={columns}
            data={settlements}
            rowKey={(s) => s.id}
            expandable
            expandedRowKeys={expandedKeys}
            onExpandedRowKeysChange={handleExpandedChange}
            renderExpandedRow={renderSettlementDetail}
            emptyMessage="정산 내역이 없습니다"
          />
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            style={{ ...styles.pageBtn, opacity: page <= 1 ? 0.4 : 1 }}
          >
            이전
          </button>
          <span style={styles.pageInfo}>{page} / {meta.totalPages} ({meta.total}건)</span>
          <button
            disabled={page >= meta.totalPages}
            onClick={() => setPage(page + 1)}
            style={{ ...styles.pageBtn, opacity: page >= meta.totalPages ? 0.4 : 1 }}
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px 16px',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '4px 0 0 0',
  },

  // KPI
  kpiRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap' as const,
  },
  kpiCard: {
    flex: '1 1 200px',
    padding: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    textAlign: 'center' as const,
  },
  kpiAmount: {
    fontSize: '22px',
    fontWeight: 700,
    margin: 0,
  },
  kpiLabel: {
    fontSize: '13px',
    color: '#64748b',
    margin: '4px 0 0 0',
  },

  // Calculate Section
  section: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '20px',
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#0f172a',
    margin: '0 0 12px 0',
  },
  calcRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  dateInput: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#0f172a',
  },
  calcButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },

  // Filter
  filterRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    flexWrap: 'wrap' as const,
  },
  filterTab: {
    padding: '6px 14px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#475569',
    fontSize: '13px',
    cursor: 'pointer',
  },
  filterTabActive: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    borderColor: '#0f172a',
  },

  // Table
  tableWrapper: {
    overflowX: 'auto' as const,
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '14px',
  },
  th: {
    padding: '12px 14px',
    textAlign: 'left' as const,
    fontWeight: 600,
    color: '#475569',
    borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap' as const,
    fontSize: '13px',
  },
  row: {
    borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '12px 14px',
    color: '#0f172a',
    whiteSpace: 'nowrap' as const,
  },
  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: 600,
  },

  // Actions
  actionGroup: {
    display: 'flex',
    gap: '4px',
    justifyContent: 'center',
  },
  actionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    padding: '4px 10px',
    borderRadius: '4px',
    border: 'none',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  approveBtn: {
    backgroundColor: '#e0e7ff',
    color: '#4338ca',
  },
  payBtn: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
  },
  cancelBtn: {
    backgroundColor: '#f1f5f9',
    color: '#64748b',
  },

  // Detail
  detailCell: {
    padding: '16px 20px',
    backgroundColor: '#f8fafc',
  },
  detailLoading: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
  },
  detailTable: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '13px',
  },
  detailTh: {
    padding: '8px 10px',
    textAlign: 'left' as const,
    fontWeight: 600,
    color: '#475569',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '12px',
  },
  detailTd: {
    padding: '8px 10px',
    color: '#334155',
    borderBottom: '1px solid #f1f5f9',
  },

  // Pagination
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px',
    marginTop: '20px',
  },
  pageBtn: {
    padding: '6px 14px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#475569',
    fontSize: '13px',
    cursor: 'pointer',
  },
  pageInfo: {
    fontSize: '13px',
    color: '#64748b',
  },

  // Empty
  emptyText: {
    textAlign: 'center' as const,
    color: '#94a3b8',
    padding: '40px 0',
    fontSize: '14px',
  },
};
