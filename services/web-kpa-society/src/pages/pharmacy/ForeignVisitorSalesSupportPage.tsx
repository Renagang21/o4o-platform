/**
 * 외국인 여행객 판매지원 (매장 측 진입점) — KPA-Society
 * WO-O4O-FOREIGN-VISITOR-SALES-SUPPORT-MENU-GATE-V1
 * WO-O4O-STORE-SERVICE-SUBSCRIPTION-TOSS-PAYMENT-V1 (Phase 2 frontend): 월 이용권 결제 진입
 *
 * 공통 ForeignVisitorSalesSupportPanel(store-ui-core) + self-scoped entitlement check + Toss 구독 결제.
 * 결제 흐름: prepare → Toss requestPayment(리다이렉트) → /payment/success 에서 confirm.
 * 소비자 checkout(STORE_SALE_PAYMENT) 경로와 분리된 store service subscription 전용 흐름이다.
 * coreApiClient 사용 — /store-entitlements 는 /api/v1 (kpa 네임스페이스 밖).
 */
import { ForeignVisitorSalesSupportPanel } from '@o4o/store-ui-core';
import { checkSubscription, prepareSubscription, loadTossSdk } from '../../api/storeServiceSubscription';

const SERVICE_KEY = 'kpa';
const PLAN_CODE = 'FOREIGN_VISITOR_SALES_SUPPORT';
const ORDER_NAME = '외국인 여행객 판매지원 월 이용권';
const RESULT_BASE = '/store/sales-channels/foreign-visitor/payment';

export function ForeignVisitorSalesSupportPage() {
  const handleSubscribe = async () => {
    const origin = window.location.origin;
    const successUrl = `${origin}${RESULT_BASE}/success?serviceKey=${encodeURIComponent(SERVICE_KEY)}`;
    const failUrl = `${origin}${RESULT_BASE}/fail`;

    const prep = await prepareSubscription({
      serviceKey: SERVICE_KEY,
      planCode: PLAN_CODE,
      successUrl,
      failUrl,
    });
    if (!prep.clientKey) {
      throw new Error('결제 설정(clientKey)을 불러오지 못했습니다.');
    }

    const toss = await loadTossSdk(prep.clientKey);
    // paymentId 는 confirm 에 필요하므로 successUrl 쿼리로 전달(Toss 가 paymentKey/orderId/amount 를 추가로 덧붙인다).
    await toss.requestPayment('카드', {
      amount: prep.amount,
      orderId: prep.orderId,
      orderName: ORDER_NAME,
      successUrl: `${successUrl}&paymentId=${encodeURIComponent(prep.paymentId)}`,
      failUrl,
    });
  };

  return (
    <ForeignVisitorSalesSupportPanel
      priceLabel="월 이용권 (1회 결제 · 30일)"
      check={async () => {
        const res = await checkSubscription({ serviceKey: SERVICE_KEY, planCode: PLAN_CODE });
        return { active: res.active, endsAt: res.endsAt };
      }}
      onSubscribe={handleSubscribe}
    />
  );
}

export default ForeignVisitorSalesSupportPage;
