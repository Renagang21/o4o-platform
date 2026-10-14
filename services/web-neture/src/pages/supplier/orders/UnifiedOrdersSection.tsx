import { Link } from 'react-router-dom';
import { Lock, ArrowRight } from 'lucide-react';
import type { UnifiedSupplierOrder } from '../../../lib/api/supplier';
import {
  formatKRW,
  formatDate,
  SOURCE_BADGE,
  ORDER_STATUS_LABEL,
} from './presentation';
import { styles } from './styles';

// 통합 주문 보기 섹션 (읽기) — neture_orders + checkout_orders
export function UnifiedOrdersSection({
  orders,
  loading,
  error,
  onRetry,
  total,
  sourceFilter,
  onChangeFilter,
}: {
  orders: UnifiedSupplierOrder[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  total: number;
  sourceFilter: 'all' | 'neture' | 'checkout';
  onChangeFilter: (f: 'all' | 'neture' | 'checkout') => void;
}) {
  const FILTERS: Array<{ key: 'all' | 'neture' | 'checkout'; label: string }> =
    [
      { key: 'all', label: '전체' },
      { key: 'neture', label: 'Neture 주문' },
      { key: 'checkout', label: '이벤트/서비스 주문' },
    ];

  return (
    <div style={styles.unifiedCard}>
      <div style={styles.unifiedHeader}>
        <div>
          <h2 style={styles.unifiedTitle}>통합 주문 보기</h2>
          <p style={styles.unifiedSubtitle}>
            Neture 주문과 이벤트 오퍼·서비스 주문을 한 곳에서 확인합니다.
            {error ? ' (읽기 전용)' : ` (읽기 전용 · 총 ${total}건)`}
          </p>
        </div>
        <div style={styles.filterRow}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={sourceFilter === f.key}
              onClick={() => onChangeFilter(f.key)}
              style={{
                ...styles.filterBtn,
                ...(sourceFilter === f.key ? styles.filterBtnActive : {}),
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={styles.unifiedLoading}>주문을 불러오는 중...</div>
      ) : error ? (
        <div style={{ ...styles.unifiedEmpty, color: '#dc2626' }}>
          통합 주문을 불러오지 못했습니다.{' '}
          <button
            onClick={onRetry}
            style={{
              background: 'none',
              border: 'none',
              color: '#dc2626',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: 'inherit',
              padding: 0,
            }}
          >
            다시 시도
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div style={styles.unifiedEmpty}>표시할 주문이 없습니다.</div>
      ) : (
        <div style={styles.unifiedList}>
          {orders.map((o) => {
            const badge =
              SOURCE_BADGE[o.orderType] || SOURCE_BADGE.service_checkout;
            const firstItem = o.itemsPreview[0]?.name;
            const itemLabel = firstItem
              ? o.itemCount > 1
                ? `${firstItem} 외 ${o.itemCount - 1}건`
                : firstItem
              : `${o.itemCount}개 상품`;
            return (
              <div key={`${o.source}-${o.id}`} style={styles.orderRow}>
                <div style={styles.orderMain}>
                  <div style={styles.orderTopLine}>
                    <span
                      style={{
                        ...styles.sourceBadge,
                        backgroundColor: badge.bg,
                        color: badge.color,
                      }}
                    >
                      {badge.label}
                    </span>
                    <span style={styles.orderNumber}>
                      {o.orderNumber || o.id.slice(0, 8)}
                    </span>
                    {o.status && (
                      <span style={styles.orderStatus}>
                        {ORDER_STATUS_LABEL[o.status] || o.status}
                      </span>
                    )}
                    {o.testPayment && (
                      <span
                        style={{
                          ...styles.sourceBadge,
                          backgroundColor: '#FEF3C7',
                          color: '#92400E',
                        }}
                        title="실제 결제가 아닌 테스트 결제 주문입니다"
                      >
                        테스트 결제
                      </span>
                    )}
                  </div>
                  <p style={styles.orderItems}>{itemLabel}</p>
                  <p style={styles.orderMeta}>
                    {o.buyerOrganizationName
                      ? `구매 약국 ${o.buyerOrganizationName}`
                      : o.buyerName || '구매자 정보 없음'}
                    {' · '}
                    {formatDate(o.createdAt)}
                  </p>
                </div>
                <div style={styles.orderRight}>
                  <p style={styles.orderTotal}>{formatKRW(o.totalAmount)}</p>
                  <p style={styles.orderShipping}>
                    배송비 {formatKRW(o.shippingFee)}
                  </p>
                  {o.canFulfill && o.fulfillmentUrl ? (
                    <Link to={o.fulfillmentUrl} style={styles.orderActionBtn}>
                      주문 처리 <ArrowRight size={13} />
                    </Link>
                  ) : (
                    <span
                      style={styles.orderReadonly}
                      title={o.readOnlyReason || '읽기 전용'}
                    >
                      <Lock size={12} /> 읽기 전용
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p style={styles.unifiedFootnote}>
        이벤트 오퍼·서비스 주문은 checkout_orders 기반으로, 현재 화면에서는
        확인만 가능합니다. 결제 완료 후 배송 준비와 송장 등록을 진행합니다.
        주문별 처리 가능 여부를 확인해 주세요.
      </p>
    </div>
  );
}
