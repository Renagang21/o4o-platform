/**
 * 외국인 여행객 판매지원 (매장 측 진입점) — Pharmacy-Hub
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §8 (#79)
 *
 * 공통 ForeignVisitorSalesSupportPanel(store-ui-core) + self-scoped 이용권 조회 + Toss 구독 결제.
 * 결제 흐름은 KPA 와 동일하다: prepare → Toss requestPayment(리다이렉트) → /payment/success 에서 confirm.
 * 이 결제는 **매장이 플랫폼에 지불하는 이용권** 이며 매장→소비자 판매 결제가 아니다
 * (O4O-STORE-COMMERCE-BOUNDARY-V1 위반 아님).
 *
 * 가격·기간은 서버 plan catalog SSOT 에서 읽는다 — 프런트 하드코딩 금지.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, ChevronRight, Languages } from 'lucide-react';
import { ForeignVisitorSalesSupportPanel } from '@o4o/store-ui-core';
import {
  checkSubscription,
  prepareSubscription,
  getSubscriptionPlan,
} from '../../lib/api/pharmacyHubStoreServiceSubscription';
import { loadTossWidget } from '../../lib/api/pharmacyHubOrders';

const SERVICE_KEY = 'pharmacy-hub';
const PLAN_CODE = 'FOREIGN_VISITOR_SALES_SUPPORT';
const ORDER_NAME = '외국인 여행객 판매지원 월 이용권';
const RESULT_BASE = '/store-owner/foreign-visitor/payment';

export default function ForeignVisitorSalesSupportPage() {
  const [priceLabel, setPriceLabel] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getSubscriptionPlan(PLAN_CODE)
      .then((plan) => {
        if (cancelled) return;
        const price =
          plan.currency === 'KRW'
            ? `월 ${plan.amount.toLocaleString()}원`
            : `${plan.amount.toLocaleString()} ${plan.currency}`;
        setPriceLabel(`${price} · ${plan.durationDays}일 이용권`);
      })
      .catch(() => {
        // catalog 조회 실패 시 가격 라벨만 생략한다(결제 버튼은 그대로 동작).
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

    const toss = await loadTossWidget(prep.clientKey);
    // paymentId 는 confirm 에 필요하므로 successUrl 쿼리로 넘긴다
    // (Toss 가 paymentKey/orderId/amount 를 추가로 덧붙인다).
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

      <div className="max-w-3xl mx-auto px-6 pb-8 space-y-3">
        <Link
          to="/store-owner/foreign-visitor/partners"
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 hover:border-teal-300 hover:bg-teal-50/30 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-slate-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">파트너 관리</p>
            <p className="text-xs text-slate-500 mt-0.5">
              여행사·가이드·호텔 등 유입 파트너를 등록하고, 파트너별 QR을 발급합니다.
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
        </Link>

        {/*
          다국어 상품 콘텐츠(#76)와 같은 업무 흐름에 있다 — 파트너 QR 로 들어온 외국인 고객이
          실제로 읽는 화면이 다국어 상품 안내다. 이미 존재하는 경로만 연결한다(dead navigation 금지).
        */}
        <Link
          to="/store-owner/multilingual-product-contents"
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 hover:border-teal-300 hover:bg-teal-50/30 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <Languages className="w-5 h-5 text-slate-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">다국어 상품 콘텐츠</p>
            <p className="text-xs text-slate-500 mt-0.5">
              외국인 고객이 QR 로 읽게 될 상품 안내를 언어별로 작성합니다.
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
        </Link>
      </div>
    </>
  );
}
