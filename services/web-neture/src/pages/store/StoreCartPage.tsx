/**
 * StoreCartPage — O4O B2B 장바구니
 *
 * WO-O4O-STORE-CART-PAGE-V1
 *
 * 구성:
 * - 공급자별 그룹화된 장바구니
 * - 수량 조절 / 삭제
 * - 배송비 자동 계산 (≥50,000원 무료, <50,000원 → 3,000원)
 * - 공급자별 주문하기 (배송 정보 입력 → POST /seller/orders)
 * - 모바일 반응형
 */

import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Trash2, Minus, Plus, Package, X, Truck } from 'lucide-react';
import { useCart } from '../../lib/cart';
import { storeApi } from '../../lib/api';
import type { StoreOrderShipping } from '../../lib/api';
import type { SupplierGroup, CartItem } from '../../lib/cart';
import { getReferralToken, clearReferralToken } from '../../lib/referral';

// ============================================================================
// Helpers
// ============================================================================

function formatPrice(value: number): string {
  return value.toLocaleString('ko-KR');
}

function calcShippingFee(subtotal: number): number {
  return subtotal >= 50000 ? 0 : 3000;
}

// ============================================================================
// Quantity Control
// ============================================================================

function QuantityControl({ quantity, onChange }: { quantity: number; onChange: (q: number) => void }) {
  return (
    <div style={styles.qtyControl}>
      <button
        style={styles.qtyBtn}
        onClick={() => onChange(Math.max(1, quantity - 1))}
        disabled={quantity <= 1}
      >
        <Minus size={14} />
      </button>
      <input
        type="number"
        value={quantity}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v) && v >= 1 && v <= 1000) onChange(v);
        }}
        style={styles.qtyInput}
        min={1}
        max={1000}
      />
      <button
        style={styles.qtyBtn}
        onClick={() => onChange(Math.min(1000, quantity + 1))}
        disabled={quantity >= 1000}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

// ============================================================================
// Cart Item Row
// ============================================================================

function CartItemRow({ item, onUpdateQty, onRemove }: {
  item: CartItem;
  onUpdateQty: (offerId: string, qty: number) => void;
  onRemove: (offerId: string) => void;
}) {
  const itemTotal = item.priceGeneral * item.quantity;

  return (
    <div style={styles.itemRow}>
      {/* Image */}
      <div style={styles.itemImage}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} style={styles.thumbnail} />
        ) : (
          <div style={styles.placeholderImg}>
            <Package size={20} color="#94a3b8" />
          </div>
        )}
      </div>

      {/* Info */}
      <div style={styles.itemInfo}>
        <div style={styles.itemName}>{item.name}</div>
        <div style={styles.itemPrice}>₩{formatPrice(item.priceGeneral)}</div>
      </div>

      {/* Quantity */}
      <QuantityControl
        quantity={item.quantity}
        onChange={(q) => onUpdateQty(item.offerId, q)}
      />

      {/* Subtotal */}
      <div style={styles.itemSubtotal}>₩{formatPrice(itemTotal)}</div>

      {/* Delete */}
      <button style={styles.deleteBtn} onClick={() => onRemove(item.offerId)} title="삭제">
        <Trash2 size={16} />
      </button>
    </div>
  );
}

// ============================================================================
// Shipping Modal
// ============================================================================

const INITIAL_SHIPPING: StoreOrderShipping = {
  recipient_name: '',
  phone: '',
  postal_code: '',
  address: '',
  address_detail: '',
  delivery_note: '',
};

