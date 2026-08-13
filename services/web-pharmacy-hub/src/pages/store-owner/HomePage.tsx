/**
 * Store Owner Home — Pharmacy-Hub 매장 대시보드
 *
 * WO-PHARMACY-HUB-STORE-HOME-DASHBOARD-V1
 * WO-O4O-MY-STORE-HOME-CROSSSERVICE-COMMONIZATION-V1
 *
 * 데이터 원천 — 기존 GET /pharmacy-hub/store-owner/dashboard 계약을 그대로 사용한다.
 * StoreHomeShell은 화면 블록 배치만 담당하고 API·권한·업무 규칙·서비스 문구는 이 파일에 유지한다.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShoppingCart, Receipt, Store, AlertTriangle } from 'lucide-react';
import { getUserDisplayName } from '@o4o/account-ui';
import { StoreHomeShell } from '@o4o/store-ui-core';
import {
  fetchStoreDashboard,
  errorMessage,
  errorStatus,
  type StoreDashboard,
} from '../../lib/api/pharmacyHubOrders';
import { orderStatusBadge, won } from '../../lib/orderStatus';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_LABELS, SERVICE_KEY, BRAND } from '../../config/service';

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

const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString('ko-KR') : '-');
const fmtDateTime = (v?: string | null) =>
  v ? new Date(v).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) : '-';

function SummaryCard({
  label,
  value,
  unit,
  hint,
  tone = 'text-slate-900',
}: {
  label: string;
  value: number | string;
  unit?: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>
        {value}
        {unit ? <span className="ml-1 text-sm font-medium text-slate-500">{unit}</span> : null}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default function StoreOwnerHomePage() {
  const { user } = useAuth();
  const [data, setData] = useState<StoreDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const result = await fetchStoreDashboard();
        if (alive) setData(result);
      } catch (err) {
        if (!alive) return;
        const status = errorStatus(err);
        setError(
          status === 401
            ? '로그인이 필요합니다.'
            : status === 403
              ? `${BRAND.name} 약국 경영자 승인이 완료된 계정만 이용할 수 있습니다.`
              : errorMessage(err, '매장 요약 정보를 불러오지 못했습니다.'),
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const store = data?.store;
  const membership = data?.membership;
  const orders = data?.orders;
  const status = membership?.status ?? 'none';
  const roleLabel = membership?.roleType
    ? ROLE_LABELS[`${SERVICE_KEY}:${membership.roleType}`] ?? membership.roleType
    : '약국 경영자';

  const storeName =
    store?.status === 'connected'
      ? store.name || '이름 없는 매장'
      : store?.status === 'ambiguous'
        ? '매장 확인 필요'
        : '매장 정보 미연결';

  return (
    <div className="space-y-6">
      <StoreHomeShell
        headerSlot={
          <header>
            <h1 className="text-xl font-bold text-slate-900">매장 경영 홈</h1>
            <p className="mt-1 text-sm text-slate-600">
              공급 상품 탐색부터 주문·결제까지 이 화면에서 이어서 진행할 수 있습니다.
            </p>
          </header>
        }
        bannerSlot={
          error ? (
            <div
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              role="alert"
            >
              {error}
            </div>
          ) : null
        }
        statusSlot={
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                    <Store className="h-4 w-4" />
                  </span>
                  <p className="truncate text-base font-semibold text-slate-900">
                    {loading ? '불러오는 중…' : error ? '매장 정보 확인 불가' : storeName}
                  </p>
                </div>
                <p className="mt-1 text-sm text-slate-500">{user ? getUserDisplayName(user) : ''}</p>
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

            {!loading && !error && store?.status === 'not_connected' && (
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                {BRAND.name} 매장 조직이 아직 연결되지 않았습니다. 상품 조회·장바구니·주문은 그대로
                이용할 수 있으며, 매장 정보 연결은 운영자 확인 후 반영됩니다.
              </p>
            )}
            {!loading && !error && store?.status === 'ambiguous' && (
              <p
                className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                role="alert"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  연결된 {BRAND.name} 매장 조직이 {store.candidateCount}개입니다. 표시할 매장을 임의로
                  선택하지 않습니다. 운영자에게 매장 연결 정리를 요청해 주세요.
                  <span className="ml-1 font-mono text-xs">({store.errorCode})</span>
                </span>
              </p>
            )}

            {!error && (
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-slate-500">역할</dt>
                  <dd className="text-slate-800">{roleLabel}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-slate-500">승인 일시</dt>
                  <dd className="text-slate-800">
                    {loading ? '…' : fmtDate(membership?.approvedAt)}
                  </dd>
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
        }
        summarySlot={
          !error ? (
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-50"
                  />
                ))
              ) : (
                <>
                  <SummaryCard label="장바구니 상품" value={data?.cart.itemCount ?? 0} unit="종" />
                  <SummaryCard label="전체 주문" value={orders?.total ?? 0} unit="건" />
                  <SummaryCard
                    label="결제 대기"
                    value={orders?.awaitingPayment ?? 0}
                    unit="건"
                    tone={orders?.awaitingPayment ? 'text-amber-700' : 'text-slate-900'}
                  />
                  <SummaryCard
                    label="공급자 처리·배송"
                    value={orders?.inFulfillment ?? 0}
                    unit="건"
                    hint="결제가 완료된 주문"
                    tone={orders?.inFulfillment ? 'text-emerald-700' : 'text-slate-900'}
                  />
                </>
              )}
            </section>
          ) : null
        }
        activitySlot={
          <>
            {!loading && !error && (orders?.awaitingPayment ?? 0) > 0 && (
              <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">결제가 필요한 주문이 있습니다</p>
                <p className="mt-1 text-sm text-amber-800">
                  결제 대기 {orders?.awaitingPayment}건 — 결제를 완료해야 공급자에게 전달됩니다.
                </p>
                <Link
                  to="/store-owner/orders"
                  className="mt-3 inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                >
                  주문 내역에서 처리하기
                </Link>
              </section>
            )}

            {!error && (
              <section className="rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                  <h2 className="text-sm font-semibold text-slate-900">최근 주문</h2>
                  <Link to="/store-owner/orders" className="text-sm text-teal-700 hover:underline">
                    전체 보기
                  </Link>
                </div>

                {loading ? (
                  <p className="px-5 py-6 text-sm text-slate-500">불러오는 중…</p>
                ) : (orders?.recent.length ?? 0) === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <p className="text-sm text-slate-500">아직 주문 내역이 없습니다.</p>
                    <Link
                      to="/store-owner/products"
                      className="mt-3 inline-block rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                    >
                      공급 상품 둘러보기
                    </Link>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {orders!.recent.map((order) => {
                      const badge = orderStatusBadge({
                        status: order.status,
                        paymentStatus: order.paymentStatus,
                        supplierNotified: order.supplierNotified,
                      });
                      return (
                        <li key={order.orderId}>
                          <Link
                            to={`/store-owner/orders/${order.orderId}`}
                            className="block px-5 py-3 hover:bg-slate-50"
                          >
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-semibold text-slate-900">
                                {order.orderNumber}
                              </span>
                              <span className={`shrink-0 rounded px-2 py-0.5 text-xs ${badge.tone}`}>
                                {badge.text}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-slate-500">
                              <span>
                                상품 {order.itemCount}종 · {fmtDateTime(order.createdAt)}
                              </span>
                              <span className="font-semibold text-slate-900">
                                {won(order.totalAmount)}
                              </span>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}
          </>
        }
        quickActionsSlot={
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
        }
      />
    </div>
  );
}
