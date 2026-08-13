/**
 * StoreHomeShell — 3서비스 내 약국/내 매장 홈 본문의 canonical 셸
 *
 * WO-O4O-STORE-HOME-CANONICAL-SHELL-V1
 * 선행: IR-O4O-STORE-HOME-CROSSSERVICE-AUDIT-V1 / WO-O4O-STORE-HOME-GLYCOPHARM-REFERENCE-STABILIZATION-V1
 *
 * 역할 (canonical "pre-sections" 영역 공통화):
 *  - 3서비스 홈은 이미 StoreDashboardLayout(셸) + HubLayout(카드 섹션) 을 공유한다.
 *    남은 차이는 카드 섹션 "위" 의 운영 상태 영역(새로고침/매장선택/배너/AI요약/인사이트/온보딩)이다.
 *  - 본 셸은 그 영역을 고정 순서 + 명명된 슬롯으로 공통화한다.
 *
 * 설계 원칙 (WO §설계 원칙):
 *  - 데이터 fetch 하지 않음. 서비스 API endpoint 를 알지 않음.
 *  - 약국/매장 등 도메인 용어를 고정하지 않음 (문구/슬롯은 서비스가 주입).
 *  - 카드 섹션 렌더는 HubLayout(@o4o/hub-core) 가 계속 담당 — 본 셸은 hub-core 에 의존하지 않는다.
 *    (store-ui-core 는 hub-core 를 dependency 로 갖지 않으며, 본 WO 는 package.json 변경 금지.)
 *  - 소비처는 본 셸을 HubLayout 의 `beforeSections` 로 주입한다 (카드 섹션 위에 렌더).
 *
 * WO-O4O-MY-STORE-HOME-CROSSSERVICE-COMMONIZATION-V1 (확장):
 *  - 홈 헤더(제목/부제 + 새로고침·추가 액션)를 셸로 흡수 — 4서비스가 각자 렌더하던 영역.
 *  - 매장 상태 헤더(statusSlot) · 처리 필요 신호(signalsSlot) · KPI(metricsSlot) 슬롯 추가.
 *  - children 으로 서비스 본문 블록을 받아 canonical 순서 안에 배치.
 *  - PharmacyHub 를 4번째 소비처로 포함.
 *  모든 신규 prop 은 선택 — 기존 소비처 동작은 그대로다.
 *
 * 공통화된 것:
 *  - 홈 헤더 + 새로고침 버튼 (표준 마크업)
 *  - 경영 인사이트 블록 (store-ui-core computeStoreInsights 산출 StoreInsight[] 렌더)
 *  - canonical 슬롯 순서:
 *      헤더(제목·새로고침) → 매장선택 → 배너 → 매장상태 → 처리필요신호 → KPI
 *      → AI요약 → 인사이트 → children(서비스 본문) → 온보딩 → 추가
 *
 * 서비스별 주입 (slot):
 *  - storeSelectorSlot : 다중 매장 선택 (K-Cosmetics). 단일 매장이면 미주입.
 *  - bannerSlot        : 서비스 배너 (예: GlycoPharm 주문/매출 준비 중 안내).
 *  - aiSummarySlot     : AI 운영 요약 카드 (서비스별 데이터/문구).
 *  - onboardingSlot    : 초기 사용자/빈 상태 안내 (예: KPA 실행 흐름 3단계).
 */

