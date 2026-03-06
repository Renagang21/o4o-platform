/**
 * SupplierAccountDashboardPage - 공급자 계정 대시보드
 *
 * Work Order: WO-O4O-SUPPLIER-DASHBOARD-PAGE-V1 (Revised)
 *
 * 구성:
 * 1. KPI Summary (4 cards): New Orders / Active Products / Active Offers / Connected Stores
 * 2. Recent Orders: supplierApi.getOrdersSummary() → 서비스별 주문 현황
 * 3. Products Summary: supplierApi.getProducts() → 제품명 / Offer 상태 / 취급 매장 수
 * 4. Offers Status: supplierApi.getRequests() → 제품 / 상태
 *
 * 데이터: 실제 API 사용. Mock 데이터 사용 금지.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  ShoppingCart,
  Store,
  FileCheck,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  supplierApi,
  dashboardApi,
  type SupplierDashboardSummary,
  type SupplierProduct,
  type SupplierRequest,
} from '../../lib/api';

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
// Recent Orders (from API)
// ============================================================================

interface RecentOrdersProps {
  orders: Array<{ serviceId: string; serviceName: string; approvedSellerCount: number; pendingRequestCount: number }>;
  loading: boolean;
}

function RecentOrders({ orders, loading }: RecentOrdersProps) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Recent Orders</h2>
        <Link to="/account/supplier/orders" style={styles.viewAllLink}>
          전체 주문 보기 <ArrowRight size={14} />
        </Link>
      </div>
      {loading ? (
        <p style={styles.loadingText}>로딩 중...</p>
      ) : orders.length === 0 ? (
        <div style={styles.emptyState}>
          <ShoppingCart size={32} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
          <p style={styles.emptyText}>주문 내역이 없습니다</p>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>서비스</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>승인 판매자</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>대기 요청</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.serviceId}>
                  <td style={styles.td}>
                    <span style={styles.storeName}>{o.serviceName}</span>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <span style={styles.countBadge}>{o.approvedSellerCount}</span>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    {o.pendingRequestCount > 0 ? (
                      <span style={styles.pendingBadge}>{o.pendingRequestCount}</span>
                    ) : (
                      <span style={styles.dimText}>0</span>
                    )}
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
// Products Summary
// ============================================================================

function ProductsSummary({ products, loading }: { products: SupplierProduct[]; loading: boolean }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Products Summary</h2>
        <Link to="/account/supplier/products" style={styles.viewAllLink}>
          제품 관리 <ArrowRight size={14} />
        </Link>
      </div>
      {loading ? (
        <p style={styles.loadingText}>로딩 중...</p>
      ) : products.length === 0 ? (
        <div style={styles.emptyState}>
          <Package size={32} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
          <p style={styles.emptyText}>등록된 제품이 없습니다</p>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>제품명</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Offer 상태</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>취급 매장</th>
              </tr>
            </thead>
            <tbody>
              {products.slice(0, 5).map((p) => (
                <tr key={p.id}>
                  <td style={styles.td}>
                    <span style={styles.storeName}>{p.name}</span>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <span style={{
                      ...styles.statusBadge,
                      ...(p.isActive
                        ? { backgroundColor: '#dcfce7', color: '#15803d' }
                        : { backgroundColor: '#f1f5f9', color: '#64748b' }),
                    }}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <span style={styles.dimText}>{p.activeServiceCount} stores</span>
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
// Offers Status
// ============================================================================

const OFFER_STATUS_STYLES: Record<string, React.CSSProperties> = {
  pending: { backgroundColor: '#fef3c7', color: '#b45309' },
  approved: { backgroundColor: '#dcfce7', color: '#15803d' },
  rejected: { backgroundColor: '#fee2e2', color: '#b91c1c' },
  suspended: { backgroundColor: '#f1f5f9', color: '#64748b' },
  revoked: { backgroundColor: '#f1f5f9', color: '#64748b' },
  expired: { backgroundColor: '#f1f5f9', color: '#64748b' },
};

function OffersStatus({ requests, loading }: { requests: SupplierRequest[]; loading: boolean }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Offers Status</h2>
        <Link to="/supplier/offers" style={styles.viewAllLink}>
          공급 조건 관리 <ArrowRight size={14} />
        </Link>
      </div>
      {loading ? (
        <p style={styles.loadingText}>로딩 중...</p>
      ) : requests.length === 0 ? (
        <div style={styles.emptyState}>
          <FileCheck size={32} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
          <p style={styles.emptyText}>공급 요청이 없습니다</p>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>제품</th>
                <th style={styles.th}>판매자</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {requests.slice(0, 5).map((r) => (
                <tr key={r.id}>
                  <td style={styles.td}>
                    <span style={styles.storeName}>{r.productName}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.dimText}>{r.sellerName}</span>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <span style={{
                      ...styles.statusBadge,
                      ...(OFFER_STATUS_STYLES[r.status] || { backgroundColor: '#f1f5f9', color: '#64748b' }),
                    }}>
                      {r.status}
                    </span>
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
// Main Component
// ============================================================================

export default function SupplierAccountDashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<SupplierDashboardSummary | null>(null);
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [requests, setRequests] = useState<SupplierRequest[]>([]);
  const [orderServices, setOrderServices] = useState<Array<{ serviceId: string; serviceName: string; approvedSellerCount: number; pendingRequestCount: number }>>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryData, productsData, requestsData, ordersSummary] = await Promise.all([
        dashboardApi.getSupplierDashboardSummary().catch(() => null),
        supplierApi.getProducts().catch(() => []),
        supplierApi.getRequests().catch(() => []),
        supplierApi.getOrdersSummary().catch(() => ({ services: [], totalApprovedSellers: 0, totalPendingRequests: 0 })),
      ]);
      setSummary(summaryData);
      setProducts(productsData);
      setRequests(requestsData);
      setOrderServices(ordersSummary.services.map((s) => ({
        serviceId: s.serviceId,
        serviceName: s.serviceName,
        approvedSellerCount: s.summary.approvedSellerCount,
        pendingRequestCount: s.summary.pendingRequestCount,
      })));
    } catch {
      // non-critical
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = summary?.stats;
  const kpiCards: KpiCard[] = [
    { icon: ShoppingCart, label: 'New Orders', value: stats?.pendingRequests ?? 0 },
    { icon: Package, label: 'Active Products', value: stats?.activeProducts ?? 0 },
    { icon: FileCheck, label: 'Active Offers', value: stats?.approvedRequests ?? 0 },
    { icon: Store, label: 'Connected Stores', value: stats?.connectedServices ?? 0 },
  ];

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
        <Link to="/account/supplier/products/new" style={styles.addButton}>
          <Plus size={16} />
          제품 등록
        </Link>
      </div>

      {/* KPI Summary */}
      <KpiSummary cards={kpiCards} loading={loading} />

      {/* Recent Orders + Products Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ marginBottom: '24px' }}>
        <RecentOrders orders={orderServices} loading={loading} />
        <ProductsSummary products={products} loading={loading} />
      </div>

      {/* Offers Status */}
      <OffersStatus requests={requests} loading={loading} />
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
  addButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
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
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
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
  },
  storeName: {
    fontWeight: 500,
    color: '#1e293b',
  },
  dimText: {
    color: '#94a3b8',
    fontSize: '13px',
  },
  countBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
  },
  pendingBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#b45309',
    backgroundColor: '#fef3c7',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
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
};
