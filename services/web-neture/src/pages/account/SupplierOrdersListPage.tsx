/**
 * SupplierOrdersListPage - 공급자 주문 관리
 *
 * Work Order: WO-O4O-SUPPLIER-ORDERS-PAGE-V2
 *
 * 구성:
 * - Toolbar: 검색 + 상태 필터 + 날짜 필터
 * - Table: 주문번호 / 매장명 / 지역 / 연락처 / 주문금액 / 제품수 / 주문일 / 상태 / 관리
 * - 상태 전환: Pending → Processing → Shipped → Completed
 *
 * B2B 주문 구조: 하나의 주문에 여러 제품(Order Items)이 포함
 * 데이터: Mock (Neture는 주문을 직접 처리하지 않음)
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShoppingCart } from 'lucide-react';

// ============================================================================
// Types & Constants
// ============================================================================

type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Completed' | 'Cancelled';

interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

interface MockOrder {
  id: string;
  orderNo: string;
  storeName: string;
  region: string;
  contact: string;
  items: OrderItem[];
  orderDate: string;
  status: OrderStatus;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; color: string }> = {
  Pending: { label: 'Pending', bg: '#fef3c7', color: '#b45309' },
  Processing: { label: 'Processing', bg: '#dbeafe', color: '#1d4ed8' },
  Shipped: { label: 'Shipped', bg: '#ede9fe', color: '#6d28d9' },
  Completed: { label: 'Completed', bg: '#dcfce7', color: '#15803d' },
  Cancelled: { label: 'Cancelled', bg: '#f1f5f9', color: '#64748b' },
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  Pending: 'Processing',
  Processing: 'Shipped',
  Shipped: 'Completed',
};

const NEXT_ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  Pending: '처리 시작',
  Processing: '배송 완료',
  Shipped: '주문 완료',
};

const INITIAL_ORDERS: MockOrder[] = [
  {
    id: '1', orderNo: '1023', storeName: '서울약국', region: '서울', contact: '010-1234-5678',
    items: [
      { name: '비타민C', quantity: 10, unitPrice: 15000 },
      { name: '프로바이오틱스', quantity: 5, unitPrice: 28000 },
      { name: '오메가3', quantity: 3, unitPrice: 22000 },
    ],
    orderDate: '2026-03-05', status: 'Pending',
  },
  {
    id: '2', orderNo: '1022', storeName: '강남약국', region: '서울', contact: '010-8888-9999',
    items: [
      { name: '혈당측정기', quantity: 5, unitPrice: 45000 },
      { name: '혈당측정 스트립', quantity: 20, unitPrice: 12000 },
    ],
    orderDate: '2026-03-04', status: 'Processing',
  },
  {
    id: '3', orderNo: '1021', storeName: '부산약국', region: '부산', contact: '010-5555-6666',
    items: [
      { name: '프로바이오틱스', quantity: 8, unitPrice: 28000 },
      { name: '비타민D', quantity: 10, unitPrice: 12000 },
      { name: '칼슘', quantity: 6, unitPrice: 9000 },
      { name: '유산균', quantity: 5, unitPrice: 18000 },
      { name: '오메가3', quantity: 3, unitPrice: 22000 },
    ],
    orderDate: '2026-03-03', status: 'Shipped',
  },
  {
    id: '4', orderNo: '1020', storeName: '대구약국', region: '대구', contact: '010-3333-4444',
    items: [
      { name: '오메가3', quantity: 12, unitPrice: 22000 },
    ],
    orderDate: '2026-03-01', status: 'Completed',
  },
  {
    id: '5', orderNo: '1019', storeName: '인천약국', region: '인천', contact: '010-7777-0000',
    items: [
      { name: '유산균', quantity: 3, unitPrice: 18000 },
      { name: '비타민C', quantity: 5, unitPrice: 15000 },
    ],
    orderDate: '2026-02-28', status: 'Cancelled',
  },
  {
    id: '6', orderNo: '1018', storeName: '수원약국', region: '경기', contact: '010-2222-1111',
    items: [
      { name: '비타민D', quantity: 15, unitPrice: 12000 },
      { name: '칼슘', quantity: 10, unitPrice: 9000 },
    ],
    orderDate: '2026-02-25', status: 'Pending',
  },
];

// ============================================================================
// Helpers
// ============================================================================

function calcOrderTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

function formatCurrency(v: number): string {
  return v.toLocaleString('ko-KR') + '원';
}

// ============================================================================
// Toolbar
// ============================================================================

interface ToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  dateRange: string;
  onDateRangeChange: (v: string) => void;
}

function Toolbar(props: ToolbarProps) {
  const { search, onSearchChange, status, onStatusChange, dateRange, onDateRangeChange } = props;

  return (
    <div style={styles.toolbar}>
      <div style={styles.toolbarFilters}>
        <div style={styles.searchWrapper}>
          <Search size={16} style={styles.searchIcon} />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="매장명 검색..."
            style={styles.searchInput}
          />
        </div>
        <select value={status} onChange={(e) => onStatusChange(e.target.value)} style={styles.filterSelect}>
          <option value="">상태 전체</option>
          <option value="Pending">Pending</option>
          <option value="Processing">Processing</option>
          <option value="Shipped">Shipped</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <select value={dateRange} onChange={(e) => onDateRangeChange(e.target.value)} style={styles.filterSelect}>
          <option value="">날짜 전체</option>
          <option value="7">최근 7일</option>
          <option value="30">최근 30일</option>
        </select>
      </div>
    </div>
  );
}

// ============================================================================
// Status Badge
// ============================================================================

function StatusBadge({ status }: { status: OrderStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span style={{ ...styles.statusBadge, backgroundColor: config.bg, color: config.color }}>
      {config.label}
    </span>
  );
}

// ============================================================================
// Orders Table (Desktop)
// ============================================================================

function OrdersTable({
  orders,
  onStatusChange,
}: {
  orders: MockOrder[];
  onStatusChange: (id: string, next: OrderStatus) => void;
}) {
  return (
    <div style={styles.tableContainer}>
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
          {orders.map((order) => {
            const nextStatus = NEXT_STATUS[order.status];
            const actionLabel = NEXT_ACTION_LABEL[order.status];
            const total = calcOrderTotal(order.items);
            return (
              <tr key={order.id} style={styles.tr}>
                <td style={styles.td}>
                  <Link
                    to={`/account/supplier/orders/${order.id}`}
                    style={styles.orderNoLink}
                  >
                    #{order.orderNo}
                  </Link>
                </td>
                <td style={styles.td}>
                  <span style={styles.storeNameText}>{order.storeName}</span>
                </td>
                <td style={styles.td}>
                  <span style={styles.dimText}>{order.region}</span>
                </td>
                <td style={styles.td}>
                  <span style={styles.dimText}>{order.contact}</span>
                </td>
                <td style={{ ...styles.td, textAlign: 'right' }}>
                  <span style={styles.amountText}>{formatCurrency(total)}</span>
                </td>
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  <span style={styles.itemCountBadge}>{order.items.length}개</span>
                </td>
                <td style={styles.td}>
                  <span style={styles.dateText}>{order.orderDate}</span>
                </td>
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  <StatusBadge status={order.status} />
                </td>
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  {nextStatus && actionLabel ? (
                    <button
                      onClick={() => onStatusChange(order.id, nextStatus)}
                      style={styles.actionButton}
                    >
                      {actionLabel}
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
  );
}

// ============================================================================
// Order Cards (Mobile)
// ============================================================================

function OrderCards({
  orders,
  onStatusChange,
}: {
  orders: MockOrder[];
  onStatusChange: (id: string, next: OrderStatus) => void;
}) {
  return (
    <div style={styles.cardList}>
      {orders.map((order) => {
        const nextStatus = NEXT_STATUS[order.status];
        const actionLabel = NEXT_ACTION_LABEL[order.status];
        const total = calcOrderTotal(order.items);
        return (
          <div key={order.id} style={styles.mobileCard}>
            <div style={styles.mobileCardTop}>
              <div>
                <Link to={`/account/supplier/orders/${order.id}`} style={styles.mobileOrderNo}>#{order.orderNo}</Link>
                <span style={styles.mobileStoreName}>{order.storeName}</span>
              </div>
              <StatusBadge status={order.status} />
            </div>
            <div style={styles.mobileCardMeta}>
              <span>{order.region}</span>
              <span>{order.contact}</span>
            </div>
            <div style={styles.mobileCardProduct}>
              <span style={styles.amountText}>{formatCurrency(total)}</span>
              <span style={styles.dimText}>{order.items.length}개 제품</span>
            </div>
            <div style={styles.mobileCardFooter}>
              <span style={styles.dateText}>{order.orderDate}</span>
              {nextStatus && actionLabel && (
                <button
                  onClick={() => onStatusChange(order.id, nextStatus)}
                  style={styles.actionButton}
                >
                  {actionLabel}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function SupplierOrdersListPage() {
  const [orders, setOrders] = useState<MockOrder[]>(INITIAL_ORDERS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState('');

  const handleStatusChange = (id: string, nextStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: nextStatus } : o))
    );
  };

  const filtered = useMemo(() => {
    const now = Date.now();
    return orders.filter((o) => {
      if (search) {
        const q = search.toLowerCase();
        if (!o.storeName.toLowerCase().includes(q)) return false;
      }
      if (statusFilter && o.status !== statusFilter) return false;
      if (dateRange) {
        const days = parseInt(dateRange, 10);
        const orderTime = new Date(o.orderDate).getTime();
        if (now - orderTime > days * 86400000) return false;
      }
      return true;
    });
  }, [orders, search, statusFilter, dateRange]);

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Orders</h1>
        <p style={styles.subtitle}>매장 주문을 확인하고 처리합니다.</p>
      </div>

      {/* Toolbar */}
      <Toolbar
        search={search}
        onSearchChange={setSearch}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      {/* Content */}
      {filtered.length === 0 ? (
        <div style={styles.emptyState}>
          <ShoppingCart size={48} style={{ color: '#cbd5e1', marginBottom: '12px' }} />
          <p style={styles.emptyText}>현재 주문이 없습니다.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <OrdersTable orders={filtered} onStatusChange={handleStatusChange} />
          </div>
          {/* Mobile Cards */}
          <div className="block md:hidden">
            <OrderCards orders={filtered} onStatusChange={handleStatusChange} />
          </div>
        </>
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
