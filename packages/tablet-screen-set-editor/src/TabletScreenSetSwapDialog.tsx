/**
 * TabletScreenSetSwapDialog — 코너 "화면 바꾸기" 공통 다이얼로그 (운영 B)
 *
 * WO-O4O-PHARMACYHUB-TABLET-CANONICAL-ADOPTION-AND-PUBLIC-KIOSK-CLOSURE-V1 §3
 *
 * 저장된 화면 세트 중 하나를 이 코너에 적용하거나, 적용을 해제한다.
 * 순수 표시 컴포넌트 — fetch·라우터·serviceKey 를 모른다. 적용 실행은 `onApply` 로 위임한다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 용어 규칙(KPA canonical 계승)
 *   내부 용어(Screen Set / current / 연결 / 블록)를 매장 화면에 노출하지 않는다.
 *   화면 이름 + "지금 사용 중" / "이 화면으로 바꾸기" 만 쓴다.
 *
 * 적용 가능 조건
 *   서버가 draft 적용을 409(SCREEN_SET_NOT_ACTIVE)로 막는다 → 고를 수 없는 것을 목록에 올려
 *   실패시키지 않는다. 호출부가 `sets` 를 적용 가능한 것만 넘기거나, `disabledReason` 을 준다.
 */

import { useMemo, useState, type ReactNode } from 'react';

export interface SwapDialogScreenSet {
  id: string;
  name: string;
  /** 화면 유형 라벨(사람이 읽는 문자열). 없으면 미표시. */
  templateLabel?: string | null;
  /** 지정 시 선택 불가 + 사유 표시. */
  disabledReason?: string | null;
}

export interface TabletScreenSetSwapDialogLabels {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  inUse: string;
  apply: string;
  clear: string;
  clearHint: string;
  empty: string;
  close: string;
}

export const DEFAULT_SWAP_DIALOG_LABELS: TabletScreenSetSwapDialogLabels = {
  title: '화면 바꾸기',
  subtitle: '이 코너에서 사용할 화면을 고르세요.',
  searchPlaceholder: '화면 이름 검색',
  inUse: '지금 사용 중',
  apply: '이 화면으로 바꾸기',
  clear: '화면 내리기',
  clearHint: '적용을 해제해도 저장된 화면은 남습니다.',
  empty: '적용할 수 있는 화면이 없습니다.',
  close: '닫기',
};

export interface TabletScreenSetSwapDialogProps {
  cornerName: string;
  sets: SwapDialogScreenSet[];
  currentSetId?: string | null;
  /** setId=null 이면 적용 해제. 실패는 호출부가 표면화한다. */
  onApply: (setId: string | null) => Promise<void> | void;
  onClose: () => void;
  /** 적용 해제 버튼 노출 여부(현재 적용된 화면이 있을 때만 의미 있음). */
  allowClear?: boolean;
  labels?: Partial<TabletScreenSetSwapDialogLabels>;
  /** primary 버튼 Tailwind class. */
  accentButton?: string;
  footerSlot?: ReactNode;
}

export function TabletScreenSetSwapDialog({
  cornerName,
  sets,
  currentSetId,
  onApply,
  onClose,
  allowClear = true,
  labels,
  accentButton = 'bg-teal-600 hover:bg-teal-700',
  footerSlot,
}: TabletScreenSetSwapDialogProps) {
  const L = { ...DEFAULT_SWAP_DIALOG_LABELS, ...labels };
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sets;
    return sets.filter((s) => s.name.toLowerCase().includes(q));
  }, [sets, query]);

  const run = async (setId: string | null) => {
    setBusyId(setId ?? '__clear__');
    try {
      await onApply(setId);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[900] flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${cornerName} ${L.title}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-slate-900">
              {cornerName} · {L.title}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">{L.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-50"
          >
            {L.close}
          </button>
        </div>

        {sets.length > 4 && (
          <div className="border-b border-slate-100 px-5 py-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={L.searchPlaceholder}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">{L.empty}</p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((s) => {
                const isCurrent = s.id === currentSetId;
                const disabled = Boolean(s.disabledReason) || busyId !== null;
                return (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{s.name}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        {s.templateLabel && <span>{s.templateLabel}</span>}
                        {isCurrent && (
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700">
                            {L.inUse}
                          </span>
                        )}
                        {s.disabledReason && <span className="text-amber-600">{s.disabledReason}</span>}
                      </p>
                    </div>
                    {!isCurrent && (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => run(s.id)}
                        className={`min-h-[40px] flex-shrink-0 rounded-xl px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 ${accentButton}`}
                      >
                        {busyId === s.id ? '적용 중…' : L.apply}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {(allowClear && currentSetId) || footerSlot ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
            <span className="text-xs text-slate-400">{L.clearHint}</span>
            <div className="flex items-center gap-2">
              {footerSlot}
              {allowClear && currentSetId && (
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => run(null)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {L.clear}
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
