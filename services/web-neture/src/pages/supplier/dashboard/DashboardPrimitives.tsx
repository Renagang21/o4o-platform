import { Link } from 'react-router-dom';

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

export function KpiLink({
  label,
  value,
  to,
  accent,
  small,
}: {
  label: string;
  value: string;
  to: string;
  accent?: boolean;
  small?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`block rounded-lg p-4 transition-colors ${
        accent
          ? 'bg-slate-800 text-white hover:bg-slate-700'
          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
      }`}
    >
      <p
        className={`text-xs font-medium mb-1 ${accent ? 'text-slate-300' : 'text-slate-500'}`}
      >
        {label}
      </p>
      <p className={`${small ? 'text-base' : 'text-2xl'} font-bold break-all`}>
        {value}
      </p>
    </Link>
  );
}

/**
 * WO-O4O-NETURE-SUPPLIER-CONTENT-DISTRIBUTION-LOAD-ERROR-CONTRACT-V1:
 * 영역 단위 조회 실패 표시 + 해당 API 만 재호출하는 다시 시도.
 * 대시보드 전체를 오류 화면으로 바꾸지 않는다.
 */
export function AreaLoadError({
  label,
  onRetry,
  tone = 'slate',
}: {
  label: string;
  onRetry: () => void;
  tone?: 'slate' | 'violet' | 'amber';
}) {
  const text =
    tone === 'violet'
      ? 'text-violet-700'
      : tone === 'amber'
        ? 'text-amber-800'
        : 'text-slate-600';
  return (
    <div className="flex flex-wrap items-center gap-2 py-1">
      <span className={`text-xs ${text}`}>{label}</span>
      <button
        onClick={onRetry}
        className={`text-xs font-medium underline ${text}`}
      >
        다시 시도
      </button>
    </div>
  );
}

export function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-sm text-slate-500 truncate">{label}</dt>
      <dd className="text-sm font-semibold text-slate-800 shrink-0">{value}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Constants & helpers                                                */
/* ------------------------------------------------------------------ */
