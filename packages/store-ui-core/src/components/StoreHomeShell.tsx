/**
 * StoreHomeShell — 내 약국/내 매장 홈 본문의 canonical 셸
 *
 * 역할:
 *  - 데이터 fetch/API/권한/업무 규칙은 알지 않는다.
 *  - 서비스가 만든 홈 블록을 공통 순서와 명명된 slot으로 배치한다.
 *  - 서비스별 명칭·통계·바로가기·추가 영역은 각 서비스가 그대로 소유한다.
 */

import type { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { Card } from '@o4o/ui';
import type { StoreInsight } from '../engine/storeInsightEngine';

export interface StoreHomeShellProps {
  loading?: boolean;
  onRefresh?: () => void;
  refreshLabel?: string;

  /** 서비스 고유 홈 제목/설명. HubLayout이 제목을 소유하면 생략한다. */
  headerSlot?: ReactNode;
  /** 다중 매장 선택 등 서비스 고유 selector. */
  storeSelectorSlot?: ReactNode;
  /** 오류·feature gate·운영 알림 등 서비스 배너. */
  bannerSlot?: ReactNode;
  /** 매장/가입/운영 상태 카드. */
  statusSlot?: ReactNode;
  /** KPI·통계 요약 카드. */
  summarySlot?: ReactNode;
  /** AI 운영 요약 카드. */
  aiSummarySlot?: ReactNode;

  insights?: StoreInsight[];
  insightsTitle?: string;
  onInsightAction?: (target: string) => void;

  /** 최근 주문/최근 활동/처리 필요 등 운영 activity 영역. */
  activitySlot?: ReactNode;
  /** 초기 사용자 안내·실행 흐름 등 onboarding 영역. */
  onboardingSlot?: ReactNode;
  /** 서비스 고유 바로가기. */
  quickActionsSlot?: ReactNode;

  /** canonical slot 외 추가 영역을 위한 escape hatch. */
  beforeSections?: ReactNode;
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

export function StoreHomeShell({
  loading = false,
  onRefresh,
  refreshLabel = '새로고침',
  headerSlot,
  storeSelectorSlot,
  bannerSlot,
  statusSlot,
  summarySlot,
  aiSummarySlot,
  insights,
  insightsTitle = '경영 인사이트',
  onInsightAction,
  activitySlot,
  onboardingSlot,
  quickActionsSlot,
  beforeSections,
}: StoreHomeShellProps) {
  return (
    <>
      {onRefresh && (
        <div className="flex justify-end mb-4 -mt-4">
          <button
            type="button"
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-600 cursor-pointer"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {refreshLabel}
          </button>
        </div>
      )}

      {headerSlot}
      {storeSelectorSlot}
      {bannerSlot}
      {statusSlot}
      {summarySlot}
      {aiSummarySlot}

      {!loading && insights && (
        <ShellInsightBlock insights={insights} title={insightsTitle} onAction={onInsightAction} />
      )}

      {activitySlot}
      {onboardingSlot}
      {quickActionsSlot}
      {beforeSections}
    </>
  );
}
