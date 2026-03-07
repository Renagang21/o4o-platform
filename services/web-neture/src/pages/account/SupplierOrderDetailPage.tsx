/**
 * SupplierOrderDetailPage - 공급자 주문 상세
 *
 * Work Order: WO-O4O-SUPPLIER-ORDER-PROCESSING-V1 + WO-O4O-SHIPMENT-ENGINE-V1
 *
 * 구성:
 * - Order Summary: 주문번호 / 주문일 / 상태 / 총 주문금액
 * - Store Information: 매장명 / 지역 / 연락처 / 주소
 * - Order Products: 제품 / 수량 / 단가 / 금액 (테이블)
 * - 주문 금액 요약: 총 주문금액 / 배송비 / 최종 금액
 * - Order Status: 상태 변경 버튼
 * - Shipment Management: 송장 등록 / 배송 정보 / 배송 완료
 *
 * 실제 API 연동: supplierApi.getOrderById() / supplierApi.updateOrderStatus() / supplierApi shipment APIs
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Store, Package, Truck, ExternalLink } from 'lucide-react';
import { supplierApi, CARRIERS, getTrackingUrl, SHIPMENT_STATUS_LABELS } from '../../lib/api';
import type { StoreOrder, StoreOrderItem, Shipment } from '../../lib/api';

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

// preparing → shipped, shipped → delivered are now handled by Shipment Engine
const NEXT_STATUS: Record<string, string> = {
  created: 'preparing',
  paid: 'preparing',
};

const NEXT_ACTION_LABEL: Record<string, string> = {
  created: '처리 시작',
  paid: '처리 시작',
};

function getStatus(status: string): StatusConfig {
  return STATUS_MAP[status] || { label: status, bg: '#f1f5f9', color: '#64748b' };
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

function extractRegion(address?: string): string {
  if (!address) return '-';
  return address.trim().split(/\s+/)[0] || '-';
}

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const info = getStatus(status);
  return (
    <span style={{ ...styles.statusBadge, backgroundColor: info.bg, color: info.color }}>
      {info.label}
    </span>
  );
}

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
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Shipment state (WO-O4O-SHIPMENT-ENGINE-V1)
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [carrierCode, setCarrierCode] = useState('cj');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [submittingShipment, setSubmittingShipment] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [orderData, shipmentData] = await Promise.all([
        supplierApi.getOrderById(id),
        supplierApi.getShipment(id),
      ]);
      setOrder(orderData);
      setShipment(shipmentData);
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleStatusChange = useCallback(async () => {
    if (!order) return;
    const nextStatus = NEXT_STATUS[order.status];
    if (!nextStatus) return;

    setUpdating(true);
    try {
      const result = await supplierApi.updateOrderStatus(order.id, nextStatus);
      if (result.success) {
        setMessage({ type: 'success', text: '주문 상태가 변경되었습니다.' });
        await fetchOrder();
      } else {
        setMessage({ type: 'error', text: result.error || '상태 변경에 실패했습니다.' });
      }
    } catch {
      setMessage({ type: 'error', text: '상태 변경 중 오류가 발생했습니다.' });
    } finally {
      setUpdating(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }, [order, fetchOrder]);

  // WO-O4O-SHIPMENT-ENGINE-V1: 송장 등록
  const handleCreateShipment = useCallback(async () => {
    if (!order || !trackingNumber.trim()) return;
    const carrier = CARRIERS.find((c) => c.code === carrierCode);
    if (!carrier) return;

    setSubmittingShipment(true);
    try {
      const result = await supplierApi.createShipment(order.id, {
        carrier_code: carrierCode,
        carrier_name: carrier.name,
        tracking_number: trackingNumber.trim(),
      });
      if (result.success) {
        setMessage({ type: 'success', text: '송장이 등록되었습니다. 배송이 시작됩니다.' });
        setTrackingNumber('');
        await fetchOrder();
      } else {
        setMessage({ type: 'error', text: result.error || '송장 등록에 실패했습니다.' });
      }
    } catch {
      setMessage({ type: 'error', text: '송장 등록 중 오류가 발생했습니다.' });
    } finally {
      setSubmittingShipment(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }, [order, carrierCode, trackingNumber, fetchOrder]);

  // WO-O4O-SHIPMENT-ENGINE-V1: 배송 완료 처리
  const handleDeliverShipment = useCallback(async () => {
    if (!shipment) return;

    setSubmittingShipment(true);
    try {
      const result = await supplierApi.updateShipmentStatus(shipment.id, { status: 'delivered' });
      if (result.success) {
        setMessage({ type: 'success', text: '배송이 완료 처리되었습니다.' });
        await fetchOrder();
      } else {
        setMessage({ type: 'error', text: result.error || '배송 완료 처리에 실패했습니다.' });
      }
    } catch {
      setMessage({ type: 'error', text: '배송 완료 처리 중 오류가 발생했습니다.' });
    } finally {
      setSubmittingShipment(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }, [shipment, fetchOrder]);

  // Loading
  if (loading) {
    return (
      <div style={styles.emptyState}>
        <p style={styles.emptyText}>주문 정보를 불러오는 중...</p>
      </div>
    );
  }

  // Not found
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
  const items: StoreOrderItem[] = order.items || [];
  const itemsTotal = items.reduce((sum, item) => sum + item.total_price, 0);
  const shippingAddress = order.shipping?.address || '-';
  const shippingDetail = order.shipping?.address_detail || '';
  const fullAddress = shippingDetail ? `${shippingAddress} ${shippingDetail}` : shippingAddress;

  return (
    <div>
      {/* Back Link */}
      <Link to="/account/supplier/orders" style={styles.backNav}>
        <ArrowLeft size={16} />
        주문 목록
      </Link>

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

      {/* 1. Order Summary */}
      <div style={styles.summarySection}>
        <div style={styles.summaryLeft}>
          <h1 style={styles.summaryTitle}>{order.order_number}</h1>
          <span style={styles.summaryDate}>{formatDate(order.created_at)}</span>
          <StatusBadge status={order.status} />
        </div>
        <div style={styles.summaryAmount}>
          <span style={styles.summaryAmountLabel}>총 주문금액</span>
          <span style={styles.summaryAmountValue}>{formatPrice(order.final_amount)}원</span>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left Column */}
        <div style={styles.colStack}>
          {/* 2. Store Information */}
          <SectionCard title="매장 정보" icon={<Store size={18} style={{ color: '#64748b' }} />}>
            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>매장명</span>
                <span style={styles.infoValue}>{order.orderer_name || '-'}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>지역</span>
                <span style={styles.infoValue}>{extractRegion(order.shipping?.address)}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>연락처</span>
                <span style={styles.infoValue}>{order.orderer_phone || '-'}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>주소</span>
                <span style={styles.infoValue}>{fullAddress}</span>
              </div>
            </div>
          </SectionCard>

          {/* 3. Order Products */}
          <SectionCard title={`주문 제품 (${items.length}개)`} icon={<Package size={18} style={{ color: '#64748b' }} />}>
            <div style={styles.productTableWrap}>
              <table style={styles.productTable}>
                <thead>
                  <tr>
                    <th style={styles.ptTh}>제품</th>
                    <th style={{ ...styles.ptTh, textAlign: 'center' }}>수량</th>
                    <th style={{ ...styles.ptTh, textAlign: 'right' }}>단가</th>
                    <th style={{ ...styles.ptTh, textAlign: 'right' }}>금액</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td style={styles.ptTd}>
                        <span style={styles.ptProductName}>{item.product_name}</span>
                        {(item.brand_name || item.specification) && (
                          <div style={styles.ptMeta}>
                            {[item.brand_name, item.specification].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </td>
                      <td style={{ ...styles.ptTd, textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ ...styles.ptTd, textAlign: 'right' }}>
                        <span style={styles.ptDim}>{formatPrice(item.unit_price)}원</span>
                      </td>
                      <td style={{ ...styles.ptTd, textAlign: 'right' }}>
                        <span style={styles.ptAmount}>{formatPrice(item.total_price)}원</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Price Summary */}
            <div style={styles.priceSummary}>
              <div style={styles.priceRow}>
                <span style={styles.priceLabel}>상품 합계</span>
                <span style={styles.priceValue}>{formatPrice(itemsTotal)}원</span>
              </div>
              <div style={styles.priceRow}>
                <span style={styles.priceLabel}>배송비</span>
                <span style={styles.priceValue}>{order.shipping_fee === 0 ? '무료' : `${formatPrice(order.shipping_fee)}원`}</span>
              </div>
              <div style={styles.priceFinalRow}>
                <span style={styles.priceFinalLabel}>최종 금액</span>
                <span style={styles.priceFinalValue}>{formatPrice(order.final_amount)}원</span>
              </div>
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
                <button
                  onClick={handleStatusChange}
                  disabled={updating}
                  style={{ ...styles.statusButton, opacity: updating ? 0.6 : 1 }}
                >
                  {updating ? '처리중...' : actionLabel}
                </button>
              )}
              {order.status === 'delivered' && (
                <p style={styles.statusDone}>주문이 완료되었습니다.</p>
              )}
              {order.status === 'cancelled' && (
                <p style={styles.statusCancelled}>취소된 주문입니다.</p>
              )}
            </div>
          </SectionCard>

          {/* 5. Shipment Management (WO-O4O-SHIPMENT-ENGINE-V1) */}
          {order.status === 'preparing' && !shipment && (
            <SectionCard title="송장 등록" icon={<Truck size={18} style={{ color: '#64748b' }} />}>
              <div style={styles.shipmentForm}>
                <div style={styles.formField}>
                  <label style={styles.formLabel}>택배사</label>
                  <select
                    value={carrierCode}
                    onChange={(e) => setCarrierCode(e.target.value)}
                    style={styles.formSelect}
                  >
                    {CARRIERS.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.formField}>
                  <label style={styles.formLabel}>송장번호</label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="송장번호를 입력하세요"
                    style={styles.formInput}
                  />
                </div>
                <button
                  onClick={handleCreateShipment}
                  disabled={submittingShipment || !trackingNumber.trim()}
                  style={{ ...styles.shipmentButton, opacity: (submittingShipment || !trackingNumber.trim()) ? 0.6 : 1 }}
                >
                  {submittingShipment ? '처리중...' : '발송 처리'}
                </button>
                <p style={styles.shipmentHint}>송장을 등록하면 주문 상태가 자동으로 '배송중'으로 변경됩니다.</p>
              </div>
            </SectionCard>
          )}

          {shipment && (
            <SectionCard title="배송 관리" icon={<Truck size={18} style={{ color: '#64748b' }} />}>
              <div style={styles.shipmentInfo}>
                <div style={styles.shipmentRow}>
                  <span style={styles.shipmentLabel}>배송 상태</span>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: shipment.status === 'delivered' ? '#dcfce7' : '#dbeafe',
                    color: shipment.status === 'delivered' ? '#15803d' : '#1d4ed8',
                  }}>
                    {SHIPMENT_STATUS_LABELS[shipment.status] || shipment.status}
                  </span>
                </div>
                <div style={styles.shipmentRow}>
                  <span style={styles.shipmentLabel}>택배사</span>
                  <span style={styles.shipmentValue}>{shipment.carrier_name}</span>
                </div>
                <div style={styles.shipmentRow}>
                  <span style={styles.shipmentLabel}>송장번호</span>
                  <span style={styles.shipmentValue}>{shipment.tracking_number}</span>
                </div>
                {(() => {
                  const trackUrl = getTrackingUrl(shipment.carrier_code, shipment.tracking_number);
                  return trackUrl ? (
                    <a href={trackUrl} target="_blank" rel="noopener noreferrer" style={styles.trackingLink}>
                      <ExternalLink size={14} />
                      배송 조회
                    </a>
                  ) : null;
                })()}
                {shipment.shipped_at && (
                  <div style={styles.shipmentRow}>
                    <span style={styles.shipmentLabel}>발송일</span>
                    <span style={styles.shipmentValue}>{formatDate(shipment.shipped_at)}</span>
                  </div>
                )}
                {shipment.delivered_at && (
                  <div style={styles.shipmentRow}>
                    <span style={styles.shipmentLabel}>배송 완료일</span>
                    <span style={styles.shipmentValue}>{formatDate(shipment.delivered_at)}</span>
                  </div>
                )}
              </div>

              {(shipment.status === 'shipped' || shipment.status === 'in_transit') && (
                <button
                  onClick={handleDeliverShipment}
                  disabled={submittingShipment}
                  style={{ ...styles.deliverButton, opacity: submittingShipment ? 0.6 : 1, marginTop: '16px' }}
                >
                  {submittingShipment ? '처리중...' : '배송 완료 처리'}
                </button>
              )}
              {shipment.status === 'delivered' && (
                <p style={{ ...styles.statusDone, marginTop: '12px' }}>배송이 완료되었습니다.</p>
              )}
            </SectionCard>
          )}

          {/* 6. Shipping Info */}
          {order.shipping && (
            <SectionCard title="배송 정보" icon={<Truck size={18} style={{ color: '#64748b' }} />}>
              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>수령인</span>
                  <span style={styles.infoValue}>{order.shipping.recipient_name || '-'}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>연락처</span>
                  <span style={styles.infoValue}>{order.shipping.phone || '-'}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>우편번호</span>
                  <span style={styles.infoValue}>{order.shipping.postal_code || '-'}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>주소</span>
                  <span style={styles.infoValue}>{fullAddress}</span>
                </div>
                {order.shipping.delivery_note && (
                  <div style={{ ...styles.infoItem, gridColumn: '1 / -1' }}>
                    <span style={styles.infoLabel}>배송 메모</span>
                    <span style={styles.infoValue}>{order.shipping.delivery_note}</span>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* Order Note */}
          {order.note && (
            <SectionCard title="주문 메모" icon={<Package size={18} style={{ color: '#64748b' }} />}>
              <p style={{ fontSize: '14px', color: '#334155', margin: 0 }}>{order.note}</p>
            </SectionCard>
          )}
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

  // Message
  messageBanner: {
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '16px',
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
    alignItems: 'center',
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
  summaryAmount: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '2px',
  },
  summaryAmountLabel: {
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: 500,
  },
  summaryAmountValue: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1e293b',
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

  // Product Table
  productTableWrap: {
    overflow: 'auto',
  },
  productTable: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  ptTh: {
    textAlign: 'left',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#64748b',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
  },
  ptTd: {
    padding: '10px 12px',
    fontSize: '14px',
    color: '#334155',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'middle',
  },
  ptProductName: {
    fontWeight: 500,
    color: '#1e293b',
  },
  ptMeta: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '2px',
  },
  ptDim: {
    color: '#94a3b8',
    fontSize: '13px',
  },
  ptAmount: {
    fontWeight: 600,
    color: '#334155',
  },

  // Price Summary
  priceSummary: {
    marginTop: '16px',
    paddingTop: '12px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: '13px',
    color: '#64748b',
  },
  priceValue: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#334155',
  },
  priceFinalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '4px',
    paddingTop: '8px',
    borderTop: '1px solid #e2e8f0',
  },
  priceFinalLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1e293b',
  },
  priceFinalValue: {
    fontSize: '18px',
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

  // Shipment (WO-O4O-SHIPMENT-ENGINE-V1)
  shipmentForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  formField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  formLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#475569',
  },
  formSelect: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: '#fff',
    color: '#334155',
    boxSizing: 'border-box' as const,
    outline: 'none',
  },
  formInput: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: '#fff',
    color: '#334155',
    boxSizing: 'border-box' as const,
    outline: 'none',
  },
  shipmentButton: {
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
  shipmentHint: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: 0,
  },
  shipmentInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  shipmentRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shipmentLabel: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: 500,
  },
  shipmentValue: {
    fontSize: '14px',
    color: '#1e293b',
    fontWeight: 500,
  },
  trackingLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#3b82f6',
    fontWeight: 500,
    textDecoration: 'none',
  },
  deliverButton: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#15803d',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },

  // Empty/Not Found
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
