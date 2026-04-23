/**
 * StoreOrdersPage - 주문 관리
 * WO-STORE-B2B-ORDER-EXECUTION-FLOW-V1
 *
 * 매장 주문 목록 (판매자 관점):
 * [1] KPI 4블록 (총 주문 / 진행 중 / 완료 / 이번 달 매출)
 * [2] 상태 필터 바
 * [3] 주문 테이블 (DataTable + 페이지네이션)
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from '@o4o/ui';
import type { Column } from '@o4o/ui';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { getStoreOrders, getStoreOrderKpi } from '../../api/checkout';
import type { StoreOrder, StoreOrderKpi } from '../../api/checkout';
import { StoreOrderDetailDrawer } from './StoreOrderDetailDrawer';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

// ── 상태 정의 (CheckoutOrderStatus enum 기준) ──

const STATUS_TABS = [
  { key: 'all', label: '전체' },
  { key: 'created', label: '접수' },
  { key: 'pending_payment', label: '결제대기' },
  { key: 'paid', label: '결제완료' },
  { key: 'cancelled', label: '취소' },
] as const;

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  created: { label: '접수', color: colors.primary, bg: '#DBEAFE' },
  pending_payment: { label: '결제대기', color: colors.accentYellow, bg: '#FEF3C7' },
  paid: { label: '결제완료', color: colors.accentGreen, bg: '#D1FAE5' },
  refunded: { label: '환불', color: colors.neutral500, bg: colors.neutral100 },
  cancelled: { label: '취소', color: '#ef4444', bg: '#FEE2E2' },
};

const PAGE_SIZE = 20;

export function StoreOrdersPage() {
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [kpi, setKpi] = useState<StoreOrderKpi>({ total: 0, pending: 0, completed: 0, monthlyRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ordersRes, kpiRes] = await Promise.all([
        getStoreOrders({
          status: selectedStatus !== 'all' ? selectedStatus : undefined,
          page,
          limit: PAGE_SIZE,
        }),
        getStoreOrderKpi(),
      ]);

      setOrders(ordersRes.data || []);
      setTotal(ordersRes.pagination?.total || 0);
      setKpi(kpiRes.data || { total: 0, pending: 0, completed: 0, monthlyRevenue: 0 });
    } catch {
      setError('주문 데이터를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset page when filter changes
  useEffect(() => { setPage(1); }, [selectedStatus]);

  const kpiBlocks = [
    { label: '총 주문', value: String(kpi.total), color: colors.neutral900 },
    { label: '진행 중', value: String(kpi.pending), color: colors.accentYellow },
    { label: '완료', value: String(kpi.completed), color: colors.accentGreen },
    {
      label: '이번 달 매출',
      value: kpi.monthlyRevenue > 0
        ? `${Number(kpi.monthlyRevenue).toLocaleString('ko-KR')}원`
        : '—',
      color: colors.primary,
    },
  ];

  const columns: Column<StoreOrder>[] = [
    {
      key: 'orderNumber',
      title: '주문번호',
      render: (_v: unknown, row: StoreOrder) => (
        <span style={{ fontWeight: 500, fontSize: '13px', color: colors.neutral800 }}>
          {row.orderNumber}
        </span>
      ),
    },
    {
      key: 'items',
      title: '상품',
      render: (_v: unknown, row: StoreOrder) => {
        const first = row.items?.[0];
        if (!first) return <span style={{ color: colors.neutral400 }}>—</span>;
        const more = row.itemCount > 1 ? ` 외 ${row.itemCount - 1}건` : '';
        return <span style={{ fontSize: '13px' }}>{first.productName}{more}</span>;
      },
    },
    {
      key: 'totalAmount',
      title: '금액',
      width: '120px',
      align: 'right' as const,
      render: (_v: unknown, row: StoreOrder) => (
        <span style={{ fontWeight: 600, fontSize: '13px' }}>
          {Number(row.totalAmount).toLocaleString('ko-KR')}원
        </span>
      ),
    },
    {
      key: 'status',
      title: '상태',
      width: '100px',
      align: 'center' as const,
      render: (_v: unknown, row: StoreOrder) => {
        const badge = STATUS_BADGE[row.status] || { label: row.status, color: colors.neutral500, bg: colors.neutral100 };
        return (
          <span style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 500,
            color: badge.color,
            backgroundColor: badge.bg,
          }}>
            {badge.label}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      title: '생성일',
      width: '140px',
      render: (_v: unknown, row: StoreOrder) => (
        <span style={{ fontSize: '12px', color: colors.neutral500 }}>
          {new Date(row.createdAt).toLocaleDateString('ko-KR')}
        </span>
      ),
    },
  ];

  return (
    <div style={S.container}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={S.title}>주문 관리</h1>
          <p style={S.subtitle}>B2B 구매 및 B2C 판매 주문을 관리합니다</p>
        </div>
        <Link to="/store/commerce/order-worktable" style={S.worktableLink}>
          주문 작업대 →
        </Link>
      </div>

      {/* [1] KPI 4블록 */}
      <div style={S.kpiGrid}>
        {kpiBlocks.map((item) => (
          <div key={item.label} style={S.kpiCard}>
            <p style={S.kpiLabel}>{item.label}</p>
            <p style={{ ...S.kpiValue, color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* [2] 상태 필터 바 */}
      <div style={S.filterBar}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedStatus(tab.key)}
            style={
              selectedStatus === tab.key
                ? { ...S.filterBtn, ...S.filterBtnActive }
                : S.filterBtn
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* [3] 주문 테이블 */}
      {loading ? (
        <div style={S.stateCenter}>
          <RefreshCw size={24} style={{ color: colors.neutral300 }} />
          <p style={{ color: colors.neutral500, fontSize: '14px', marginTop: '12px' }}>
            주문 데이터를 불러오는 중...
          </p>
        </div>
      ) : error ? (
        <div style={S.stateCenter}>
          <AlertCircle size={28} style={{ color: '#ef4444' }} />
          <p style={{ color: colors.neutral700, fontSize: '14px', marginTop: '12px' }}>{error}</p>
          <button onClick={loadData} style={S.retryBtn}>다시 시도</button>
        </div>
      ) : orders.length === 0 ? (
        <div style={S.tableCard}>
          <div style={S.emptyState}>
            <div style={S.emptyIcon}>📦</div>
            <p style={S.emptyTitle}>주문 데이터가 없습니다</p>
            <p style={S.emptyDesc}>
              주문 작업대에서 B2B 주문을 생성할 수 있습니다.
            </p>
            <Link to="/store/commerce/order-worktable" style={S.worktableLinkSmall}>
              주문 작업대 바로가기 →
            </Link>
          </div>
        </div>
      ) : (
        /* WO-O4O-STORE-LAYOUT-WIDTH-OVERFLOW-FIX-V1: table overflow → horizontal scroll */
        <div style={{ overflowX: 'auto' }}>
          <DataTable<StoreOrder>
            columns={columns}
            dataSource={orders}
            rowKey="id"
            onRowClick={(row) => setSelectedOrderId(row.id)}
            pagination={{
              current: page,
              pageSize: PAGE_SIZE,
              total,
              onChange: (p: number) => setPage(p),
            }}
            emptyText="주문이 없습니다"
          />
        </div>
      )}

      {/* Order Detail Drawer */}
      <StoreOrderDetailDrawer
        orderId={selectedOrderId}
        open={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        onStatusChange={() => {
          loadData();
          setSelectedOrderId(null);
        }}
      />
    </div>
  );
}

/* ── Styles ── */
const S: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
  },
  title: {
    ...typography.headingL,
    margin: 0,
    color: colors.neutral900,
  },
  subtitle: {
    margin: `${spacing.xs} 0 0`,
    fontSize: '0.875rem',
    color: colors.neutral500,
  },
  worktableLink: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.primary,
    textDecoration: 'none',
    padding: '8px 16px',
    borderRadius: borderRadius.md,
    backgroundColor: '#EFF6FF',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,
  worktableLinkSmall: {
    marginTop: '16px',
    display: 'inline-block',
    fontSize: '14px',
    color: colors.primary,
    textDecoration: 'none',
    fontWeight: 500,
  },

  /* KPI */
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: spacing.md,
  },
  kpiCard: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
  },
  kpiLabel: {
    margin: 0,
    fontSize: '0.8rem',
    fontWeight: 500,
    color: colors.neutral500,
  },
  kpiValue: {
    margin: `${spacing.xs} 0 0`,
    fontSize: '1.5rem',
    fontWeight: 700,
  },

  /* Filter */
  filterBar: {
    display: 'flex',
    gap: spacing.sm,
    overflowX: 'auto',
  },
  filterBtn: {
    padding: `${spacing.sm} ${spacing.md}`,
    fontSize: '0.875rem',
    fontWeight: 500,
    color: colors.neutral600,
    backgroundColor: colors.neutral100,
    border: 'none',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,
  filterBtnActive: {
    backgroundColor: '#DBEAFE',
    color: colors.primary,
  },

  /* Table card */
  tableCard: {
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    overflow: 'hidden',
  },

  /* States */
  stateCenter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
  } as React.CSSProperties,
  retryBtn: {
    marginTop: '16px',
    padding: '8px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
  },

  /* Empty */
  emptyState: {
    textAlign: 'center',
    padding: `${spacing.xxxl} ${spacing.lg}`,
  } as React.CSSProperties,
  emptyIcon: {
    fontSize: '2.5rem',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    margin: 0,
    fontSize: '1.125rem',
    fontWeight: 600,
    color: colors.neutral800,
  },
  emptyDesc: {
    margin: `${spacing.sm} 0 0`,
    fontSize: '0.875rem',
    color: colors.neutral500,
  },
};
