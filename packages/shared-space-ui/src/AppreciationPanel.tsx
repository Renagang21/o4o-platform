/**
 * AppreciationPanel — O4O 공통 감사 포인트 컴포넌트
 *
 * WO-O4O-APPRECIATION-PANEL-COMPONENT-EXTRACTION-V1
 *
 * Forum Post / LMS Course / Content Detail 화면에서 반복되던 감사 포인트 UI
 * (집계 chip + 최근 메시지 + 보내기 버튼 + 모달)를 통합한 공통 컴포넌트.
 *
 * API 의존성은 props 로 주입한다 — 컴포넌트는 어떤 서비스의 apiClient 도 직접
 * import 하지 않는다. KPA `apiClient` 와 Glyco/K-Cos/Neture `api` 차이는
 * consumer 가 wrapper 함수로 흡수해서 전달한다.
 *
 * 두 가지 layout variant 지원:
 *   - 'inline' : Forum/LMS — summary chip + 단일 버튼 + 집계 박스 + 모달
 *   - 'panel'  : Content   — card 형태 panel 안에 요약 + 메시지 + 버튼 + 모달
 *
 * service-specific 문구·색상은 props 로 받는다. 본 컴포넌트 안에 hardcode 금지.
 */

import { useCallback, useEffect, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppreciationTargetType = 'forum_post' | 'lms_course' | 'content';

export interface AppreciationSummaryData {
  totalAmount: number;
  count: number;
}

export interface AppreciationRecentItem {
  amount: number;
  message?: string | null;
  createdAt: string;
}

/**
 * API 의존성 주입 인터페이스.
 *
 * consumer 는 자신의 wrapper 함수를 그대로 전달한다 — 본 컴포넌트는 response
 * 의 정확한 envelope 모양을 가정하지 않고 항상 정규화된 데이터를 받는다.
 */
export interface AppreciationApi {
  send: (data: {
    targetType: AppreciationTargetType;
    targetId: string;
    amount: number;
    message?: string;
  }) => Promise<unknown>;
  getSummary: (
    targetType: AppreciationTargetType,
    targetId: string,
  ) => Promise<AppreciationSummaryData | null>;
  getRecent: (
    targetType: AppreciationTargetType,
    targetId: string,
  ) => Promise<AppreciationRecentItem[]>;
}

export type AppreciationTheme = 'amber' | 'emerald' | 'pink' | 'blue';
export type AppreciationVariant = 'inline' | 'panel';

export interface AppreciationPanelProps {
  /** Target 식별 — 필수 */
  targetType: AppreciationTargetType;
  targetId: string;

  /** API 함수 주입 — 필수 (서비스별 apiClient 차이 흡수) */
  api: AppreciationApi;

  /** 송신 가능 여부 — 기본 true. false 시 disabledReason 노출 */
  canSend?: boolean;
  /** canSend=false 일 때 표시할 사유 (예: '작성자 정보가 없어 감사하기를 사용할 수 없습니다.') */
  disabledReason?: string;

  /** 로그인 사용자 ID — undefined 면 비로그인으로 간주, display-only 처리 */
  currentUserId?: string | null;

  /** 표시 옵션 */
  showSummary?: boolean;
  showRecent?: boolean;
  recentLimit?: number;
  buttonLabel?: string;
  panelTitle?: string;

  /** 모달 동작 */
  defaultAmount?: number | '';
  presetAmounts?: number[];
  allowCustomAmount?: boolean;
  allowMessage?: boolean;

  /** 테마 (서비스별 색상) */
  theme?: AppreciationTheme;

  /** Layout — 기본 'inline' */
  variant?: AppreciationVariant;

  /** 추가 className (감싸는 외부 div) */
  className?: string;

  /** 전송 성공 시 콜백 — toast 호출 등 consumer 가 처리 */
  onSent?: (payload: { amount: number; message?: string }) => void;
  /** 에러 콜백 — toast.error 등 consumer 가 처리. 미지정 시 silent */
  onError?: (err: unknown) => void;
  /** 비로그인 상태에서 보내기 버튼 클릭 시 콜백 (로그인 모달 호출 등) */
  onRequireLogin?: () => void;
}

// ─── Theme tokens ─────────────────────────────────────────────────────────────

interface ThemeTokens {
  /** chip / 패널 배경 + 보더 */
  chipBg: string;
  chipBorder: string;
  chipText: string;
  /** primary 버튼 (보내기) */
  primaryBg: string;
  primaryHoverBg: string;
  primaryText: string;
  /** preset 활성 */
  presetActiveBg: string;
  presetActiveBorder: string;
  presetActiveText: string;
  /** focus 링 */
  focusRing: string;
}

const THEMES: Record<AppreciationTheme, ThemeTokens> = {
  amber: {
    chipBg: 'bg-amber-50',
    chipBorder: 'border-amber-200',
    chipText: 'text-amber-700',
    primaryBg: 'bg-amber-500',
    primaryHoverBg: 'hover:bg-amber-600',
    primaryText: 'text-white',
    presetActiveBg: 'bg-amber-50',
    presetActiveBorder: 'border-amber-400',
    presetActiveText: 'text-amber-800',
    focusRing: 'focus:border-amber-400',
  },
  emerald: {
    chipBg: 'bg-emerald-50',
    chipBorder: 'border-emerald-200',
    chipText: 'text-emerald-700',
    primaryBg: 'bg-emerald-600',
    primaryHoverBg: 'hover:bg-emerald-700',
    primaryText: 'text-white',
    presetActiveBg: 'bg-emerald-50',
    presetActiveBorder: 'border-emerald-400',
    presetActiveText: 'text-emerald-800',
    focusRing: 'focus:border-emerald-400',
  },
  pink: {
    chipBg: 'bg-pink-50',
    chipBorder: 'border-pink-200',
    chipText: 'text-pink-700',
    primaryBg: 'bg-pink-500',
    primaryHoverBg: 'hover:bg-pink-600',
    primaryText: 'text-white',
    presetActiveBg: 'bg-pink-50',
    presetActiveBorder: 'border-pink-400',
    presetActiveText: 'text-pink-800',
    focusRing: 'focus:border-pink-400',
  },
  blue: {
    chipBg: 'bg-sky-50',
    chipBorder: 'border-sky-200',
    chipText: 'text-sky-700',
    primaryBg: 'bg-sky-600',
    primaryHoverBg: 'hover:bg-sky-700',
    primaryText: 'text-white',
    presetActiveBg: 'bg-sky-50',
    presetActiveBorder: 'border-sky-400',
    presetActiveText: 'text-sky-800',
    focusRing: 'focus:border-sky-400',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function AppreciationPanel(props: AppreciationPanelProps) {
  const {
    targetType,
    targetId,
    api,
    canSend = true,
    disabledReason,
    currentUserId,
    showSummary = true,
    showRecent = true,
    recentLimit = 3,
    buttonLabel = '🎁 감사하기',
    panelTitle,
    defaultAmount = '',
    presetAmounts = [10, 30, 50],
    allowCustomAmount = true,
    allowMessage = true,
    theme = 'amber',
    variant = 'inline',
    className,
    onSent,
    onError,
    onRequireLogin,
  } = props;

  const t = THEMES[theme];
  const isAuthenticated = !!currentUserId;
  const canInteract = isAuthenticated && canSend;

  const [summary, setSummary] = useState<AppreciationSummaryData | null>(null);
  const [recent, setRecent] = useState<AppreciationRecentItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState<number | ''>(defaultAmount);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async () => {
    const [sumRes, recentRes] = await Promise.allSettled([
      api.getSummary(targetType, targetId),
      api.getRecent(targetType, targetId),
    ]);
    if (sumRes.status === 'fulfilled') setSummary(sumRes.value);
    if (recentRes.status === 'fulfilled') setRecent(recentRes.value ?? []);
  }, [api, targetType, targetId]);

  useEffect(() => {
    if (!targetId) return;
    refresh();
  }, [targetId, refresh]);

  const openModal = () => {
    if (!isAuthenticated) {
      onRequireLogin?.();
      return;
    }
    setAmount(defaultAmount);
    setMessage('');
    setShowModal(true);
  };

  const closeModal = () => {
    if (sending) return;
    setShowModal(false);
    setAmount(defaultAmount);
    setMessage('');
  };

  const handleSend = async () => {
    if (sending) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    try {
      setSending(true);
      await api.send({
        targetType,
        targetId,
        amount: amt,
        message: message.trim() || undefined,
      });
      setShowModal(false);
      setAmount(defaultAmount);
      setMessage('');
      onSent?.({ amount: amt, message: message.trim() || undefined });
      refresh();
    } catch (err) {
      onError?.(err);
    } finally {
      setSending(false);
    }
  };

  const hasSummary = !!summary && summary.totalAmount > 0;
  const messagesToShow = showRecent
    ? recent.filter((r) => r.message).slice(0, recentLimit)
    : [];

  const summaryChip = hasSummary && summary ? (
    <span className={`text-xs ${t.chipText}`}>
      🎁 {summary.totalAmount.toLocaleString()}P · {summary.count}명
    </span>
  ) : null;

  // ─── Render: inline variant (Forum / LMS) ──────────────────────────────────

  if (variant === 'inline') {
    return (
      <div className={className}>
        {/* Button + summary chip row */}
        <div className="flex items-center gap-3 mb-4">
          {canInteract ? (
            <button
              type="button"
              onClick={openModal}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border ${t.chipBorder} ${t.chipBg} ${t.chipText} hover:opacity-90 transition-colors`}
            >
              <span>{buttonLabel}</span>
              {hasSummary && summary && (
                <span className="text-xs opacity-75">
                  {summary.totalAmount.toLocaleString()}P · {summary.count}명
                </span>
              )}
            </button>
          ) : (
            <>
              {hasSummary && summary && (
                <span className={`text-sm ${t.chipText}`}>
                  🎁 {summary.totalAmount.toLocaleString()}P · {summary.count}명
                </span>
              )}
              {!canSend && disabledReason && (
                <span className="text-xs text-slate-400">{disabledReason}</span>
              )}
            </>
          )}
        </div>

        {/* Summary + recent box */}
        {showSummary && hasSummary && summary && (
          <div className={`${t.chipBg} ${t.chipBorder} border rounded-xl px-5 py-4 mb-6`}>
            <div className={`flex items-center gap-3 text-sm ${t.chipText} mb-2`}>
              <span>🎁 감사 <strong>{summary.totalAmount.toLocaleString()}P</strong></span>
              <span className="opacity-50">·</span>
              <span>👥 <strong>{summary.count}명</strong></span>
            </div>
            {messagesToShow.length > 0 && (
              <div className={`border-t ${t.chipBorder} pt-2 mt-2 space-y-1`}>
                <p className={`text-[11px] font-semibold ${t.chipText} opacity-75 uppercase tracking-wide mb-1`}>최근 감사</p>
                {messagesToShow.map((r, i) => (
                  <div key={i} className={`flex justify-between items-center text-xs ${t.chipText}`}>
                    <span className="italic flex-1 mr-2">
                      "{r.message && r.message.length > 60 ? r.message.slice(0, 60) + '…' : r.message}"
                    </span>
                    <span className="font-semibold whitespace-nowrap">+{r.amount}P</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {renderModal()}
      </div>
    );
  }

  // ─── Render: panel variant (Content) ───────────────────────────────────────

  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-5 ${className ?? ''}`}>
      <div className="flex items-center justify-between mb-3">
        {panelTitle ? (
          <h2 className="text-sm font-semibold text-slate-700">{panelTitle}</h2>
        ) : (
          <span />
        )}
        {showSummary && hasSummary && summary && (
          <span className={`text-xs ${t.chipText} ${t.chipBg} ${t.chipBorder} border px-2.5 py-1 rounded-full`}>
            🎁 {summary.totalAmount.toLocaleString()}P · {summary.count}명
          </span>
        )}
      </div>

      {canInteract ? (
        <button
          type="button"
          onClick={openModal}
          className={`w-full py-2.5 ${t.chipBg} hover:opacity-90 border ${t.chipBorder} ${t.chipText} text-sm font-medium rounded-lg transition-colors mb-4`}
        >
          {buttonLabel}
        </button>
      ) : !canSend && disabledReason ? (
        <p className="text-xs text-slate-400 mb-4">{disabledReason}</p>
      ) : null}

      {showRecent && messagesToShow.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">최근 감사 메시지</p>
          <div className="space-y-1.5">
            {messagesToShow.map((r, i) => (
              <div key={i} className={`flex justify-between items-center text-xs ${t.chipBg} rounded px-3 py-1.5`}>
                <span className={`italic ${t.chipText} flex-1 mr-2 truncate`}>"{r.message}"</span>
                <span className={`font-semibold ${t.chipText} whitespace-nowrap`}>+{r.amount}P</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {renderModal()}
    </div>
  );

  // ─── Modal (variant 공통) ──────────────────────────────────────────────────

  function renderModal() {
    if (!showModal) return null;
    const amt = Number(amount);
    const canSubmit = !sending && amt > 0;

    return (
      <div
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4"
        onClick={closeModal}
      >
        <div
          className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-base font-bold text-slate-800 mb-1">🎁 감사 포인트 보내기</h3>
          <p className="text-xs text-slate-500 mb-4">감사의 마음을 포인트로 전달할 수 있습니다.</p>

          <div className="flex gap-2 mb-3">
            {presetAmounts.map((v) => {
              const active = amount === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(v)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    active
                      ? `${t.presetActiveBg} ${t.presetActiveBorder} ${t.presetActiveText}`
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {v}P
                </button>
              );
            })}
          </div>

          {allowCustomAmount && (
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '') setAmount('');
                else setAmount(Math.max(1, parseInt(v, 10) || 1));
              }}
              min={1}
              placeholder="직접 입력"
              className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-3 focus:outline-none ${t.focusRing}`}
            />
          )}

          {allowMessage && (
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="감사 메시지 (선택)"
              rows={2}
              className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-4 resize-none focus:outline-none ${t.focusRing}`}
            />
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={closeModal}
              disabled={sending}
              className="flex-1 py-2.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSubmit}
              className={`flex-1 py-2.5 ${t.primaryBg} ${t.primaryText} text-sm font-medium rounded-lg ${t.primaryHoverBg} disabled:opacity-50 transition-colors`}
            >
              {sending ? '전송 중...' : amt > 0 ? `${amt}P 보내기` : '보내기'}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
