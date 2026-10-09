/**
 * Neture 약국 매장 화면 공용 조각 — WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { WORKSPACE_PATHS } from '../../config/workspace';
import { useUnifiedStore } from '../../contexts/StoreContext';

/** 내 매장 아래 약국 화면 경로(상대 subPath). storeMenu · App 라우트 · 화면 링크가 같은 값을 쓴다. */
export const PHARMACY_STORE_PATHS = {
  membership: '/pharmacy/membership',
  semiFranchises: '/pharmacy/semi-franchises',
  supply: '/pharmacy/supply',
  contents: '/pharmacy/contents',
  recruitments: '/pharmacy/recruitments',
  cart: '/pharmacy/cart',
  orders: '/pharmacy/orders',
} as const;

export const pharmacyStorePath = (key: keyof typeof PHARMACY_STORE_PATHS) =>
  `${WORKSPACE_PATHS.myStore}${PHARMACY_STORE_PATHS[key]}`;

export const MEMBERSHIP_STATUS_LABEL: Record<string, string> = {
  pending: '승인 대기',
  active: '이용 중',
  rejected: '반려',
  suspended: '정지',
  terminated: '종료',
};

const STATUS_TONE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  suspended: 'bg-slate-100 text-slate-600 border-slate-200',
  terminated: 'bg-slate-100 text-slate-600 border-slate-200',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function StatusBadge({ status, label }: { status: string | null | undefined; label?: string }) {
  const s = status ?? '';
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_TONE[s] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
      {label ?? MEMBERSHIP_STATUS_LABEL[s] ?? (s || '-')}
    </span>
  );
}

export const SUPPLY_KIND_LABEL: Record<string, string> = {
  default: '기본 공급',
  proposal: '공급 제안',
  event: '이벤트',
  recruitment: '모집 참여',
};

export function formatWon(v: number | string | null | undefined): string {
  const n = Number(v);
  return Number.isFinite(n) ? `${n.toLocaleString('ko-KR')}원` : '-';
}

export function formatDate(v: string | null | undefined): string {
  if (!v) return '-';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('ko-KR');
}

export function PharmacyPage({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error' | 'warn'; children: ReactNode }) {
  const cls = tone === 'error'
    ? 'border-red-200 bg-red-50 text-red-700'
    : tone === 'warn'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-slate-200 bg-slate-50 text-slate-700';
  return <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${cls}`} role={tone === 'error' ? 'alert' : undefined}>{children}</div>;
}

export const btn = {
  primary: 'rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50',
  secondary: 'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50',
  danger: 'rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50',
};

/**
 * 약국(Neture 약국 매장) 문맥에서만 여는 화면 — 퇴역한 서비스 문맥에서는 안내만 한다.
 * 권한 판정은 서버(내 매장(약국) 신청 원장 게이트)가 한다. 이 컴포넌트는 표시 분기다.
 */
export function PharmacyContextOnly({ children }: { children: ReactNode }) {
  const { effectiveServiceKey } = useUnifiedStore();
  if (effectiveServiceKey === 'kpa-society') return <>{children}</>;
  return (
    <main className="center-card"><section className="card" data-testid="pharmacy-context-only">
      <h1>약국 매장 전용 화면입니다</h1>
      <p>이 화면은 Neture 약국 매장에서 이용할 수 있습니다.</p>
      <Link className="button-link" to={WORKSPACE_PATHS.myStore}>내 매장으로 돌아가기</Link>
    </section></main>
  );
}
