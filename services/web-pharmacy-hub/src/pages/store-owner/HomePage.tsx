/**
 * Store Owner Home — Pharmacy-Hub 매장 대시보드
 *
 * WO-PHARMACY-HUB-STORE-HOME-DASHBOARD-V1
 *
 * W3 최소 셸 홈을 실제 사용 가능한 매장 대시보드로 보완한다.
 * 셸(StoreDashboardLayout · 사이드바 · 메뉴)과 기존 B2B 기능은 그대로 두고,
 * 이미 존재하는 매장·장바구니·주문 데이터를 요약해서 보여준다.
 *
 * 데이터 원천 — 단일 read-only 요약 계약 하나만 호출한다:
 *   GET /pharmacy-hub/store-owner/dashboard
 *     약국명   = organizations.name (Pharmacy-Hub active enrollment 조직으로만 해석)
 *     이용 상태 = service_memberships
 *     장바구니  = store_cart_items
 *     주문      = checkout_orders
 *   users.businessInfo 는 매장명 SSOT 로 쓰지 않는다.
 *
 * 하드코딩 수치·임시 값은 두지 않는다. 계산할 수 없는 지표는 카드로 만들지 않는다.
 * 조회 실패는 정상 0건으로 삼키지 않는다 — 실패는 오류 상태로 명시한다.
 *
 * WO-O4O-MY-STORE-HOME-CROSSSERVICE-COMMONIZATION-V1:
 *   4서비스 "내 매장 홈" 공통화의 4번째 소비처. 헤더 · 오류 배너 · 매장 상태 · 처리 필요 신호 ·
 *   요약 지표 · 최근 활동 패널을 @o4o/store-ui-core canonical 파트로 위임한다.
 *   route · 권한 · API 계약 · 업무 의미는 변경하지 않는다 (구조/동작만 공통).
 *
 * 결제 화면(/store-owner/payment)으로는 홈에서 직접 링크하지 않는다.
 * 해당 화면은 진입과 동시에 결제 세션 준비(prepare)를 호출하므로,
 * 홈의 "처리 필요" 안내는 주문 내역으로 보내고 결제 개시는 사용자가 그곳에서 선택한다.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShoppingCart, Receipt, Store, AlertTriangle } from 'lucide-react';
import {
  StoreHomeShell,
  StoreHomeMetricGrid,
  StoreHomeSignalList,
  StoreHomeActivityPanel,
  StoreHomeShortcutGrid,
} from '@o4o/store-ui-core';
import type {
  StoreHomeMetricItem,
  StoreHomeSignalItem,
  StoreHomeShortcutItem,
} from '@o4o/store-ui-core';
import { getUserDisplayName } from '@o4o/account-ui';
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

// WO-O4O-MY-STORE-HOME-SHORTCUT-GRID-CROSSSERVICE-COMMONIZATION-V1:
//   항목·문구·경로는 종전 그대로, 렌더만 공통 StoreHomeShortcutGrid 로 위임한다.
const SHORTCUTS: StoreHomeShortcutItem[] = [
  {
    to: '/store-owner/products',
    label: '공급 상품',
    description: '공급자가 제공하는 상품을 살펴보고 장바구니에 담습니다.',
    icon: <Package className="h-5 w-5" />,
  },
  {
    to: '/store-owner/cart',
    label: '장바구니',
    description: '담아 둔 상품을 확인하고 주문을 생성합니다.',
    icon: <ShoppingCart className="h-5 w-5" />,
  },
  {
    to: '/store-owner/orders',
    label: '주문 내역',
    description: '주문 상태와 결제 진행 상황을 확인합니다.',
    icon: <Receipt className="h-5 w-5" />,
  },
];

const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString('ko-KR') : '-');
const fmtDateTime = (v?: string | null) =>
  v ? new Date(v).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) : '-';

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

  // 요약 지표 — 항목·문구·집계는 서버 계약 그대로, 그리드/스켈레톤만 공통
  const metricItems: StoreHomeMetricItem[] = [
    { key: 'cart', label: '장바구니 상품', value: data?.cart.itemCount ?? 0, unit: '종' },
    { key: 'orders-total', label: '전체 주문', value: orders?.total ?? 0, unit: '건' },
    {
      key: 'awaiting-payment',
      label: '결제 대기',
      value: orders?.awaitingPayment ?? 0,
      unit: '건',
      valueClassName: orders?.awaitingPayment ? 'text-amber-700' : 'text-slate-900',
    },
    {
      key: 'in-fulfillment',
      label: '공급자 처리·배송',
      value: orders?.inFulfillment ?? 0,
      unit: '건',
      hint: '결제가 완료된 주문',
      valueClassName: orders?.inFulfillment ? 'text-emerald-700' : 'text-slate-900',
    },
  ];

  // 처리 필요 신호 — 실제 집계값이 있을 때만. 렌더는 공통 StoreHomeSignalList.
  const signalItems: StoreHomeSignalItem[] =
    !loading && !error && (orders?.awaitingPayment ?? 0) > 0
      ? [
          {
            key: 'awaiting-payment',
            tone: 'amber',
            message: '결제가 필요한 주문이 있습니다',
            description: `결제 대기 ${orders?.awaitingPayment}건 — 결제를 완료해야 공급자에게 전달됩니다.`,
            to: '/store-owner/orders',
          },
        ]
      : [];

  return (
    <div className="space-y-6">
      <StoreHomeShell
        title="매장 경영 홈"
        subtitle="공급 상품 탐색부터 주문·결제까지 이 화면에서 이어서 진행할 수 있습니다."
        loading={loading}
        bannerSlot={
          error ? (
            <div
              className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              role="alert"
            >
              {error}
            </div>
          ) : null
        }
        statusSlot={
          <div className="mb-6">
          {/* 매장 · 가입 상태 */}
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
          </div>
        }
        signalsSlot={<StoreHomeSignalList items={signalItems} />}
        metricsSlot={
          !error ? (
            <div className="mb-6">
              <StoreHomeMetricGrid
                items={metricItems}
                variant="label-top"
                loading={loading}
                columnsClassName="sm:grid-cols-2 lg:grid-cols-4"
              />
            </div>
          ) : null
        }
      >
        <div className="space-y-6">
        {/* 최근 주문 — 패널 chrome(제목/전체보기/로딩/빈 상태)은 공통 StoreHomeActivityPanel */}
        {!error && (
          <StoreHomeActivityPanel
            title="최근 주문"
            moreLabel="전체 보기"
            moreTo="/store-owner/orders"
            padded={false}
            loading={loading}
            isEmpty={(orders?.recent.length ?? 0) === 0}
            emptyContent={
              <>
                <p className="text-sm text-slate-500 m-0">아직 주문 내역이 없습니다.</p>
                <Link
                  to="/store-owner/products"
                  className="mt-3 inline-block rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white no-underline hover:bg-teal-700"
                >
                  공급 상품 둘러보기
                </Link>
              </>
            }
          >
            <ul className="divide-y divide-slate-100 m-0 p-0 list-none">
              {orders?.recent.map((order) => {
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
          </StoreHomeActivityPanel>
        )}

        {/* 바로가기 */}
        <StoreHomeShortcutGrid items={SHORTCUTS} aria-label="바로가기" />
        </div>
      </StoreHomeShell>
    </div>
  );
}
