/**
 * StoreOrdersPage — K-Cosmetics 내 매장 주문 관리
 *
 * WO-O4O-KCOSMETICS-STORE-ORDERS-FRONTEND-ALIGNMENT-V1
 *
 * Backend: /api/v1/cosmetics/orders
 * K-Cosmetics 사용자-facing 문구는 "내 매장", "매장 주문" 기준
 * ⚠️ "내 약국" 또는 약국 전용 문구 사용 금지
 * ⚠️ 정산/인보이스 기능 포함 금지 (별도 IR로 설계 예정)
 */

import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import {
  ShoppingCart,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Loader2,
  X,
} from 'lucide-react';
import {
  getStoreOrders,
  getStoreOrder,
  type StoreOrder,
  type StoreOrderDetail,
} from '@/api/storeOrders';

const PAGE_SIZE = 20;

const STATUS_TABS = [
  { key: 'all', label: '전체' },
  { key: 'created', label: '접수' },
  { key: 'pending_payment', label: '결제대기' },
  { key: 'paid', label: '결제완료' },
  { key: 'cancelled', label: '취소' },
] as const;

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  created:         { label: '접수',    color: '#2563EB', bg: '#DBEAFE' },
  pending_payment: { label: '결제대기', color: '#D97706', bg: '#FEF3C7' },
  paid:            { label: '결제완료', color: '#059669', bg: '#D1FAE5' },
  cancelled:       { label: '취소',    color: '#DC2626', bg: '#FEE2E2' },
  refunded:        { label: '환불',    color: '#6B7280', bg: '#F3F4F6' },
};

const CHANNEL_LABEL: Record<string, string> = {
  local:  '매장',
  travel: '여행',
};

