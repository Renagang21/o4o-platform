import { StoreAiSlot } from '../../components/store/StoreAiPlacement';
import { useState } from "react";
import { Link, useLocation, useOutletContext } from "react-router-dom";
import { BookOpen, Package, QrCode, BarChart3 } from "lucide-react";
import {
  StoreHomeShell,
  StoreHomeMetricGrid,
  StoreHomeSignalList,
  StoreHomeStateView,
  type StoreHomeMetricItem,
  type StoreHomeSignalItem,
} from "@o4o/store-ui-core";
import { useStoreOperationScope } from "../../hooks/useStoreOperationScope";
import { storeWorkspaceBase } from "../../components/store/StoreWorkflowNavigation";
import type { StoreWorkspaceOutlet } from "../../components/layouts/StoreWorkspaceShell";
import { getRecentScans } from "../../api/storeAnalytics";
import { useStoreResource } from "./hooks/useStoreResource";
import { useStoreHomeOverview } from "./operations/useStoreHomeOverview";
import { StoreOverviewExplanation } from '../../components/store/StoreOverviewExplanation';

export function StoreHomePage() {
  const { key } = useStoreOperationScope();
  return <StoreHomeSession key={key} />;
}
function StoreHomeSession() {
  const { pathname } = useLocation();
  const base = storeWorkspaceBase(pathname);
  const [showActivity, setShowActivity] = useState(false);
  const config = useOutletContext<StoreWorkspaceOutlet | undefined>()?.config;
  const product = config?.menuSections
    ?.flatMap((section) => section.items)
    .find((item) => item.key === "my-products");
  const {
    analytics,
    libraryCount,
    productCount,
    signals,
    loading,
    noStore,
    unavailable,
    reload,
  } = useStoreHomeOverview();
  if (noStore)
    return (
      <StoreHomeStateView
        state="empty"
        title="매장을 선택해 주세요"
        description="선택한 매장의 업무를 시작할 수 있습니다."
      />
    );

  const signalItems: StoreHomeSignalItem[] = [];
  if (signals?.newOrders)
    signalItems.push({
      key: "orders",
      tone: "amber",
      message: `신규 주문 ${signals.newOrders}건 대기`,
      to: "/work/kpa-society/commerce/orders",
    });
  if (signals?.pendingTabletRequests)
    signalItems.push({
      key: "requests",
      tone: "blue",
      message: `상담 요청 ${signals.pendingTabletRequests}건 대기`,
      to: `${base}/requests`,
    });
  const metrics: StoreHomeMetricItem[] = [
    {
      key: "library",
      label: "직접 등록·제작 자료",
      value: libraryCount ?? undefined,
      icon: <BookOpen size={20} />,
      to: `${base}/library/resources`,
    },
    {
      key: "qr",
      label: "활성 QR",
      value: analytics?.activeQrCount ?? undefined,
      icon: <QrCode size={20} />,
      to: `${base}/marketing/qr?workspace=use`,
    },
    {
      key: "products",
      label: "진열 중인 O4O 제품",
      value: productCount ?? undefined,
      icon: <Package size={20} />,
    },
    {
      key: "scans",
      label: "이번주 스캔",
      value: analytics?.weeklyScans?.toLocaleString() ?? undefined,
      icon: <BarChart3 size={20} />,
    },
  ];
  return (
    <div className="max-w-[1100px]">
      <StoreHomeShell
        title="매장 대시보드"
        subtitle="선택한 매장의 확인할 일과 이용 현황입니다."
        loading={loading}
        onRefresh={reload}
        statusSlot={
          <>
            <StoreAiSlot />
            <StoreOverviewExplanation />
            <nav aria-label="매장 빠른 작업" className="mb-4 flex flex-wrap gap-2 text-sm">
              {product && <Link className="min-h-11 content-center rounded-lg border bg-white px-3" to={`${base}${product.subPath}`}>상품 보기</Link>}
              <Link className="min-h-11 content-center rounded-lg border bg-white px-3" to={`${base}/workspace/studio`}>매장 컨텐츠</Link>
              <Link className="min-h-11 content-center rounded-lg border bg-white px-3" to={`${base}/workspace/use`}>운영 확인</Link>
            </nav>
          </>
        }
        signalsSlot={
          <section
            className="mb-6 rounded-xl border border-slate-200 bg-white p-5"
            aria-label="확인할 일"
          >
            <h2 className="mb-3 font-semibold text-slate-900">확인할 일</h2>
            {loading ? (
              <p role="status" className="text-sm text-slate-500">
                매장 현황을 불러오는 중입니다. 위에서 업무를 바로 시작할 수
                있습니다.
              </p>
            ) : (
              <>
                {unavailable.length > 0 && (
                  <div
                    role="alert"
                    className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
                  >
                    <p>
                      확인하지 못한 현황: {unavailable.join(" · ")}. 해당 항목은
                      0건으로 표시하지 않습니다.
                    </p>
                    <button
                      type="button"
                      onClick={() => void reload()}
                      className="mt-2 min-h-11 underline"
                    >
                      현황 다시 시도
                    </button>
                  </div>
                )}
                {signals &&
                  (signalItems.length ? (
                    <StoreHomeSignalList items={signalItems} />
                  ) : Object.values(signals).some(value => value === 0) ? (
                    <p role="status" className="text-sm text-slate-500">
                      확인된 업무에는 대기 항목이 없습니다.
                    </p>
                  ) : null)}
              </>
            )}
          </section>
        }
        metricsSlot={
          <section
            className="rounded-xl border border-slate-200 bg-white p-5"
            aria-label="핵심 현황"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-900">핵심 현황</h2>
              <Link
                to={`${base}/analytics/marketing`}
                className="text-sm font-medium text-teal-700 underline"
              >
                상세 이용 현황
              </Link>
            </div>
            <StoreHomeMetricGrid
              items={metrics}
              variant="icon-centered"
              loading={loading}
            />
            <p className="mt-4 text-xs text-slate-500">
              게시 설정·실제 배치·기기 동작은 서로 다릅니다. 매장 운영에서 각각
              확인하세요.
            </p>
          </section>
        }
      >
        <details
          className="mt-5 rounded-xl border border-slate-200 bg-white p-5"
          onToggle={(event) => setShowActivity(event.currentTarget.open)}
        >
          <summary className="min-h-11 cursor-pointer content-center text-sm font-medium text-slate-700">
            최근 QR 활동 보기
          </summary>
          {showActivity && <RecentQrActivity />}
        </details>
      </StoreHomeShell>
    </div>
  );
}

