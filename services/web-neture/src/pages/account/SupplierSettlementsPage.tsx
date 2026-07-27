/**
 * SupplierSettlementsPage - 공급자 정산 관리
 *
 * Work Order: WO-O4O-SETTLEMENT-ENGINE-V1
 *
 * 구성:
 * - KPI 카드: 미정산 금액 / 지급 완료 금액
 * - 상태 필터 탭: 전체 / 정산완료 / 지급완료 / 취소
 * - 정산 목록: 기간 / 매출 / 수수료 / 정산금액 / 주문수 / 상태
 * - 상세 확장: 연결 주문 목록
 * - 페이지네이션
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, DollarSign } from 'lucide-react';
import { DataTable, type ListColumnDef } from '@o4o/operator-ux-core';
import {
  supplierApi,
  type Settlement,
  type SettlementDetail,
  type SettlementKpi,
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

export default function SupplierSettlementsPage() {
  const location = useLocation();
  const backPath = location.pathname.startsWith('/supplier/') ? '/supplier/dashboard' : '/account/supplier';
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [kpi, setKpi] = useState<SettlementKpi>({
    pending_amount: 0, paid_amount: 0, total_amount: 0, pending_count: 0, paid_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [statusFilter, setStatusFilter] = useState<SettlementStatus | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SettlementDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(false);

  // WO-O4O-NETURE-SUPPLIER-ORDER-INVENTORY-SETTLEMENT-LOAD-ERROR-CONTRACT-V1:
  //   기존 catch 는 API 가 먼저 오류를 삼켜 실행되지 않았고, 실패가 "정산 0건 · 0원" 으로 표시됐다.
  //   이제 두 API 가 throw 하므로 실패를 명시 상태로 분리한다.
  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [result, kpiData] = await Promise.all([
        supplierApi.getSettlements({ page, limit: 20, status: statusFilter }),
        supplierApi.getSettlementKpi(),
      ]);
      setSettlements(result.data);
      setMeta(result.meta);
      setKpi(kpiData);
    } catch {
      setSettlements([]);
      setMeta({ page: 1, limit: 20, total: 0, totalPages: 0 });
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (value: SettlementStatus | undefined) => {
    setStatusFilter(value);
    setPage(1);
    setExpandedId(null);
    setDetail(null);
  };

  // 상세 로드 — 확장 시 해당 정산의 연결 주문을 조회한다.
  const openDetail = async (id: string) => {
    setExpandedId(id);
    setLoadingDetail(true);
    setDetailError(false);
    try {
      // null = 미존재(404) / throw = 조회 실패 — 두 상태를 분리한다.
      const data = await supplierApi.getSettlementDetail(id);
      setDetail(data);
    } catch {
      setDetail(null);
      setDetailError(true);
    } finally {
      setLoadingDetail(false);
    }
  };

  // WO-O4O-NETURE-EXPANDABLE-AND-REMAINING-LISTS-STANDARDIZATION-BATCH-V5:
  //   카드 목록 + 수동 확장 → 공용 DataTable 확장 API (controlled, single-open).
  //   상세는 단일 상태(detail)로 유지하므로 한 번에 하나만 펼친다.
  const handleExpandChange = (next: Set<string>) => {
    const added = [...next].find((k) => k !== expandedId);
    if (added) {
      openDetail(added);
    } else {
      setExpandedId(null);
      setDetail(null);
    }
  };

  const columns: ListColumnDef<Settlement>[] = [
    {
      key: 'period',
      header: '정산 기간',
      minWidth: 200,
      render: (_v, s) => (
        <span style={{ fontWeight: 600, color: '#1e293b' }}>{formatPeriod(s.period_start, s.period_end)}</span>
      ),
    },
    {
      key: 'total_sales',
      header: '매출',
      align: 'right',
      width: '120px',
      render: (_v, s) => <span style={{ color: '#1e293b' }}>{formatPrice(s.total_sales)}원</span>,
    },
    {
      key: 'platform_fee',
      header: '수수료',
      align: 'right',
      width: '140px',
      render: (_v, s) => (
        <span style={{ color: '#dc2626' }}>
          -{formatPrice(s.platform_fee)}원
          <span style={{ color: '#94a3b8', fontSize: '12px' }}> ({formatRate(s.platform_fee_rate)})</span>
        </span>
      ),
    },
    {
      key: 'supplier_amount',
      header: '정산금액',
      align: 'right',
      width: '130px',
      render: (_v, s) => <span style={{ fontWeight: 700, color: '#1e293b' }}>{formatPrice(s.supplier_amount)}원</span>,
    },
    {
      key: 'order_count',
      header: '주문수',
      align: 'right',
      width: '90px',
      render: (_v, s) => <span style={{ color: '#64748b' }}>{s.order_count}건</span>,
    },
    {
      key: 'status',
      header: '상태',
      width: '110px',
      align: 'center',
      render: (_v, s) => {
        const statusInfo = getStatus(s.status);
        return (
          <span style={{ ...styles.statusBadge, backgroundColor: statusInfo.bg, color: statusInfo.color }}>
            {statusInfo.label}
          </span>
        );
      },
    },
    {
      key: 'created_at',
      header: '등록일',
      width: '120px',
      render: (_v, s) => <span style={{ color: '#94a3b8', fontSize: '13px', whiteSpace: 'nowrap' }}>{formatDate(s.created_at)}</span>,
    },
  ];

  // 확장 상세 — 단일 상태(detail)이므로 현재 펼쳐진 행에만 대응한다.
  const renderExpandedRow = (s: Settlement) => {
    if (expandedId !== s.id) return null;
    if (loadingDetail) return <p style={styles.detailLoading}>주문 정보를 불러오는 중...</p>;
    if (detailError) {
      return (
        <p style={{ ...styles.detailLoading, color: '#dc2626' }}>
          정산 상세를 불러오지 못했습니다.{' '}
          <button
            onClick={() => openDetail(s.id)}
            style={{ background: 'none', border: 'none', color: '#dc2626', textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit', padding: 0 }}
          >
            다시 시도
          </button>
        </p>
      );
    }
    if (detail && detail.orders && detail.orders.length > 0) {
      return (
        <table style={styles.detailTable}>
          <thead>
            <tr>
              <th style={styles.dtTh}>주문번호</th>
              <th style={styles.dtTh}>주문자</th>
              <th style={{ ...styles.dtTh, textAlign: 'right' }}>매출</th>
              <th style={styles.dtTh}>주문일</th>
            </tr>
          </thead>
          <tbody>
            {detail.orders.map((o) => (
              <tr key={o.order_id}>
                <td style={styles.dtTd}>{o.order_number}</td>
                <td style={styles.dtTd}>{o.orderer_name || '-'}</td>
                <td style={{ ...styles.dtTd, textAlign: 'right', fontWeight: 500 }}>
                  {formatPrice(o.supplier_sales_amount)}원
                </td>
                <td style={styles.dtTd}>{formatDate(o.order_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    return <p style={styles.detailLoading}>연결된 주문이 없습니다.</p>;
  };

  return (
    <div>
      {/* Back Link */}
      <Link to={backPath} style={styles.backNav}>
        <ArrowLeft size={16} />
        대시보드
      </Link>

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>정산 관리</h1>
        <p style={styles.subtitle}>배송 완료된 주문의 정산 현황을 확인하세요.</p>
      </div>

      {/* KPI Cards */}
      {/* KPI — 조회 실패 시 0원/0건 으로 오인시키지 않도록 숨긴다 */}
      {!loadError && (
      <div style={styles.kpiGrid}>
        <div style={{ ...styles.kpiCard, backgroundColor: '#fffbeb' }}>
          <DollarSign size={20} style={{ color: '#b45309' }} />
          <div style={styles.kpiContent}>
            <span style={{ ...styles.kpiValue, color: '#b45309' }}>{formatPrice(kpi.pending_amount)}원</span>
            <span style={styles.kpiLabel}>미정산 ({kpi.pending_count}건)</span>
          </div>
        </div>
        <div style={{ ...styles.kpiCard, backgroundColor: '#f0fdf4' }}>
          <DollarSign size={20} style={{ color: '#15803d' }} />
          <div style={styles.kpiContent}>
            <span style={{ ...styles.kpiValue, color: '#15803d' }}>{formatPrice(kpi.paid_amount)}원</span>
            <span style={styles.kpiLabel}>지급완료 ({kpi.paid_count}건)</span>
          </div>
        </div>
      </div>
      )}

      {/* Filter Tabs */}
      <div style={styles.filterTabs}>
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
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>정산 정보를 불러오는 중...</p>
        </div>
      ) : loadError ? (
        <div style={styles.emptyState}>
          <DollarSign size={40} style={{ color: '#dc2626' }} />
          <p style={styles.emptyText}>정산 정보를 불러오지 못했습니다.</p>
          <button
            onClick={fetchData}
            style={{
              marginTop: '12px', padding: '8px 16px', borderRadius: '8px',
              border: '1px solid #e2e8f0', backgroundColor: '#fff',
              color: '#475569', fontSize: '14px', cursor: 'pointer',
            }}
          >
            다시 시도
          </button>
        </div>
      ) : settlements.length === 0 ? (
        <div style={styles.emptyState}>
          <DollarSign size={40} style={{ color: '#cbd5e1' }} />
          <p style={styles.emptyText}>정산 내역이 없습니다.</p>
        </div>
      ) : (
        <DataTable<Settlement>
          columns={columns}
          data={settlements}
          rowKey={(s) => s.id}
          emptyMessage="정산 내역이 없습니다."
          expandable
          expandedRowKeys={expandedId ? new Set([expandedId]) : new Set()}
          onExpandedRowKeysChange={handleExpandChange}
          renderExpandedRow={renderExpandedRow}
        />
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{ ...styles.pageButton, opacity: page <= 1 ? 0.4 : 1 }}
          >
            이전
          </button>
          <span style={styles.pageInfo}>{page} / {meta.totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            disabled={page >= meta.totalPages}
            style={{ ...styles.pageButton, opacity: page >= meta.totalPages ? 0.4 : 1 }}
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
  backNav: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#64748b',
    textDecoration: 'none',
    marginBottom: '20px',
    fontWeight: 500,
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '4px 0 0 0',
  },

  // KPI
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  kpiCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  kpiContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  kpiValue: {
    fontSize: '20px',
    fontWeight: 700,
  },
  kpiLabel: {
    fontSize: '13px',
    color: '#64748b',
  },

  // Filter Tabs
  filterTabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  filterTab: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#64748b',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    cursor: 'pointer',
  },
  filterTabActive: {
    color: '#1d4ed8',
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
  },

  // List
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  settlementCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  settlementRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    cursor: 'pointer',
  },
  settlementMain: {
    flex: 1,
    minWidth: 0,
  },
  periodText: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: '6px',
  },
  amountRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
    fontSize: '13px',
  },
  amountLabel: {
    color: '#64748b',
  },
  amountValue: {
    color: '#1e293b',
    fontWeight: 500,
  },
  amountSeparator: {
    color: '#cbd5e1',
    fontSize: '12px',
  },
  metaRow: {
    display: 'flex',
    gap: '16px',
    marginTop: '6px',
  },
  metaText: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  settlementRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexShrink: 0,
    marginLeft: '16px',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },

  // Detail
  detailSection: {
    padding: '0 20px 16px',
    borderTop: '1px solid #f1f5f9',
  },
  detailLoading: {
    fontSize: '13px',
    color: '#94a3b8',
    padding: '12px 0',
    margin: 0,
  },
  detailTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '12px',
  },
  dtTh: {
    textAlign: 'left',
    padding: '8px 10px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#64748b',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  dtTd: {
    padding: '8px 10px',
    fontSize: '13px',
    color: '#334155',
    borderBottom: '1px solid #f1f5f9',
  },

  // Pagination
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginTop: '24px',
  },
  pageButton: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#3b82f6',
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  pageInfo: {
    fontSize: '13px',
    color: '#64748b',
  },

  // Empty
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
};
