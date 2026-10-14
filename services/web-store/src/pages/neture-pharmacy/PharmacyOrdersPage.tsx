/**
 * 주문 내역 — DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1 §8-3
 *
 *   GET  /api/v1/neture/pharmacy/orders              내 약국의 Neture 약국 주문(최근 200건)
 *   POST /api/v1/neture/pharmacy/orders/:id/cancel   결제 전 취소(created · pending_payment)
 * 결제 전 주문은 결제 그룹 단위로 여기서도 결제할 수 있다(장바구니 화면을 벗어난 경우).
 * 테스트 결제 주문은 "테스트 결제" 로 표시한다 — 실제 결제 · 공급자 지급 근거가 아니다.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { neturePharmacyApi, pharmacyErrorMessage, type PharmacyOrder, type SemiFranchiseRow } from '../../api/neturePharmacy';
import { BusinessTabs } from '../../components/BusinessTabs';
import { Notice, PharmacyPage, StatusBadge, btn, formatDate, formatWon, pharmacyStorePath } from './shared';
import { PaymentGroupPay, usePaymentMode } from './PaymentGroupPay';

const ORDER_STATUS_LABEL: Record<string, string> = {
  created: '주문 생성',
  pending_payment: '결제 대기',
  paid: '결제 완료',
  refunded: '환불',
  cancelled: '취소',
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: '미결제',
  paid: '결제 완료',
  failed: '결제 실패',
  refunded: '환불',
};

const isUnpaid = (o: PharmacyOrder) =>
  (o.status === 'created' || o.status === 'pending_payment') && (o.paymentStatus === 'pending' || o.paymentStatus === 'failed');

function itemSummary(o: PharmacyOrder): string {
  const items = Array.isArray(o.items) ? o.items : [];
  if (items.length === 0) return '-';
  const first = items[0]?.productName ?? '상품';
  return items.length > 1 ? `${first} 외 ${items.length - 1}건` : first;
}

export default function PharmacyOrdersPage() {
  const mode = usePaymentMode();
  const [params, setParams] = useSearchParams();
  const business = params.get('business') || '';
  const [businesses, setBusinesses] = useState<SemiFranchiseRow[]>([]);
  useEffect(() => { let active = true; neturePharmacyApi.listSemiFranchises().then(rows => { if (active) setBusinesses(rows.filter(r => r.membershipStatus !== null)); }).catch(() => {}); return () => { active = false; }; }, []);
  const [orders, setOrders] = useState<PharmacyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrders(await neturePharmacyApi.listOrders());
    } catch (e) {
      setError(pharmacyErrorMessage(e, '주문 내역을 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visibleOrders = business ? orders.filter(o => o.items?.some(i => i.metadata?.semiFranchiseKey === business)) : orders;
  /** 결제 전 주문을 결제 그룹별로 묶는다(금액 = 그룹 주문 합계 — 확정 금액은 서버가 다시 계산한다). */
  const unpaidGroups = useMemo(() => {
    const m = new Map<string, { paymentGroupId: string; amount: number; count: number }>();
    for (const o of orders) {
      if (!isUnpaid(o) || !o.paymentGroupId) continue;
      const g = m.get(o.paymentGroupId) ?? { paymentGroupId: o.paymentGroupId, amount: 0, count: 0 };
      g.amount += Number(o.totalAmount) || 0;
      g.count += 1;
      m.set(o.paymentGroupId, g);
    }
    return [...m.values()];
  }, [orders]);

  const cancel = async (o: PharmacyOrder) => {
    if (!window.confirm(`주문 ${o.orderNumber} 을(를) 취소하시겠습니까?`)) return;
    setBusyId(o.id);
    setError(null);
    setMessage(null);
    try {
      await neturePharmacyApi.cancelOrder(o.id);
      setMessage(`주문 ${o.orderNumber} 을(를) 취소했습니다.`);
      await load();
    } catch (e) {
      setError(pharmacyErrorMessage(e, '주문을 취소하지 못했습니다.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <PharmacyPage
      title="주문 내역"
      description="Neture 약국 매장에서 확정한 주문입니다. 결제 전 주문은 취소하거나 결제할 수 있습니다."
      actions={<>
        <Link className={btn.secondary} to={pharmacyStorePath('cart')}>장바구니</Link>
        <button className={btn.secondary} onClick={load} disabled={loading}><RefreshCw size={14} className={`inline ${loading ? 'animate-spin' : ''}`} /> 새로고침</button>
      </>}
    >
      {message && <Notice>{message}</Notice>}
      <BusinessTabs businesses={businesses} value={business} onChange={key => setParams(prev => { const p = new URLSearchParams(prev); if (key) p.set('business', key); else p.delete('business'); return p; })} />
      {business && <p className="mb-3 text-sm text-slate-500">선택한 사업의 항목이 포함된 주문입니다. 주문 금액·결제 그룹은 원래 주문 전체 기준입니다.</p>}
      {error && <Notice tone="error">{error}</Notice>}

      {!loading && unpaidGroups.length > 0 && (
        <section className="mb-6 rounded-lg border border-amber-200 bg-white p-4">
          <h2 className="mb-2 text-base font-semibold text-gray-900">전체 사업의 결제 대기</h2>
          {unpaidGroups.map((g, idx) => (
            <div key={g.paymentGroupId} className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
              <span><strong>결제 그룹 {idx + 1}</strong> · 주문 {g.count}건 · {formatWon(g.amount)}</span>
              <PaymentGroupPay paymentGroupId={g.paymentGroupId} amount={g.amount} mode={mode} onPaid={load} />
            </div>
          ))}
        </section>
      )}

      {loading ? (
        <p className="py-12 text-center text-gray-500">불러오는 중...</p>
      ) : visibleOrders.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          <p>주문 내역이 없습니다.</p>
          <p className="mt-1"><Link className="underline" to={pharmacyStorePath('supply')}>공급 상품 보기</Link></p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
                <th className="px-4 py-3 font-medium">주문번호</th>
                <th className="px-4 py-3 font-medium">상품</th>
                <th className="px-4 py-3 text-right font-medium">금액</th>
                <th className="px-4 py-3 font-medium">주문 상태</th>
                <th className="px-4 py-3 font-medium">결제</th>
                <th className="px-4 py-3 font-medium">주문일</th>
                <th className="px-4 py-3 text-center font-medium">작업</th>
              </tr>
            </thead>
            <tbody>
              {visibleOrders.map((o) => (
                <tr key={o.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{o.orderNumber}</td>
                  <td className="px-4 py-3">{itemSummary(o)}</td>
                  <td className="px-4 py-3 text-right">{formatWon(o.totalAmount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} label={ORDER_STATUS_LABEL[o.status] ?? o.status} /></td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.paymentStatus} label={PAYMENT_STATUS_LABEL[o.paymentStatus] ?? o.paymentStatus} />
                    {o.testPayment && <span className="ml-1 rounded bg-violet-50 px-1.5 py-0.5 text-xs text-violet-700" data-testid="test-payment-badge">테스트 결제</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(o.createdAt)}</td>
                  <td className="px-4 py-3 text-center">
                    {isUnpaid(o) && (
                      <button className={btn.danger} disabled={busyId === o.id} onClick={() => cancel(o)}>결제 전 취소</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PharmacyPage>
  );
}
