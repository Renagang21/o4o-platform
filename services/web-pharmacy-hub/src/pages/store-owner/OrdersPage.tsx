/**
 * OrdersPage (약국 경영자) — 내 주문 목록
 *
 * WO-PHARMACY-HUB-STORE-OWNER-CHECKOUT-AND-PAYMENT-UI-V1
 *
 * 표시 규칙: 서버가 내려준 `supplierNotified` 와 `paymentStatus` 를 그대로 반영한다.
 *   미결제 주문을 "접수됨"·"처리 중"처럼 표현하지 않는다 — 결제 전에는 공급자가 볼 수 없다.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchOrders,
  errorMessage,
  errorStatus,
  type OrderListItem,
} from '../../lib/api/pharmacyHubOrders';
import { BRAND } from '../../config/service';
// 상태 문구·금액 표기는 홈 대시보드와 동일 정의를 쓴다(사본 금지).
import { orderStatusBadge as statusLabel, won } from '../../lib/orderStatus';

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchOrders(p);
      setOrders(result.items);
      setTotalPages(result.pagination.totalPages || 1);
    } catch (err) {
      const status = errorStatus(err);
      setError(
        status === 401
          ? '로그인이 필요합니다.'
          : status === 403
            ? `${BRAND.name} 약국 경영자 승인이 완료된 계정만 이용할 수 있습니다.`
            : errorMessage(err, '주문 목록을 불러오지 못했습니다.'),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(page);
  }, [load, page]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-xl font-bold">주문 내역</h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">불러오는 중…</p>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <p className="mb-4 text-sm text-gray-500">주문 내역이 없습니다.</p>
          <Link
            to="/store-owner/products"
            className="inline-block rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white"
          >
            상품 둘러보기
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
            const label = statusLabel(order);
            return (
              <li key={order.orderId} className="rounded-lg border border-gray-200 bg-white">
                <Link to={`/store-owner/orders/${order.orderId}`} className="block px-4 py-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-semibold">{order.orderNumber}</span>
                    <span className={`rounded px-2 py-0.5 text-xs ${label.tone}`}>{label.text}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>
                      상품 {order.itemCount}종 · {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                    <span className="font-semibold text-gray-900">{won(order.totalAmount)}</span>
                  </div>
                  {order.paymentStatus === 'pending' && order.status !== 'cancelled' && (
                    <p className="mt-1 text-xs text-amber-700">
                      결제를 완료해야 공급자에게 전달됩니다.
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40"
          >
            이전
          </button>
          <span className="text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}

      <p className="mt-6 flex gap-4 text-sm">
        <Link to="/store-owner/cart" className="text-gray-500 underline">
          장바구니
        </Link>
        <Link to="/store-owner/products" className="text-gray-500 underline">
          상품 목록
        </Link>
      </p>
    </div>
  );
}
