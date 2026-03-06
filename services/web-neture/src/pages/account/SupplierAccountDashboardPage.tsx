/**
 * SupplierAccountDashboardPage - 공급자 계정 대시보드
 *
 * Work Order: WO-O4O-SUPPLIER-DASHBOARD-PAGE-V1
 *
 * 구성:
 * 1. KPI Summary (4 cards)
 * 2. Recent Orders (mock)
 * 3. Recent Products (API)
 * 4. Supplier Forum (static)
 *
 * 데이터:
 * - dashboardApi.getSupplierDashboardSummary() → KPI
 * - supplierApi.getProducts() → Recent Products
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  ShoppingCart,
  Store,
  Clock,
  ArrowRight,
  Plus,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  supplierApi,
  dashboardApi,
  type SupplierDashboardSummary,
  type SupplierProduct,
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
    <div style={styles.kpiGrid}>
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
// Recent Orders (Mock Data)
// ============================================================================

const MOCK_ORDERS = [
  { id: '1', store: '서울약국', product: '비타민C', quantity: 10, status: '완료' },
  { id: '2', store: '강남약국', product: '혈당측정기', quantity: 5, status: '배송중' },
  { id: '3', store: '부산약국', product: '프로바이오틱스', quantity: 8, status: '접수' },
];

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  '완료': { backgroundColor: '#dcfce7', color: '#15803d' },
  '배송중': { backgroundColor: '#dbeafe', color: '#1d4ed8' },
  '접수': { backgroundColor: '#fef3c7', color: '#b45309' },
};

function RecentOrders() {
  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Recent Orders</h2>
        <Link to="/supplier/orders" style={styles.viewAllLink}>
          전체 주문 보기 <ArrowRight size={14} />
        </Link>
      </div>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>매장</th>
              <th style={styles.th}>제품</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>수량</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>상태</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_ORDERS.map((order) => (
              <tr key={order.id}>
                <td style={styles.td}>{order.store}</td>
                <td style={styles.td}>{order.product}</td>
                <td style={{ ...styles.td, textAlign: 'center' }}>{order.quantity}</td>
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  <span style={{ ...styles.statusBadge, ...(STATUS_STYLES[order.status] || {}) }}>
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// Recent Products
// ============================================================================

function RecentProducts({ products, loading }: { products: SupplierProduct[]; loading: boolean }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Recent Products</h2>
        <Link to="/supplier/products" style={styles.viewAllLink}>
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
        <div style={styles.productList}>
          {products.map((product) => (
            <div key={product.id} style={styles.productItem}>
              <div style={styles.productIcon}>
                <Package size={16} style={{ color: '#64748b' }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={styles.productName}>{product.name}</p>
                <p style={styles.productDate}>
                  {new Date(product.createdAt).toLocaleDateString('ko-KR')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Supplier Forum Preview
// ============================================================================

const FORUM_ITEMS = [
  { id: '1', title: '제품 공급 협력 문의', icon: '📦' },
  { id: '2', title: '매장 진열 사례 공유', icon: '🏪' },
  { id: '3', title: '유통 전략 논의', icon: '📊' },
];

function SupplierForumPreview() {
  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>
          <MessageSquare size={18} style={{ color: '#64748b' }} />
          Supplier Forum
        </h2>
        <Link to="/supplier/forum" style={styles.viewAllLink}>
          Supplier Forum 이동 <ArrowRight size={14} />
        </Link>
      </div>
      <div style={styles.forumList}>
        {FORUM_ITEMS.map((item) => (
          <Link key={item.id} to="/supplier/forum" style={styles.forumItem}>
            <span style={styles.forumIcon}>{item.icon}</span>
            <span style={styles.forumTitle}>{item.title}</span>
            <ArrowRight size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
          </Link>
        ))}
      </div>
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
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryData, productsData] = await Promise.all([
        dashboardApi.getSupplierDashboardSummary().catch(() => null),
        supplierApi.getProducts().catch(() => []),
      ]);
      setSummary(summaryData);
      setProducts(productsData);
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
    { icon: Package, label: 'Products', value: stats?.totalProducts ?? 0 },
    { icon: ShoppingCart, label: 'Orders', value: 0 },
    { icon: Store, label: 'Active Stores', value: stats?.connectedServices ?? 0 },
    { icon: Clock, label: 'Pending Requests', value: stats?.pendingRequests ?? 0 },
  ];

  const recentProducts = products.slice(0, 5);

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
        <Link to="/supplier/products/new" style={styles.addButton}>
          <Plus size={16} />
          제품 등록
        </Link>
      </div>

      {/* KPI Summary */}
      <KpiSummary cards={kpiCards} loading={loading} />

      {/* Two-column layout */}
      <div style={styles.twoColumnGrid}>
        <RecentOrders />
        <RecentProducts products={recentProducts} loading={loading} />
      </div>

      {/* Supplier Forum */}
      <SupplierForumPreview />
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
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
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
  twoColumnGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginBottom: '24px',
  },
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
  },
  td: {
    padding: '10px 12px',
    fontSize: '14px',
    color: '#334155',
    borderBottom: '1px solid #f1f5f9',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },

  // Products
  loadingText: {
    color: '#64748b',
    textAlign: 'center',
    padding: '24px',
    fontSize: '14px',
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
  productList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  productItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
  },
  productIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  productName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1e293b',
    margin: 0,
  },
  productDate: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: '2px 0 0 0',
  },

  // Forum
  forumList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  forumItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: '8px',
    textDecoration: 'none',
    transition: 'background-color 0.15s',
    backgroundColor: '#f8fafc',
  },
  forumIcon: {
    fontSize: '18px',
    flexShrink: 0,
  },
  forumTitle: {
    flex: 1,
    fontSize: '14px',
    color: '#334155',
    fontWeight: 500,
  },
};
