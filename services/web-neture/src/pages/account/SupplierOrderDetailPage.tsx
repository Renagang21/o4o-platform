/**
 * SupplierOrderDetailPage - 공급자 주문 상세
 *
 * Work Order: WO-O4O-SUPPLIER-ORDER-DETAIL-PAGE-V1
 *
 * 구성:
 * - Order Summary: 주문번호 / 주문일 / 상태
 * - Store Information: 매장명 / 지역 / 연락처 / 주소
 * - Order Products: 제품 / 수량 / 단가
 * - Order Status: 상태 변경 버튼
 * - Delivery Memo: 배송 메모 입력
 * - Order Timeline: 주문 상태 변경 기록
 *
 * 데이터: Mock (Neture는 주문을 직접 처리하지 않음)
 */

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Store, Package, Truck, Clock } from 'lucide-react';

// ============================================================================
// Types & Constants
// ============================================================================

type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Completed' | 'Cancelled';

interface OrderProduct {
  name: string;
  quantity: number;
  unitPrice: number;
}

interface TimelineEvent {
  status: string;
  label: string;
  date: string;
}

interface MockOrderDetail {
  id: string;
  orderNo: string;
  storeName: string;
  region: string;
  contact: string;
  address: string;
  products: OrderProduct[];
  orderDate: string;
  status: OrderStatus;
  timeline: TimelineEvent[];
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

const MOCK_ORDERS: Record<string, MockOrderDetail> = {
  '1': {
    id: '1', orderNo: '1023', storeName: '서울약국', region: '서울', contact: '010-1234-5678',
    address: '서울 강남구 테헤란로 123',
    products: [
      { name: '비타민C', quantity: 10, unitPrice: 15000 },
    ],
    orderDate: '2026-03-05', status: 'Pending',
    timeline: [
      { status: 'created', label: '주문 접수', date: '2026-03-05 10:12' },
    ],
  },
  '2': {
    id: '2', orderNo: '1022', storeName: '강남약국', region: '서울', contact: '010-8888-9999',
    address: '서울 강남구 역삼동 456',
    products: [
      { name: '혈당측정기', quantity: 5, unitPrice: 45000 },
      { name: '혈당측정 스트립', quantity: 20, unitPrice: 12000 },
    ],
    orderDate: '2026-03-04', status: 'Processing',
    timeline: [
      { status: 'created', label: '주문 접수', date: '2026-03-04 09:30' },
      { status: 'processing', label: '주문 처리', date: '2026-03-04 14:15' },
    ],
  },
  '3': {
    id: '3', orderNo: '1021', storeName: '부산약국', region: '부산', contact: '010-5555-6666',
    address: '부산 해운대구 우동 789',
    products: [
      { name: '프로바이오틱스', quantity: 8, unitPrice: 28000 },
    ],
    orderDate: '2026-03-03', status: 'Shipped',
    timeline: [
      { status: 'created', label: '주문 접수', date: '2026-03-03 11:00' },
      { status: 'processing', label: '주문 처리', date: '2026-03-03 15:30' },
      { status: 'shipped', label: '배송 출발', date: '2026-03-04 09:00' },
    ],
  },
  '4': {
    id: '4', orderNo: '1020', storeName: '대구약국', region: '대구', contact: '010-3333-4444',
    address: '대구 수성구 범어동 321',
    products: [
      { name: '오메가3', quantity: 12, unitPrice: 22000 },
    ],
    orderDate: '2026-03-01', status: 'Completed',
    timeline: [
      { status: 'created', label: '주문 접수', date: '2026-03-01 08:45' },
      { status: 'processing', label: '주문 처리', date: '2026-03-01 13:00' },
      { status: 'shipped', label: '배송 출발', date: '2026-03-02 10:00' },
      { status: 'completed', label: '주문 완료', date: '2026-03-03 16:00' },
    ],
  },
  '5': {
    id: '5', orderNo: '1019', storeName: '인천약국', region: '인천', contact: '010-7777-0000',
    address: '인천 남동구 구월동 654',
    products: [
      { name: '유산균', quantity: 3, unitPrice: 18000 },
    ],
    orderDate: '2026-02-28', status: 'Cancelled',
    timeline: [
      { status: 'created', label: '주문 접수', date: '2026-02-28 10:00' },
      { status: 'cancelled', label: '주문 취소', date: '2026-02-28 15:30' },
    ],
  },
  '6': {
    id: '6', orderNo: '1018', storeName: '수원약국', region: '경기', contact: '010-2222-1111',
    address: '경기 수원시 영통구 영통동 987',
    products: [
      { name: '비타민D', quantity: 15, unitPrice: 12000 },
      { name: '칼슘', quantity: 10, unitPrice: 9000 },
    ],
    orderDate: '2026-02-25', status: 'Pending',
    timeline: [
      { status: 'created', label: '주문 접수', date: '2026-02-25 14:20' },
    ],
  },
};

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
// Section Card
// ============================================================================

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        {icon}
        <h2 style={styles.cardTitle}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function SupplierOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const orderData = id ? MOCK_ORDERS[id] : undefined;

