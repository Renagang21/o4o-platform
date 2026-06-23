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
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, ChevronRight } from 'lucide-react';
import { ForeignVisitorSalesSupportPanel } from '@o4o/store-ui-core';
import {
  checkSubscription,
  prepareSubscription,
  getSubscriptionPlan,
  loadTossSdk,
} from '../../api/storeServiceSubscription';

const SERVICE_KEY = 'kpa';
const PLAN_CODE = 'FOREIGN_VISITOR_SALES_SUPPORT';
const ORDER_NAME = '외국인 여행객 판매지원 월 이용권';
const RESULT_BASE = '/store/sales-channels/foreign-visitor/payment';

export function ForeignVisitorSalesSupportPage() {
  // 가격/기간은 서버 catalog 기준으로 표시(프론트 하드코딩 금지).
  const [priceLabel, setPriceLabel] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getSubscriptionPlan(PLAN_CODE)
      .then((plan) => {
        if (cancelled) return;
        const price = plan.currency === 'KRW'
          ? `월 ${plan.amount.toLocaleString()}원`
          : `${plan.amount.toLocaleString()} ${plan.currency}`;
        setPriceLabel(`${price} · ${plan.durationDays}일 이용권`);
      })
      .catch(() => {
        // catalog 조회 실패 시 가격 라벨 생략(버튼은 정상 동작)
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    <>
      <ForeignVisitorSalesSupportPanel
        priceLabel={priceLabel}
        check={async () => {
          const res = await checkSubscription({ serviceKey: SERVICE_KEY, planCode: PLAN_CODE });
          return { active: res.active, endsAt: res.endsAt };
        }}
        onSubscribe={handleSubscribe}
      />

      {/* WO-O4O-FOREIGN-VISITOR-PARTNER-MANAGEMENT-UI-V1: 유입 파트너 관리 진입점 */}
      <div className="max-w-3xl mx-auto px-6 pb-8">
        <Link
          to="/store/sales-channels/foreign-visitor/partners"
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 hover:border-teal-300 hover:bg-teal-50/30 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-slate-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">파트너 관리</p>
            <p className="text-xs text-slate-500 mt-0.5">
              여행사·가이드·호텔 등 유입 파트너를 등록하고, 이후 파트너별 QR을 발급할 수 있습니다.
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
        </Link>
      </div>
    </>
  );
}

export default ForeignVisitorSalesSupportPage;
