/**
 * OnlineSalesOrdersPage — 온라인 판매 주문 관리 (seller)
 *
 * WO-O4O-KPA-ONLINE-SALES-ORDER-MANAGEMENT-AND-BUYER-ORDER-RELABEL-V1
 *
 * 온라인 스토어(B2C)를 통해 고객이 접수한 판매 주문(checkout_orders, sellerOrganizationId 기준)을 조회한다.
 * - 기존 백엔드 seller order API 재사용: GET /checkout/store-orders, /checkout/store-orders/kpi
 *   (kpa-checkout.controller — requireStoreOwner + sellerOrganizationId 스코프). backend/DB 무변경.
 * - 구매(발주) 내역(StoreOrdersPage, /checkout/orders, buyer)과 의미를 섞지 않는다(별도 화면).
 * - LIST 응답에 고객명/연락처는 없음(개인정보 보호) → 표시하지 않음. 상세는 후속(주문 상세 WO).
 *
 * 구성: [KPI 4블록] + [상태 필터] + [주문 테이블 + 서버 페이지네이션]
 *  - 빈 상태: 온라인 스토어 미활성(B2C 채널 없음) vs 주문 없음 구분.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from '@o4o/ui';
import type { Column } from '@o4o/ui';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { getStoreOrders, getStoreOrderKpi, type StoreOrder, type StoreOrderKpi } from '../../api/checkout';
import { fetchChannelOverview } from '../../api/storeHub';
import { BUYER_CHECKOUT_STATUS_TABS, BuyerOrderStatusBadge } from '@o4o/store-ui-core';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

const STATUS_TABS = BUYER_CHECKOUT_STATUS_TABS;
const PAGE_SIZE = 20;

// checkout_orders 결제 상태 표시(간단 매핑) — seller 관점 결제 상태
function paymentLabel(p: string): string {
  const s = (p || '').toLowerCase();
  if (s === 'paid') return '결제완료';
  if (s === 'pending') return '결제대기';
  if (s === 'refunded') return '환불';
  if (s === 'failed') return '결제실패';
  return p || '—';
}

export function OnlineSalesOrdersPage() {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [kpi, setKpi] = useState<StoreOrderKpi | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 온라인 스토어(B2C) 활성 여부 — 빈 상태 메시지 분기용
  const [storeActive, setStoreActive] = useState<boolean | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statusParam = selectedStatus === 'all' ? undefined : selectedStatus;
      const [listRes, kpiRes, channels] = await Promise.all([
        getStoreOrders({ status: statusParam, page, limit: PAGE_SIZE }),
        getStoreOrderKpi().catch(() => null),
        fetchChannelOverview().catch(() => []),
      ]);
      setOrders(listRes.success ? listRes.data ?? [] : []);
      setTotal(listRes.pagination?.total ?? 0);
      if (kpiRes?.success) setKpi(kpiRes.data);
      setStoreActive(
        Array.isArray(channels) &&
          channels.some((c) => c.channelType === 'B2C' && c.status === 'APPROVED'),
      );
    } catch {
      setError('온라인 판매 주문을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [selectedStatus]);

  const kpiBlocks = [
    { label: '전체 주문', value: String(kpi?.total ?? 0), color: colors.neutral900 },
    { label: '처리 중', value: String(kpi?.pending ?? 0), color: colors.primary },
    { label: '완료', value: String(kpi?.completed ?? 0), color: colors.accentGreen },
    {
      label: '최근 매출',
      value: kpi && kpi.monthlyRevenue > 0 ? `${kpi.monthlyRevenue.toLocaleString('ko-KR')}원` : '—',
      color: colors.primary,
    },
  ];

  const columns: Column<StoreOrder>[] = [
    {
      key: 'orderNumber',
      title: '주문번호',
      render: (_v: unknown, row: StoreOrder) => (
        <span style={{ fontWeight: 500, fontSize: '13px', color: colors.neutral800 }}>{row.orderNumber}</span>
      ),
    },
    {
      key: 'items',
      title: '주문 상품',
      render: (_v: unknown, row: StoreOrder) => {
        const first = row.items?.[0]?.productName;
        if (!first) return <span style={{ color: colors.neutral400 }}>—</span>;
        const extra = (row.itemCount || row.items?.length || 1) - 1;
        return (
          <span style={{ fontSize: '13px' }}>
            {first}
            {extra > 0 ? ` 외 ${extra}건` : ''}
          </span>
        );
      },
    },
    {
      key: 'totalAmount',
      title: '주문금액',
      width: '120px',
      align: 'right' as const,
      render: (_v: unknown, row: StoreOrder) => (
        <span style={{ fontWeight: 600, fontSize: '13px' }}>
          {Number(row.totalAmount).toLocaleString('ko-KR')}원
        </span>
      ),
    },
    {
      key: 'paymentStatus',
      title: '결제상태',
      width: '90px',
      align: 'center' as const,
      render: (_v: unknown, row: StoreOrder) => (
        <span style={{ fontSize: '12px', color: colors.neutral600 }}>{paymentLabel(row.paymentStatus)}</span>
      ),
    },
    {
      key: 'status',
      title: '주문상태',
      width: '100px',
      align: 'center' as const,
      render: (_v: unknown, row: StoreOrder) => <BuyerOrderStatusBadge status={row.status} />,
    },
    {
      key: 'createdAt',
      title: '주문일시',
      width: '150px',
      render: (_v: unknown, row: StoreOrder) => (
        <span style={{ fontSize: '12px', color: colors.neutral500 }}>
          {new Date(row.createdAt).toLocaleString('ko-KR')}
        </span>
      ),
    },
  ];

  return (
    <div style={S.container}>
      {/* Header */}
      <div>
        <h1 style={S.title}>온라인 판매 주문 관리</h1>
        <p style={S.subtitle}>온라인 스토어를 통해 접수된 고객 주문을 확인합니다</p>
      </div>

      {/* KPI */}
      <div style={S.kpiGrid}>
        {kpiBlocks.map((item) => (
          <div key={item.label} style={S.kpiCard}>
            <p style={S.kpiLabel}>{item.label}</p>
            <p style={{ ...S.kpiValue, color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* 상태 필터 */}
      <div style={S.filterBar}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedStatus(tab.key)}
            style={selectedStatus === tab.key ? { ...S.filterBtn, ...S.filterBtnActive } : S.filterBtn}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 본문 */}
      {loading ? (
        <div style={S.stateCenter}>
          <RefreshCw size={24} style={{ color: colors.neutral300 }} />
          <p style={{ color: colors.neutral500, fontSize: '14px', marginTop: '12px' }}>주문을 불러오는 중...</p>
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
            <div style={S.emptyIcon}>🛒</div>
            {storeActive === false ? (
              <>
                <p style={S.emptyTitle}>온라인 스토어가 아직 시작되지 않았습니다</p>
                <p style={S.emptyDesc}>
                  온라인 스토어를 시작하면 고객 주문을 이곳에서 확인할 수 있습니다.
                </p>
                <Link to="/store/online-sales/settings" style={S.worktableLinkSmall}>
                  판매 설정으로 이동 →
                </Link>
              </>
            ) : (
              <>
                <p style={S.emptyTitle}>아직 온라인 판매 주문이 없습니다</p>
                <p style={S.emptyDesc}>
                  고객이 온라인 스토어에서 주문하면 이곳에서 확인할 수 있습니다.
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <DataTable<StoreOrder>
            columns={columns}
            dataSource={orders}
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

/* ── Styles (StoreOrdersPage 패턴 정합) ── */
const S: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: spacing.lg },
  title: { ...typography.headingL, margin: 0, color: colors.neutral900 },
  subtitle: { margin: `${spacing.xs} 0 0`, fontSize: '0.875rem', color: colors.neutral500 },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: spacing.md },
  kpiCard: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
  },
  kpiLabel: { margin: 0, fontSize: '0.8rem', fontWeight: 500, color: colors.neutral500 },
  kpiValue: { margin: `${spacing.xs} 0 0`, fontSize: '1.5rem', fontWeight: 700 },
  filterBar: { display: 'flex', gap: spacing.sm, overflowX: 'auto' },
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
  filterBtnActive: { backgroundColor: '#DBEAFE', color: colors.primary },
  tableCard: {
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    overflow: 'hidden',
  },
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
  emptyState: { textAlign: 'center', padding: `${spacing.xxxl} ${spacing.lg}` } as React.CSSProperties,
  emptyIcon: { fontSize: '2.5rem', marginBottom: spacing.md },
  emptyTitle: { margin: 0, fontSize: '1.125rem', fontWeight: 600, color: colors.neutral800 },
  emptyDesc: { margin: `${spacing.sm} 0 0`, fontSize: '0.875rem', color: colors.neutral500 },
  worktableLinkSmall: {
    marginTop: '16px',
    display: 'inline-block',
    fontSize: '14px',
    color: colors.primary,
    textDecoration: 'none',
    fontWeight: 500,
  },
};

export default OnlineSalesOrdersPage;
