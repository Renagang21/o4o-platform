/**
 * ForeignVisitorSalesSupportPanel — 외국인 여행객 판매지원 진입 화면 (매장 측)
 * WO-O4O-FOREIGN-VISITOR-SALES-SUPPORT-MENU-GATE-V1
 *
 * 유료 기능(이용권) 게이트의 매장 측 진입점. 결제/기능 본체는 후속 WO.
 * - 이용권 미보유(active=false) → 잠금 안내 + "결제 기능 준비 중"(disabled)
 * - 이용권 보유(active=true)   → 이용 중 + 기능 준비 안내
 * store-ui-core 는 API 비의존 — 실제 entitlement 조회는 consumer 가 `check` 로 주입한다.
 *
 * SSOT: docs/investigations/IR-O4O-TOSS-PAYMENT-SCOPE-AND-TYPE-SEPARATION-V1.md (§5.1)
 */
import { useEffect, useState } from 'react';
import { Loader2, Lock, Globe, CheckCircle2, AlertCircle } from 'lucide-react';

export interface ForeignVisitorSalesSupportPanelProps {
  /** 활성 이용권 보유 여부를 반환. consumer 가 authClient 로 self-scoped check API 를 호출한다. */
  check: () => Promise<boolean>;
}

type PanelState = 'loading' | 'locked' | 'active' | 'error';

const FEATURE_POINTS = [
  '외국인 여행객을 위한 다국어 상품 설명',
  'QR · SNS 안내',
  '숙소 배송 또는 매장 수령 안내',
  '공급자 주문 연결',
];

export function ForeignVisitorSalesSupportPanel({ check }: ForeignVisitorSalesSupportPanelProps) {
  const [state, setState] = useState<PanelState>('loading');

  useEffect(() => {
    let cancelled = false;
    check()
      .then((active) => {
        if (!cancelled) setState(active ? 'active' : 'locked');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
    // check 는 mount 시 1회만 평가 (consumer 의 inline 함수 재생성으로 인한 루프 방지)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Hero */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
          <Globe className="w-6 h-6 text-teal-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">외국인 여행객 판매지원</h1>
          <p className="text-sm text-slate-500 mt-1">
            외국인 여행객 대상 판매를 돕는 매장 유료 기능입니다.
          </p>
        </div>
      </div>

      {state === 'loading' && (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> 이용권 상태를 확인하는 중...
        </div>
      )}

      {state === 'error' && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800">
            이용권 상태를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </p>
        </div>
      )}

      {state === 'locked' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">유료 기능 — 이용권 필요</span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            외국인 여행객 판매지원은 유료 기능입니다. 월 이용권 결제 후 사용할 수 있습니다.
          </p>

          <ul className="mt-4 space-y-1.5">
            {FEATURE_POINTS.map((point) => (
              <li key={point} className="flex items-center gap-2 text-sm text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                {point}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              disabled
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-slate-300 cursor-not-allowed"
              title="결제 기능은 준비 중입니다"
            >
              이용권 결제하기
            </button>
            <span className="text-xs text-slate-400">결제 기능은 준비 중입니다.</span>
          </div>
        </div>
      )}

      {state === 'active' && (
        <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-teal-600" />
            <span className="text-sm font-semibold text-teal-800">외국인 여행객 판매지원 이용 중</span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            이용권이 활성화되어 있습니다. 판매지원 기능은 준비 중이며 곧 제공될 예정입니다.
          </p>
        </div>
      )}
    </div>
  );
}

export default ForeignVisitorSalesSupportPanel;
