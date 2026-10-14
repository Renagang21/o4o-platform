import { useState, useEffect, useCallback } from 'react';
import {
  supplierCopilotApi,
  supplierApi,
  supplierProfileApi,
  supplierStoreDescriptionApi,
  supplierKpaEventOfferApi,
  getInventoryStatus,
  type SupplierKpiSummary,
  type ProductPerformanceItem,
  type DistributionItem,
  type TrendingProductItem,
  type SupplierEventOfferStats,
  type SupplierOrderKpi,
  type SettlementKpi,
  type SupplierProfile,
  type SupplierStoreDescriptionDraft,
} from '../../../lib/api';
// supplierRecruitmentApi 는 lib/api index 에 re-export 되어 있지 않아 모듈에서 직접 import 한다.
import {
  supplierRecruitmentApi,
  type SupplierRecruitment,
} from '../../../lib/api/supplier';
import { getMyTrials, type Trial } from '../../../api/trial';

import {
  settled,
  NO_OPS_FAILURE,
  NO_CD_FAILURE,
  type InventoryCounts,
  type ApprovalCounts,
  type OpsFailures,
  type ContentDistributionFailures,
} from './presentation';

export function useSupplierDashboard() {
  // 운영 현황
  const [kpi, setKpi] = useState<SupplierKpiSummary | null>(null);
  const [orderKpi, setOrderKpi] = useState<SupplierOrderKpi | null>(null);
  const [inventory, setInventory] = useState<InventoryCounts | null>(null);
  const [settlementKpi, setSettlementKpi] = useState<SettlementKpi | null>(
    null,
  );
  const [approval, setApproval] = useState<ApprovalCounts | null>(null);
  const [profile, setProfile] = useState<SupplierProfile | null>(null);
  // null = 조회 실패/미수신 — 정상 0건([]) 과 구분한다.
  const [recruitments, setRecruitments] = useState<
    SupplierRecruitment[] | null
  >(null);
  const [storeDescs, setStoreDescs] = useState<
    SupplierStoreDescriptionDraft[] | null
  >(null);
  const [trials, setTrials] = useState<Trial[] | null>(null);
  const [eventOfferStats, setEventOfferStats] =
    useState<SupplierEventOfferStats | null>(null);

  // 지표 분석 (Copilot SQL 집계)
  const [metricsFailed, setMetricsFailed] = useState(false);
  const [performance, setPerformance] = useState<ProductPerformanceItem[]>([]);
  const [distribution, setDistribution] = useState<DistributionItem[]>([]);
  const [trending, setTrending] = useState<TrendingProductItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opsFailed, setOpsFailed] = useState<OpsFailures>(NO_OPS_FAILURE);
  const [approvalError, setApprovalError] = useState(false);
  const [cdFailed, setCdFailed] =
    useState<ContentDistributionFailures>(NO_CD_FAILURE);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOpsFailed(NO_OPS_FAILURE);

    // Primary await — 공급자 권한 확인 (실패 시 전체 화면 오류)
    try {
      setKpi(await supplierCopilotApi.getKpi());
    } catch (err: any) {
      if (err?.message?.includes('401') || err?.message?.includes('403')) {
        setError('공급자 권한이 필요합니다.');
      } else {
        setError('데이터를 불러오는데 실패했습니다.');
      }
      setLoading(false);
      return;
    }

    // 운영 현황 — 병렬. 일부 실패해도 나머지는 그대로 표시한다(영역별 독립 처리).
    const ops = await Promise.allSettled([
      supplierApi.getOrderKpi(),
      supplierApi.getInventory(),
      supplierApi.getSettlementKpi(),
      supplierApi.getApprovalCounts(),
      supplierProfileApi.getProfile(),
      supplierRecruitmentApi.listMine(),
      supplierStoreDescriptionApi.listMine(),
      getMyTrials(),
      supplierKpaEventOfferApi.getStats(),
    ]);

    // WO-O4O-NETURE-SUPPLIER-ORDER-INVENTORY-SETTLEMENT-LOAD-ERROR-CONTRACT-V1:
    //   주문·재고·정산은 영역별로 독립 처리한다. 실패한 영역은 null 로 두고 0 으로 대체하지 않는다.
    const ordersFailed = ops[0].status === 'rejected';
    const inventoryFailed = ops[1].status === 'rejected';
    const settlementsFailed = ops[2].status === 'rejected';

    setOrderKpi(
      ordersFailed
        ? null
        : (ops[0] as PromiseFulfilledResult<SupplierOrderKpi>).value,
    );
    if (inventoryFailed) {
      setInventory(null);
    } else {
      const invItems = (ops[1] as PromiseFulfilledResult<any[]>).value;
      setInventory({
        lowStock: invItems.filter((i) => getInventoryStatus(i) === 'low_stock')
          .length,
        outOfStock: invItems.filter(
          (i) => getInventoryStatus(i) === 'out_of_stock',
        ).length,
        tracked: invItems.filter((i) => getInventoryStatus(i) !== 'untracked')
          .length,
      });
    }
    setSettlementKpi(
      settlementsFailed
        ? null
        : (ops[2] as PromiseFulfilledResult<SettlementKpi>).value,
    );
    // WO-O4O-NETURE-SUPPLIER-APPROVAL-COUNTS-LOAD-ERROR-CONTRACT-V1:
    //   승인 카운트 실패는 이 영역만 실패로 두고 0 으로 대체하지 않는다.
    const approvalFailed = ops[3].status === 'rejected';
    setApprovalError(approvalFailed);
    setApproval(
      approvalFailed
        ? null
        : (ops[3] as PromiseFulfilledResult<ApprovalCounts>).value,
    );
    setProfile(
      settled(ops[4] as PromiseSettledResult<SupplierProfile | null>, null),
    );

    // WO-O4O-NETURE-SUPPLIER-CONTENT-DISTRIBUTION-LOAD-ERROR-CONTRACT-V1:
    //   콘텐츠·유통 4영역도 rejection 을 []/null 로 흡수하지 않고 영역별 실패로 분리한다.
    //   실패 영역은 null 로 두어 "정상 0건" 과 구분한다.
    const recruitmentsFailed = ops[5].status === 'rejected';
    const storeDescsFailed = ops[6].status === 'rejected';
    const trialsFailed = ops[7].status === 'rejected';
    const eventOffersFailed = ops[8].status === 'rejected';

    setRecruitments(
      recruitmentsFailed
        ? null
        : (ops[5] as PromiseFulfilledResult<SupplierRecruitment[]>).value,
    );
    setStoreDescs(
      storeDescsFailed
        ? null
        : (ops[6] as PromiseFulfilledResult<SupplierStoreDescriptionDraft[]>)
            .value,
    );
    setTrials(
      trialsFailed ? null : (ops[7] as PromiseFulfilledResult<Trial[]>).value,
    );
    setEventOfferStats(
      eventOffersFailed
        ? null
        : (ops[8] as PromiseFulfilledResult<SupplierEventOfferStats | null>)
            .value,
    );
    setCdFailed({
      recruitments: recruitmentsFailed,
      storeDescriptions: storeDescsFailed,
      marketTrials: trialsFailed,
      eventOffers: eventOffersFailed,
    });

    setOpsFailed({
      orders: ordersFailed,
      inventory: inventoryFailed,
      settlements: settlementsFailed,
    });

    // 지표 분석 — fire-and-forget (SQL 집계 · 내부 LLM 호출 없음)
    setMetricsFailed(false);
    Promise.all([
      supplierCopilotApi.getProductPerformance(),
      supplierCopilotApi.getDistribution(),
      supplierCopilotApi.getTrendingProducts(),
    ])
      .then(([products, stores, growth]) => {
        setPerformance(products);
        setDistribution(stores);
        setTrending(growth);
      })
      .catch(() => setMetricsFailed(true));

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // WO-O4O-NETURE-SUPPLIER-CONTENT-DISTRIBUTION-LOAD-ERROR-CONTRACT-V1:
  //   영역별 다시 시도 — 해당 API 만 재호출한다(전체 대시보드 재호출·AI 재호출 없음).
  const retryRecruitments = useCallback(async () => {
    try {
      setRecruitments(await supplierRecruitmentApi.listMine());
      setCdFailed((p) => ({ ...p, recruitments: false }));
    } catch {
      setRecruitments(null);
      setCdFailed((p) => ({ ...p, recruitments: true }));
    }
  }, []);

  const retryStoreDescs = useCallback(async () => {
    try {
      setStoreDescs(await supplierStoreDescriptionApi.listMine());
      setCdFailed((p) => ({ ...p, storeDescriptions: false }));
    } catch {
      setStoreDescs(null);
      setCdFailed((p) => ({ ...p, storeDescriptions: true }));
    }
  }, []);

  const retryTrials = useCallback(async () => {
    try {
      setTrials(await getMyTrials());
      setCdFailed((p) => ({ ...p, marketTrials: false }));
    } catch {
      setTrials(null);
      setCdFailed((p) => ({ ...p, marketTrials: true }));
    }
  }, []);

  const retryEventOffers = useCallback(async () => {
    try {
      setEventOfferStats(await supplierKpaEventOfferApi.getStats());
      setCdFailed((p) => ({ ...p, eventOffers: false }));
    } catch {
      setEventOfferStats(null);
      setCdFailed((p) => ({ ...p, eventOffers: true }));
    }
  }, []);

  return {
    kpi,
    orderKpi,
    inventory,
    settlementKpi,
    approval,
    profile,
    recruitments,
    storeDescs,
    trials,
    eventOfferStats,
    metricsFailed,
    performance,
    distribution,
    trending,
    loading,
    error,
    opsFailed,
    approvalError,
    cdFailed,
    fetchData,
    retryRecruitments,
    retryStoreDescs,
    retryTrials,
    retryEventOffers,
  };
}
