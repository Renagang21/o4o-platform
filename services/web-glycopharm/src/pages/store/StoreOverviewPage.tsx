/**
 * StoreOverviewPage — Canonical Store Hub
 *
 * WO-STORE-HUB-MERGE-INTO-OVERVIEW-V1 + WO-MENU-REALIGN-V1
 * 원본: /pharmacy/hub (PharmacyHubPage) → /store (StoreOverviewPage)
 *
 * WO-MENU-REALIGN-V1:
 * - Care 섹션 제거 (Care는 Home으로 분리)
 *
 * WO-O4O-STORE-DASHBOARD-DESIGN-REFINEMENT-V1:
 * - inline style → Tailwind, hex → theme, Card 적용
 *
 * 구조:
 *  1. 매출/매장 카드 + 운영 신호 (pharmacist)
 *  2. 관리자 전용 카드 (glycopharm:admin)
 *  3. AI Summary 요약 (beforeSections)
 *
 * 레이아웃: StoreDashboardLayout (Outlet) → HubLayout (content)
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { HubLayout } from '@o4o/hub-core';
import type { HubSectionDefinition } from '@o4o/hub-core';
import { computeStoreInsights } from '@o4o/store-ui-core';
import type { StoreInsight } from '@o4o/store-ui-core';
import { Card } from '@o4o/ui';
import {
  BrainCircuit,
  TrendingUp,
  ClipboardList,
  Package,
  Monitor,
  Building2,
  Settings,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useStoreHub } from './hooks/useStoreHub';
import type { AiSummaryData } from './hooks/useStoreHub';

// ─── Icon helper ───

function LucideIcon({ Icon, color }: { Icon: React.ComponentType<{ style?: React.CSSProperties }>; color: string }) {
  return <Icon style={{ width: 22, height: 22, color }} />;
}

// ─── Section Definitions ───

// WO-MENU-REALIGN-V1: Care 섹션 제거됨 (Care는 Home으로 분리)
const HUB_SECTIONS: HubSectionDefinition[] = [
  {
    id: 'store',
    title: '매출 / 매장',
    cards: [
      {
        id: 'revenue',
        title: '매출 요약',
        description: '이번 달 매출 및 성장률',
        href: '/store/orders',
        icon: <LucideIcon Icon={TrendingUp} color="#D97706" />,
        iconBg: '#FEF3C7',
        signalKey: 'glycopharm.revenue',
      },
      {
        id: 'pending-requests',
        title: '미처리 요청',
        description: '고객 요청 확인 및 처리',
        href: '/store/requests',
        icon: <LucideIcon Icon={ClipboardList} color="#EA580C" />,
        iconBg: '#FFF7ED',
        signalKey: 'glycopharm.pending_requests',
      },
      {
        id: 'products',
        title: '상품 관리',
        description: '등록 상품 현황 관리',
        href: '/store/products',
        icon: <LucideIcon Icon={Package} color="#2563EB" />,
        iconBg: '#EFF6FF',
        signalKey: 'glycopharm.products',
      },
      {
        id: 'signage',
        title: '사이니지',
        description: '디지털 사이니지 편성 관리',
        href: '/store/signage/my',
        icon: <LucideIcon Icon={Monitor} color="#6D28D9" />,
        iconBg: '#F5F3FF',
        signalKey: 'glycopharm.signage',
      },
    ],
  },
  {
    id: 'admin',
    title: '관리자 전용',
    badge: 'Admin',
    roles: ['operator', 'glycopharm:admin'],
    cards: [
      {
        id: 'pharmacy-approval',
        title: '약국 등록 승인',
        description: '신규 약국 참여 신청 심사',
        href: '/operator/applications',
        icon: <LucideIcon Icon={Building2} color="#DC2626" />,
        iconBg: '#FEF2F2',
        signalKey: 'glycopharm.pharmacy_approval',
      },
      {
        id: 'policy',
        title: '정책 설정',
        description: '운영 정책 및 서비스 설정',
        href: '/operator/settings',
        icon: <LucideIcon Icon={Settings} color="#475569" />,
        iconBg: '#F1F5F9',
      },
    ],
  },
];

// ─── AI Summary Card ───

function AiSummaryCard({ data }: { data: AiSummaryData }) {
  const { insight, meta } = data;

  const riskClass =
    insight.riskLevel === 'high' ? 'text-red-600 bg-red-50' :
    insight.riskLevel === 'medium' ? 'text-amber-600 bg-amber-50' :
    'text-emerald-600 bg-emerald-50';
  const riskLabel =
    insight.riskLevel === 'high' ? '주의' :
    insight.riskLevel === 'medium' ? '관찰' : '정상';

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <BrainCircuit className="w-5 h-5 text-emerald-600" />
        <span className="text-[15px] font-semibold text-slate-800">약국 운영 분석</span>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-[10px] ${riskClass}`}>
          {riskLabel}
        </span>
        <span className="ml-auto text-[11px] text-slate-400">
          {meta.provider} · {meta.durationMs}ms
        </span>
      </div>
      <p className="text-sm leading-relaxed text-slate-700 m-0 mb-3">{insight.summary}</p>
      {insight.recommendedActions.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {insight.recommendedActions.map((action, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              <span className="text-[13px] text-slate-600">{action}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Insight Block (WO-STORE-AI-INSIGHT-LAYER-V1) ───

function InsightBlock({ insights, onNavigate }: { insights: StoreInsight[]; onNavigate: (path: string) => void }) {
  if (insights.length === 0) return null;
  const levelIcon = (l: StoreInsight['level']) =>
    l === 'critical' ? '🔴' : l === 'warning' ? '🟡' : '🔵';

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-slate-800 mb-4 mt-0">경영 인사이트</h2>
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
                  onClick={() => onNavigate(ins.action!.target)}
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

// ─── Component ───

export default function StoreOverviewPage() {
  const navigate = useNavigate();
  const { cockpitData, loading, error, signals, userRoles, fetchData, handleActionTrigger } = useStoreHub();

  // WO-STORE-AI-INSIGHT-LAYER-V1: Rule-based insights
  const insights = useMemo(() => {
    const pendingOrders = cockpitData.todayActions?.pendingOrders ?? 0;
    const pendingReceive = cockpitData.todayActions?.pendingReceiveOrders ?? 0;
    const signageEnabled = cockpitData.signageStats?.enabled ? 1 : 0;
    const totalChannels = cockpitData.signageStats ? 1 : 0;

    return computeStoreInsights({
      monthlyRevenue: 0, // API 미연결 — Phase 2+
      totalOrders: cockpitData.todayActions?.todayOrders ?? 0,
      inProgressOrders: pendingOrders + pendingReceive,
      activeChannels: signageEnabled,
      totalChannels,
      visibleProducts: cockpitData.productStats?.total ?? 0,
    });
  }, [cockpitData]);

  return (
    <HubLayout
      title="의료 운영 허브"
      subtitle="AI 기반 약국 운영 현황을 한눈에 확인하고 실행하세요"
      sections={HUB_SECTIONS}
      userRoles={userRoles}
      signals={signals}
      onCardClick={(href) => navigate(href)}
      onActionTrigger={handleActionTrigger}
      beforeSections={
        <>
          {/* 새로고침 버튼 */}
          <div className="flex justify-end mb-4 -mt-4">
            <button
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-600 cursor-pointer"
              onClick={fetchData}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </button>
          </div>

          {/* AI Summary 카드 */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 mt-0">AI 운영 요약</h2>
            {loading ? (
              <div className="flex items-center justify-center gap-2.5 py-8">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <span className="text-sm text-slate-500">분석 중...</span>
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 p-4 bg-red-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm text-red-600">{error}</span>
              </div>
            ) : cockpitData.aiSummary ? (
              <AiSummaryCard data={cockpitData.aiSummary} />
            ) : (
              <Card className="p-6 text-center">
                <span className="text-sm text-slate-400">AI 요약 데이터가 없습니다.</span>
              </Card>
            )}
          </section>

          {/* WO-STORE-AI-INSIGHT-LAYER-V1 + WO-STORE-INSIGHT-ACTION-BRIDGE-V1 */}
          {!loading && <InsightBlock insights={insights} onNavigate={navigate} />}
        </>
      }
      footerNote="허브는 각 기능의 진입점입니다. QuickAction 버튼으로 즉시 실행하거나, 카드를 클릭하여 상세 페이지로 이동하세요."
    />
  );
}
