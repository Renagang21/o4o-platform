import { useLatestStoreRequest } from "./useLatestStoreRequest";
import { useState, useRef, useEffect } from "react";
import {
  listQrPlacements,
  getQrPlacementAnalytics,
  getStorePlacementAnalytics,
  getQrAnalytics,
  type StoreQrPlacementDto,
  type QrPlacementScanRow,
  type StoreQrPlacementAnalyticsDto,
  type QrAnalyticsData,
} from "../../../api/storeQr";
/** Placement and scan state is separate from QR authoring/printing. */
export function useQrOperations(
  fetchItems: () => Promise<void>,
  organizationId = "",
) {
  // Analytics state
  const [analyticsId, setAnalyticsId] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<QrAnalyticsData | null>(
    null,
  );
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // ── 사용처(Placement) — WO-O4O-STORE-QR-PLACEMENT-AND-ANALYTICS-IMPLEMENTATION-V1 §9 ──
  //   표시·경고·폼은 공통 Core(StoreQrPlacementPanel)가 담당한다. 여기는 adapter 축뿐이다.
  const [placementId, setPlacementId] = useState<string | null>(null);
  const [placementItems, setPlacementItems] = useState<StoreQrPlacementDto[]>(
    [],
  );
  const [placementScans, setPlacementScans] = useState<QrPlacementScanRow[]>(
    [],
  );
  const [placementLoading, setPlacementLoading] = useState(false);
  const [placementBusy, setPlacementBusy] = useState(false);
  const [placementError, setPlacementError] = useState<string | null>(null);

  const placementRequest = useLatestStoreRequest(organizationId);
  const actionBusy = useRef(false);
  const activePlacement = useRef(placementId);
  activePlacement.current = placementId;

  const loadPlacements = async (id: string) => {
    const isCurrent = placementRequest.begin();
    setPlacementLoading(true);
    setPlacementError(null);
    try {
      const [list, scans] = await Promise.all([
        listQrPlacements(id),
        getQrPlacementAnalytics(id),
      ]);
      if (!isCurrent() || activePlacement.current !== id) return;
      setPlacementItems(list?.data?.items ?? []);
      setPlacementScans(scans?.data?.byPlacement ?? []);
    } catch (e: any) {
      if (isCurrent() && activePlacement.current === id)
        setPlacementError(
          e?.response?.data?.error?.message ||
            e?.message ||
            "사용처를 불러오지 못했습니다.",
        );
    } finally {
      if (isCurrent() && activePlacement.current === id)
        setPlacementLoading(false);
    }
  };

  const handleShowPlacements = async (id: string) => {
    if (placementId === id) {
      placementRequest.cancel();
      activePlacement.current = null;
      setPlacementLoading(false);
      setPlacementId(null);
      setPlacementItems([]);
      setPlacementScans([]);
      return;
    }
    activePlacement.current = id;
    setPlacementItems([]);
    setPlacementScans([]);
    setPlacementId(id);
    await loadPlacements(id);
  };

  const runPlacementAction = async (id: string, fn: () => Promise<unknown>) => {
    if (actionBusy.current) return;
    actionBusy.current = true;
    setPlacementBusy(true);
    setPlacementError(null);
    try {
      await fn();
      if (activePlacement.current === id) await loadPlacements(id);
      await fetchItems();
    } catch (e: any) {
      if (activePlacement.current === id)
        setPlacementError(
          e?.response?.data?.error?.message ||
            e?.message ||
            "처리하지 못했습니다.",
        );
    } finally {
      actionBusy.current = false;
      setPlacementBusy(false);
    }
  };

  // ── 매장 전체 스캔 분포(§13) ────────────────────────────────────────────────
  //   QR 1건 단위 통계와 다른 질문이다. "이 QR 이 몇 번 찍혔나" 가 아니라
  //   "우리 매장 스캔이 어느 사용처/출처/대상에 몰려 있나" 를 본다.
  const [distOpen, setDistOpen] = useState(false);
  const [distDays, setDistDays] = useState<number | null>(30);
  const [distData, setDistData] = useState<StoreQrPlacementAnalyticsDto | null>(
    null,
  );
  const [distLoading, setDistLoading] = useState(false);
  const [distError, setDistError] = useState<string | null>(null);

  const distributionRequest = useLatestStoreRequest(organizationId);
  const analyticsRequest = useLatestStoreRequest(organizationId);

  const loadDistribution = async (days: number | null) => {
    const isCurrent = distributionRequest.begin();
    setDistLoading(true);
    setDistError(null);
    try {
      const res = await getStorePlacementAnalytics(days);
      if (isCurrent()) setDistData(res?.data ?? null);
    } catch (e: any) {
      if (isCurrent())
        setDistError(
          e?.response?.data?.error?.message ||
            e?.message ||
            "분포를 불러오지 못했습니다.",
        );
    } finally {
      if (isCurrent()) setDistLoading(false);
    }
  };

  const handleToggleDistribution = async () => {
    if (distOpen) {
      distributionRequest.cancel();
      setDistLoading(false);
      setDistOpen(false);
      return;
    }
    setDistOpen(true);
    await loadDistribution(distDays);
  };

  const handleChangeDistDays = async (days: number | null) => {
    setDistDays(days);
    await loadDistribution(days);
  };

  const handleShowAnalytics = async (id: string) => {
    if (analyticsId === id) {
      analyticsRequest.cancel();
      setAnalyticsLoading(false);
      setAnalyticsId(null);
      setAnalyticsData(null);
      return;
    }
    const isCurrent = analyticsRequest.begin();
    setAnalyticsId(id);
    setAnalyticsLoading(true);
    setAnalyticsData(null);
    try {
      const res = await getQrAnalytics(id);
      if (isCurrent() && res.success && res.data) {
        setAnalyticsData(res.data);
      }
    } catch {
      // silent
    } finally {
      if (isCurrent()) setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    setPlacementId(null);
    setPlacementItems([]);
    setPlacementScans([]);
    setPlacementError(null);
    setPlacementLoading(false);
    setAnalyticsId(null);
    setAnalyticsData(null);
    setAnalyticsLoading(false);
    setDistError(null);
    setDistLoading(false);
    setDistOpen(false);
    setDistData(null);
  }, [organizationId]);

  return {
    placementId,
    placementItems,
    placementScans,
    placementLoading,
    placementBusy,
    placementError,
    handleShowPlacements,
    runPlacementAction,
    distOpen,
    distDays,
    distData,
    distLoading,
    distError,
    loadDistribution,
    handleToggleDistribution,
    handleChangeDistDays,
    analyticsId,
    analyticsData,
    analyticsLoading,
    handleShowAnalytics,
  };
}
