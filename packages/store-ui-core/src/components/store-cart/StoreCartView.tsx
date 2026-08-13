/**
 * StoreCartView — 매장 장바구니 공통 View (K-Cosmetics · GlycoPharm · KPA-Society)
 *
 * WO-O4O-STORE-HUB-PRODUCT-APPLICATION-AND-CART-COMMONIZATION-V1
 *
 * K-Cosmetics(282줄) / GlycoPharm(283줄) `StoreCartPage` 는 accent 색(pink/teal)과
 * 결과 헤더 아이콘(lucide vs emoji)만 다른 near-identical 화면이었다. 그 구조를 그대로 옮기고
 * 서비스 차이는 props 로 주입한다.
 *
 * WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1:
 *   남아 있던 KPA-Society 사본(423줄, inline style)까지 편입한다. KPA 차이는
 *   accent(violet) · header slot(PageHeader breadcrumb) · empty slot(EmptyState) ·
 *   containerClassName(880px) 로만 표현한다. API · 주문 확정 계약 무변경.
 *
 * 범위 밖(의도적):
 *   - Pharmacy-Hub 는 결제 그룹 기반의 다른 주문 계약이므로 대상이 아니다.
 */

import type { ReactNode } from 'react';
import { Loader2, ShoppingCart, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { UseStoreCartResult } from './useStoreCart';

export type StoreCartAccent = 'pink' | 'teal' | 'violet';

export interface StoreCartViewProps {
  cart: UseStoreCartResult;
  accent: StoreCartAccent;
  /** 빈 장바구니 CTA — 라벨과 클릭 동작(라우팅)은 서비스가 소유한다. */
  emptyAction: { label: string; onClick: () => void };
  /** 화면 상단 — 서비스 자체 PageHeader(breadcrumb) 를 쓰면 주입한다. */
  header?: ReactNode;
  /** 빈 상태 표시 — 서비스 EmptyState 를 쓰면 주입한다(emptyAction 대신). */
  empty?: ReactNode;
  /** 최외곽 container class (폭·여백 차이) */
  containerClassName?: string;
}

// accent 별 정적 Tailwind class 맵 (동적 class 구성 금지).
const ACCENT_CLASSES: Record<StoreCartAccent, { spinner: string; solidBtn: string; hint: string }> = {
  pink: {
    spinner: 'text-pink-600',
    solidBtn: 'bg-pink-600 text-white hover:bg-pink-700',
    hint: 'text-pink-600',
  },
  teal: {
    spinner: 'text-teal-600',
    solidBtn: 'bg-teal-600 text-white hover:bg-teal-700',
    hint: 'text-teal-600',
  },
  violet: {
    spinner: 'text-violet-600',
    solidBtn: 'bg-violet-600 text-white hover:bg-violet-700',
    hint: 'text-violet-600',
  },
};

const won = (n: number | null | undefined) => '₩' + Number(n ?? 0).toLocaleString('ko-KR');

export function StoreCartView({
  cart,
  accent,
  emptyAction,
  header,
  empty,
  containerClassName = 'space-y-6',
}: StoreCartViewProps) {
  const ac = ACCENT_CLASSES[accent];
  const {
    groups,
    loading,
    busy,
    confirming,
    confirmResult,
    changeQty,
    remove,
    clearAll,
    confirmCheckout,
    itemsSubtotal,
    shippingTotal,
    grandTotal,
    itemCount,
  } = cart;

  return (
    <div className={containerClassName}>
      {header ?? (
        <div>
          <h1 className="text-2xl font-bold text-slate-800">내 장바구니</h1>
          <p className="text-slate-500 mt-1 text-sm">
            담은 상품을 확인하고 공급자별로 주문을 확정합니다.
          </p>
        </div>
      )}

      {/* 주문 확정 결과 */}
      {confirmResult && (
        <div className="bg-white rounded-xl border border-slate-100 p-5 space-y-3">
          {confirmResult.createdOrders.length > 0 && (
            <div>
              <p className="text-sm font-bold text-green-700 mb-2 flex items-center gap-1.5">
                <CheckCircle2 size={16} aria-hidden="true" />생성된 주문 (공급자별)
              </p>
              {confirmResult.createdOrders.map((o) => (
                <div
                  key={o.orderId}
                  className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0 text-sm"
                >
                  <span className="font-semibold text-slate-800 flex-1">{o.orderNumber}</span>
                  <span className="text-xs text-slate-500">
                    {o.itemCount}개 · 배송비 {won(o.shippingFee)}
                  </span>
                  <span className="font-bold text-slate-900 w-24 text-right">{won(o.totalAmount)}</span>
                </div>
              ))}
            </div>
          )}
          {confirmResult.failedItems.length > 0 && (
            <div>
              <p className="text-sm font-bold text-red-700 mb-1 flex items-center gap-1.5">
                <AlertTriangle size={16} aria-hidden="true" />주문하지 못한 항목
              </p>
              {confirmResult.failedItems.map((f) => (
                <p key={f.itemId} className="text-sm text-red-600">· {f.message}</p>
              ))}
              <p className="text-xs text-slate-500 mt-1">실패한 항목은 장바구니에 그대로 남아 있습니다.</p>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 size={28} className={'animate-spin ' + ac.spinner} />
        </div>
      ) : itemCount === 0 ? (
        empty ?? (
        <div className="bg-white rounded-xl border border-slate-100 text-center py-16 text-slate-500">
          <ShoppingCart size={36} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-sm">장바구니가 비어 있습니다.</p>
          <button
            type="button"
            onClick={emptyAction.onClick}
            className={'mt-4 px-4 py-2 text-sm font-semibold rounded-lg ' + ac.solidBtn}
          >
            {emptyAction.label}
          </button>
        </div>
        )
      ) : (
        <>
          {groups.map((group) => (
            <div
              key={group.supplierId ?? '__no_supplier__'}
              className="bg-white rounded-xl border border-slate-100 p-5"
            >
              <div className="flex justify-between items-center pb-3 mb-3 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-700">
                  공급자 {group.supplierId ? '#' + group.supplierId : '미지정'}
                </span>
                <span className="text-sm font-semibold text-slate-900">{won(group.displaySubtotal)}</span>
              </div>
              {group.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{item.productName}</p>
                    <p className="text-xs text-slate-400">
                      {item.sourceType === 'event_offer' ? '이벤트' : item.sourceType} · {won(item.priceSnapshot)}
                    </p>
                  </div>
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      disabled={busy || item.quantity <= 1}
                      onClick={() => changeQty(item.id, item.quantity - 1)}
                      className="w-8 h-8 text-slate-600 disabled:opacity-40 hover:bg-slate-50"
                    >
                      −
                    </button>
                    <span className="w-9 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => changeQty(item.id, item.quantity + 1)}
                      className="w-8 h-8 text-slate-600 disabled:opacity-40 hover:bg-slate-50"
                    >
                      +
                    </button>
                  </div>
                  <span className="w-24 text-right text-sm font-semibold text-slate-900">
                    {won(item.priceSnapshot * item.quantity)}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => remove(item.id)}
                    className="text-slate-400 hover:text-red-500 disabled:opacity-40"
                    title="삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              {/* WO-O4O-STORE-CART-SUPPLIER-GROUP-SHIPPING-PREVIEW-V1 */}
              {group.shipping && (
                <div className="mt-3 pt-3 border-t border-slate-100 text-sm">
                  <div className="flex justify-between py-0.5 text-slate-500">
                    <span>상품금액</span><span>{won(group.displaySubtotal)}</span>
                  </div>
                  <div className="flex justify-between py-0.5 text-slate-500">
                    <span>배송비</span>
                    <span>{group.shipping.freeShippingApplied ? '무료' : won(group.shipping.shippingFee)}</span>
                  </div>
                  <div className="flex justify-between py-0.5 font-semibold text-slate-900">
                    <span>공급자 합계</span><span>{won(group.displayTotal)}</span>
                  </div>
                  {group.shipping.freeShippingApplied ? (
                    <p className={'text-xs mt-1 ' + ac.hint}>무료배송 기준을 충족했습니다.</p>
                  ) : group.shipping.remainingForFreeShipping != null ? (
                    <p className={'text-xs mt-1 ' + ac.hint}>
                      {won(group.shipping.remainingForFreeShipping)} 더 담으면 무료배송 (기준 {won(group.shipping.freeShippingThreshold)})
                    </p>
                  ) : !group.shipping.policyConfigured ? (
                    <p className="text-xs text-slate-400 mt-1">배송 정책 미설정 — 배송비 0원으로 표시됩니다.</p>
                  ) : null}
                </div>
              )}
            </div>
          ))}

          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <div className="flex justify-between items-center py-1 text-sm text-slate-500">
              <span>상품 합계 ({itemCount}개)</span><span>{won(itemsSubtotal)}</span>
            </div>
            <div className="flex justify-between items-center py-1 text-sm text-slate-500">
              <span>배송비 합계</span><span>{won(shippingTotal)}</span>
            </div>
            <div className="flex justify-between items-center mb-3 mt-2 pt-2 border-t border-slate-200">
              <span className="text-base font-semibold text-slate-700">총 주문 예정 금액</span>
              <span className="text-xl font-bold text-slate-900">{won(grandTotal)}</span>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              표시 금액은 담을 때의 스냅샷입니다. 최종 가격·재고·배송비는 주문 확정 시 공급자별로 다시
              검증되어 공급자 단위 주문으로 생성됩니다.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={confirming || busy}
                onClick={confirmCheckout}
                className={'px-6 py-3 text-sm font-semibold rounded-lg disabled:opacity-60 ' + ac.solidBtn}
              >
                {confirming ? '주문 확정 중...' : '주문 확정'}
              </button>
              <button
                type="button"
                disabled={busy || confirming}
                onClick={clearAll}
                className="px-5 py-2.5 text-sm font-medium rounded-lg border border-slate-300 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-60"
              >
                장바구니 비우기
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default StoreCartView;
