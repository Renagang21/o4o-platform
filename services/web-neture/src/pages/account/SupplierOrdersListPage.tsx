/**
 * SupplierOrdersListPage - 공급자 주문 관리
 *
 * Work Order: WO-O4O-SUPPLIER-ORDER-PROCESSING-V1
 *
 * 구성:
 * - Toolbar: 검색 + 상태 필터
 * - Table: 주문번호 / 매장명 / 지역 / 연락처 / 주문금액 / 제품수 / 주문일 / 상태 / 관리
 * - 상태 전환: created/paid → preparing → shipped → delivered
 * - Mobile: Card 레이아웃
 *
 * 실제 API 연동: supplierApi.getOrders() / supplierApi.updateOrderStatus()
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react';
import { supplierApi } from '../../lib/api';
import type { SupplierOrderSummary } from '../../lib/api';

// ============================================================================
// Status Config
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

const NEXT_STATUS: Record<string, string> = {
  created: 'preparing',
  paid: 'preparing',
  preparing: 'shipped',
  shipped: 'delivered',
};

const NEXT_ACTION_LABEL: Record<string, string> = {
  created: '처리 시작',
  paid: '처리 시작',
  preparing: '배송 처리',
  shipped: '배송 완료',
};

function getStatus(status: string): StatusConfig {
  return STATUS_MAP[status] || { label: status, bg: '#f1f5f9', color: '#64748b' };
}

// ============================================================================
// Responsive CSS injection
// ============================================================================

const RESPONSIVE_CSS = `
@media (max-width: 768px) {
  [data-supplier-orders-table] { display: none !important; }
  [data-supplier-orders-cards] { display: block !important; }
}
@media (min-width: 769px) {
  [data-supplier-orders-cards] { display: none !important; }
}
`;

if (typeof document !== 'undefined') {
  const existing = document.getElementById('supplier-orders-responsive');
  if (!existing) {
    const el = document.createElement('style');
    el.id = 'supplier-orders-responsive';
    el.textContent = RESPONSIVE_CSS;
    document.head.appendChild(el);
  }
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
// Status Badge
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const info = getStatus(status);
  return (
    <span style={{ ...styles.statusBadge, backgroundColor: info.bg, color: info.color }}>
      {info.label}
    </span>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function SupplierOrdersListPage() {
  const [orders, setOrders] = useState<SupplierOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await supplierApi.getOrders({
        page,
        limit: 20,
        status: statusFilter || undefined,
      });
      setOrders(result.data);
      setTotalPages(result.meta.totalPages);
      setTotal(result.meta.total);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  // Client-side search filter on orderer_name
  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter((o) => (o.orderer_name || '').toLowerCase().includes(q));
  }, [orders, search]);

  const handleStatusChange = useCallback(async (orderId: string, nextStatus: string) => {
    setUpdatingId(orderId);
    try {
      const result = await supplierApi.updateOrderStatus(orderId, nextStatus);
      if (result.success) {
        setMessage({ type: 'success', text: '주문 상태가 변경되었습니다.' });
        await fetchOrders();
      } else {
        setMessage({ type: 'error', text: result.error || '상태 변경에 실패했습니다.' });
      }
    } catch {
      setMessage({ type: 'error', text: '상태 변경 중 오류가 발생했습니다.' });
    } finally {
      setUpdatingId(null);
      setTimeout(() => setMessage(null), 3000);
    }
  }, [fetchOrders]);

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Orders</h1>
        <p style={styles.subtitle}>매장 주문을 확인하고 처리합니다.</p>
      </div>

      {/* Message Banner */}
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
        <div style={styles.toolbarFilters}>
          <div style={styles.searchWrapper}>
            <Search size={16} style={styles.searchIcon} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="매장명 검색..."
              style={styles.searchInput}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="">상태 전체</option>
            <option value="created">주문접수</option>
            <option value="paid">결제완료</option>
            <option value="preparing">준비중</option>
            <option value="shipped">배송중</option>
            <option value="delivered">배송완료</option>
            <option value="cancelled">취소됨</option>
          </select>
        </div>
        {total > 0 && !loading && (
          <span style={styles.totalCount}>총 {total}건</span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>주문 내역을 불러오는 중...</p>
        </div>
      )}

      {/* Empty */}
      {!loading && filteredOrders.length === 0 && (
        <div style={styles.emptyState}>
          <ShoppingCart size={48} style={{ color: '#cbd5e1', marginBottom: '12px' }} />
          <p style={styles.emptyText}>현재 주문이 없습니다.</p>
        </div>
      )}

      {/* Desktop Table */}
      {!loading && filteredOrders.length > 0 && (
        <div style={styles.tableContainer} data-supplier-orders-table>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>주문번호</th>
                <th style={styles.th}>매장명</th>
                <th style={styles.th}>지역</th>
                <th style={styles.th}>연락처</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>주문금액</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>제품수</th>
                <th style={styles.th}>주문일</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>상태</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const nextStatus = NEXT_STATUS[order.status];
                const actionLabel = NEXT_ACTION_LABEL[order.status];
                return (
                  <tr key={order.id} style={styles.tr}>
                    <td style={styles.td}>
                      <Link to={`/account/supplier/orders/${order.id}`} style={styles.orderNoLink}>
                        {order.order_number}
                      </Link>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.storeNameText}>{order.orderer_name || '-'}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.dimText}>{order.region || '-'}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.dimText}>{order.orderer_phone || '-'}</span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <span style={styles.amountText}>{formatPrice(order.final_amount)}원</span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <span style={styles.itemCountBadge}>{order.item_count}개</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.dateText}>{formatDate(order.created_at)}</span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <StatusBadge status={order.status} />
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      {nextStatus && actionLabel ? (
                        <button
                          onClick={() => handleStatusChange(order.id, nextStatus)}
                          disabled={updatingId === order.id}
                          style={{
                            ...styles.actionButton,
                            opacity: updatingId === order.id ? 0.5 : 1,
                          }}
                        >
                          {updatingId === order.id ? '처리중...' : actionLabel}
                        </button>
                      ) : (
                        <span style={styles.dimText}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile Cards */}
      {!loading && filteredOrders.length > 0 && (
        <div style={{ display: 'none' }} data-supplier-orders-cards>
          <div style={styles.cardList}>
            {filteredOrders.map((order) => {
              const nextStatus = NEXT_STATUS[order.status];
              const actionLabel = NEXT_ACTION_LABEL[order.status];
              return (
                <div key={order.id} style={styles.mobileCard}>
                  <div style={styles.mobileCardTop}>
                    <div>
                      <Link to={`/account/supplier/orders/${order.id}`} style={styles.mobileOrderNo}>
                        {order.order_number}
                      </Link>
                      <span style={styles.mobileStoreName}>{order.orderer_name || '-'}</span>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  <div style={styles.mobileCardMeta}>
                    <span>{order.region || '-'}</span>
                    <span>{order.orderer_phone || '-'}</span>
                  </div>
                  <div style={styles.mobileCardProduct}>
                    <span style={styles.amountText}>{formatPrice(order.final_amount)}원</span>
                    <span style={styles.dimText}>{order.item_count}개 제품</span>
                  </div>
                  <div style={styles.mobileCardFooter}>
                    <span style={styles.dateText}>{formatDate(order.created_at)}</span>
                    {nextStatus && actionLabel && (
                      <button
                        onClick={() => handleStatusChange(order.id, nextStatus)}
                        disabled={updatingId === order.id}
                        style={{
                          ...styles.actionButton,
                          opacity: updatingId === order.id ? 0.5 : 1,
                        }}
                      >
                        {updatingId === order.id ? '처리중...' : actionLabel}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
  header: {
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

  // Message
  messageBanner: {
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '16px',
  },

  // Toolbar
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '20px',
  },
  toolbarFilters: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    flex: 1,
  },
  searchWrapper: {
    position: 'relative',
    flex: '1 1 200px',
    maxWidth: '280px',
  },
  searchIcon: {
    position: 'absolute',
    left: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#94a3b8',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '8px 12px 8px 32px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    outline: 'none',
    backgroundColor: '#fff',
    color: '#334155',
    boxSizing: 'border-box',
  },
  filterSelect: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: '#fff',
    color: '#334155',
    cursor: 'pointer',
    outline: 'none',
  },
  totalCount: {
    fontSize: '13px',
    color: '#64748b',
    whiteSpace: 'nowrap',
  },

  // Table
  tableContainer: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '860px',
  },
  th: {
    textAlign: 'left',
    padding: '12px 14px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#64748b',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
  },
  tr: {
    transition: 'background-color 0.1s',
  },
  td: {
    padding: '12px 14px',
    fontSize: '14px',
    color: '#334155',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
  },
  orderNoLink: {
    color: '#3b82f6',
    fontWeight: 600,
    fontSize: '14px',
    textDecoration: 'none',
  },
  storeNameText: {
    fontWeight: 500,
    color: '#1e293b',
  },
  dimText: {
    color: '#94a3b8',
    fontSize: '13px',
  },
  amountText: {
    fontWeight: 600,
    color: '#1e293b',
    fontSize: '14px',
  },
  itemCountBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
  },
  dateText: {
    fontSize: '13px',
    color: '#94a3b8',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  actionButton: {
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  // Mobile Cards
  cardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  mobileCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '16px',
  },
  mobileCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  mobileOrderNo: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#3b82f6',
    marginRight: '8px',
    textDecoration: 'none',
  },
  mobileStoreName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1e293b',
  },
  mobileCardMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '13px',
    color: '#94a3b8',
    marginBottom: '8px',
  },
  mobileCardProduct: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
    color: '#334155',
    marginBottom: '8px',
  },
  mobileCardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '8px',
    borderTop: '1px solid #f1f5f9',
  },

  // Pagination
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginTop: '20px',
    paddingBottom: '20px',
  },
  pageBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#475569',
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
    padding: '60px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
};
