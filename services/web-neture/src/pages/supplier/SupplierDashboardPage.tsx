/**
 * SupplierDashboardPage — 공급자 홈 (운영 현황 중심)
 *
 * WO-O4O-NETURE-SUPPLIER-DASHBOARD-OPS-STATUS-V1
 *
 * 구조 (위 → 아래):
 *  1. 공급자 상태 배너 (SupplierActivationGate — 승인/프로필 분리)
 *  2. 처리 필요 알림 — 실제 0 초과 항목만
 *  3. 핵심 운영 KPI — canonical 업무 화면 링크
 *  4. 업무 바로가기
 *  5. 상품 · 콘텐츠 운영 현황
 *  6. 유통 활동 현황 (판매자 모집 / 유통참여형 펀딩 / 이벤트 오퍼)
 *  7. 공급자 계정 상태 (승인 ≠ 프로필 완성)
 *  8. AI · 분석 (기존 Copilot 블록 — 접기 가능, 하단 배치)
 *
 * 원칙:
 *  - 기존 API 재사용만. 신규 backend / 복합 dashboard API 없음.
 *  - 정확히 계산 가능한 수치만 표시. 추정·하드코딩 금지.
 *  - Promise.allSettled — 일부 API 실패가 전체 대시보드를 무너뜨리지 않는다.
 *  - 기존 AI 기능(요약/성과/확산/분석/인기/성장/추천)은 삭제하지 않고 운영 현황 아래로 이동.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GuideBackLink } from '../../components/GuideBackLink';
import SupplierActivationGate from '../../components/supplier/SupplierActivationGate';
import {
  FlaskConical,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  supplierCopilotApi,
  supplierApi,
  supplierProfileApi,
  supplierStoreDescriptionApi,
  supplierKpaEventOfferApi,
  getInventoryStatus,
  PROFILE_FIELD_LABELS,
  type SupplierKpiSummary,
  type ProductPerformanceItem,
  type DistributionItem,
  type TrendingProductItem,
  type SupplierAiInsight,
  type SupplierEventOfferStats,
  type SupplierOrderKpi,
  type SettlementKpi,
  type SupplierProfile,
  type SupplierStoreDescriptionDraft,
} from '../../lib/api';
// supplierRecruitmentApi 는 lib/api index 에 re-export 되어 있지 않아 모듈에서 직접 import 한다.
import { supplierRecruitmentApi, type SupplierRecruitment } from '../../lib/api/supplier';
import { getMyTrials, type Trial } from '../../api/trial';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ApprovalCounts = { total: number; unrequested: number; pending: number; approved: number; rejected: number };
type InventoryCounts = { lowStock: number; outOfStock: number; tracked: number };

/** 처리 필요 항목 — value > 0 일 때만 렌더된다. */
type ActionItem = { key: string; label: string; value: number; unit: string; to: string; tone: 'red' | 'amber' };

/**
 * WO-O4O-NETURE-SUPPLIER-ORDER-INVENTORY-SETTLEMENT-LOAD-ERROR-CONTRACT-V1:
 * 주문·재고·정산 조회 실패를 영역 단위로 구분한다. 단일 boolean 으로 뭉개면
 * 어느 영역이 실패했는지 알 수 없어 실패 영역만 골라낼 수 없다.
 */
type OpsArea = 'orders' | 'inventory' | 'settlements';
type OpsFailures = Record<OpsArea, boolean>;
const NO_OPS_FAILURE: OpsFailures = { orders: false, inventory: false, settlements: false };
/** 조회 실패 영역의 수치 자리 표시 — 0 으로 대체하지 않는다. */
const UNAVAILABLE = '—';
const OPS_AREA_LABELS: Record<OpsArea, string> = {
  orders: '주문',
  inventory: '재고',
  settlements: '정산',
};

/**
 * WO-O4O-NETURE-SUPPLIER-CONTENT-DISTRIBUTION-LOAD-ERROR-CONTRACT-V1:
 * 콘텐츠·유통 영역의 조회 실패를 영역 단위로 구분한다.
 * 주문·재고·정산(OpsFailures) 과는 별개 상태다.
 */