import type { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { Card } from '@o4o/ui';
import type { StoreInsight } from '../engine/storeInsightEngine';

export interface StoreHomeShellProps {
  /**
   * 홈 제목 — 주입 시 canonical 헤더(제목/부제 + 우측 액션)를 렌더한다.
   * 미주입 시 기존 동작(새로고침 버튼만 우측 정렬) 유지.
   * 문구는 서비스 config 가 SSOT (약국/매장 용어를 셸이 고정하지 않는다).
   */
  title?: string;
  subtitle?: string;
  /** 헤더 우측 추가 액션 (새로고침 버튼 왼쪽에 렌더) */
  headerActions?: ReactNode;

  /** 로딩 중 — 새로고침 버튼 disable/spin, 인사이트 숨김 */
  loading?: boolean;
  /** 새로고침 핸들러. 미주입 시 새로고침 버튼 미표시. */
  onRefresh?: () => void;
  /** 새로고침 버튼 라벨 (기본 '새로고침') */
  refreshLabel?: string;

  /** 다중 매장 선택 슬롯 (K-Cosmetics). 단일 매장이면 미주입. */
  storeSelectorSlot?: ReactNode;
  /** 서비스 배너 슬롯 (예: 주문/매출 준비 중). 표시 조건은 서비스가 결정. */
  bannerSlot?: ReactNode;
  /** 매장 상태 헤더 슬롯 (매장명·상태배지·가입상태 등). */
  statusSlot?: ReactNode;
  /** 처리 필요 신호 슬롯 — StoreHomeSignalList 주입 위치 (KPI 위). */
  signalsSlot?: ReactNode;
  /** KPI/요약 지표 슬롯 — StoreHomeMetricGrid 주입 위치. */
  metricsSlot?: ReactNode;
  /** AI 운영 요약 슬롯 (서비스별 카드/로딩/에러 포함). */
  aiSummarySlot?: ReactNode;

  /**
   * 경영 인사이트 — store-ui-core computeStoreInsights 산출.
   * 비어있거나 loading 중이면 미표시.
   */
  insights?: StoreInsight[];
  /** 인사이트 섹션 제목 (기본 '경영 인사이트') */
  insightsTitle?: string;
  /** 인사이트 action 클릭 핸들러 (target 경로 전달) */
  onInsightAction?: (target: string) => void;

  /** 초기 사용자/빈 상태 온보딩 슬롯 (예: KPA 실행 흐름 3단계). */
  onboardingSlot?: ReactNode;

  /** canonical 슬롯 외 추가 렌더 (escape hatch) */
  beforeSections?: ReactNode;

  /** 서비스 본문 블록 (인사이트 아래 · 온보딩 위). */
  children?: ReactNode;
}

const levelIcon = (l: StoreInsight['level']) =>
  l === 'critical' ? '🔴' : l === 'warning' ? '🟡' : '🔵';

function ShellInsightBlock({
  insights,
  title,
  onAction,
}: {
  insights: StoreInsight[];
  title: string;
  onAction?: (target: string) => void;
}) {
  if (insights.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-slate-800 mb-4 mt-0">{title}</h2>
      <Card className="px-5 py-4">
        <div className="flex flex-col gap-2.5">
          {insights.map((ins) => (
            <div key={ins.code} className="flex items-start gap-2.5">
              <span className="text-base leading-[22px] flex-shrink-0">{levelIcon(ins.level)}</span>
              <div className="flex-1">
                <span className="text-sm font-semibold text-slate-800">{ins.message}</span>
                {ins.recommendation && (
                  <span className="text-[13px] text-slate-500"> — {ins.recommendation}</span>
                )}
              </div>
              {ins.action && (
                <button
                  onClick={() => onAction?.(ins.action!.target)}
                  className="flex-shrink-0 self-center px-3 py-1 text-xs font-semibold text-primary bg-transparent border border-primary-200 rounded-md cursor-pointer whitespace-nowrap hover:bg-primary-50"
                >
                  {ins.action.label} →
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

/**
 * StoreHomeShell — HubLayout 의 `beforeSections` 로 주입하여 사용한다.
 *
 * @example
 *   <HubLayout
 *     title={config.uiText.storeHomeTitle}
 *     sections={HUB_SECTIONS}
 *     signals={signals}
 *     beforeSections={
 *       <StoreHomeShell
 *         loading={loading}
 *         onRefresh={fetchData}
 *         bannerSlot={!orderMetricsReady ? <OrderNotReadyBanner /> : null}
 *         aiSummarySlot={<AiSummarySection ... />}
 *         insights={insights}
 *         onInsightAction={navigate}
 *       />
 *     }
 *   />
 */
export function StoreHomeShell({
  title,
  subtitle,
  headerActions,
  loading = false,
  onRefresh,
  refreshLabel = '새로고침',
  storeSelectorSlot,
  bannerSlot,
  statusSlot,
  signalsSlot,
  metricsSlot,
  aiSummarySlot,
  insights,
  insightsTitle = '경영 인사이트',
  onInsightAction,
  onboardingSlot,
  beforeSections,
  children,
}: StoreHomeShellProps) {
  const refreshButton = onRefresh ? (
    <button
      type="button"
      aria-label={refreshLabel}
      className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-600 cursor-pointer whitespace-nowrap shrink-0"
      onClick={onRefresh}
      disabled={loading}
    >
      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      {refreshLabel}
    </button>
  ) : null;

  return (
    <>
      {title ? (
        <div className="flex flex-wrap justify-between items-start gap-2 mb-4 sm:mb-6">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 m-0">{title}</h1>
            {subtitle && <p className="text-xs sm:text-[13px] text-slate-500 mt-1">{subtitle}</p>}
          </div>
          {(headerActions || refreshButton) && (
            <div className="flex items-center gap-2">
              {headerActions}
              {refreshButton}
            </div>
          )}
        </div>
      ) : (
        (headerActions || refreshButton) && (
          <div className="flex justify-end items-center gap-2 mb-4 -mt-4">
            {headerActions}
            {refreshButton}
          </div>
        )
      )}

      {storeSelectorSlot}

      {bannerSlot}

      {statusSlot}

      {signalsSlot}

      {metricsSlot}

      {aiSummarySlot}

      {!loading && insights && (
        <ShellInsightBlock insights={insights} title={insightsTitle} onAction={onInsightAction} />
      )}

      {children}

      {onboardingSlot}

      {beforeSections}
    </>
  );
}
