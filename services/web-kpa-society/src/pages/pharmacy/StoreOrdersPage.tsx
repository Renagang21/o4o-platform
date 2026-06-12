/**
 * StoreOrdersPage - 구매/발주 내역 (buyer)
 *
 * IR-O4O-STORE-ORDER-DIRECTION-SEMANTICS-CROSSSERVICE-V1 / WO-...-BUYER-LEDGER-ALIGNMENT-V1:
 *   "내 매장 주문 내역" canonical = buyer(구매/발주 내역). buyerId 기준 checkout_orders(/checkout/orders).
 *   (기존 "판매자 관점" /checkout/store-orders + StoreOrderDetailDrawer(상태변경) 제거.
 *    seller "받은 주문/판매 이행" 은 별도 화면으로 분리 — 본 화면 범위 외. client 의 store-orders* 함수는 보존.)
 *
 * [1] KPI 3블록 (총 주문 / 결제완료 / 이번 달 주문액)
 * [2] 상태 필터 바
 * [3] 주문 테이블 (DataTable + 페이지네이션)
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from '@o4o/ui';
import type { Column } from '@o4o/ui';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { getBuyerOrders } from '../../api/checkout';
import type { BuyerOrder } from '../../api/checkout';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';
// 3서비스 공통 buyer checkout 상태 표시 매핑 (WO-O4O-STORE-CHECKOUT-STATUS-LABEL-ALIGNMENT-V1)
import { BUYER_CHECKOUT_STATUS_TABS, getBuyerCheckoutStatusDisplay, BUYER_CHECKOUT_TONE_HEX } from '@o4o/store-ui-core';

// ── 상태 정의 (3서비스 공통 매핑) ──

const STATUS_TABS = BUYER_CHECKOUT_STATUS_TABS;

const PAGE_SIZE = 20;

function isPaid(o: BuyerOrder): boolean {
  const s = (o.status || '').toLowerCase();
  const p = (o.paymentStatus || '').toLowerCase();
  return p === 'paid' || s === 'paid' || s === 'completed' || s === 'fulfilled';
}

export function StoreOrdersPage() {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [allOrders, setAllOrders] = useState<BuyerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // buyer endpoint 는 status 필터 미지원 → 전체 조회 후 client-side 필터/집계
      const res = await getBuyerOrders({ limit: 100 });
      setAllOrders(res.success ? res.data ?? [] : []);
    } catch {
      setError('주문 내역을 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset page when filter changes
  useEffect(() => { setPage(1); }, [selectedStatus]);

  // client-side 필터 + 집계
  const filtered = allOrders.filter((o) =>
    selectedStatus === 'all' ? true : (o.status || '').toLowerCase() === selectedStatus
  );
  const total = filtered.length;
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const paidCount = allOrders.filter(isPaid).length;
  const monthlyAmount = allOrders
    .filter((o) => new Date(o.createdAt) >= monthStart && (o.status || '').toLowerCase() !== 'cancelled')
    .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

  const kpiBlocks = [
    { label: '총 주문', value: String(allOrders.length), color: colors.neutral900 },
    { label: '결제완료', value: String(paidCount), color: colors.accentGreen },
    {
      label: '이번 달 주문액',
      value: monthlyAmount > 0 ? `${monthlyAmount.toLocaleString('ko-KR')}원` : '—',
      color: colors.primary,
    },
  ];

  const columns: Column<BuyerOrder>[] = [
    {
      key: 'orderNumber',
      title: '주문번호',
      render: (_v: unknown, row: BuyerOrder) => (
        <span style={{ fontWeight: 500, fontSize: '13px', color: colors.neutral800 }}>
          {row.orderNumber}
        </span>
      ),
    },
    {
      key: 'itemCount',
      title: '상품',
      render: (_v: unknown, row: BuyerOrder) =>
        row.itemCount > 0 ? (
          <span style={{ fontSize: '13px' }}>상품 {row.itemCount}개</span>
        ) : (
          <span style={{ color: colors.neutral400 }}>—</span>
        ),
    },
    {
      key: 'totalAmount',
      title: '금액',
      width: '120px',
      align: 'right' as const,
      render: (_v: unknown, row: BuyerOrder) => (
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
      render: (_v: unknown, row: BuyerOrder) => {
        const display = getBuyerCheckoutStatusDisplay(row.status);
        const hex = BUYER_CHECKOUT_TONE_HEX[display.tone];
        return (
          <span style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 500,
            color: hex.color,
            backgroundColor: hex.bg,
          }}>
            {display.label}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      title: '주문일',
      width: '140px',
      render: (_v: unknown, row: BuyerOrder) => (
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
          <h1 style={S.title}>구매/발주 내역</h1>
          <p style={S.subtitle}>매장 허브에서 주문한 O4O 상품·이벤트 오퍼의 주문·결제 내역을 확인합니다</p>
        </div>
        <Link to="/store/commerce/order-worktable" style={S.worktableLink}>
          주문 작업대 →
        </Link>
      </div>

      {/* [1] KPI */}
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
            주문 내역을 불러오는 중...
          </p>
        </div>
      ) : error ? (
        <div style={S.stateCenter}>
          <AlertCircle size={28} style={{ color: '#ef4444' }} />
          <p style={{ color: colors.neutral700, fontSize: '14px', marginTop: '12px' }}>{error}</p>
          <button onClick={loadData} style={S.retryBtn}>다시 시도</button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={S.tableCard}>
          <div style={S.emptyState}>
            <div style={S.emptyIcon}>📦</div>
            <p style={S.emptyTitle}>주문 내역이 없습니다</p>
            <p style={S.emptyDesc}>
              매장 허브에서 O4O 주문 가능 상품이나 이벤트 오퍼를 주문하면 이곳에서 확인할 수 있습니다.
            </p>
            <Link to="/store/commerce/order-worktable" style={S.worktableLinkSmall}>
              주문 작업대 바로가기 →
            </Link>
          </div>
        </div>
      ) : (
        /* WO-O4O-STORE-LAYOUT-WIDTH-OVERFLOW-FIX-V1: table overflow → horizontal scroll */
        <div style={{ overflowX: 'auto' }}>
          <DataTable<BuyerOrder>
            columns={columns}
            dataSource={pageRows}
            rowKey="id"
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
    gridTemplateColumns: 'repeat(3, 1fr)',
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