type ContentDistributionFailures = {
  recruitments: boolean;
  storeDescriptions: boolean;
  marketTrials: boolean;
  eventOffers: boolean;
};
const NO_CD_FAILURE: ContentDistributionFailures = {
  recruitments: false,
  storeDescriptions: false,
  marketTrials: false,
  eventOffers: false,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** 서비스 내 기존 표기와 동일: 1,234,567원 */
function won(value: number): string {
  return `${value.toLocaleString('ko-KR')}원`;
}

function settled<T>(r: PromiseSettledResult<T>, fallback: T): T {
  return r.status === 'fulfilled' ? r.value : fallback;
}

/** 공급자 승인 상태 라벨 — SupplierActivationGate 와 동일 어휘 */
const SUPPLIER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: '활성',
  PENDING: '승인 대기',
  REJECTED: '거절',
  INACTIVE: '정지',
};

/** 매장용 설명서 상태 라벨 — supplierStoreDescription 의 실제 status 모델 그대로 사용 */
const STORE_DESC_STATUS_LABELS: Record<string, string> = {
  draft: '임시저장',
  needs_review: '검수 요청',
  revision_requested: '수정 요청',
  canonical: '게시됨',
  hidden: '숨김',
  candidate: '후보',
  deprecated: '보관',
};

/** 유통참여형 펀딩 상태 라벨 — api/trial 의 TrialStatus 그대로 사용 */
const TRIAL_STATUS_LABELS: Record<string, string> = {
  draft: '작성 중',
  submitted: '제출됨',
  recruiting: '모집 중',
  development: '개발 중',
  outcome_confirming: '결과 확인',
  fulfilled: '이행 완료',
  closed: '마감',
};

