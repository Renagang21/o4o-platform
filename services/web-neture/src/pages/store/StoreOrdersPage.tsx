/**
 * StoreOrdersPage — O4O B2B 주문 목록
 *
 * WO-O4O-STORE-ORDERS-PAGE-V1
 *
 * 구성:
 * - 주문 목록 (테이블 + 모바일 카드)
 * - 상태 필터 / 주문번호 검색
 * - 주문 상세 이동 (/store/orders/:id)
 * - 재주문 기능 (카트 추가)
 * - 페이지네이션
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList, Search, RefreshCw, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { storeApi, sellerApi } from '../../lib/api';
import type { StoreOrder, StoreOrderItem } from '../../lib/api';
import { addToCart } from '../../lib/cart';

// ============================================================================
// Status Mapping
// ============================================================================

type StatusConfig = { label: string; bg: string; color: string };

const STATUS_MAP: Record<string, StatusConfig> = {
  created: { label: '주문접수', bg: '#fef3c7', color: '#92400e' },
  pending_payment: { label: '결제대기', bg: '#fef3c7', color: '#92400e' },
  paid: { label: '결제완료', bg: '#dbeafe', color: '#1e40af' },
  preparing: { label: '준비중', bg: '#dbeafe', color: '#1e40af' },
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

function formatPrice(value: number): string {
  return value.toLocaleString('ko-KR');
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getItemsSummary(items?: StoreOrderItem[]): string {
  if (!items || items.length === 0) return '-';
  if (items.length === 1) return items[0].product_name;
  return `${items[0].product_name} 외 ${items.length - 1}건`;
}

function getItemCount(items?: StoreOrderItem[]): number {
  return items?.length || 0;
}

// ============================================================================
// Status Badge
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const info = getStatus(status);
  return (
    <span style={{ ...styles.badge, backgroundColor: info.bg, color: info.color }}>
      {info.label}
    </span>
  );
}

// ============================================================================
// Status Filter Options
// ============================================================================

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'created', label: '주문접수' },
  { value: 'preparing', label: '준비중' },
  { value: 'shipped', label: '배송중' },
  { value: 'delivered', label: '배송완료' },
  { value: 'cancelled', label: '취소됨' },
];

// ============================================================================
// Main Page
// ============================================================================

export default function StoreOrdersPage() {
  const navigate = useNavigate();

  // State
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [reordering, setReordering] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const result = await storeApi.getOrders({
      page,
      limit: 20,
      status: statusFilter || undefined,
    });
    setOrders(result.data);
    setTotalPages(result.meta.totalPages);
    setTotal(result.meta.total);
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Search filter (client-side on order_number)
  const filteredOrders = searchQuery
    ? orders.filter((o) => o.order_number.toLowerCase().includes(searchQuery.toLowerCase()))
    : orders;

  // Reorder handler
  const handleReorder = useCallback(async (order: StoreOrder) => {
    if (!order.items || order.items.length === 0) {
      setMessage({ type: 'error', text: '주문 상품 정보가 없습니다.' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setReordering(order.id);

    try {
      // Fetch current available products to get supplier info + current prices
      const products = await sellerApi.getAvailableSupplyProducts();
      const productMap = new Map(products.map((p) => [p.id, p]));

      let addedCount = 0;
      let unavailableCount = 0;

      for (const item of order.items) {
        const matched = productMap.get(item.product_id);
        if (matched) {
          addToCart({
            offerId: item.product_id,
            name: item.product_name,
            priceGeneral: matched.priceGeneral || item.unit_price,
            supplierId: matched.supplierId,
            supplierName: matched.supplierName,
            imageUrl: matched.primaryImageUrl || null,
          }, item.quantity);
          addedCount++;
        } else {
          unavailableCount++;
        }
      }

      if (addedCount > 0 && unavailableCount === 0) {
        navigate('/store/cart');
      } else if (addedCount > 0) {
        setMessage({ type: 'success', text: `${addedCount}건 장바구니 추가 (${unavailableCount}건 공급 불가)` });
        setTimeout(() => { setMessage(null); navigate('/store/cart'); }, 2000);
      } else {
        setMessage({ type: 'error', text: '모든 상품이 현재 공급 불가 상태입니다.' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch {
      setMessage({ type: 'error', text: '재주문 처리 중 오류가 발생했습니다.' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setReordering(null);
    }
  }, [navigate]);

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>
          <ClipboardList size={24} />
          <span style={{ marginLeft: 8 }}>주문 내역</span>
          {total > 0 && <span style={styles.totalCount}>{total}건</span>}
        </h1>
      </div>

      {/* Message */}
      {message && (
        <div style={{
          ...styles.messageBanner,
          backgroundColor: message.type === 'success' ? '#dcfce7' : '#fef2f2',
          color: message.type === 'success' ? '#15803d' : '#dc2626',
        }}>
          {message.text}
        </div>
      )}

      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.searchWrap}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 10 }} />
          <input
            style={styles.searchInput}
            placeholder="주문번호 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          style={styles.select}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div style={styles.loading}>주문 내역을 불러오는 중...</div>
      )}

      {/* Empty */}
      {!loading && filteredOrders.length === 0 && (
        <div style={styles.empty}>
          <Package size={48} color="#cbd5e1" />
          <h3 style={styles.emptyTitle}>주문 내역이 없습니다</h3>
          <p style={styles.emptyText}>상품을 둘러보고 첫 주문을 시작해보세요.</p>
          <Link to="/library/content" style={styles.browseBtn}>상품 둘러보기</Link>
        </div>
      )}

      {/* Desktop Table */}
      {!loading && filteredOrders.length > 0 && (
        <>
          <div style={styles.tableWrap} data-store-orders-table>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>주문번호</th>
                  <th style={styles.th}>주문일</th>
                  <th style={styles.th}>상품</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>주문금액</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>배송비</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>최종금액</th>
                  <th style={styles.th}>상태</th>
                  <th style={styles.th}>관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} style={styles.tr}>
                    <td style={styles.td}>
                      <Link to={`/store/orders/${order.id}`} style={styles.orderLink}>
                        {order.order_number}
                      </Link>
                    </td>
                    <td style={styles.td}>{formatDate(order.created_at)}</td>
                    <td style={styles.td}>
                      <div style={styles.itemsSummary}>{getItemsSummary(order.items)}</div>
                      {getItemCount(order.items) > 1 && (
                        <span style={styles.itemCount}>{getItemCount(order.items)}건</span>
                      )}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>₩{formatPrice(order.total_amount)}</td>
                    <td style={{ ...styles.td, textAlign: 'right', color: order.shipping_fee === 0 ? '#15803d' : '#475569' }}>
                      {order.shipping_fee === 0 ? '무료' : `₩${formatPrice(order.shipping_fee)}`}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600 }}>₩{formatPrice(order.final_amount)}</td>
                    <td style={styles.td}><StatusBadge status={order.status} /></td>
                    <td style={styles.td}>
                      <button
                        style={styles.reorderBtn}
                        onClick={() => handleReorder(order)}
                        disabled={reordering === order.id}
                      >
                        <RefreshCw size={14} />
                        <span style={{ marginLeft: 4 }}>{reordering === order.id ? '처리중' : '재주문'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div style={styles.mobileCards} data-store-orders-cards>
            {filteredOrders.map((order) => (
              <div key={order.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <Link to={`/store/orders/${order.id}`} style={styles.orderLink}>
                    {order.order_number}
                  </Link>
                  <StatusBadge status={order.status} />
                </div>
                <div style={styles.cardDate}>{formatDate(order.created_at)}</div>
                <div style={styles.cardItems}>{getItemsSummary(order.items)}</div>
                <div style={styles.cardFooter}>
                  <span style={styles.cardAmount}>₩{formatPrice(order.final_amount)}</span>
                  <button
                    style={styles.reorderBtn}
                    onClick={() => handleReorder(order)}
                    disabled={reordering === order.id}
                  >
                    <RefreshCw size={14} />
                    <span style={{ marginLeft: 4 }}>{reordering === order.id ? '처리중' : '재주문'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            style={{ ...styles.pageBtn, opacity: page <= 1 ? 0.4 : 1 }}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={16} /> 이전
          </button>
          <span style={styles.pageInfo}>{page} / {totalPages}</span>
          <button
            style={{ ...styles.pageBtn, opacity: page >= totalPages ? 0.4 : 1 }}
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            다음 <ChevronRight size={16} />
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
  page: {
    maxWidth: 1000,
    margin: '0 auto',
    padding: '24px 16px',
  },
  header: {
    marginBottom: 20,
  },
  pageTitle: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 22,
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  totalCount: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: 500,
    color: '#64748b',
  },

  // Toolbar
  toolbar: {
    display: 'flex',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap' as const,
  },
  searchWrap: {
    position: 'relative' as const,
    flex: 1,
    minWidth: 200,
  },
  searchInput: {
    width: '100%',
    padding: '10px 12px 10px 36px',
    fontSize: 14,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  select: {
    padding: '10px 12px',
    fontSize: 14,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    backgroundColor: '#fff',
    outline: 'none',
    minWidth: 120,
  },

  // Table (desktop)
  tableWrap: {
    overflowX: 'auto' as const,
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    backgroundColor: '#fff',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 14,
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left' as const,
    fontWeight: 600,
    fontSize: 13,
    color: '#64748b',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap' as const,
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '12px 16px',
    color: '#1e293b',
    whiteSpace: 'nowrap' as const,
  },
  orderLink: {
    color: '#6366f1',
    fontWeight: 600,
    textDecoration: 'none',
    fontSize: 13,
  },
  itemsSummary: {
    fontSize: 14,
    color: '#1e293b',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    maxWidth: 200,
  },
  itemCount: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 4,
  },

  // Badge
  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: 'nowrap' as const,
  },

  // Reorder
  reorderBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    fontSize: 13,
    fontWeight: 500,
    color: '#6366f1',
    backgroundColor: '#eef2ff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },

  // Mobile Cards (hidden on desktop via media query workaround with @media not available in inline styles)
  mobileCards: {
    display: 'none',
  },

  card: {
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 8,
  },
  cardItems: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 12,
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: 700,
    color: '#0f172a',
  },

  // Pagination
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 24,
  },
  pageBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '8px 16px',
    fontSize: 14,
    color: '#475569',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    cursor: 'pointer',
  },
  pageInfo: {
    fontSize: 14,
    color: '#64748b',
  },

  // Empty
  empty: {
    textAlign: 'center' as const,
    padding: '60px 20px',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#334155',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    margin: 0,
  },
  browseBtn: {
    display: 'inline-block',
    marginTop: 16,
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#6366f1',
    borderRadius: 8,
    textDecoration: 'none',
  },

  // Message
  messageBanner: {
    padding: '12px 20px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    marginBottom: 16,
  },

  // Loading
  loading: {
    textAlign: 'center' as const,
    padding: '40px 20px',
    color: '#94a3b8',
    fontSize: 14,
  },
};

// ============================================================================
// Responsive CSS (injected once)
// ============================================================================

const RESPONSIVE_CSS = `
@media (max-width: 768px) {
  [data-store-orders-table] { display: none !important; }
  [data-store-orders-cards] { display: block !important; }
}
@media (min-width: 769px) {
  [data-store-orders-cards] { display: none !important; }
}
`;

// Inject responsive styles
if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('store-orders-responsive');
  if (!existingStyle) {
    const style = document.createElement('style');
    style.id = 'store-orders-responsive';
    style.textContent = RESPONSIVE_CSS;
    document.head.appendChild(style);
  }
}
