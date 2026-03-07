/**
 * StoreOrderDetailPage — O4O B2B 주문 상세
 *
 * WO-O4O-STORE-ORDER-DETAIL-PAGE-V1
 *
 * 구성:
 * - 주문 기본 정보 (주문번호, 주문일, 상태)
 * - 공급자 정보 (이름, 전화, 웹사이트)
 * - 주문 상품 목록 (이미지, 상품명, 브랜드, 규격, 단가, 수량, 금액)
 * - 주문 금액 요약 (상품 합계, 배송비, 총 주문금액)
 * - 배송 정보 (수령인, 연락처, 주소, 메모)
 * - 재주문 기능
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Truck, Store, RefreshCw, Globe, Phone, ExternalLink } from 'lucide-react';
import { storeApi, sellerApi, getTrackingUrl, SHIPMENT_STATUS_LABELS } from '../../lib/api';
import type { StoreOrder, StoreOrderItem, Shipment } from '../../lib/api';
import { addToCart } from '../../lib/cart';

// ============================================================================
// Status
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

// ============================================================================
// Section Components
// ============================================================================

function SectionCard({ icon, title, children }: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        {icon}
        <span style={styles.sectionTitle}>{title}</span>
      </div>
      <div style={styles.sectionBody}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div style={styles.infoRow}>
      <span style={styles.infoLabel}>{label}</span>
      <span style={styles.infoValue}>{value}</span>
    </div>
  );
}

// ============================================================================
// Order Item Row
// ============================================================================

function OrderItemCard({ item }: { item: StoreOrderItem }) {
  const imageUrl = item.primary_image_url || null;
  const brandSpec = [item.brand_name, item.specification].filter(Boolean).join(' · ');

  return (
    <div style={styles.itemCard}>
      {/* Image */}
      <div style={styles.itemImage}>
        {imageUrl ? (
          <img src={imageUrl} alt={item.product_name} style={styles.thumbnail} />
        ) : (
          <div style={styles.placeholderImg}>
            <Package size={20} color="#94a3b8" />
          </div>
        )}
      </div>

      {/* Info */}
      <div style={styles.itemInfo}>
        <div style={styles.itemName}>{item.product_name}</div>
        {brandSpec && <div style={styles.itemMeta}>{brandSpec}</div>}
      </div>

      {/* Price */}
      <div style={styles.itemPricing}>
        <div style={styles.itemUnitPrice}>₩{formatPrice(item.unit_price)} × {item.quantity}</div>
        <div style={styles.itemTotal}>₩{formatPrice(item.total_price)}</div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function StoreOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      storeApi.getOrderById(id),
      storeApi.getShipment(id),
    ]).then(([orderResult, shipmentResult]) => {
      if (orderResult) {
        setOrder(orderResult);
      } else {
        setNotFound(true);
      }
      setShipment(shipmentResult);
      setLoading(false);
    });
  }, [id]);

  // Supplier info from first item
  const supplierName = order?.items?.[0]?.supplier_name || null;
  const supplierPhone = order?.items?.[0]?.supplier_phone || null;
  const supplierWebsite = order?.items?.[0]?.supplier_website || null;

  // Reorder
  const handleReorder = useCallback(async () => {
    if (!order?.items || order.items.length === 0) return;
    setReordering(true);

    try {
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
      setReordering(false);
    }
  }, [order, navigate]);

  // Loading
  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loading}>주문 정보를 불러오는 중...</div>
      </div>
    );
  }

  // Not found
  if (notFound || !order) {
    return (
      <div style={styles.page}>
        <div style={styles.empty}>
          <Package size={48} color="#cbd5e1" />
          <h3 style={styles.emptyTitle}>주문을 찾을 수 없습니다</h3>
          <Link to="/store/orders" style={styles.backLink}>
            <ArrowLeft size={16} /> 주문 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = getStatus(order.status);

  return (
    <div style={styles.page}>
      {/* Back */}
      <Link to="/store/orders" style={styles.backLink}>
        <ArrowLeft size={16} />
        <span style={{ marginLeft: 4 }}>주문 목록</span>
      </Link>

      {/* Order Header */}
      <div style={styles.orderHeader}>
        <div>
          <h1 style={styles.orderNumber}>{order.order_number}</h1>
          <div style={styles.orderDate}>{formatDate(order.created_at)}</div>
        </div>
        <span style={{ ...styles.badge, backgroundColor: statusInfo.bg, color: statusInfo.color }}>
          {statusInfo.label}
        </span>
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

      {/* Supplier Info */}
      {supplierName && (
        <SectionCard icon={<Store size={18} color="#6366f1" />} title="공급자 정보">
          <div style={styles.supplierName}>{supplierName}</div>
          {supplierPhone && (
            <div style={styles.supplierContact}>
              <Phone size={14} color="#94a3b8" />
              <span style={{ marginLeft: 6 }}>{supplierPhone}</span>
            </div>
          )}
          {supplierWebsite && (
            <div style={styles.supplierContact}>
              <Globe size={14} color="#94a3b8" />
              <a href={supplierWebsite} target="_blank" rel="noopener noreferrer" style={styles.supplierLink}>
                {supplierWebsite}
              </a>
            </div>
          )}
        </SectionCard>
      )}

      {/* Order Items */}
      <SectionCard icon={<Package size={18} color="#6366f1" />} title="주문 상품">
        {order.items && order.items.length > 0 ? (
          order.items.map((item) => <OrderItemCard key={item.id} item={item} />)
        ) : (
          <div style={styles.noItems}>상품 정보 없음</div>
        )}
      </SectionCard>

      {/* Order Summary */}
      <SectionCard icon={<Package size={18} color="#6366f1" />} title="주문 금액">
        <div style={styles.summaryRow}>
          <span>상품 합계</span>
          <span>₩{formatPrice(order.total_amount)}</span>
        </div>
        <div style={styles.summaryRow}>
          <span>배송비</span>
          <span style={order.shipping_fee === 0 ? { color: '#15803d', fontWeight: 600 } : {}}>
            {order.shipping_fee === 0 ? '무료' : `₩${formatPrice(order.shipping_fee)}`}
          </span>
        </div>
        {order.discount_amount > 0 && (
          <div style={styles.summaryRow}>
            <span>할인</span>
            <span style={{ color: '#dc2626' }}>-₩{formatPrice(order.discount_amount)}</span>
          </div>
        )}
        <div style={styles.summaryTotal}>
          <span>총 주문금액</span>
          <span>₩{formatPrice(order.final_amount)}</span>
        </div>
      </SectionCard>

      {/* Shipping Info */}
      {order.shipping && (
        <SectionCard icon={<Truck size={18} color="#6366f1" />} title="배송 정보">
          <InfoRow label="수령인" value={order.shipping.recipient_name} />
          <InfoRow label="연락처" value={order.shipping.phone} />
          <InfoRow label="우편번호" value={order.shipping.postal_code} />
          <InfoRow label="주소" value={order.shipping.address} />
          <InfoRow label="상세주소" value={order.shipping.address_detail} />
          <InfoRow label="배송메모" value={order.shipping.delivery_note} />
        </SectionCard>
      )}

      {/* Shipment Tracking (WO-O4O-SHIPMENT-ENGINE-V1) */}
      {shipment && (
        <SectionCard icon={<Truck size={18} color="#6366f1" />} title="배송 추적">
          <div style={styles.shipmentGrid}>
            <div style={styles.shipmentItem}>
              <span style={styles.shipmentLabel}>배송 상태</span>
              <span style={{
                display: 'inline-block',
                padding: '3px 10px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                backgroundColor: shipment.status === 'delivered' ? '#dcfce7' : '#dbeafe',
                color: shipment.status === 'delivered' ? '#15803d' : '#1d4ed8',
              }}>
                {SHIPMENT_STATUS_LABELS[shipment.status] || shipment.status}
              </span>
            </div>
            <div style={styles.shipmentItem}>
              <span style={styles.shipmentLabel}>택배사</span>
              <span style={styles.shipmentValue}>{shipment.carrier_name}</span>
            </div>
            <div style={styles.shipmentItem}>
              <span style={styles.shipmentLabel}>송장번호</span>
              <span style={styles.shipmentValue}>{shipment.tracking_number}</span>
            </div>
            {shipment.shipped_at && (
              <div style={styles.shipmentItem}>
                <span style={styles.shipmentLabel}>발송일</span>
                <span style={styles.shipmentValue}>{formatDate(shipment.shipped_at)}</span>
              </div>
            )}
            {shipment.delivered_at && (
              <div style={styles.shipmentItem}>
                <span style={styles.shipmentLabel}>배송완료일</span>
                <span style={styles.shipmentValue}>{formatDate(shipment.delivered_at)}</span>
              </div>
            )}
          </div>
          {(() => {
            const trackUrl = getTrackingUrl(shipment.carrier_code, shipment.tracking_number);
            return trackUrl ? (
              <a href={trackUrl} target="_blank" rel="noopener noreferrer" style={styles.trackingLink}>
                <ExternalLink size={14} />
                <span style={{ marginLeft: 6 }}>배송 조회 바로가기</span>
              </a>
            ) : null;
          })()}
        </SectionCard>
      )}

      {/* Orderer Info */}
      {(order.orderer_name || order.orderer_phone) && (
        <SectionCard icon={<Store size={18} color="#6366f1" />} title="주문자 정보">
          <InfoRow label="이름" value={order.orderer_name} />
          <InfoRow label="연락처" value={order.orderer_phone} />
          <InfoRow label="이메일" value={order.orderer_email} />
          {order.note && <InfoRow label="메모" value={order.note} />}
        </SectionCard>
      )}

      {/* Reorder Button */}
      <div style={styles.actionBar}>
        <button
          style={styles.reorderBtn}
          onClick={handleReorder}
          disabled={reordering}
        >
          <RefreshCw size={16} />
          <span style={{ marginLeft: 6 }}>{reordering ? '처리 중...' : '재주문'}</span>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '24px 16px',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: 14,
    color: '#6366f1',
    textDecoration: 'none',
    marginBottom: 16,
  },

  // Order Header
  orderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  orderNumber: {
    fontSize: 22,
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  orderDate: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: 'nowrap' as const,
  },

  // Section
  section: {
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '14px 20px',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#1e293b',
  },
  sectionBody: {
    padding: 20,
  },

  // Supplier
  supplierName: {
    fontSize: 16,
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: 8,
  },
  supplierContact: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 14,
    color: '#475569',
    marginBottom: 4,
  },
  supplierLink: {
    marginLeft: 6,
    color: '#6366f1',
    textDecoration: 'none',
    fontSize: 14,
  },

  // Item Card
  itemCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '12px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  itemImage: {
    flexShrink: 0,
    width: 56,
    height: 56,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
    objectFit: 'cover' as const,
  },
  placeholderImg: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: 14,
    fontWeight: 500,
    color: '#1e293b',
  },
  itemMeta: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  itemPricing: {
    textAlign: 'right' as const,
    flexShrink: 0,
  },
  itemUnitPrice: {
    fontSize: 13,
    color: '#64748b',
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: 600,
    color: '#1e293b',
    marginTop: 2,
  },
  noItems: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center' as const,
    padding: '20px 0',
  },

  // Summary
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 14,
    color: '#475569',
    marginBottom: 8,
  },
  summaryTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 17,
    fontWeight: 700,
    color: '#0f172a',
    paddingTop: 12,
    borderTop: '1px solid #e2e8f0',
    marginTop: 4,
  },

  // Info Row
  infoRow: {
    display: 'flex',
    marginBottom: 8,
    fontSize: 14,
  },
  infoLabel: {
    width: 80,
    flexShrink: 0,
    color: '#64748b',
    fontWeight: 500,
  },
  infoValue: {
    color: '#1e293b',
    flex: 1,
  },

  // Action Bar
  actionBar: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  reorderBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '12px 24px',
    fontSize: 15,
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#6366f1',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },

  // Empty / Loading
  empty: {
    textAlign: 'center' as const,
    padding: '60px 20px',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#334155',
    marginTop: 16,
    marginBottom: 16,
  },
  loading: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: '#94a3b8',
    fontSize: 14,
  },
  messageBanner: {
    padding: '12px 20px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    marginBottom: 16,
  },

  // Shipment Tracking (WO-O4O-SHIPMENT-ENGINE-V1)
  shipmentGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 10,
    marginBottom: 12,
  },
  shipmentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shipmentLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: 500,
  },
  shipmentValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: 500,
  },
  trackingLink: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '10px 16px',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#6366f1',
    borderRadius: 8,
    textDecoration: 'none',
    width: '100%',
    justifyContent: 'center',
    boxSizing: 'border-box' as const,
  },
};