  const [order, setOrder] = useState<MockOrderDetail | undefined>(orderData);
  const [memo, setMemo] = useState('');
  const [memoSaved, setMemoSaved] = useState(false);

  if (!order) {
    return (
      <div style={styles.notFound}>
        <h2 style={styles.notFoundTitle}>주문을 찾을 수 없습니다</h2>
        <p style={styles.notFoundText}>주문번호를 확인해 주세요.</p>
        <Link to="/account/supplier/orders" style={styles.backLink}>
          <ArrowLeft size={16} />
          주문 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const nextStatus = NEXT_STATUS[order.status];
  const actionLabel = NEXT_ACTION_LABEL[order.status];

  const handleStatusChange = () => {
    if (!nextStatus) return;
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const statusLabels: Record<string, string> = {
      Processing: '주문 처리',
      Shipped: '배송 출발',
      Completed: '주문 완료',
    };
    setOrder({
      ...order,
      status: nextStatus,
      timeline: [
        ...order.timeline,
        { status: nextStatus.toLowerCase(), label: statusLabels[nextStatus] || nextStatus, date: dateStr },
      ],
    });
  };

  const handleSaveMemo = () => {
    setMemoSaved(true);
    setTimeout(() => setMemoSaved(false), 2000);
  };

  const formatCurrency = (v: number) => v.toLocaleString('ko-KR') + '원';

  return (
    <div>
      {/* Back Link */}
      <Link to="/account/supplier/orders" style={styles.backNav}>
        <ArrowLeft size={16} />
        주문 목록
      </Link>

      {/* 1. Order Summary */}
      <div style={styles.summarySection}>
        <div style={styles.summaryLeft}>
          <h1 style={styles.summaryTitle}>Order #{order.orderNo}</h1>
          <span style={styles.summaryDate}>{order.orderDate}</span>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Content Grid — single column on mobile, two columns on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left Column */}
        <div style={styles.colStack}>
          {/* 2. Store Information */}
          <SectionCard title="매장 정보" icon={<Store size={18} style={{ color: '#64748b' }} />}>
            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>매장명</span>
                <span style={styles.infoValue}>{order.storeName}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>지역</span>
                <span style={styles.infoValue}>{order.region}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>연락처</span>
                <span style={styles.infoValue}>{order.contact}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>주소</span>
                <span style={styles.infoValue}>{order.address}</span>
              </div>
            </div>
          </SectionCard>

          {/* 3. Order Products */}
          <SectionCard title="주문 제품" icon={<Package size={18} style={{ color: '#64748b' }} />}>
            <div style={styles.productList}>
              {order.products.map((p, i) => (
                <div key={i} style={styles.productRow}>
                  <div style={styles.productInfo}>
                    <span style={styles.productName}>{p.name}</span>
                    <span style={styles.productMeta}>수량 {p.quantity} · 단가 {formatCurrency(p.unitPrice)}</span>
                  </div>
                  <span style={styles.productTotal}>{formatCurrency(p.quantity * p.unitPrice)}</span>
                </div>
              ))}
            </div>
            <div style={styles.totalRow}>
              <span style={styles.totalLabel}>합계</span>
              <span style={styles.totalValue}>
                {formatCurrency(order.products.reduce((sum, p) => sum + p.quantity * p.unitPrice, 0))}
              </span>
            </div>
          </SectionCard>
        </div>

        {/* Right Column */}
        <div style={styles.colStack}>
          {/* 4. Order Status */}
          <SectionCard title="주문 상태" icon={<Truck size={18} style={{ color: '#64748b' }} />}>
            <div style={styles.statusSection}>
              <div style={styles.currentStatus}>
                <span style={styles.infoLabel}>현재 상태</span>
                <StatusBadge status={order.status} />
              </div>
              {nextStatus && actionLabel && (
                <button onClick={handleStatusChange} style={styles.statusButton}>
                  {actionLabel}
                </button>
              )}
              {order.status === 'Completed' && (
                <p style={styles.statusDone}>주문이 완료되었습니다.</p>
              )}
              {order.status === 'Cancelled' && (
                <p style={styles.statusCancelled}>취소된 주문입니다.</p>
              )}
            </div>
          </SectionCard>

          {/* 5. Delivery Memo */}
          <SectionCard title="배송 메모" icon={<Truck size={18} style={{ color: '#64748b' }} />}>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="배송 메모를 입력하세요 (예: 택배 발송, 직접 배송, 매장 방문 수령)"
              style={styles.memoInput}
              rows={3}
            />
            <div style={styles.memoFooter}>
              <button onClick={handleSaveMemo} style={styles.saveButton} disabled={!memo.trim()}>
                Save Memo
              </button>
              {memoSaved && <span style={styles.savedText}>저장되었습니다</span>}
            </div>
          </SectionCard>

          {/* 6. Order Timeline */}
          <SectionCard title="주문 타임라인" icon={<Clock size={18} style={{ color: '#64748b' }} />}>
            <div style={styles.timeline}>
              {order.timeline.map((event, i) => (
                <div key={i} style={styles.timelineItem}>
                  <div style={styles.timelineDot} />
                  {i < order.timeline.length - 1 && <div style={styles.timelineLine} />}
                  <div style={styles.timelineContent}>
                    <span style={styles.timelineLabel}>{event.label}</span>
                    <span style={styles.timelineDate}>{event.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  // Back navigation
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

  // Order Summary
  summarySection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '24px',
  },
  summaryLeft: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '12px',
    flexWrap: 'wrap',
  },
  summaryTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
  },
  summaryDate: {
    fontSize: '14px',
    color: '#94a3b8',
  },

  // Column stack
  colStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '20px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #f1f5f9',
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
  },

  // Info Grid
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  infoLabel: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  infoValue: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1e293b',
  },

  // Products
  productList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  productRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
  },
  productInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  productName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1e293b',
  },
  productMeta: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  productTotal: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#334155',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '16px',
    paddingTop: '12px',
    borderTop: '1px solid #e2e8f0',
  },
  totalLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#64748b',
  },
  totalValue: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#1e293b',
  },

  // Status
  statusBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  statusSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  currentStatus: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusButton: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  statusDone: {
    fontSize: '13px',
    color: '#15803d',
    margin: 0,
    textAlign: 'center',
  },
  statusCancelled: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: 0,
    textAlign: 'center',
  },

  // Delivery Memo
  memoInput: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    outline: 'none',
    backgroundColor: '#fff',
    color: '#334155',
    resize: 'vertical' as const,
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  memoFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '12px',
  },
  saveButton: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  savedText: {
    fontSize: '13px',
    color: '#15803d',
  },

  // Timeline
  timeline: {
    display: 'flex',
    flexDirection: 'column',
  },
  timelineItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    position: 'relative',
    paddingBottom: '20px',
  },
  timelineDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    flexShrink: 0,
    marginTop: '4px',
    position: 'relative',
    zIndex: 1,
  },
  timelineLine: {
    position: 'absolute',
    left: '4px',
    top: '14px',
    bottom: '0',
    width: '2px',
    backgroundColor: '#e2e8f0',
  },
  timelineContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  timelineLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1e293b',
  },
  timelineDate: {
    fontSize: '12px',
    color: '#94a3b8',
  },

  // Not Found
  notFound: {
    textAlign: 'center',
    padding: '60px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  notFoundTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  notFoundText: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 20px 0',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#3b82f6',
    textDecoration: 'none',
    fontWeight: 500,
  },
};
