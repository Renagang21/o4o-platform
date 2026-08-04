/**
 * Store Owner Home — Pharmacy-Hub 매장 경영 홈 (최소 셸)
 *
 * WO-PHARMACY-HUB-STORE-SHELL-AND-MENU-CONFIG-V1
 *
 * 범위: 매장 식별 정보 + 가입/매장 상태 + 실기능 바로가기 3개.
 * 상세 통계·최근 활동·AI 요약은 본 WO 범위 밖(W4 매장 대시보드).
 *
 * 데이터 원천은 이미 존재하는 계약만 사용한다 (backend 무변경):
 *   - GET /pharmacy-hub/join/status  → 가입 상태·역할·승인 일시
 *   - AuthContext user               → 계정 표시명/이메일
 * 약국명(사업자 상호)·매장 프로필은 현재 Pharmacy-Hub API 가 노출하지 않으므로
 * 표시하지 않는다. 신규 endpoint 신설은 본 WO 의 변경 금지 항목이다.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShoppingCart, Receipt } from 'lucide-react';
import { api } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_LABELS, SERVICE_KEY } from '../../config/service';

interface JoinStatus {
  status: string;
  roleType: string | null;
  approvedAt?: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  none: '미신청',
  pending: '승인 대기',
  active: '이용 중',
  rejected: '반려',
  suspended: '정지',
  withdrawn: '탈퇴',
};

const STATUS_TONE: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

const SHORTCUTS = [
  {
    to: '/store-owner/products',
    label: '공급 상품',
    desc: '공급자가 제공하는 상품을 살펴보고 장바구니에 담습니다.',
    Icon: Package,
  },
  {
    to: '/store-owner/cart',
    label: '장바구니',
    desc: '담아 둔 상품을 확인하고 주문을 생성합니다.',
    Icon: ShoppingCart,
  },
  {
    to: '/store-owner/orders',
    label: '주문 내역',
    desc: '주문 상태와 결제 진행 상황을 확인합니다.',
    Icon: Receipt,
  },
];

const fmt = (v?: string | null) => (v ? new Date(v).toLocaleDateString('ko-KR') : '-');

export default function StoreOwnerHomePage() {
  const { user } = useAuth();
  const [join, setJoin] = useState<JoinStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get('/pharmacy-hub/join/status');
        if (alive) setJoin(res.data?.data ?? null);
      } catch {
        // 조회 실패를 정상 0건으로 삼키지 않는다 — 상태 카드에 실패를 명시한다.
        if (alive) setError('가입 상태를 불러오지 못했습니다.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const status = join?.status ?? 'none';
  const roleLabel = join?.roleType
    ? ROLE_LABELS[`${SERVICE_KEY}:${join.roleType}`] ?? join.roleType
    : '약국 경영자';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-slate-900">매장 경영 홈</h1>
        <p className="mt-1 text-sm text-slate-600">
          공급 상품 탐색부터 주문·결제까지 이 화면에서 이어서 진행할 수 있습니다.
        </p>
      </header>

      {/* 매장/가입 상태 */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-slate-900">
              {user?.name || user?.email || '매장 경영자'}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">{user?.email}</p>
          </div>
          {loading ? (
            <span className="text-sm text-slate-500">확인 중…</span>
          ) : error ? (
            <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
              상태 조회 실패
            </span>
          ) : (
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                STATUS_TONE[status] ?? 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              {STATUS_LABEL[status] ?? status}
            </span>
          )}
        </div>

        {error ? (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        ) : (
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-slate-500">역할</dt>
              <dd className="text-slate-800">{roleLabel}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-slate-500">승인 일시</dt>
              <dd className="text-slate-800">{loading ? '…' : fmt(join?.approvedAt)}</dd>
            </div>
          </dl>
        )}

        <Link
          to="/join/status"
          className="mt-4 inline-block text-sm font-medium text-teal-700 hover:underline"
        >
          가입 상태 상세 보기
        </Link>
      </section>

      {/* 바로가기 */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SHORTCUTS.map(({ to, label, desc, Icon }) => (
          <Link
            key={to}
            to={to}
            className="group rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-teal-300 hover:bg-teal-50/40"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <Icon className="h-5 w-5" />
            </span>
            <p className="mt-3 font-semibold text-slate-900 group-hover:text-teal-800">{label}</p>
            <p className="mt-1 text-sm text-slate-600">{desc}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
