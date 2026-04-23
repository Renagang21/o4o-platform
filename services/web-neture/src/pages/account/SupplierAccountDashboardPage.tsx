/**
 * SupplierAccountDashboardPage - 공급자 운영 대시보드
 *
 * Work Order: WO-O4O-SUPPLIER-DASHBOARD-V1
 *
 * 구성:
 * 1. KPI Summary (4 cards): 오늘 주문 / 처리 대기 / 배송 대기 / 등록 상품
 * 2. Quick Actions: 상품 등록 / 상품 관리 / 주문 관리
 * 3. Recent Orders: supplierApi.getOrders() → 최근 5건
 * 4. Product Summary: dashboardApi → 등록 상품 / 활성 상품 / 승인 대기
 *
 * 데이터: 실제 API. Mock 데이터 사용 금지.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  ShoppingCart,
  Truck,
  Clock,
  ArrowRight,
  Plus,
  Settings,
  ClipboardList,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  supplierApi,
  dashboardApi,
  type SupplierDashboardSummary,
  type SupplierOrderKpi,
  type SupplierOrderSummary,
  type InventoryItem,
  type SettlementKpi,
  getInventoryStatus,
} from '../../lib/api';

// ============================================================================
// Status Config (shared with SupplierOrdersListPage)
// ============================================================================

type StatusConfig = { label: string; bg: string; color: string };

const STATUS_MAP: Record<string, StatusConfig> = {
  created: { label: '주문접수', bg: '#fef3c7', color: '#b45309' },
  pending_payment: { label: '결제대기', bg: '#fef3c7', color: '#b45309' },
  paid: { label: '결제완료', bg: '#dbeafe', color: '#1d4ed8' },
  preparing: { label: '준비중', bg: '#dbeafe', color: '#1d4ed8' },
  shipped: { label: '배송중', bg: '#ede9fe', color: '#6d28d9' },
  delivered: { label: '배송완료', bg: '#dcfce7', color: '#15803d' },
  cancelled: { label: '취소됨', bg: '#f1f5f9', color: '#64748b' },
  refunded: { label: '환불됨', bg: '#f1f5f9', color: '#64748b' },
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

// ============================================================================
// KPI Summary Cards
// ============================================================================

interface KpiCard {
  icon: typeof Package;
  label: string;
  value: number;
}

function KpiSummary({ cards, loading }: { cards: KpiCard[]; loading: boolean }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ marginBottom: '24px' }}>
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} style={styles.kpiCard}>
            {loading ? (
              <div style={styles.skeleton} />
            ) : (
              <>
                <div style={styles.kpiIconWrapper}>
                  <Icon size={20} style={{ color: '#64748b' }} />
                </div>
                <div>
                  <p style={styles.kpiValue}>{card.value}</p>
                  <p style={styles.kpiLabel}>{card.label}</p>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Quick Actions
// ============================================================================

function QuickActions() {
  const actions = [
    { label: '상품 등록', path: '/supplier/products/new', icon: Plus, color: '#3b82f6' },
    { label: '상품 관리', path: '/account/supplier/products', icon: Settings, color: '#6366f1' },
    { label: '주문 관리', path: '/account/supplier/orders', icon: ClipboardList, color: '#0891b2' },
    { label: '재고 관리', path: '/account/supplier/inventory', icon: Package, color: '#059669' },
    { label: '정산 관리', path: '/account/supplier/settlements', icon: DollarSign, color: '#d97706' },
  ];

  return (
    <div style={styles.quickActions}>
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <Link key={a.label} to={a.path} style={styles.quickActionLink}>
            <div style={{ ...styles.quickActionIcon, backgroundColor: a.color }}>
              <Icon size={18} color="#fff" />
            </div>
            <span style={styles.quickActionLabel}>{a.label}</span>
            <ArrowRight size={14} style={{ color: '#94a3b8' }} />
          </Link>
        );
      })}
    </div>
  );
}

// ============================================================================
// Recent Orders
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const info = getStatus(status);
  return (
    <span style={{ ...styles.statusBadge, backgroundColor: info.bg, color: info.color }}>
      {info.label}
    </span>
  );
}

function RecentOrders({ orders, loading }: { orders: SupplierOrderSummary[]; loading: boolean }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>최근 주문</h2>
        <Link to="/account/supplier/orders" style={styles.viewAllLink}>
          전체 보기 <ArrowRight size={14} />
        </Link>
      </div>
      {loading ? (
        <p style={styles.loadingText}>로딩 중...</p>
      ) : orders.length === 0 ? (
        <div style={styles.emptyState}>
          <ShoppingCart size={32} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
          <p style={styles.emptyText}>주문이 없습니다</p>
          <p style={styles.emptySubText}>매장에서 주문이 들어오면 여기에 표시됩니다.</p>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>주문번호</th>
                <th style={styles.th}>매장명</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>주문금액</th>
                <th style={styles.th}>주문일</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td style={styles.td}>
                    <Link to={`/account/supplier/orders/${o.id}`} style={styles.orderNoLink}>
                      {o.order_number}
                    </Link>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.storeName}>{o.orderer_name || '-'}</span>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>
                    <span style={styles.amountText}>{formatPrice(o.final_amount)}원</span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.dimText}>{formatDate(o.created_at)}</span>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <StatusBadge status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Inventory Alerts (WO-O4O-INVENTORY-ENGINE-V1)
// ============================================================================

function InventoryAlerts({ items, loading }: { items: InventoryItem[]; loading: boolean }) {
  const alertItems = items.filter((i) => {
    const status = getInventoryStatus(i);
    return status === 'low_stock' || status === 'out_of_stock';
  });

  if (loading) return <p style={styles.loadingText}>로딩 중...</p>;
  if (alertItems.length === 0) return null;

  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>재고 알림</h2>
        <Link to="/account/supplier/inventory" style={styles.viewAllLink}>
          재고 관리 <ArrowRight size={14} />
        </Link>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {alertItems.slice(0, 5).map((item) => {
          const status = getInventoryStatus(item);
          const isOut = status === 'out_of_stock';
          return (
            <div
              key={item.offer_id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                backgroundColor: isOut ? '#fef2f2' : '#fffbeb',
                borderRadius: '8px',
                border: `1px solid ${isOut ? '#fecaca' : '#fde68a'}`,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.name}
                </p>
                {item.brand_name && (
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>{item.brand_name}</p>
                )}
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                  marginLeft: '12px',
                  backgroundColor: isOut ? '#fee2e2' : '#fef3c7',
                  color: isOut ? '#dc2626' : '#b45309',
                }}
              >
                {isOut ? '품절' : `재고 부족 (${item.available_stock}개)`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Product Summary
// ============================================================================

interface ProductStats {
  total: number;
  active: number;
  pending: number;
}

function ProductSummary({ stats, loading }: { stats: ProductStats; loading: boolean }) {
  const items = [
    { label: '등록 상품', value: stats.total, color: '#1e293b' },
    { label: '활성 상품', value: stats.active, color: '#15803d' },
    { label: '승인 대기', value: stats.pending, color: '#b45309' },
  ];

  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>상품 현황</h2>
        <Link to="/account/supplier/products" style={styles.viewAllLink}>
          상품 관리 <ArrowRight size={14} />
        </Link>
      </div>
      {loading ? (
        <p style={styles.loadingText}>로딩 중...</p>
      ) : stats.total === 0 ? (
        <div style={styles.emptyState}>
          <Package size={32} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
          <p style={styles.emptyText}>등록된 상품이 없습니다.</p>
          <Link to="/supplier/products/new" style={styles.emptyLink}>상품 등록하기</Link>
        </div>
      ) : (
        <div style={styles.productStatsGrid}>
          {items.map((item) => (
            <div key={item.label} style={styles.productStatCard}>
              <p style={{ ...styles.productStatValue, color: item.color }}>{item.value}</p>
              <p style={styles.productStatLabel}>{item.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function SupplierAccountDashboardPage() {
  const { user } = useAuth();
  const [orderKpi, setOrderKpi] = useState<SupplierOrderKpi>({ today_orders: 0, pending_processing: 0, pending_shipping: 0, total_orders: 0 });
  const [recentOrders, setRecentOrders] = useState<SupplierOrderSummary[]>([]);
  const [summary, setSummary] = useState<SupplierDashboardSummary | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [settlementKpi, setSettlementKpi] = useState<SettlementKpi>({
    pending_amount: 0, paid_amount: 0, total_amount: 0, pending_count: 0, paid_count: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [kpi, ordersResult, summaryData, inventory, settleKpi] = await Promise.all([
        supplierApi.getOrderKpi().catch(() => ({ today_orders: 0, pending_processing: 0, pending_shipping: 0, total_orders: 0 })),
        supplierApi.getOrders({ limit: 5 }).catch(() => ({ data: [], meta: { page: 1, limit: 5, total: 0, totalPages: 0 } })),
        dashboardApi.getSupplierDashboardSummary().catch(() => null),
        supplierApi.getInventory().catch(() => []),
        supplierApi.getSettlementKpi().catch(() => ({ pending_amount: 0, paid_amount: 0, total_amount: 0, pending_count: 0, paid_count: 0 })),
      ]);
      setOrderKpi(kpi);
      setRecentOrders(ordersResult.data);
      setSummary(summaryData);
      setInventoryItems(inventory);
      setSettlementKpi(settleKpi);
    } catch {
      // non-critical
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = summary?.stats;
  const lowStockCount = inventoryItems.filter((i) => {
    const s = getInventoryStatus(i);
    return s === 'low_stock' || s === 'out_of_stock';
  }).length;
  const kpiCards: KpiCard[] = [
    { icon: ShoppingCart, label: '오늘 주문', value: orderKpi.today_orders },
    { icon: Clock, label: '처리 대기', value: orderKpi.pending_processing },
    { icon: Truck, label: '배송 대기', value: orderKpi.pending_shipping },
    { icon: lowStockCount > 0 ? AlertTriangle : Package, label: lowStockCount > 0 ? '재고 부족' : '등록 상품', value: lowStockCount > 0 ? lowStockCount : (stats?.totalProducts ?? 0) },
  ];

  const productStats: ProductStats = {
    total: stats?.totalProducts ?? 0,
    active: stats?.activeProducts ?? 0,
    pending: stats?.pendingRequests ?? 0,
  };

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Supplier Dashboard</h1>
          <p style={styles.subtitle}>
            안녕하세요, <strong>{user?.name || '공급자'}</strong>님. 운영 현황을 확인하세요.
          </p>
        </div>
      </div>

      {/* KPI Summary */}
      <KpiSummary cards={kpiCards} loading={loading} />

      {/* Quick Actions */}
      <QuickActions />

      {/* Inventory Alerts (WO-O4O-INVENTORY-ENGINE-V1) */}
      {lowStockCount > 0 && (
        <div style={{ marginTop: '24px' }}>
          <InventoryAlerts items={inventoryItems} loading={loading} />
        </div>
      )}

      {/* Settlement Summary (WO-O4O-SETTLEMENT-ENGINE-V1) */}
      {(settlementKpi.pending_amount > 0 || settlementKpi.paid_amount > 0) && (
        <div style={{ marginTop: '24px' }}>
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>정산 현황</h2>
              <Link to="/account/supplier/settlements" style={styles.viewAllLink}>
                정산 관리 <ArrowRight size={14} />
              </Link>
            </div>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' as const }}>
              <div style={{ flex: '1 1 140px', textAlign: 'center' as const, padding: '16px', backgroundColor: '#fffbeb', borderRadius: '8px' }}>
                <p style={{ fontSize: '20px', fontWeight: 700, color: '#b45309', margin: 0 }}>
                  {settlementKpi.pending_amount.toLocaleString('ko-KR')}원
                </p>
                <p style={{ fontSize: '12px', color: '#92400e', margin: '4px 0 0 0' }}>미정산 ({settlementKpi.pending_count}건)</p>
              </div>
              <div style={{ flex: '1 1 140px', textAlign: 'center' as const, padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
                <p style={{ fontSize: '20px', fontWeight: 700, color: '#15803d', margin: 0 }}>
                  {settlementKpi.paid_amount.toLocaleString('ko-KR')}원
                </p>
                <p style={{ fontSize: '12px', color: '#166534', margin: '4px 0 0 0' }}>지급완료 ({settlementKpi.paid_count}건)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Orders + Product Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ marginTop: '24px' }}>
        <div style={{ gridColumn: 'span 2 / span 2' }}>
          <RecentOrders orders={recentOrders} loading={loading} />
        </div>
        <div>
          <ProductSummary stats={productStats} loading={loading} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },

  // KPI
  kpiCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  kpiIconWrapper: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  kpiValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
    lineHeight: 1,
  },
  kpiLabel: {
    fontSize: '13px',
    color: '#64748b',
    margin: '4px 0 0 0',
  },
  skeleton: {
    width: '100%',
    height: '44px',
    backgroundColor: '#e2e8f0',
    borderRadius: '8px',
  },

  // Quick Actions
  quickActions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  quickActionLink: {
    flex: '1 1 160px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    textDecoration: 'none',
    transition: 'border-color 0.15s',
  },
  quickActionIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  quickActionLabel: {
    flex: 1,
    fontSize: '14px',
    fontWeight: 500,
    color: '#1e293b',
  },

  // Sections
  section: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '24px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
  },
  viewAllLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: '#3b82f6',
    textDecoration: 'none',
    fontWeight: 500,
  },

  // Table
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#64748b',
    borderBottom: '1px solid #e2e8f0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '10px 12px',
    fontSize: '14px',
    color: '#334155',
    borderBottom: '1px solid #f1f5f9',
    whiteSpace: 'nowrap',
  },
  orderNoLink: {
    color: '#3b82f6',
    fontWeight: 600,
    fontSize: '14px',
    textDecoration: 'none',
  },
  storeName: {
    fontWeight: 500,
    color: '#1e293b',
  },
  amountText: {
    fontWeight: 600,
    color: '#1e293b',
    fontSize: '14px',
  },
  dimText: {
    color: '#94a3b8',
    fontSize: '13px',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },

  // Product Summary
  productStatsGrid: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  productStatCard: {
    flex: '1 1 80px',
    textAlign: 'center',
    padding: '16px 12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
  },
  productStatValue: {
    fontSize: '24px',
    fontWeight: 700,
    margin: '0 0 4px 0',
    lineHeight: 1,
  },
  productStatLabel: {
    fontSize: '12px',
    color: '#64748b',
    margin: 0,
  },

  // States
  loadingText: {
    color: '#64748b',
    textAlign: 'center',
    padding: '24px',
    fontSize: '14px',
    margin: 0,
  },
  emptyState: {
    textAlign: 'center',
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0,
  },
  emptySubText: {
    fontSize: '13px',
    color: '#cbd5e1',
    margin: '4px 0 0 0',
  },
  emptyLink: {
    marginTop: '12px',
    fontSize: '14px',
    color: '#3b82f6',
    textDecoration: 'none',
    fontWeight: 500,
  },
};
