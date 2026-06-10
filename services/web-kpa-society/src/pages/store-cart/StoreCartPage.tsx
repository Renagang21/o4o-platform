/**
 * StoreCartPage — 내 장바구니 (읽기/편집, 주문 확정 전)
 *
 * WO-O4O-EVENT-OFFER-TO-CART-MIGRATION-V1 (Phase 1a)
 *
 * Canonical Store Cart 의 매장 경영자(buyer) 확인 화면. 공급자별 묶음으로
 * 담긴 항목을 보여주고 수량 변경/삭제/비우기를 지원한다.
 *
 * Phase 1a 범위: 조회·수량변경·삭제만. 주문/결제/정산 확정은 후속 Phase(1b).
 *   priceSnapshot 은 표시용 임시값이며 checkout 확정 시 재검증된다.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';
import { storeCartApi, type SupplierGroup } from '../../api';
import type { CheckoutConfirmResult } from '../../api/storeCart';
import { colors, typography } from '../../styles/theme';

const CART_SERVICE_KEY = 'kpa-society';

const formatWon = (n: number | null | undefined) =>
  new Intl.NumberFormat('ko-KR').format(Number(n ?? 0)) + '원';

export function StoreCartPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<SupplierGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  // WO-O4O-STORE-CART-CHECKOUT-CONFIRMATION-V1 (Phase 1b)
  const [confirming, setConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState<CheckoutConfirmResult | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await storeCartApi.groupBySupplier(CART_SERVICE_KEY);
      setGroups(res.data.groups);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '장바구니를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeQty = async (id: string, quantity: number) => {
    if (quantity < 1 || busy) return;
    setBusy(true);
    try {
      await storeCartApi.updateQuantity(CART_SERVICE_KEY, id, quantity);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '수량 변경에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await storeCartApi.removeItem(CART_SERVICE_KEY, id);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const clearAll = async () => {
    if (busy || groups.length === 0) return;
    setBusy(true);
    try {
      await storeCartApi.clear(CART_SERVICE_KEY);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '비우기에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const confirmCheckout = async () => {
    if (confirming || busy || groups.length === 0) return;
    setConfirming(true);
    setConfirmResult(null);
    try {
      const res = await storeCartApi.checkoutConfirm(CART_SERVICE_KEY);
      setConfirmResult(res.data);
      if (res.data.createdOrders.length > 0) {
        toast.success(`${res.data.createdOrders.length}개 공급자 주문이 생성되었습니다.`);
      }
      if (res.data.failedItems.length > 0) {
        toast.error(`${res.data.failedItems.length}개 항목은 주문하지 못했습니다.`);
      }
      await load(); // 성공 항목 제거 반영
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '주문 확정에 실패했습니다.');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="장바구니를 불러오는 중..." />;
  }

  // WO-O4O-STORE-CART-SUPPLIER-GROUP-SHIPPING-PREVIEW-V1: 상품/배송비/총액 분리
  const itemsSubtotal = groups.reduce((sum, g) => sum + g.displaySubtotal, 0);
  const shippingTotal = groups.reduce((sum, g) => sum + (g.shipping?.shippingFee ?? 0), 0);
  const grandTotal = itemsSubtotal + shippingTotal;
  const itemCount = groups.reduce((sum, g) => sum + g.itemCount, 0);

  return (
    <div style={styles.container}>
      <PageHeader
        title="내 장바구니"
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '매장 허브', href: '/store-hub' },
          { label: '내 장바구니' },
        ]}
      />

      {/* 주문 확정 결과 (Phase 1b) */}
      {confirmResult && (
        <Card padding="large" style={{ marginBottom: '16px' }}>
          {confirmResult.createdOrders.length > 0 && (
            <>
              <p style={styles.resultTitle}>✅ 생성된 주문 (공급자별)</p>
              {confirmResult.createdOrders.map((o) => (
                <div key={o.orderId} style={styles.resultRow}>
                  <span style={styles.resultOrderNo}>{o.orderNumber}</span>
                  <span style={styles.resultMeta}>
                    {o.itemCount}개 품목 · 배송비 {formatWon(o.shippingFee)}
                  </span>
                  <span style={styles.resultTotal}>{formatWon(o.totalAmount)}</span>
                </div>
              ))}
            </>
          )}
          {confirmResult.failedItems.length > 0 && (
            <>
              <p style={{ ...styles.resultTitle, color: '#B91C1C', marginTop: confirmResult.createdOrders.length ? '16px' : 0 }}>
                ⚠️ 주문하지 못한 항목
              </p>
              {confirmResult.failedItems.map((f) => (
                <p key={f.itemId} style={styles.resultFail}>· {f.message}</p>
              ))}
              <p style={styles.resultFailNote}>실패한 항목은 장바구니에 그대로 남아 있습니다.</p>
            </>
          )}
        </Card>
      )}

      {itemCount === 0 ? (
        <EmptyState
          icon="🛒"
          title="장바구니가 비어 있습니다"
          description="이벤트 상품을 둘러보고 장바구니에 담아보세요."
          action={{ label: '이벤트 상품 보기', onClick: () => navigate('/store-hub/event-offers') }}
        />
      ) : (
        <>
          {groups.map((group) => (
            <Card key={group.supplierId ?? '__no_supplier__'} padding="large" style={{ marginBottom: '16px' }}>
              <div style={styles.groupHeader}>
                <span style={styles.supplierLabel}>
                  공급자 {group.supplierId ? `#${group.supplierId}` : '미지정'}
                </span>
                <span style={styles.groupSubtotal}>{formatWon(group.displaySubtotal)}</span>
              </div>

              {group.items.map((item) => (
                <div key={item.id} style={styles.itemRow}>
                  <div style={styles.itemInfo}>
                    <span style={styles.itemName}>{item.productName}</span>
                    <span style={styles.itemMeta}>
                      {item.sourceType === 'event_offer' ? '이벤트' : item.sourceType} ·{' '}
                      {formatWon(item.priceSnapshot)}
                    </span>
                  </div>
                  <div style={styles.qtyStepper}>
                    <button
                      type="button"
                      style={styles.qtyBtn}
                      disabled={busy || item.quantity <= 1}
                      onClick={() => changeQty(item.id, item.quantity - 1)}
                    >
                      −
                    </button>
                    <span style={styles.qtyValue}>{item.quantity}</span>
                    <button
                      type="button"
                      style={styles.qtyBtn}
                      disabled={busy}
                      onClick={() => changeQty(item.id, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <span style={styles.itemSubtotal}>
                    {formatWon(item.priceSnapshot * item.quantity)}
                  </span>
                  <button
                    type="button"
                    style={styles.removeBtn}
                    disabled={busy}
                    onClick={() => remove(item.id)}
                  >
                    삭제
                  </button>
                </div>
              ))}

              {/* WO-O4O-STORE-CART-SUPPLIER-GROUP-SHIPPING-PREVIEW-V1: 공급자별 배송비 */}
              {group.shipping && (
                <div style={styles.shipBox}>
                  <div style={styles.shipRow}>
                    <span style={styles.shipLabel}>상품금액</span>
                    <span style={styles.shipValue}>{formatWon(group.displaySubtotal)}</span>
                  </div>
                  <div style={styles.shipRow}>
                    <span style={styles.shipLabel}>배송비</span>
                    <span style={styles.shipValue}>
                      {group.shipping.freeShippingApplied ? '무료' : formatWon(group.shipping.shippingFee)}
                    </span>
                  </div>
                  <div style={styles.shipRow}>
                    <span style={styles.shipTotalLabel}>공급자 합계</span>
                    <span style={styles.shipTotalValue}>{formatWon(group.displayTotal)}</span>
                  </div>
                  {group.shipping.freeShippingApplied ? (
                    <p style={styles.shipNote}>무료배송 기준을 충족했습니다.</p>
                  ) : group.shipping.remainingForFreeShipping != null ? (
                    <p style={styles.shipNote}>
                      {formatWon(group.shipping.remainingForFreeShipping)} 더 담으면 무료배송 (기준{' '}
                      {formatWon(group.shipping.freeShippingThreshold)})
                    </p>
                  ) : !group.shipping.policyConfigured ? (
                    <p style={styles.shipNoteMuted}>
                      배송 정책이 설정되지 않아 배송비가 0원으로 표시됩니다. 주문 전 확인이 필요할 수 있습니다.
                    </p>
                  ) : null}
                </div>
              )}
            </Card>
          ))}

          <Card padding="large">
            <div style={styles.subRow}>
              <span style={styles.subLabel}>상품 합계 ({itemCount}개)</span>
              <span style={styles.subValue}>{formatWon(itemsSubtotal)}</span>
            </div>
            <div style={styles.subRow}>
              <span style={styles.subLabel}>배송비 합계</span>
              <span style={styles.subValue}>{formatWon(shippingTotal)}</span>
            </div>
            <div style={styles.totalRow}>
              <span style={styles.totalLabel}>총 주문 예정 금액</span>
              <span style={styles.totalValue}>{formatWon(grandTotal)}</span>
            </div>
            <p style={styles.notice}>
              표시 금액은 담을 때의 스냅샷입니다. 최종 가격·재고·배송비는 주문 확정 시 공급자별로
              다시 검증되어 공급자 단위 주문으로 생성됩니다.
            </p>
            <div style={styles.actionRow}>
              <button
                style={{ ...styles.confirmBtn, opacity: confirming || busy ? 0.7 : 1 }}
                disabled={confirming || busy}
                onClick={confirmCheckout}
              >
                {confirming ? '주문 확정 중...' : '주문 확정'}
              </button>
              <button style={styles.clearBtn} disabled={busy || confirming} onClick={clearAll}>
                장바구니 비우기
              </button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '880px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  groupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '12px',
    marginBottom: '12px',
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  supplierLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.neutral700,
  },
  groupSubtotal: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.neutral900,
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 0',
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  itemInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: 0,
  },
  itemName: {
    fontSize: '15px',
    fontWeight: 500,
    color: colors.neutral900,
  },
  itemMeta: {
    fontSize: '12px',
    color: colors.neutral500,
  },
  qtyStepper: {
    display: 'flex',
    alignItems: 'center',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    overflow: 'hidden',
  },
  qtyBtn: {
    width: '32px',
    height: '32px',
    border: 'none',
    backgroundColor: colors.neutral50,
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral700,
    cursor: 'pointer',
  },
  qtyValue: {
    minWidth: '36px',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: 600,
    color: colors.neutral900,
  },
  itemSubtotal: {
    minWidth: '90px',
    textAlign: 'right',
    fontSize: '14px',
    fontWeight: 600,
    color: colors.neutral900,
  },
  removeBtn: {
    border: 'none',
    background: 'none',
    color: colors.neutral500,
    fontSize: '13px',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  shipBox: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: `1px solid ${colors.neutral100}`,
  },
  shipRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '3px 0',
  },
  shipLabel: { fontSize: '13px', color: colors.neutral500 },
  shipValue: { fontSize: '13px', color: colors.neutral700, fontWeight: 500 },
  shipTotalLabel: { fontSize: '14px', color: colors.neutral800, fontWeight: 600 },
  shipTotalValue: { fontSize: '14px', color: colors.neutral900, fontWeight: 700 },
  shipNote: { fontSize: '12px', color: '#7C3AED', margin: '6px 0 0' },
  shipNoteMuted: { fontSize: '12px', color: colors.neutral400, margin: '6px 0 0', lineHeight: 1.5 },
  subRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
  },
  subLabel: { fontSize: '14px', color: colors.neutral500 },
  subValue: { fontSize: '14px', color: colors.neutral700, fontWeight: 500 },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: '8px 0 12px',
    paddingTop: '8px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  totalLabel: {
    ...typography.headingM,
    color: colors.neutral700,
  },
  totalValue: {
    fontSize: '22px',
    fontWeight: 700,
    color: colors.neutral900,
  },
  notice: {
    fontSize: '13px',
    color: colors.neutral500,
    lineHeight: 1.6,
    margin: '0 0 16px',
  },
  actionRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  confirmBtn: {
    padding: '12px 28px',
    backgroundColor: '#7C3AED',
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  clearBtn: {
    padding: '10px 20px',
    backgroundColor: colors.white,
    color: colors.neutral600,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  resultTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#15803d',
    margin: '0 0 12px',
  },
  resultRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 0',
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  resultOrderNo: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.neutral900,
    flex: 1,
  },
  resultMeta: {
    fontSize: '12px',
    color: colors.neutral500,
  },
  resultTotal: {
    fontSize: '14px',
    fontWeight: 700,
    color: colors.neutral900,
    minWidth: '90px',
    textAlign: 'right',
  },
  resultFail: {
    fontSize: '13px',
    color: '#B91C1C',
    margin: '0 0 4px',
    lineHeight: 1.5,
  },
  resultFailNote: {
    fontSize: '12px',
    color: colors.neutral500,
    margin: '6px 0 0',
  },
};