async function loadRecentActivity() {
  const response = await getRecentScans();
  if (!response.success || !Array.isArray(response.data))
    throw new Error("Invalid activity");
  return response.data;
}
function RecentQrActivity() {
  const { data, loading, error, reload } = useStoreResource(
    loadRecentActivity,
    [],
  );
  if (loading)
    return (
      <p role="status" className="mt-3 text-sm text-slate-500">
        최근 활동을 불러오는 중입니다.
      </p>
    );
  if (error)
    return (
      <div role="alert" className="mt-3 text-sm text-amber-900">
        최근 활동을 확인하지 못했습니다.{" "}
        <button
          type="button"
          onClick={() => void reload()}
          className="min-h-11 underline"
        >
          최근 활동 다시 시도
        </button>
      </div>
    );
  return (
    <div className="mt-3 space-y-2 text-sm text-slate-600">
      {data.length === 0 ? (
        <p>최근 활동 기록이 없습니다</p>
      ) : (
        data.slice(0, 6).map((scan, index) => (
          <div
            key={`${scan.createdAt}:${scan.qrSlug}:${index}`}
            className="flex flex-wrap justify-between gap-2 rounded-lg bg-slate-50 p-3"
          >
            <span>{scan.qrTitle || "(삭제된 QR)"}</span>
            <span>
              {Number.isFinite(Date.parse(scan.createdAt))
                ? new Date(scan.createdAt).toLocaleString("ko-KR")
                : "시간 미확인"}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
