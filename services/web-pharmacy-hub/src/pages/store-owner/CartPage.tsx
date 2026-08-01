/**
 * CartPage (약국 경영자) — 장바구니 · 주문 생성
 *
 * WO-PHARMACY-HUB-STORE-OWNER-CHECKOUT-AND-PAYMENT-UI-V1
 *
 * 흐름: 장바구니 확인 → 주문 생성(공급자별 N건 + paymentGroupId) → 결제 화면으로 이동
 *
 * 표시 규칙:
 *   · 소계 · 배송비 · 총액은 **서버 응답을 그대로** 쓴다. 화면에서 다시 계산하지 않는다.
 *   · 주문 생성 직후는 미결제 상태다 — "주문 완료"·"공급자 접수"처럼 표현하지 않는다.
 *
 * 중복 방지: 주문 생성은 in-flight 동안 버튼을 잠근다(중복 클릭 → 중복 주문 방지).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  fetchCart,
  updateCartItem,
  removeCartItem,
  createOrders,
  errorMessage,
  errorStatus,
  type CartResponse,
  type FailedItem,
} from '../../lib/api/pharmacyHubOrders';
import { BRAND } from '../../config/service';

const won = (v: number | null | undefined) =>
  typeof v === 'number' ? `${v.toLocaleString('ko-KR')}원` : '-';

export default function CartPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [ordering, setOrdering] = useState(false);
  const [failedItems, setFailedItems] = useState<FailedItem[]>([]);
  /** 중복 주문 방지 — state 반영 전 두 번째 클릭도 막는다 */
  const orderingRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCart(await fetchCart());
    } catch (err) {
      const status = errorStatus(err);
      setError(
        status === 401
          ? '로그인이 필요합니다.'
          : status === 403
            ? `${BRAND.name} 약국 경영자 승인이 완료된 계정만 이용할 수 있습니다.`
            : errorMessage(err, '장바구니를 불러오지 못했습니다.'),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changeQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1 || quantity > 1000 || busyItemId) return;
    setBusyItemId(itemId);
    try {
      await updateCartItem(itemId, quantity);
      await load();
    } catch (err) {
      setError(errorMessage(err, '수량을 변경하지 못했습니다.'));
    } finally {
      setBusyItemId(null);
    }
  };

  const remove = async (itemId: string) => {
    if (busyItemId) return;
    setBusyItemId(itemId);
    try {
      await removeCartItem(itemId);
      await load();
    } catch (err) {
      setError(errorMessage(err, '항목을 삭제하지 못했습니다.'));
    } finally {
      setBusyItemId(null);
    }
  };

  const submitOrder = async () => {
    if (orderingRef.current) return;
    orderingRef.current = true;
    setOrdering(true);
    setError(null);
    setFailedItems([]);
    try {
      const result = await createOrders();
      if (result.orders.length === 0) {
        // 전부 실패 — 장바구니는 그대로 남는다. 사유를 보여주고 멈춘다.
        setFailedItems(result.failedItems);
        setError('주문할 수 있는 상품이 없습니다.');
        await load();
        return;
      }
      // 일부만 실패했어도 생성된 주문은 결제 대상이다. 사유는 결제 화면에서 안내한다.
      navigate(
        `/store-owner/payment?paymentGroupId=${encodeURIComponent(result.paymentGroupId)}`,
        { state: { failedItems: result.failedItems } },
      );
    } catch (err) {
      const status = errorStatus(err);
      setError(
        status === 400
          ? errorMessage(err, '주문할 상품이 없습니다.')
          : errorMessage(err, '주문 생성에 실패했습니다.'),
      );
      await load();
    } finally {
      orderingRef.current = false;
      setOrdering(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-gray-500">불러오는 중…</div>;
  }

  const isEmpty = !cart || cart.groups.length === 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-1 text-xl font-bold">장바구니</h1>
      <p className="mb-6 text-sm text-gray-500">
        공급자가 여러 곳이어도 <strong>결제는 한 번</strong>입니다. 주문은 공급자별로 나뉘어 전달됩니다.
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {failedItems.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <p className="mb-1 font-semibold">주문하지 못한 상품</p>
          <ul className="list-disc pl-5">
            {failedItems.map((f) => (
              <li key={f.itemId}>
                {f.productName} — {f.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isEmpty ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <p className="mb-4 text-sm text-gray-500">장바구니가 비어 있습니다.</p>
          <Link
            to="/store-owner/products"
            className="inline-block rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white"
          >
            상품 둘러보기
          </Link>
        </div>
      ) : (
        <>
          {cart.groups.map((group) => (
            <section
              key={group.supplierId ?? 'none'}
              className="mb-4 rounded-lg border border-gray-200 bg-white"
            >
              <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <h2 className="text-sm font-semibold">{group.supplierName}</h2>
                <span className="text-xs text-gray-500">{group.itemCount}개 상품</span>
              </header>

              {group.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 border-b border-gray-50 px-4 py-3 text-sm"
                >
                  <span className="flex-1 break-all">{item.productName}</span>
                  <span className="w-24 text-right text-gray-500">{won(item.priceSnapshot)}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="수량 감소"
                      disabled={busyItemId === item.id || item.quantity <= 1}
                      onClick={() => changeQuantity(item.id, item.quantity - 1)}
                      className="h-7 w-7 rounded border border-gray-300 disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      type="button"
                      aria-label="수량 증가"
                      disabled={busyItemId === item.id || item.quantity >= 1000}
                      onClick={() => changeQuantity(item.id, item.quantity + 1)}
                      className="h-7 w-7 rounded border border-gray-300 disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={busyItemId === item.id}
                    onClick={() => remove(item.id)}
                    className="text-xs text-gray-400 underline disabled:opacity-40"
                  >
                    삭제
                  </button>
                </div>
              ))}

              <div className="space-y-1 px-4 py-3 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>상품 합계</span>
                  <span>{won(group.displaySubtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>배송비</span>
                  <span>
                    {group.shipping.freeShippingApplied ? (
                      <span className="text-emerald-600">무료</span>
                    ) : (
                      won(group.shipping.shippingFee)
                    )}
                  </span>
                </div>
                {group.shipping.remainingForFreeShipping != null && (
                  <p className="text-xs text-emerald-700">
                    {won(group.shipping.remainingForFreeShipping)} 더 담으면 배송비가 무료입니다.
                  </p>
                )}
                <div className="flex justify-between border-t border-gray-100 pt-2 font-semibold">
                  <span>공급자 합계</span>
                  <span>{won(group.displayTotal)}</span>
                </div>
              </div>
            </section>
          ))}

          {/* 합계도 서버 계산값 그대로 — 화면에서 더하지 않는다 */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex justify-between py-1 text-sm text-gray-500">
              <span>상품 합계</span>
              <span>{won(cart.displaySubtotal)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm text-gray-500">
              <span>배송비 합계</span>
              <span>{won(cart.displayShippingFee)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-3">
              <span className="font-semibold">결제 예정 금액</span>
              <span className="text-xl font-bold text-emerald-600">{won(cart.displayTotal)}</span>
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            주문을 만들어도 결제 전에는 공급자에게 전달되지 않습니다. 결제 전에는 취소할 수 있습니다.
          </p>

          <button
            type="button"
            onClick={submitOrder}
            disabled={ordering}
            className={`mt-4 w-full rounded-xl px-4 py-3 text-base font-bold text-white ${
              ordering ? 'cursor-not-allowed bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {ordering ? '주문을 만드는 중…' : '주문하고 결제하기'}
          </button>
        </>
      )}

      <p className="mt-6 flex gap-4 text-sm">
        <Link to="/store-owner/products" className="text-gray-500 underline">
          상품 목록
        </Link>
        <Link to="/store-owner/orders" className="text-gray-500 underline">
          주문 내역
        </Link>
      </p>
    </div>
  );
}
