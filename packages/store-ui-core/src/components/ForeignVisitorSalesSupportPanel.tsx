/**
 * ForeignVisitorSalesSupportPanel — 외국인 여행객 판매지원 진입 화면 (매장 측)
 * WO-O4O-FOREIGN-VISITOR-SALES-SUPPORT-MENU-GATE-V1
 * WO-O4O-STORE-SERVICE-SUBSCRIPTION-TOSS-PAYMENT-V1 (Phase 2 frontend): 결제 진입 버튼 추가
 *
 * 유료 기능(이용권) 게이트의 매장 측 진입점.
 * - 이용권 미보유(active=false) → 잠금 안내 + 월 이용권 결제 버튼(onSubscribe 제공 시) / "준비 중"(미제공 시 disabled)
 * - 이용권 보유(active=true)   → 이용 중 + (만료일 있으면 표시)
 * store-ui-core 는 API 비의존 — 실제 entitlement 조회/결제는 consumer 가 `check`/`onSubscribe` 로 주입한다.
 *
 * SSOT: docs/investigations/IR-O4O-TOSS-PAYMENT-SCOPE-AND-TYPE-SEPARATION-V1.md (§5.1)
 */
import { useEffect, useState } from 'react';
import { Loader2, Lock, Globe, CheckCircle2, AlertCircle } from 'lucide-react';

/** check() 결과 — boolean(하위호환) 또는 만료일 포함 상태. */
export interface ForeignVisitorSalesSupportStatus {
  active: boolean;
  endsAt?: string | null;
}

export interface ForeignVisitorSalesSupportPanelProps {
  /** 활성 이용권 보유 여부(또는 만료일 포함 상태)를 반환. consumer 가 self-scoped check API 를 호출한다. */
  check: () => Promise<boolean | ForeignVisitorSalesSupportStatus>;
  /**
   * 월 이용권 결제 트리거. 제공 시 잠금 화면 결제 버튼이 활성화된다.
   * consumer 가 prepare → Toss requestPayment(리다이렉트)까지 수행한다(성공 시 페이지 이탈).
   * 미제공 시 버튼은 "준비 중"(disabled) 으로 표시된다.
   */
  onSubscribe?: () => Promise<void> | void;
  /** 결제 버튼 보조 라벨(가격 등). 예: "월 99,000원". */
  priceLabel?: string;
}

type PanelState = 'loading' | 'locked' | 'active' | 'error' | 'processing';

const FEATURE_POINTS = [
  '외국인 여행객을 위한 다국어 상품 설명',
  'QR · SNS 안내',
  '숙소 배송 또는 매장 수령 안내',
  '공급자 주문 연결',
];

export function ForeignVisitorSalesSupportPanel({
  check,
  onSubscribe,
  priceLabel,
}: ForeignVisitorSalesSupportPanelProps) {
  const [state, setState] = useState<PanelState>('loading');
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    check()
      .then((result) => {
        if (cancelled) return;
        const active = typeof result === 'boolean' ? result : result.active;
        const ends = typeof result === 'boolean' ? null : result.endsAt ?? null;
        setEndsAt(ends);
        setState(active ? 'active' : 'locked');
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

  const handleSubscribe = async () => {
    if (!onSubscribe) return;
    setSubscribeError(null);
    setState('processing');
    try {
      // 성공 시 Toss 결제창으로 리다이렉트되어 페이지를 이탈한다.
      await onSubscribe();
    } catch (e) {
      // 결제 준비 실패 / 사용자 취소 등 → 잠금 화면 복귀 + 안내
      setSubscribeError(e instanceof Error ? e.message : '결제를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      setState('locked');
    }
  };

  const formatDate = (iso: string | null): string | null => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

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

      {(state === 'locked' || state === 'processing') && (
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

          {subscribeError && (
            <div className="mt-4 flex items-center gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-xs text-amber-800">{subscribeError}</span>
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            {onSubscribe ? (
              <>
                <button
                  type="button"
                  onClick={handleSubscribe}
                  disabled={state === 'processing'}
                  className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white ${
                    state === 'processing'
                      ? 'bg-teal-400 cursor-not-allowed'
                      : 'bg-teal-600 hover:bg-teal-700'
                  }`}
                >
                  {state === 'processing' && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {state === 'processing' ? '결제 준비 중...' : '월 이용권 결제하기'}
                </button>
                {priceLabel && state !== 'processing' && (
                  <span className="text-xs text-slate-500">{priceLabel}</span>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-slate-300 cursor-not-allowed"
                  title="결제 기능은 준비 중입니다"
                >
                  이용권 결제하기
                </button>
                <span className="text-xs text-slate-400">결제 기능은 준비 중입니다.</span>
              </>
            )}
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
          {formatDate(endsAt) && (
            <p className="mt-3 text-sm text-teal-800">
              이용 기간: <span className="font-semibold">{formatDate(endsAt)}</span> 까지
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default ForeignVisitorSalesSupportPanel;