function ShippingModal({ onSubmit, onClose, loading }: {
  onSubmit: (shipping: StoreOrderShipping, ordererName: string, ordererPhone: string) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [shipping, setShipping] = useState<StoreOrderShipping>(INITIAL_SHIPPING);
  const [ordererName, setOrdererName] = useState('');
  const [ordererPhone, setOrdererPhone] = useState('');

  const isValid = shipping.recipient_name && shipping.phone && shipping.postal_code && shipping.address && ordererName && ordererPhone;

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>배송 정보 입력</h3>
          <button style={styles.modalClose} onClick={onClose}><X size={20} /></button>
        </div>

        <div style={styles.modalBody}>
          <div style={styles.sectionLabel}>주문자 정보</div>
          <div style={styles.formRow}>
            <label style={styles.label}>이름 *</label>
            <input style={styles.input} value={ordererName} onChange={(e) => setOrdererName(e.target.value)} placeholder="주문자 이름" />
          </div>
          <div style={styles.formRow}>
            <label style={styles.label}>연락처 *</label>
            <input style={styles.input} value={ordererPhone} onChange={(e) => setOrdererPhone(e.target.value)} placeholder="010-0000-0000" />
          </div>

          <div style={{ ...styles.sectionLabel, marginTop: 20 }}>배송지 정보</div>
          <div style={styles.formRow}>
            <label style={styles.label}>수령인 *</label>
            <input style={styles.input} value={shipping.recipient_name} onChange={(e) => setShipping({ ...shipping, recipient_name: e.target.value })} placeholder="수령인 이름" />
          </div>
          <div style={styles.formRow}>
            <label style={styles.label}>연락처 *</label>
            <input style={styles.input} value={shipping.phone} onChange={(e) => setShipping({ ...shipping, phone: e.target.value })} placeholder="010-0000-0000" />
          </div>
          <div style={styles.formRow}>
            <label style={styles.label}>우편번호 *</label>
            <input style={styles.input} value={shipping.postal_code} onChange={(e) => setShipping({ ...shipping, postal_code: e.target.value })} placeholder="12345" />
          </div>
          <div style={styles.formRow}>
            <label style={styles.label}>주소 *</label>
            <input style={styles.input} value={shipping.address} onChange={(e) => setShipping({ ...shipping, address: e.target.value })} placeholder="기본 주소" />
          </div>
          <div style={styles.formRow}>
            <label style={styles.label}>상세주소</label>
            <input style={styles.input} value={shipping.address_detail || ''} onChange={(e) => setShipping({ ...shipping, address_detail: e.target.value })} placeholder="상세 주소" />
          </div>
          <div style={styles.formRow}>
            <label style={styles.label}>배송메모</label>
            <input style={styles.input} value={shipping.delivery_note || ''} onChange={(e) => setShipping({ ...shipping, delivery_note: e.target.value })} placeholder="배송 시 요청사항" />
          </div>
        </div>

        <div style={styles.modalFooter}>
          <button style={styles.cancelBtn} onClick={onClose} disabled={loading}>취소</button>
          <button
            style={{ ...styles.orderBtn, opacity: isValid && !loading ? 1 : 0.5 }}
            disabled={!isValid || loading}
            onClick={() => onSubmit(shipping, ordererName, ordererPhone)}
          >
            {loading ? '주문 처리 중...' : '주문하기'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Supplier Group Card
// ============================================================================

function SupplierGroupCard({ supplierId, group, onUpdateQty, onRemove, onOrder }: {
  supplierId: string;
  group: SupplierGroup;
  onUpdateQty: (offerId: string, qty: number) => void;
  onRemove: (offerId: string) => void;
  onOrder: (supplierId: string) => void;
}) {
  const subtotal = useMemo(
    () => group.items.reduce((sum, i) => sum + i.priceGeneral * i.quantity, 0),
    [group.items],
  );
  const shippingFee = calcShippingFee(subtotal);
  const total = subtotal + shippingFee;

  return (
    <div style={styles.groupCard}>
      {/* Header */}
      <div style={styles.groupHeader}>
        <div style={styles.groupName}>
          <Truck size={18} color="#6366f1" />
          <span style={{ marginLeft: 8 }}>{group.supplierName}</span>
          <span style={styles.groupCount}>{group.items.length}개 상품</span>
        </div>
      </div>

      {/* Items */}
      <div style={styles.groupItems}>
        {group.items.map((item) => (
          <CartItemRow
            key={item.offerId}
            item={item}
            onUpdateQty={onUpdateQty}
            onRemove={onRemove}
          />
        ))}
      </div>

      {/* Summary */}
      <div style={styles.groupSummary}>
        <div style={styles.summaryRow}>
          <span>소계</span>
          <span>₩{formatPrice(subtotal)}</span>
        </div>
        <div style={styles.summaryRow}>
          <span>배송비</span>
          <span style={shippingFee === 0 ? { color: '#15803d', fontWeight: 600 } : {}}>
            {shippingFee === 0 ? '무료' : `₩${formatPrice(shippingFee)}`}
          </span>
        </div>
        {shippingFee > 0 && (
          <div style={styles.shippingHint}>
            ₩{formatPrice(50000 - subtotal)} 더 주문 시 무료배송
          </div>
        )}
        <div style={styles.summaryTotal}>
          <span>합계</span>
          <span>₩{formatPrice(total)}</span>
        </div>
        <button style={styles.orderBtn} onClick={() => onOrder(supplierId)}>
          주문하기
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyCart() {
  return (
    <div style={styles.empty}>
      <ShoppingCart size={48} color="#cbd5e1" />
      <h3 style={styles.emptyTitle}>장바구니가 비어있습니다</h3>
      <p style={styles.emptyText}>공급 상품을 둘러보고 장바구니에 담아보세요.</p>
      <Link to="/library/content" style={styles.browseBtn}>
        상품 둘러보기
      </Link>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function StoreCartPage() {
  const { items, grouped, updateQty, remove, removeSupplier, clear } = useCart();
  const [orderingSupplierId, setOrderingSupplierId] = useState<string | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const grandTotal = useMemo(() => {
    let total = 0;
    for (const [, group] of grouped) {
      const sub = group.items.reduce((s, i) => s + i.priceGeneral * i.quantity, 0);
      total += sub + calcShippingFee(sub);
    }
    return total;
  }, [grouped]);

  const handleOrder = useCallback((supplierId: string) => {
    setOrderingSupplierId(supplierId);
    setErrorMessage(null);
  }, []);

  const handleSubmitOrder = useCallback(async (
    shipping: StoreOrderShipping,
    ordererName: string,
    ordererPhone: string,
  ) => {
    if (!orderingSupplierId) return;
    const group = grouped.get(orderingSupplierId);
    if (!group) return;

    setOrderLoading(true);
    setErrorMessage(null);

    const referralToken = getReferralToken();
    const result = await storeApi.createOrder({
      items: group.items.map((i) => ({ product_id: i.offerId, quantity: i.quantity })),
      shipping,
      orderer_name: ordererName,
      orderer_phone: ordererPhone,
      ...(referralToken ? { referral_token: referralToken } : {}),
    });

    setOrderLoading(false);

    if (result.success) {
      clearReferralToken();
      removeSupplier(orderingSupplierId);
      setOrderingSupplierId(null);
      setSuccessMessage(`${group.supplierName} 주문이 완료되었습니다.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(result.error || '주문에 실패했습니다.');
    }
  }, [orderingSupplierId, grouped, removeSupplier]);

  if (items.length === 0 && !successMessage) {
    return (
      <div style={styles.page}>
        <h1 style={styles.pageTitle}>
          <ShoppingCart size={24} />
          <span style={{ marginLeft: 8 }}>장바구니</span>
        </h1>
        <EmptyCart />
      </div>
    );
  }

  const supplierEntries = Array.from(grouped.entries());

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>
          <ShoppingCart size={24} />
          <span style={{ marginLeft: 8 }}>장바구니</span>
          {items.length > 0 && <span style={styles.cartCount}>{items.length}</span>}
        </h1>
        {items.length > 0 && (
          <button style={styles.clearAllBtn} onClick={clear}>
            전체 삭제
          </button>
        )}
      </div>

      {/* Success Message */}
      {successMessage && (
        <div style={styles.successBanner}>
          {successMessage}
        </div>
      )}

      {/* Supplier Groups */}
      {supplierEntries.map(([supplierId, group]) => (
        <SupplierGroupCard
          key={supplierId}
          supplierId={supplierId}
          group={group}
          onUpdateQty={updateQty}
          onRemove={remove}
          onOrder={handleOrder}
        />
      ))}

      {/* Grand Total */}
      {items.length > 0 && (
        <div style={styles.grandTotal}>
          <span style={styles.grandTotalLabel}>전체 합계 ({supplierEntries.length}개 공급자)</span>
          <span style={styles.grandTotalValue}>₩{formatPrice(grandTotal)}</span>
        </div>
      )}

      {/* Shipping Modal */}
      {orderingSupplierId && (
        <ShippingModal
          loading={orderLoading}
          onClose={() => { setOrderingSupplierId(null); setErrorMessage(null); }}
          onSubmit={handleSubmitOrder}
        />
      )}

      {/* Error message inside modal area */}
      {errorMessage && orderingSupplierId && (
        <div style={styles.errorOverlay}>
          <div style={styles.errorBanner}>{errorMessage}</div>
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
    maxWidth: 900,
    margin: '0 auto',
    padding: '24px 16px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  pageTitle: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 22,
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  cartCount: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: 600,
    backgroundColor: '#6366f1',
    color: '#fff',
    borderRadius: 12,
    padding: '2px 8px',
  },
  clearAllBtn: {
    padding: '8px 16px',
    fontSize: 13,
    color: '#dc2626',
    backgroundColor: 'transparent',
    border: '1px solid #fecaca',
    borderRadius: 8,
    cursor: 'pointer',
  },

  // Supplier Group
  groupCard: {
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  groupHeader: {
    padding: '14px 20px',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  groupName: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 15,
    fontWeight: 600,
    color: '#1e293b',
  },
  groupCount: {
    marginLeft: 8,
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: 400,
  },
  groupItems: {
    padding: '8px 0',
  },

  // Item Row
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 20px',
    gap: 16,
    borderBottom: '1px solid #f1f5f9',
  },
  itemImage: {
    flexShrink: 0,
    width: 48,
    height: 48,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    objectFit: 'cover' as const,
  },
  placeholderImg: {
    width: 48,
    height: 48,
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
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  itemPrice: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  itemSubtotal: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1e293b',
    minWidth: 90,
    textAlign: 'right' as const,
  },
  deleteBtn: {
    padding: 6,
    border: 'none',
    background: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    borderRadius: 6,
    flexShrink: 0,
  },

  // Quantity
  qtyControl: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    overflow: 'hidden',
    flexShrink: 0,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    backgroundColor: '#f8fafc',
    cursor: 'pointer',
    color: '#475569',
  },
  qtyInput: {
    width: 44,
    height: 32,
    textAlign: 'center' as const,
    border: 'none',
    borderLeft: '1px solid #e2e8f0',
    borderRight: '1px solid #e2e8f0',
    fontSize: 14,
    fontWeight: 500,
    outline: 'none',
  },

  // Group Summary
  groupSummary: {
    padding: '16px 20px',
    backgroundColor: '#f8fafc',
    borderTop: '1px solid #e2e8f0',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 14,
    color: '#475569',
    marginBottom: 6,
  },
  shippingHint: {
    fontSize: 12,
    color: '#6366f1',
    textAlign: 'right' as const,
    marginBottom: 8,
  },
  summaryTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 16,
    fontWeight: 700,
    color: '#0f172a',
    paddingTop: 8,
    borderTop: '1px solid #e2e8f0',
    marginBottom: 12,
  },

  // Buttons
  orderBtn: {
    width: '100%',
    padding: '12px 0',
    fontSize: 15,
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#6366f1',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '10px 20px',
    fontSize: 14,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
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

  // Grand Total
  grandTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    backgroundColor: '#f8fafc',
    border: '2px solid #e2e8f0',
    borderRadius: 12,
    marginTop: 8,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: 600,
    color: '#475569',
  },
  grandTotalValue: {
    fontSize: 22,
    fontWeight: 700,
    color: '#0f172a',
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

  // Modal
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  modalClose: {
    padding: 4,
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: '#94a3b8',
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    padding: '16px 20px',
    borderTop: '1px solid #e2e8f0',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#6366f1',
    marginBottom: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  formRow: {
    marginBottom: 12,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: '#475569',
    marginBottom: 4,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },

  // Messages
  successBanner: {
    padding: '12px 20px',
    backgroundColor: '#dcfce7',
    color: '#15803d',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    marginBottom: 16,
  },
  errorOverlay: {
    position: 'fixed' as const,
    bottom: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1100,
  },
  errorBanner: {
    padding: '12px 24px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
};
