/**
 * StoreOrdersPage — K-Cosmetics 내 매장 주문 내역 (buyer)
 *
 * WO-O4O-KCOSMETICS-STORE-ORDERS-FRONTEND-ALIGNMENT-V1
 * WO-O4O-STORE-HUB-MAIN-INDEPENDENT-PRODUCTION-VERIFICATION-V1:
 *   본 화면의 데이터 계약은 `/api/v1/cosmetics/orders` = **buyerId 스코프 checkout_orders**
 *   (컨트롤러 list/get 모두 `co."buyerId" = 요청자`). 즉 KPA `StoreOrdersPage` ·
 *   GlycoPharm `PharmacyOrders` 와 **같은 buyer 구매/발주 내역**이다.
 *   그럼에도 헤더 / 상태 탭 / loading·error·empty / 페이지네이션 뼈대를 inline style 로
 *   따로 구현하고 있어(사본), 두 서비스가 공유하는 `BuyerOrderLedgerView` 로 이관한다.
 *   K-Cosmetics 고유는 config·slot 으로만 남긴다 — 채널(local/travel) 컬럼 · 행 클릭 상세 패널.
 *   API·응답 shape·상태 라벨 매핑 무변경.
 *
 * ⚠️ "내 약국" 또는 약국 전용 문구 사용 금지 (K-Cosmetics 는 "내 매장")
 * ⚠️ 정산/인보이스 기능 포함 금지 (별도 IR로 설계 예정)
 */

import { useState, useEffect, useCallback, useMemo, type CSSProperties } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import {
  getStoreOrders,
  getStoreOrder,
  type StoreOrder,
  type StoreOrderDetail,
} from '@/api/storeOrders';
// 3서비스 공통 buyer checkout 상태 표시 매핑 (WO-O4O-STORE-CHECKOUT-STATUS-LABEL-ALIGNMENT-V1)
// + buyer 주문 내역 공통 뼈대 (WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1 §8)
import {
  BUYER_CHECKOUT_STATUS_TABS,
  getBuyerCheckoutStatusDisplay,
  getBuyerPaymentStatusLabel,
  BuyerOrderStatusBadge,
  BuyerOrderLedgerView,
} from '@o4o/store-ui-core';

const PAGE_SIZE = 20;
/** buyer endpoint 의 상태 필터는 화면에서 처리한다 → 한 번에 받아 client-side 필터/집계 (KPA 동일). */
const FETCH_LIMIT = 100;

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

/** KPI 집계 판정 — 기존 상태 라벨 매핑과 동일 해석을 유지한다. */
function isPaid(o: StoreOrder): boolean {
  const st = (o.status || '').toLowerCase();
  const pay = (o.paymentStatus || '').toLowerCase();
  return pay === 'paid' || st === 'paid';
}

function isCancelled(o: StoreOrder): boolean {
  const st = (o.status || '').toLowerCase();
  return st === 'cancelled' || st === 'refunded';
}

/** checkout status 원값으로 탭 매칭 (파생 상태 collapse 없음 — 기존 서버 필터와 동일 기준). */
function matchStatus(o: StoreOrder, tabKey: string): boolean {
  return tabKey === 'all' ? true : (o.status || '').toLowerCase() === tabKey;
}

export default function StoreOrdersPage() {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<StoreOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getStoreOrders({ page: 1, limit: FETCH_LIMIT });
      setOrders(res.data || []);
      setTotal(res.pagination?.total ?? (res.data || []).length);
    } catch (e: any) {
      setError(e?.message || '주문 목록을 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleRowClick = useCallback(async (order: StoreOrder) => {
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
  }, []);

  const renderList = useMemo(
    () => (rows: StoreOrder[]) => (
      <div style={s.tableWrap}>
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
            {rows.map((order) => (
              <tr
                key={order.id}
                onClick={() => handleRowClick(order)}
                style={{ ...s.tr, ...(order.id === selectedId ? s.trActive : {}) }}
              >
                <td style={s.td}>
                  <span style={{ fontWeight: 500, fontSize: 13, color: '#1F2937' }}>
                    {order.orderNumber}
                  </span>
                </td>
                <td style={s.td}>
                  <span style={{ fontSize: 12, color: '#6B7280' }}>{formatDate(order.createdAt)}</span>
                </td>
                <td style={s.td}>
                  <span style={{ fontSize: 12, color: '#374151' }}>
                    {CHANNEL_LABEL[order.channel] ?? order.channel}
                  </span>
                </td>
                <td style={s.td}>
                  <span style={{ fontSize: 13, color: '#374151' }}>{order.itemCount}개</span>
                </td>
                <td style={{ ...s.td, textAlign: 'right' }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#1F2937' }}>
                    {formatAmount(order.totalAmount)}
                  </span>
                </td>
                <td style={{ ...s.td, textAlign: 'center' }}>
                  <BuyerOrderStatusBadge status={order.status} />
                </td>
                <td style={{ ...s.td, textAlign: 'center' }}>
                  <span style={{ fontSize: 12, color: '#6B7280' }}>
                    {getBuyerPaymentStatusLabel(order.paymentStatus)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
    [handleRowClick, selectedId],
  );

  return (
    <div style={s.container}>
      <BuyerOrderLedgerView<StoreOrder>
        orders={orders}
        loading={loading}
        error={error}
        onRetry={loadOrders}
        totalCount={total}
        accent="pink"
        title="주문 내역"
        description="내 매장이 공급자에게 주문한 상품의 주문·결제 진행 상태를 확인합니다"
        statusTabs={BUYER_CHECKOUT_STATUS_TABS}
        matchStatus={matchStatus}
        isPaid={isPaid}
        isCancelled={isCancelled}
        searchPlaceholder="주문번호 검색"
        pageSize={PAGE_SIZE}
        renderList={renderList}
        empty={{
          title: '주문 내역이 없습니다',
          description: '매장 허브에서 상품이나 이벤트 오퍼를 주문하면 이곳에서 확인할 수 있습니다.',
          filteredDescription: '검색 조건에 맞는 주문이 없습니다.',
        }}
      />

      {/* Detail Panel — K-Cosmetics 고유(행 클릭 상세) */}
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
              <Loader2 size={20} style={{ color: '#DB2777' }} />
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
                  {getBuyerCheckoutStatusDisplay(detail.status).label}
                </span>
              </div>
              <div style={s.detailRow}>
                <span style={s.detailLabel}>결제 상태</span>
                <span style={s.detailValue}>{getBuyerPaymentStatusLabel(detail.paymentStatus)}</span>
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
  errorBox:     { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, marginBottom: 16 },
  tableWrap:    { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'auto' },
  center:       { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px' },
  table:        { width: '100%', borderCollapse: 'collapse' as const },
  th:           { padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#6B7280', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', textAlign: 'left' as const, whiteSpace: 'nowrap' as const },
  tr:           { cursor: 'pointer', transition: 'background 0.1s' },
  trActive:     { background: '#FDF2F8' },
  td:           { padding: '12px 14px', fontSize: 13, color: '#374151', borderBottom: '1px solid #F3F4F6', verticalAlign: 'middle' as const },
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