function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const k = key(item);
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SupplierDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // 운영 현황
  const [kpi, setKpi] = useState<SupplierKpiSummary | null>(null);
  const [orderKpi, setOrderKpi] = useState<SupplierOrderKpi | null>(null);
  const [inventory, setInventory] = useState<InventoryCounts | null>(null);
  const [settlementKpi, setSettlementKpi] = useState<SettlementKpi | null>(null);
  const [approval, setApproval] = useState<ApprovalCounts | null>(null);
  const [profile, setProfile] = useState<SupplierProfile | null>(null);
  // null = 조회 실패/미수신 — 정상 0건([]) 과 구분한다.
  const [recruitments, setRecruitments] = useState<SupplierRecruitment[] | null>(null);
  const [storeDescs, setStoreDescs] = useState<SupplierStoreDescriptionDraft[] | null>(null);
  const [trials, setTrials] = useState<Trial[] | null>(null);
  const [eventOfferStats, setEventOfferStats] = useState<SupplierEventOfferStats | null>(null);

  // AI · 분석 (기존 유지)
  const [aiInsight, setAiInsight] = useState<SupplierAiInsight | null>(null);
  const [performance, setPerformance] = useState<ProductPerformanceItem[]>([]);
  const [distribution, setDistribution] = useState<DistributionItem[]>([]);
  const [trending, setTrending] = useState<TrendingProductItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opsFailed, setOpsFailed] = useState<OpsFailures>(NO_OPS_FAILURE);
  const [approvalError, setApprovalError] = useState(false);
  const [cdFailed, setCdFailed] = useState<ContentDistributionFailures>(NO_CD_FAILURE);
  const [aiOpen, setAiOpen] = useState(false);

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

    setOrderKpi(ordersFailed ? null : (ops[0] as PromiseFulfilledResult<SupplierOrderKpi>).value);
    if (inventoryFailed) {
      setInventory(null);
    } else {
      const invItems = (ops[1] as PromiseFulfilledResult<any[]>).value;
      setInventory({
        lowStock: invItems.filter((i) => getInventoryStatus(i) === 'low_stock').length,
        outOfStock: invItems.filter((i) => getInventoryStatus(i) === 'out_of_stock').length,
        tracked: invItems.filter((i) => getInventoryStatus(i) !== 'untracked').length,
      });
    }
    setSettlementKpi(settlementsFailed ? null : (ops[2] as PromiseFulfilledResult<SettlementKpi>).value);
    // WO-O4O-NETURE-SUPPLIER-APPROVAL-COUNTS-LOAD-ERROR-CONTRACT-V1:
    //   승인 카운트 실패는 이 영역만 실패로 두고 0 으로 대체하지 않는다.
    const approvalFailed = ops[3].status === 'rejected';
    setApprovalError(approvalFailed);
    setApproval(approvalFailed ? null : (ops[3] as PromiseFulfilledResult<ApprovalCounts>).value);
    setProfile(settled(ops[4] as PromiseSettledResult<SupplierProfile | null>, null));

    // WO-O4O-NETURE-SUPPLIER-CONTENT-DISTRIBUTION-LOAD-ERROR-CONTRACT-V1:
    //   콘텐츠·유통 4영역도 rejection 을 []/null 로 흡수하지 않고 영역별 실패로 분리한다.
    //   실패 영역은 null 로 두어 "정상 0건" 과 구분한다.
    const recruitmentsFailed = ops[5].status === 'rejected';
    const storeDescsFailed = ops[6].status === 'rejected';
    const trialsFailed = ops[7].status === 'rejected';
    const eventOffersFailed = ops[8].status === 'rejected';

    setRecruitments(recruitmentsFailed ? null : (ops[5] as PromiseFulfilledResult<SupplierRecruitment[]>).value);
    setStoreDescs(storeDescsFailed ? null : (ops[6] as PromiseFulfilledResult<SupplierStoreDescriptionDraft[]>).value);
    setTrials(trialsFailed ? null : (ops[7] as PromiseFulfilledResult<Trial[]>).value);
    setEventOfferStats(eventOffersFailed ? null : (ops[8] as PromiseFulfilledResult<SupplierEventOfferStats | null>).value);
    setCdFailed({
      recruitments: recruitmentsFailed,
      storeDescriptions: storeDescsFailed,
      marketTrials: trialsFailed,
      eventOffers: eventOffersFailed,
    });

    setOpsFailed({ orders: ordersFailed, inventory: inventoryFailed, settlements: settlementsFailed });

    // AI · 분석 — fire-and-forget (기존 동작 유지)
    supplierCopilotApi.getAiInsight().then(setAiInsight).catch(() => {});
    supplierCopilotApi.getProductPerformance().then(setPerformance).catch(() => {});
    supplierCopilotApi.getDistribution().then(setDistribution).catch(() => {});
    supplierCopilotApi.getTrendingProducts().then(setTrending).catch(() => {});

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-slate-500 text-lg mb-4">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  /* ---- 파생 값 ---- */

  // 실패 영역(null)은 0 이 아니라 "계산 불가" 다. 아래 actionItems 필터에서 후보 제외한다.
  const recruitmentPending = (recruitments ?? []).reduce((sum, r) => sum + (r.applications?.pending ?? 0), 0);
  const descRevisionRequested = (storeDescs ?? []).filter((d) => d.status === 'revision_requested').length;
  const profileComplete =
    profile == null
      ? true // 미확인 시 미완료로 단정하지 않는다 (fail-open — SupplierActivationGate 와 동일)
      : typeof profile.profileComplete === 'boolean'
        ? profile.profileComplete
        : (profile.missingProfileFields ?? profile.missingActivationFields ?? []).length === 0;
  const missingProfileLabels = (profile?.missingProfileFields ?? profile?.missingActivationFields ?? [])
    .map((f) => PROFILE_FIELD_LABELS[f] || f);

  const actionCandidates: ActionItem[] = [
    { key: 'orders-processing', label: '처리 대기 주문', value: orderKpi?.pending_processing ?? 0, unit: '건', to: '/supplier/orders', tone: 'red' },
    { key: 'orders-shipping', label: '배송 준비 주문', value: orderKpi?.pending_shipping ?? 0, unit: '건', to: '/supplier/orders', tone: 'amber' },
    { key: 'inv-out', label: '품절 상품', value: inventory?.outOfStock ?? 0, unit: '개', to: '/supplier/inventory', tone: 'red' },
    { key: 'inv-low', label: '재고 부족 상품', value: inventory?.lowStock ?? 0, unit: '개', to: '/supplier/inventory', tone: 'amber' },
    { key: 'desc-revision', label: '설명서 수정 요청', value: descRevisionRequested, unit: '건', to: '/supplier/store-descriptions', tone: 'red' },
    { key: 'recruit-pending', label: '판매자 모집 신청 대기', value: recruitmentPending, unit: '건', to: '/supplier/recruitments', tone: 'amber' },
    { key: 'product-approval', label: '상품 승인 대기', value: approval?.pending ?? 0, unit: '개', to: '/supplier/products', tone: 'amber' },
    { key: 'settlement', label: '정산 대기', value: settlementKpi?.pending_count ?? 0, unit: '건', to: '/supplier/settlements', tone: 'amber' },
  ];
  // 실패 영역의 카드는 값이 없으므로 아예 후보에서 제외한다 (0 으로 표시하지 않는다).
  const actionItems = actionCandidates.filter((a) => {
    if (a.value <= 0) return false;
    if (opsFailed.orders && a.key.startsWith('orders-')) return false;
    if (opsFailed.inventory && a.key.startsWith('inv-')) return false;
    if (opsFailed.settlements && a.key === 'settlement') return false;
    if (approvalError && a.key === 'product-approval') return false;
    if (cdFailed.storeDescriptions && a.key === 'desc-revision') return false;
    if (cdFailed.recruitments && a.key === 'recruit-pending') return false;
    return true;
  });

  const failedAreas = (Object.keys(opsFailed) as OpsArea[]).filter((k) => opsFailed[k]);
  // 콘텐츠·유통 실패는 처리 필요 판단을 불완전하게 만든다 → 정상 문구를 단정하지 않는다.
  const cdActionAffected = cdFailed.storeDescriptions || cdFailed.recruitments;
  const showProfileAction = !loading && profile != null && !profileComplete;
  const hasAnyAction = actionItems.length > 0 || showProfileAction;

  const supplierStatusRaw = String(profile?.status ?? '').toUpperCase();
  const supplierStatusLabel = supplierStatusRaw ? (SUPPLIER_STATUS_LABELS[supplierStatusRaw] ?? supplierStatusRaw) : null;

  const descCounts = countBy(storeDescs ?? [], (d) => d.status);
  const trialCounts = countBy(trials ?? [], (t) => String(t.status));
  const recruitmentOpen = (recruitments ?? []).filter((r) => String(r.status).toLowerCase() === 'open').length;

  const topByRevenue = performance.slice(0, 5);
  const topByOrders = [...performance].sort((a, b) => b.orders - a.orders).slice(0, 5);
  const aiActions = aiInsight?.insight?.recommendedActions || [];
  const riskColor = aiInsight?.insight?.riskLevel === 'high' ? 'text-red-600 bg-red-50'
    : aiInsight?.insight?.riskLevel === 'medium' ? 'text-amber-600 bg-amber-50'
    : 'text-emerald-600 bg-emerald-50';

  const supplierLabel = profile?.name || user?.name || null;

  return (
    <div className="space-y-6">
      {/* 공급자 승인 상태 / 프로필 보완 배너 (승인 ≠ 프로필 완성) */}
      <SupplierActivationGate mode="banner">
        <></>
      </SupplierActivationGate>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">공급자 홈</h1>
          <p className="text-sm text-slate-500 mt-1">
            {supplierLabel ? `${supplierLabel}님의 ` : ''}주문·재고·정산과 상품·콘텐츠 운영 현황을 확인하세요.
          </p>
          <div className="mt-2"><GuideBackLink to="/guide/features/copilot-dashboard" label="Copilot 이용 안내" /></div>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 disabled:opacity-50 shrink-0"
        >
          {loading ? '로딩...' : '새로고침'}
        </button>
      </div>

      {/* ── 1. 처리 필요 ── */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">처리 필요</h2>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}
          </div>
        ) : hasAnyAction ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {actionItems.map((a) => (
              <Link
                key={a.key}
                to={a.to}
                className={`flex items-center justify-between gap-3 rounded-lg border p-4 transition-colors ${
                  a.tone === 'red'
                    ? 'border-red-200 bg-red-50 hover:bg-red-100'
                    : 'border-amber-200 bg-amber-50 hover:bg-amber-100'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <AlertTriangle size={16} className={a.tone === 'red' ? 'text-red-500 shrink-0' : 'text-amber-500 shrink-0'} />
                  <span className={`text-sm font-medium truncate ${a.tone === 'red' ? 'text-red-800' : 'text-amber-800'}`}>
                    {a.label}
                  </span>
                </span>
                <span className={`text-base font-bold shrink-0 ${a.tone === 'red' ? 'text-red-700' : 'text-amber-700'}`}>
                  {a.value.toLocaleString()}{a.unit}
                </span>
              </Link>
            ))}
            {showProfileAction && (
              <Link
                to="/mypage/business-profile"
                className="flex items-center justify-between gap-3 rounded-lg border border-sky-200 bg-sky-50 p-4 hover:bg-sky-100 transition-colors"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <AlertTriangle size={16} className="text-sky-500 shrink-0" />
                  <span className="text-sm font-medium text-sky-800 truncate">공급자 정보 미완료</span>
                </span>
                <span className="text-xs font-semibold text-sky-700 shrink-0">등록하기</span>
              </Link>
            )}
          </div>
        ) : failedAreas.length > 0 || cdActionAffected ? (
          // 처리 필요 계산에 쓰이는 영역이 하나라도 실패하면 "처리할 업무 없음" 으로 단정하지 않는다.
          <div className="flex items-center gap-2 py-2">
            <AlertTriangle size={18} className="text-amber-500" />
            <p className="text-sm text-slate-600">
              {[
                ...failedAreas.map((a) => OPS_AREA_LABELS[a]),
                ...(cdFailed.storeDescriptions ? ['매장용 설명서'] : []),
                ...(cdFailed.recruitments ? ['판매자 모집'] : []),
              ].join(' · ')} 현황을 불러오지 못해 처리 필요 업무를 확인할 수 없습니다.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 py-2">
            <CheckCircle2 size={18} className="text-emerald-500" />
            <p className="text-sm text-slate-600">현재 바로 처리해야 할 주요 업무가 없습니다.</p>
          </div>
        )}
        {failedAreas.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
            <p className="text-xs text-amber-800">
              {failedAreas.map((a) => OPS_AREA_LABELS[a]).join(' · ')} 현황을 불러오지 못했습니다. 나머지 현황은 정상입니다.
            </p>
            <button onClick={fetchData} className="text-xs font-medium text-slate-600 underline">다시 시도</button>
          </div>
        )}
      </section>

      {/* ── 2. 핵심 운영 KPI ── */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">핵심 운영 현황</h2>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 실패 영역은 0 이 아니라 '—' 로 표시한다 (수치 오인 방지) */}
            <KpiLink label="등록 상품" value={(kpi?.registeredProducts ?? 0).toLocaleString()} to="/supplier/products" />
            <KpiLink label="판매 중" value={(kpi?.activeProducts ?? 0).toLocaleString()} to="/supplier/products" accent />
            <KpiLink
              label="처리 대기 주문"
              value={opsFailed.orders ? UNAVAILABLE : (orderKpi?.pending_processing ?? 0).toLocaleString()}
              to="/supplier/orders"
              accent
            />
            <KpiLink
              label="배송 준비 주문"
              value={opsFailed.orders ? UNAVAILABLE : (orderKpi?.pending_shipping ?? 0).toLocaleString()}
              to="/supplier/orders"
            />
            <KpiLink
              label="재고 주의"
              value={opsFailed.inventory ? UNAVAILABLE : ((inventory?.lowStock ?? 0) + (inventory?.outOfStock ?? 0)).toLocaleString()}
              to="/supplier/inventory"
            />
            <KpiLink
              label="정산 대기"
              value={opsFailed.settlements ? UNAVAILABLE : won(settlementKpi?.pending_amount ?? 0)}
              to="/supplier/settlements"
              small
            />
          </div>
        )}
      </section>

      {/* ── 3. 업무 바로가기 ── */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">업무 바로가기</h2>
        <div className="flex flex-wrap gap-2">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      {/* ── 4. 상품 · 콘텐츠 운영 현황 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 상품 */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800">상품 · 공급</h2>
            <Link to="/supplier/products" className="text-xs font-medium text-blue-600 hover:text-blue-700">상품 목록 →</Link>
          </div>
          <dl className="space-y-2">
            <StatRow label="등록 상품" value={`${(kpi?.registeredProducts ?? 0).toLocaleString()}개`} />
            <StatRow label="판매 중" value={`${(kpi?.activeProducts ?? 0).toLocaleString()}개`} />
            {/* 승인 카운트는 별도 영역 — 실패해도 등록 상품·판매 중은 그대로 표시한다 */}
            {approvalError ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-sm text-amber-800">승인 현황을 불러오지 못했습니다.</span>
                <button
                  onClick={fetchData}
                  className="text-xs font-medium text-amber-800 underline hover:text-amber-900"
                >
                  다시 시도
                </button>
              </div>
            ) : approval ? (
              <>
                <StatRow label="승인 완료" value={`${approval.approved.toLocaleString()}개`} />
                <StatRow label="승인 대기" value={`${approval.pending.toLocaleString()}개`} />
                <StatRow label="승인 미요청" value={`${approval.unrequested.toLocaleString()}개`} />
              </>
            ) : null}
          </dl>
          <Link
            to="/supplier/supply-offers"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            공급 오퍼 관리 <ArrowRight size={14} />
          </Link>
        </section>

        {/* 콘텐츠 */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800">매장용 콘텐츠</h2>
            <Link to="/supplier/store-descriptions" className="text-xs font-medium text-blue-600 hover:text-blue-700">
              매장용 설명서 →
            </Link>
          </div>
          {cdFailed.storeDescriptions ? (
            <AreaLoadError label="설명서 현황을 불러오지 못했습니다." onRetry={retryStoreDescs} />
          ) : storeDescs && storeDescs.length > 0 ? (
            <dl className="space-y-2">
              {Object.entries(descCounts).map(([status, count]) => (
                <StatRow
                  key={status}
                  label={`설명서 · ${STORE_DESC_STATUS_LABELS[status] ?? status}`}
                  value={`${count.toLocaleString()}건`}
                />
              ))}
            </dl>
          ) : (
            <p className="text-sm text-slate-400 py-2">작성한 매장용 설명서가 없습니다.</p>
          )}
          {/* 제품 콘텐츠·태블릿·사이니지는 공통 count API 가 없어 진입점만 제공한다. */}
          <div className="mt-4 flex flex-wrap gap-2">
            {CONTENT_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* ── 5. 유통 활동 현황 ── */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">유통 활동</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 판매자 모집 */}
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-800">판매자 모집</h3>
              <Link to="/supplier/recruitments" className="text-xs text-blue-600 hover:text-blue-700">관리 →</Link>
            </div>
            {cdFailed.recruitments ? (
              <AreaLoadError label="판매자 모집 현황을 불러오지 못했습니다." onRetry={retryRecruitments} />
            ) : (
              <dl className="space-y-1.5">
                <StatRow label="전체 모집" value={`${(recruitments?.length ?? 0).toLocaleString()}건`} />
                <StatRow label="모집 중" value={`${recruitmentOpen.toLocaleString()}건`} />
                <StatRow label="신청 대기" value={`${recruitmentPending.toLocaleString()}건`} />
              </dl>
            )}
          </div>

          {/* 유통참여형 펀딩 */}
          <div className="rounded-lg border border-violet-200 bg-violet-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-violet-900">
                <FlaskConical size={15} /> 유통참여형 펀딩
              </h3>
              <Link to="/supplier/market-trial" className="text-xs text-violet-700 hover:text-violet-800">관리 →</Link>
            </div>
            {cdFailed.marketTrials ? (
              <AreaLoadError label="펀딩 현황을 불러오지 못했습니다." onRetry={retryTrials} tone="violet" />
            ) : trials && trials.length > 0 ? (
              <dl className="space-y-1.5">
                {Object.entries(trialCounts).map(([status, count]) => (
                  <StatRow
                    key={status}
                    label={TRIAL_STATUS_LABELS[status] ?? status}
                    value={`${count.toLocaleString()}건`}
                  />
                ))}
              </dl>
            ) : (
              <p className="text-xs text-violet-600">
                신규 제품·유통안을 콘텐츠로 소개하고 참여 의향을 확인합니다.
              </p>
            )}
            <Link
              to="/supplier/market-trial/new"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-violet-700 hover:text-violet-800"
            >
              펀딩 생성하기 <ArrowRight size={12} />
            </Link>
          </div>

          {/* 이벤트 오퍼 */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-amber-900">이벤트 오퍼 (KPA)</h3>
              <Link to="/supplier/event-offers" className="text-xs text-amber-700 hover:text-amber-800">관리 →</Link>
            </div>
            {cdFailed.eventOffers || !eventOfferStats ? (
              <AreaLoadError label="이벤트 오퍼 현황을 불러오지 못했습니다." onRetry={retryEventOffers} tone="amber" />
            ) : (
              <dl className="space-y-1.5">
                <StatRow label="전체 이벤트" value={`${eventOfferStats.totalOffers.toLocaleString()}건`} />
                <StatRow label="노출 중" value={`${eventOfferStats.activeOffers.toLocaleString()}건`} />
                <StatRow label="이벤트 주문" value={`${eventOfferStats.totalOrders.toLocaleString()}건`} />
                <StatRow label="이벤트 매출" value={won(eventOfferStats.totalRevenue)} />
              </dl>
            )}
          </div>
        </div>
      </section>

      {/* ── 6. 공급자 계정 상태 ── */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">공급자 계정 상태</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500 mb-1">공급자 상태</p>
            <p className="text-sm font-semibold text-slate-800">
              {supplierStatusLabel ?? '확인할 수 없음'}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500 mb-1">프로필 정보</p>
            <p className="text-sm font-semibold text-slate-800">
              {profile == null ? '확인할 수 없음' : profileComplete ? '입력 완료' : '일부 미입력'}
            </p>
            {!profileComplete && missingProfileLabels.length > 0 && (
              <p className="text-xs text-slate-500 mt-1">미입력: {missingProfileLabels.join(', ')}</p>
            )}
            {profile != null && !profileComplete && (
              <Link
                to="/mypage/business-profile"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
              >
                공급자 정보 등록 <ArrowRight size={12} />
              </Link>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          공급자 승인과 프로필 완성은 별개입니다. 프로필이 일부 미입력이어도 승인된 공급 업무는 그대로 이용할 수 있습니다.
        </p>
      </section>

      {/* ── 7. AI · 분석 (기존 Copilot 블록 — 접기 가능) ── */}
      <section className="bg-white rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => setAiOpen((v) => !v)}
          aria-expanded={aiOpen}
          className="w-full flex items-center justify-between gap-3 p-6 text-left"
        >
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-800">AI · 분석</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              AI 공급자 요약, 상품 성과, 매장 확산, 인기·성장 상품, 추천 전략
            </p>
          </div>
          {aiOpen ? <ChevronUp size={18} className="text-slate-400 shrink-0" /> : <ChevronDown size={18} className="text-slate-400 shrink-0" />}
        </button>

        {aiOpen && (
          <div className="px-6 pb-6 space-y-6">
            {/* AI 공급자 요약 */}
            <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-6">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-base font-semibold text-indigo-900">AI 공급자 요약</h3>
                {aiInsight?.insight?.riskLevel && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${riskColor}`}>
                    {aiInsight.insight.riskLevel === 'high' ? '주의' : aiInsight.insight.riskLevel === 'medium' ? '보통' : '양호'}
                  </span>
                )}
              </div>
              {aiInsight ? (
                <>
                  <p className="text-sm text-indigo-800 leading-relaxed">{aiInsight.insight.summary}</p>
                  <p className="text-xs text-indigo-400 mt-3">
                    {aiInsight.meta.provider}/{aiInsight.meta.model} &middot; {aiInsight.meta.durationMs}ms
                  </p>
                </>
              ) : (
                <p className="text-sm text-indigo-400">AI 분석을 불러오는 중...</p>
              )}
            </div>

            {/* 상품 성과 + 매장 확산 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-base font-semibold text-slate-800 mb-4">상품 성과 (매출 TOP 5)</h3>
                {topByRevenue.length === 0 ? (
                  <p className="text-sm text-slate-400 py-8 text-center">상품 데이터가 없습니다.</p>
                ) : (
                  <div className="space-y-3">
                    {topByRevenue.map((item, idx) => (
                      <div key={item.productId} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <span className="text-xs font-bold text-slate-400 w-5">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{item.productName}</p>
                          <p className="text-xs text-slate-400">주문 {item.orders}건 &middot; QR {item.qrScans}</p>
                        </div>
                        <span className="text-sm font-semibold text-slate-700 shrink-0">{won(item.revenue)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-base font-semibold text-slate-800 mb-4">매장 확산</h3>
                {distribution.length === 0 ? (
                  <p className="text-sm text-slate-400 py-8 text-center">매장 진열 데이터가 없습니다.</p>
                ) : (
                  <div className="space-y-3">
                    {distribution.slice(0, 5).map((item) => (
                      <div key={item.productId} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{item.productName}</p>
                        </div>
                        <span className="text-sm font-semibold text-slate-600 shrink-0">{item.storeCount}개 매장</span>
                        {item.newStores > 0 && (
                          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                            +{item.newStores} new
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* AI 상품 분석 */}
            {aiActions.length > 0 && (
              <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-6">
                <h3 className="text-base font-semibold text-indigo-900 mb-4">AI 상품 분석</h3>
                <div className="space-y-2">
                  {aiActions.slice(0, 3).map((action, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-white/60 rounded-lg">
                      <span className="text-indigo-400 text-xs font-bold mt-0.5">{idx + 1}</span>
                      <p className="text-sm text-indigo-800">{action}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 인기 상품 + 성장 상품 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-base font-semibold text-slate-800 mb-4">인기 상품 (주문 TOP 5)</h3>
                {topByOrders.length === 0 ? (
                  <p className="text-sm text-slate-400 py-8 text-center">주문 데이터가 없습니다.</p>
                ) : (
                  <div className="space-y-3">
                    {topByOrders.map((item, idx) => (
                      <div key={item.productId} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <span className="text-xs font-bold text-slate-400 w-5">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{item.productName}</p>
                          <p className="text-xs text-slate-400">매출 {won(item.revenue)}</p>
                        </div>
                        <span className="text-sm font-semibold text-slate-700 shrink-0">{item.orders}건</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6">
                <h3 className="text-base font-semibold text-emerald-900 mb-4">성장 상품</h3>
                {trending.length === 0 ? (
                  <p className="text-sm text-emerald-400 py-8 text-center">성장 데이터가 없습니다.</p>
                ) : (
                  <div className="space-y-3">
                    {trending.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-white/60 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-emerald-800 truncate">{item.productName}</p>
                          <p className="text-xs text-emerald-500">
                            이번주 {item.currentOrders}건 / 지난주 {item.previousOrders}건
                          </p>
                        </div>
                        <span className={`text-sm font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          item.growthRate > 0
                            ? 'text-emerald-700 bg-emerald-100'
                            : item.growthRate < 0
                            ? 'text-red-600 bg-red-50'
                            : 'text-slate-500 bg-slate-100'
                        }`}>
                          {item.growthRate > 0 ? '+' : ''}{item.growthRate}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 추천 전략 */}
            <div className="bg-violet-50 rounded-xl border border-violet-200 p-6">
              <h3 className="text-base font-semibold text-violet-900 mb-4">추천 전략</h3>
              {aiActions.length > 0 ? (
                <div className="space-y-2">
                  {aiActions.map((action, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 bg-white/60 rounded-lg cursor-pointer hover:bg-white/80 transition-colors"
                      onClick={() => inferActionPath(action, navigate)}
                    >
                      <span className="text-violet-400 text-xs font-bold mt-0.5">{idx + 1}</span>
                      <p className="text-sm text-violet-800">{action}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-violet-400">AI 추천을 불러오는 중...</p>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function KpiLink({ label, value, to, accent, small }: {
  label: string; value: string; to: string; accent?: boolean; small?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`block rounded-lg p-4 transition-colors ${
        accent ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
      }`}
    >
      <p className={`text-xs font-medium mb-1 ${accent ? 'text-slate-300' : 'text-slate-500'}`}>{label}</p>
      <p className={`${small ? 'text-base' : 'text-2xl'} font-bold break-all`}>{value}</p>
    </Link>
  );
}

/**
 * WO-O4O-NETURE-SUPPLIER-CONTENT-DISTRIBUTION-LOAD-ERROR-CONTRACT-V1:
 * 영역 단위 조회 실패 표시 + 해당 API 만 재호출하는 다시 시도.
 * 대시보드 전체를 오류 화면으로 바꾸지 않는다.
 */
function AreaLoadError({ label, onRetry, tone = 'slate' }: {
  label: string; onRetry: () => void; tone?: 'slate' | 'violet' | 'amber';
}) {
  const text = tone === 'violet' ? 'text-violet-700' : tone === 'amber' ? 'text-amber-800' : 'text-slate-600';
  return (
    <div className="flex flex-wrap items-center gap-2 py-1">
      <span className={`text-xs ${text}`}>{label}</span>
      <button onClick={onRetry} className={`text-xs font-medium underline ${text}`}>
        다시 시도
      </button>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
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

// 모든 경로는 canonical /supplier/* (사업자 정보만 /mypage/business-profile)
const QUICK_LINKS = [
  { label: '상품 등록', path: '/supplier/products/register' },
  { label: '공급 오퍼 관리', path: '/supplier/supply-offers' },
  { label: '주문 처리', path: '/supplier/orders' },
  { label: '재고 관리', path: '/supplier/inventory' },
  { label: '정산 내역', path: '/supplier/settlements' },
  { label: '파트너 수수료', path: '/supplier/partner-commissions' },
  { label: '사업자 정보', path: '/mypage/business-profile' },
];

const CONTENT_LINKS = [
  { label: '제품 콘텐츠', path: '/supplier/b2b-content' },
  { label: '매장용 설명서', path: '/supplier/store-descriptions' },
  { label: '태블릿', path: '/supplier/tablet-screen-sets' },
  { label: '디지털 사이니지', path: '/supplier/signage' },
];

function inferActionPath(action: string, navigate: (path: string) => void) {
  const lower = action.toLowerCase();
  if (lower.includes('상품') || lower.includes('제품') || lower.includes('product')) {
    navigate('/supplier/products');
  } else if (lower.includes('주문') || lower.includes('order')) {
    navigate('/supplier/orders');
  } else if (lower.includes('재고') || lower.includes('inventory')) {
    navigate('/supplier/inventory');
  } else if (lower.includes('정산') || lower.includes('settlement')) {
    navigate('/supplier/settlements');
  } else if (lower.includes('라이브러리') || lower.includes('콘텐츠') || lower.includes('content')) {
    navigate('/supplier/b2b-content');
  } else if (lower.includes('판매자') || lower.includes('seller') || lower.includes('신청')) {
    navigate('/supplier/recruitments');
  } else if (lower.includes('trial') || lower.includes('시범') || lower.includes('트라이얼') || lower.includes('펀딩')) {
    navigate('/supplier/market-trial');
  } else if (lower.includes('프로필') || lower.includes('profile') || lower.includes('사업자')) {
    navigate('/mypage/business-profile');
  }
}