function formatAmount(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function StoreOrdersPage() {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<StoreOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const loadOrders = useCallback(async (p: number, status: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getStoreOrders({
        page: p,
        limit: PAGE_SIZE,
        status: status !== 'all' ? status : undefined,
      });
      setOrders(res.data || []);
      setTotal(res.pagination?.total ?? 0);
    } catch (e: any) {
      setError(e?.message || '주문 목록을 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders(page, statusFilter);
  }, [page, statusFilter, loadOrders]);

  const handleStatusChange = (key: string) => {
    setStatusFilter(key);
    setPage(1);
  };

  const handleRowClick = async (order: StoreOrder) => {
    setSelectedId(order.id);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const res = await getStoreOrder(order.id);
      setDetail(res.data);
    } catch (e: any) {
      setDetailError(e?.message || '주문 상세를 불러오지 못했습니다');
    } finally {
      setDetailLoading(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.breadcrumb}>
            <span>내 매장</span>
            <span style={{ color: '#9CA3AF' }}>/</span>
            <span style={{ color: '#374151' }}>주문 관리</span>
          </div>
          <h1 style={s.title}>
            <ShoppingCart size={20} style={{ color: '#0EA5E9' }} />
            매장 주문 관리
          </h1>
          <p style={s.subtitle}>
            매장에 접수된 주문 내역을 확인하고 관리합니다.
          </p>
        </div>
        <button
          onClick={() => loadOrders(page, statusFilter)}
          style={s.refreshBtn}
          disabled={loading}
        >
          <RefreshCw size={14} />
          새로고침
        </button>
      </div>

      {/* Status Tabs */}
      <div style={s.tabBar}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleStatusChange(tab.key)}
            style={{
              ...s.tab,
              ...(statusFilter === tab.key ? s.tabActive : {}),
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={s.errorBox}>
          <AlertTriangle size={16} style={{ color: '#DC2626', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#991B1B', flex: 1 }}>{error}</span>
          <button
            type="button"
            onClick={() => loadOrders(page, statusFilter)}
            style={s.retryBtn}
          >
            재시도
          </button>
        </div>
      )}

      {/* Table */}
      <div style={s.tableWrap}>
        {loading ? (
          <div style={s.center}>
            <Loader2 size={28} style={{ color: '#0EA5E9', animation: 'spin 1s linear infinite' }} />
            <span style={{ marginLeft: 10, fontSize: 13, color: '#9CA3AF' }}>불러오는 중...</span>
          </div>
        ) : orders.length === 0 ? (
          <div style={s.empty}>
            <ShoppingCart size={40} style={{ color: '#E5E7EB', marginBottom: 12 }} />
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
              {statusFilter !== 'all' ? '해당 상태의 주문이 없습니다.' : '매장 주문이 없습니다.'}
            </p>
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>주문번호</th>
                <th style={s.th}>주문일시</th>
                <th style={s.th}>채널</th>
                <th style={s.th}>상품 수</th>
                <th style={{ ...s.th, textAlign: 'right' }}>주문 금액</th>
                <th style={{ ...s.th, textAlign: 'center' }}>주문 상태</th>
                <th style={{ ...s.th, textAlign: 'center' }}>결제 상태</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const statusBadge = STATUS_LABEL[order.status] || {
                  label: order.status,
                  color: '#6B7280',
                  bg: '#F3F4F6',
                };
                const isSelected = order.id === selectedId;
                return (
                  <tr
                    key={order.id}
                    onClick={() => handleRowClick(order)}
                    style={{
                      ...s.tr,
                      ...(isSelected ? s.trActive : {}),
                    }}
                  >
                    <td style={s.td}>
                      <span style={{ fontWeight: 500, fontSize: 13, color: '#1F2937' }}>
                        {order.orderNumber}
                      </span>
                    </td>
                    <td style={s.td}>
                      <span style={{ fontSize: 12, color: '#6B7280' }}>
                        {formatDate(order.createdAt)}
                      </span>
                    </td>
                    <td style={s.td}>
                      <span style={{ fontSize: 12, color: '#374151' }}>
                        {CHANNEL_LABEL[order.channel] ?? order.channel}
                      </span>
                    </td>
                    <td style={s.td}>
                      <span style={{ fontSize: 13, color: '#374151' }}>
                        {order.itemCount}개
                      </span>
                    </td>
                    <td style={{ ...s.td, textAlign: 'right' }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#1F2937' }}>
                        {formatAmount(order.totalAmount)}
                      </span>
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 500,
                        color: statusBadge.color,
                        background: statusBadge.bg,
                      }}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      <span style={{ fontSize: 12, color: '#6B7280' }}>
                        {order.paymentStatus ?? '-'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div style={s.pagination}>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ ...s.pageBtn, opacity: page === 1 ? 0.4 : 1 }}
          >
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: 13, color: '#374151' }}>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ ...s.pageBtn, opacity: page === totalPages ? 0.4 : 1 }}
          >
            <ChevronRight size={14} />
          </button>
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>총 {total}건</span>
        </div>
      )}

      {/* Detail Panel */}
      {selectedId && (
        <div style={s.detailPanel}>
          <div style={s.detailHeader}>
            <h2 style={s.detailTitle}>주문 상세</h2>
            <button
              type="button"
              onClick={() => { setSelectedId(null); setDetail(null); }}
              style={s.closeBtn}
            >
              <X size={16} />
            </button>
          </div>

          {detailLoading ? (
            <div style={s.center}>
              <Loader2 size={20} style={{ color: '#0EA5E9' }} />
              <span style={{ marginLeft: 8, fontSize: 13, color: '#9CA3AF' }}>불러오는 중...</span>
            </div>
          ) : detailError ? (
            <div style={s.errorBox}>
              <AlertTriangle size={14} style={{ color: '#DC2626' }} />
              <span style={{ fontSize: 13, color: '#991B1B' }}>{detailError}</span>
            </div>
          ) : detail ? (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
              <div style={s.detailRow}>
                <span style={s.detailLabel}>주문번호</span>
                <span style={s.detailValue}>{detail.orderNumber}</span>
              </div>
              <div style={s.detailRow}>
                <span style={s.detailLabel}>주문 상태</span>
                <span style={s.detailValue}>
                  {STATUS_LABEL[detail.status]?.label ?? detail.status}
                </span>
              </div>
              <div style={s.detailRow}>
                <span style={s.detailLabel}>결제 상태</span>
                <span style={s.detailValue}>{detail.paymentStatus}</span>
              </div>
              <div style={s.detailRow}>
                <span style={s.detailLabel}>채널</span>
                <span style={s.detailValue}>
                  {CHANNEL_LABEL[detail.channel] ?? detail.channel}
                </span>
              </div>
              {detail.fulfillment && (
                <div style={s.detailRow}>
                  <span style={s.detailLabel}>수령 방법</span>
                  <span style={s.detailValue}>{detail.fulfillment}</span>
                </div>
              )}
              <div style={s.detailDivider} />
              <div style={{ fontWeight: 600, fontSize: 13, color: '#374151' }}>주문 상품</div>
              {detail.items.map((item) => (
                <div key={item.id} style={s.itemRow}>
                  <span style={{ flex: 1, fontSize: 13, color: '#1F2937' }}>
                    {item.productName}
                    {item.sku && <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 6 }}>{item.sku}</span>}
                  </span>
                  <span style={{ fontSize: 12, color: '#6B7280', marginRight: 12 }}>
                    ×{item.quantity}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#1F2937' }}>
                    {formatAmount(item.subtotal)}
                  </span>
                </div>
              ))}
              <div style={s.detailDivider} />
              <div style={s.detailRow}>
                <span style={s.detailLabel}>상품 소계</span>
                <span style={s.detailValue}>{formatAmount(detail.subtotal)}</span>
              </div>
              {detail.shippingFee > 0 && (
                <div style={s.detailRow}>
                  <span style={s.detailLabel}>배송비</span>
                  <span style={s.detailValue}>{formatAmount(detail.shippingFee)}</span>
                </div>
              )}
              {detail.discount > 0 && (
                <div style={s.detailRow}>
                  <span style={s.detailLabel}>할인</span>
                  <span style={{ ...s.detailValue, color: '#DC2626' }}>
                    -{formatAmount(detail.discount)}
                  </span>
                </div>
              )}
              <div style={{ ...s.detailRow, fontWeight: 600 }}>
                <span style={{ ...s.detailLabel, fontWeight: 600 }}>총 결제 금액</span>
                <span style={{ ...s.detailValue, fontWeight: 700, color: '#1F2937', fontSize: 15 }}>
                  {formatAmount(detail.totalAmount)}
                </span>
              </div>
              {detail.paidAt && (
                <div style={s.detailRow}>
                  <span style={s.detailLabel}>결제 일시</span>
                  <span style={s.detailValue}>{formatDate(detail.paidAt)}</span>
                </div>
              )}
              <div style={s.detailRow}>
                <span style={s.detailLabel}>주문 일시</span>
                <span style={s.detailValue}>{formatDate(detail.createdAt)}</span>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

const s: Record<string, CSSProperties> = {
  container:    { padding: '24px', maxWidth: '1100px', margin: '0 auto' },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20 },
  breadcrumb:   { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#9CA3AF', marginBottom: 6 },
  title:        { display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 20, fontWeight: 600, color: '#1F2937', margin: 0 },
  subtitle:     { fontSize: 13, color: '#6B7280', margin: '6px 0 0', lineHeight: 1.5 },
  refreshBtn:   { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#fff', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, color: '#374151', cursor: 'pointer' },
  tabBar:       { display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #E5E7EB', paddingBottom: 0 },
  tab:          { padding: '8px 16px', background: 'transparent', border: 'none', borderBottom: '2px solid transparent', fontSize: 13, color: '#6B7280', cursor: 'pointer', fontWeight: 400, marginBottom: -1 },
  tabActive:    { color: '#0EA5E9', borderBottomColor: '#0EA5E9', fontWeight: 600 },
  errorBox:     { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, marginBottom: 16 },
  retryBtn:     { padding: '4px 10px', fontSize: 12, color: '#DC2626', background: '#fff', border: '1px solid #FECACA', borderRadius: 4, cursor: 'pointer', flexShrink: 0 },
  tableWrap:    { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' },
  center:       { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px' },
  empty:        { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '60px 24px' },
  table:        { width: '100%', borderCollapse: 'collapse' as const },
  th:           { padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#6B7280', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', textAlign: 'left' as const, whiteSpace: 'nowrap' as const },
  tr:           { cursor: 'pointer', transition: 'background 0.1s' },
  trActive:     { background: '#F0F9FF' },
  td:           { padding: '12px 14px', fontSize: 13, color: '#374151', borderBottom: '1px solid #F3F4F6', verticalAlign: 'middle' as const },
  pagination:   { display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 16 },
  pageBtn:      { display: 'inline-flex', alignItems: 'center', padding: '6px 10px', background: '#fff', border: '1px solid #D1D5DB', borderRadius: 6, cursor: 'pointer' },
  detailPanel:  { marginTop: 20, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '20px 24px' },
  detailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #E5E7EB' },
  detailTitle:  { fontSize: 15, fontWeight: 600, color: '#1F2937', margin: 0 },
  closeBtn:     { display: 'inline-flex', alignItems: 'center', padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7280', borderRadius: 4 },
  detailRow:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  detailLabel:  { fontSize: 12, color: '#6B7280', flexShrink: 0 },
  detailValue:  { fontSize: 13, color: '#374151', textAlign: 'right' as const },
  detailDivider: { height: 1, background: '#F3F4F6', margin: '4px 0' },
  itemRow:      { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #F9FAFB' },
};
