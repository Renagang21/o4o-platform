/**
 * OrderDetailPage (약국 경영자) — 주문 상세 · 결제 전 취소 · 이어서 결제
 *
 * WO-PHARMACY-HUB-STORE-OWNER-CHECKOUT-AND-PAYMENT-UI-V1
 *
 * 표시 규칙:
 *   · `supplierNotified` 는 서버가 공급자 원장(neture_orders) 존재로 판정한 값이다.
 *     결제만으로 "전달 완료"라고 쓰지 않는다.
 *   · 결제 전 취소만 이 화면에서 제공한다. 결제 후 취소·환불은 이번 범위 밖이며,
 *     서버가 409 로 거부하면 그 사유를 그대로 보여준다.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  fetchOrderDetail,
  cancelOrderBeforePayment,
  errorMessage,
  errorStatus,
  type OrderDetail,
} from '../../lib/api/pharmacyHubOrders';

const won = (v: number | null | undefined) =>
  typeof v === 'number' || typeof v === 'string' ? `${Number(v).toLocaleString('ko-KR')}원` : '-';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 border-t border-gray-100 px-4 py-2 text-sm">
      <span className="w-28 shrink-0 text-gray-500">{label}</span>
      <span className="break-all">{value ?? '-'}</span>
    </div>
  );
}

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      setOrder(await fetchOrderDetail(orderId));
    } catch (err) {
      const status = errorStatus(err);
      setError(
        status === 404
          ? '주문을 찾을 수 없습니다.'
          : errorMessage(err, '주문을 불러오지 못했습니다.'),
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const cancel = async () => {
    if (!orderId || cancelling) return;
    if (!window.confirm('이 주문을 취소하시겠습니까? 취소하면 되돌릴 수 없습니다.')) return;
    setCancelling(true);
    setError(null);
    try {
      await cancelOrderBeforePayment(orderId);
      await load();
    } catch (err) {
      // 결제된 주문이면 서버가 409 ALREADY_PAID 로 거부한다 — 사유를 그대로 노출한다.
      setError(errorMessage(err, '주문을 취소하지 못했습니다.'));
      await load();
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-2xl px-4 py-10 text-sm text-gray-500">불러오는 중…</div>;
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="mb-4 text-sm text-red-600">{error ?? '주문을 찾을 수 없습니다.'}</p>
        <Link to="/store-owner/orders" className="text-sm text-gray-500 underline">
          주문 내역
        </Link>
      </div>
    );
  }

  const unpaid = order.paymentStatus === 'pending' && order.status !== 'cancelled';
  const cancelled = order.status === 'cancelled';

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-xl font-bold">{order.orderNumber}</h1>
      <p className="mb-6 text-sm text-gray-500">{order.supplierName} 공급</p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {/* 상태 안내 — 결제·전달 여부를 섞지 않고 각각 표시한다 */}
      <div
        className={`mb-4 rounded-lg p-3 text-sm ${
          cancelled
            ? 'bg-gray-100 text-gray-600'
            : order.paymentStatus === 'paid'
              ? 'bg-emerald-50 text-emerald-800'
              : 'bg-amber-50 text-amber-800'
        }`}
      >
        {cancelled ? (
          '취소된 주문입니다.'
        ) : order.paymentStatus === 'paid' ? (
          <>
            결제가 완료되었습니다.
            <br />
            {order.supplierNotified
              ? '공급자에게 주문이 전달되었습니다.'
              : '공급자 전달을 처리 중입니다. 잠시 후 다시 확인해 주세요.'}
          </>
        ) : (
          '아직 결제되지 않았습니다. 결제를 완료해야 공급자에게 전달됩니다.'
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="px-4 py-3 text-sm font-semibold">주문 상품</div>
        {order.items?.map((item, idx) => (
          <div
            key={`${item.productName}-${idx}`}
            className="flex items-center gap-3 border-t border-gray-100 px-4 py-2 text-sm"
          >
            <span className="flex-1 break-all">{item.productName}</span>
            <span className="text-gray-500">{item.quantity}개</span>
            <span className="w-24 text-right">{won(item.subtotal)}</span>
          </div>
        ))}
        <Row label="상품 합계" value={won(order.subtotal)} />
        <Row label="배송비" value={won(order.shippingFee)} />
        <Row label="결제 금액" value={<strong>{won(order.totalAmount)}</strong>} />
        <Row label="주문일" value={new Date(order.createdAt).toLocaleString('ko-KR')} />
        {order.paidAt && (
          <Row label="결제일" value={new Date(order.paidAt).toLocaleString('ko-KR')} />
        )}
        {order.note && <Row label="요청사항" value={order.note} />}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {unpaid && order.paymentGroupId && (
          <button
            type="button"
            onClick={() =>
              navigate(
                `/store-owner/payment?paymentGroupId=${encodeURIComponent(order.paymentGroupId!)}`,
              )
            }
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white"
          >
            결제하기
          </button>
        )}
        {unpaid && (
          <button
            type="button"
            onClick={cancel}
            disabled={cancelling}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm text-gray-700 disabled:opacity-40"
          >
            {cancelling ? '취소하는 중…' : '주문 취소'}
          </button>
        )}
      </div>

      {unpaid && !order.paymentGroupId && (
        <p className="mt-3 text-xs text-gray-500">
          이 주문은 결제 정보를 만들 수 없는 이전 형식입니다. 취소 후 장바구니에서 다시 주문해 주세요.
        </p>
      )}

      <p className="mt-6 text-sm">
        <Link to="/store-owner/orders" className="text-gray-500 underline">
          주문 내역
        </Link>
      </p>
    </div>
  );
}
