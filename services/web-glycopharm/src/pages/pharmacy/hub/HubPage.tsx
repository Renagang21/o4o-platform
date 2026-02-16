/**
 * GlycoPharm HubPage — AI 기반 의료 운영 허브
 *
 * WO-GLYCOPHARM-HUB-AI-TRIGGER-INTEGRATION-V1
 *
 * 구조:
 *  1. Care 운영 카드 + AI 신호 배지 (pharmacist)
 *  2. 매출/매장 카드 + 운영 신호 (pharmacist)
 *  3. 관리자 전용 카드 (glycopharm:admin)
 *  4. AI Summary 요약 (beforeSections)
 *
 * 권한: pharmacy 역할 이상
 * AI → Hub Signal → QuickAction → API 실행 → 결과 반영
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { HubLayout, createSignal, createActionSignal } from '@o4o/hub-core';
import type { HubSectionDefinition, HubSignal, HubActionResult } from '@o4o/hub-core';
import { authClient } from '@o4o/auth-client';
import {
  HeartPulse,
  MessageCircle,
  Activity,
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

// ─── Types ───

interface AiSummaryData {
  insight: {
    summary: string;
    riskLevel: 'low' | 'medium' | 'high';
    recommendedActions: string[];
    confidenceScore: number;
  };
  meta: {
    provider: string;
    model: string;
    durationMs: number;
    confidenceScore: number;
  };
}

interface CockpitData {
  aiSummary: AiSummaryData | null;
  todayActions: {
    todayOrders: number;
    pendingOrders: number;
    pendingReceiveOrders: number;
    pendingRequests: number;
    operatorNotices: number;
    applicationAlerts: number;
  } | null;
  careDashboard: {
    totalPatients: number;
    highRiskCount: number;
    moderateRiskCount: number;
    lowRiskCount: number;
    recentCoachingCount: number;
    improvingCount: number;
  } | null;
}

// ─── Icon helper ───

function LucideIcon({ Icon, color }: { Icon: React.ComponentType<{ style?: React.CSSProperties }>; color: string }) {
  return <Icon style={{ width: 22, height: 22, color }} />;
}

// ─── Section Definitions ───

const HUB_SECTIONS: HubSectionDefinition[] = [
  {
    id: 'care',
    title: 'Care 운영',
    cards: [
      {
        id: 'high-risk',
        title: '고위험 환자 관리',
        description: '고위험 환자 리뷰 및 우선 상담',
        href: '/pharmacy/patients',
        icon: <LucideIcon Icon={HeartPulse} color="#DC2626" />,
        iconBg: '#FEF2F2',
        signalKey: 'glycopharm.high_risk',
      },
      {
        id: 'coaching',
        title: '상담 세션',
        description: '환자 코칭 세션 생성 및 관리',
        href: '/pharmacy/patients',
        icon: <LucideIcon Icon={MessageCircle} color="#7C3AED" />,
        iconBg: '#F3E8FF',
        signalKey: 'glycopharm.coaching',
      },
      {
        id: 'analysis',
        title: 'CGM 분석',
        description: '혈당 분석 데이터 확인',
        href: '/pharmacy/patients',
        icon: <LucideIcon Icon={Activity} color="#0284C7" />,
        iconBg: '#F0F9FF',
        signalKey: 'glycopharm.analysis',
      },
      {
        id: 'ai-summary',
        title: 'AI 요약 리포트',
        description: 'AI 기반 약국 운영 분석',
        href: '/pharmacy',
        icon: <LucideIcon Icon={BrainCircuit} color="#059669" />,
        iconBg: '#ECFDF5',
        signalKey: 'glycopharm.ai_summary',
      },
    ],
  },
  {
    id: 'store',
    title: '매출 / 매장',
    cards: [
      {
        id: 'revenue',
        title: '매출 요약',
        description: '이번 달 매출 및 성장률',
        href: '/store',
        icon: <LucideIcon Icon={TrendingUp} color="#D97706" />,
        iconBg: '#FEF3C7',
        signalKey: 'glycopharm.revenue',
      },
      {
        id: 'pending-requests',
        title: '미처리 요청',
        description: '고객 요청 확인 및 처리',
        href: '/pharmacy/requests',
        icon: <LucideIcon Icon={ClipboardList} color="#EA580C" />,
        iconBg: '#FFF7ED',
        signalKey: 'glycopharm.pending_requests',
      },
      {
        id: 'products',
        title: '상품 관리',
        description: '등록 상품 현황 관리',
        href: '/pharmacy/products',
        icon: <LucideIcon Icon={Package} color="#2563EB" />,
        iconBg: '#EFF6FF',
      },
      {
        id: 'signage',
        title: '사이니지',
        description: '디지털 사이니지 편성 관리',
        href: '/pharmacy/signage/my',
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

// ─── Signal Adapter (Phase 2) ───

function buildGlycoSignals(data: CockpitData): Record<string, HubSignal> {
  const signals: Record<string, HubSignal> = {};
  const { aiSummary, todayActions, careDashboard } = data;

  // Care signals
  if (careDashboard) {
    const { highRiskCount, totalPatients, recentCoachingCount, improvingCount } = careDashboard;
    const highRiskRatio = totalPatients > 0 ? highRiskCount / totalPatients : 0;

    // 고위험 환자 신호
    if (highRiskCount > 0) {
      if (highRiskRatio > 0.3) {
        signals['glycopharm.high_risk'] = createActionSignal('critical', {
          label: '고위험',
          count: highRiskCount,
          pulse: true,
          action: {
            key: 'glycopharm.trigger.care_review',
            buttonLabel: '리뷰 시작',
          },
        });
      } else {
        signals['glycopharm.high_risk'] = createSignal('warning', {
          label: '고위험',
          count: highRiskCount,
        });
      }
    } else {
      signals['glycopharm.high_risk'] = createSignal('info', { label: '양호' });
    }

    // 코칭 세션 신호
    if (recentCoachingCount === 0 && highRiskCount > 0) {
      signals['glycopharm.coaching'] = createActionSignal('critical', {
        label: '미실시',
        pulse: true,
        action: {
          key: 'glycopharm.trigger.create_session',
          buttonLabel: '세션 생성',
        },
      });
    } else if (recentCoachingCount > 0) {
      signals['glycopharm.coaching'] = createSignal('info', {
        label: '최근 7일',
        count: recentCoachingCount,
      });
    }

    // 분석 (개선 추세)
    if (improvingCount > 0) {
      signals['glycopharm.analysis'] = createSignal('info', {
        label: '개선중',
        count: improvingCount,
      });
    }
  }

  // AI Summary 신호
  if (aiSummary) {
    const { riskLevel } = aiSummary.insight;
    const level = riskLevel === 'high' ? 'critical' : riskLevel === 'medium' ? 'warning' : 'info';
    signals['glycopharm.ai_summary'] = createActionSignal(level, {
      label: riskLevel === 'high' ? '주의 필요' : riskLevel === 'medium' ? '관찰' : '정상',
      action: {
        key: 'glycopharm.trigger.refresh_ai',
        buttonLabel: 'AI 재분석',
      },
    });
  }

  // 매출 신호
  if (todayActions) {
    if (todayActions.todayOrders > 0) {
      signals['glycopharm.revenue'] = createSignal('info', {
        label: '오늘 주문',
        count: todayActions.todayOrders,
      });
    }

    // 미처리 요청
    if (todayActions.pendingRequests > 0) {
      const level = todayActions.pendingRequests > 10 ? 'warning' : 'info';
      signals['glycopharm.pending_requests'] = createActionSignal(level as 'info' | 'warning', {
        label: '미처리',
        count: todayActions.pendingRequests,
        action: {
          key: 'glycopharm.trigger.review_requests',
          buttonLabel: '처리하기',
        },
      });
    }
  }

  return signals;
}

// ─── QuickAction Handler (Phase 4) ───

async function executeAction(key: string, _payload?: Record<string, unknown>): Promise<HubActionResult> {
  const api = authClient.api;

  switch (key) {
    case 'glycopharm.trigger.care_review': {
      const res = await api.post('/api/v1/glycopharm/pharmacy/hub/trigger/care-review');
      const body = res.data as any;
      return { success: body.success, message: body.data?.message || body.error?.message };
    }
    case 'glycopharm.trigger.create_session': {
      const res = await api.post('/api/v1/glycopharm/pharmacy/hub/trigger/coaching-auto-create');
      const body = res.data as any;
      return { success: body.success, message: body.data?.message || body.error?.message };
    }
    case 'glycopharm.trigger.refresh_ai': {
      const res = await api.post('/api/v1/glycopharm/pharmacy/hub/trigger/ai-refresh');
      const body = res.data as any;
      return { success: body.success, message: body.data?.message || body.error?.message };
    }
    case 'glycopharm.trigger.review_requests': {
      // Navigate action — no API call
      return { success: true, message: '요청 페이지로 이동' };
    }
    default:
      return { success: false, message: '알 수 없는 액션' };
  }
}

// ─── Component ───

export default function HubPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cockpitData, setCockpitData] = useState<CockpitData>({
    aiSummary: null,
    todayActions: null,
    careDashboard: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userRoles = useMemo(() => {
    const role = user?.role;
    return role ? [role] : [];
  }, [user]);

  const signals = useMemo(() => buildGlycoSignals(cockpitData), [cockpitData]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const api = authClient.api;

    try {
      const [aiRes, actionsRes, careRes] = await Promise.allSettled([
        api.get('/api/v1/glycopharm/pharmacy/cockpit/ai-summary'),
        api.get('/api/v1/glycopharm/pharmacy/cockpit/today-actions'),
        api.get('/api/v1/care/dashboard'),
      ]);

      setCockpitData({
        aiSummary: aiRes.status === 'fulfilled' ? (aiRes.value.data as any)?.data : null,
        todayActions: actionsRes.status === 'fulfilled' ? (actionsRes.value.data as any)?.data : null,
        careDashboard: careRes.status === 'fulfilled' ? (careRes.value.data as any)?.data : null,
      });
    } catch {
      setError('운영 데이터를 불러오지 못했습니다.');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleActionTrigger = useCallback(
    async (key: string, payload?: Record<string, unknown>): Promise<HubActionResult> => {
      try {
        const result = await executeAction(key, payload);
        // 액션 성공 시 데이터 새로고침
        if (result.success) {
          setTimeout(() => fetchData(), 1000);
        }
        return result;
      } catch {
        return { success: false, message: '실행 중 오류 발생' };
      }
    },
    [fetchData],
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
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
            <div style={styles.refreshRow}>
              <button style={styles.refreshButton} onClick={fetchData} disabled={loading}>
                <RefreshCw style={{ width: 16, height: 16, ...(loading ? { animation: 'spin 1s linear infinite' } : {}) }} />
                새로고침
              </button>
            </div>

            {/* AI Summary 카드 */}
            <section style={styles.summarySection}>
              <h2 style={styles.sectionTitle}>AI 운영 요약</h2>
              {loading ? (
                <div style={styles.loadingBox}>
                  <Loader2 style={{ width: 24, height: 24, color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
                  <span style={{ color: '#64748b', fontSize: '14px' }}>분석 중...</span>
                </div>
              ) : error ? (
                <div style={styles.errorBox}>
                  <AlertCircle style={{ width: 20, height: 20, color: '#dc2626' }} />
                  <span style={{ color: '#dc2626', fontSize: '14px' }}>{error}</span>
                </div>
              ) : cockpitData.aiSummary ? (
                <AiSummaryCard data={cockpitData.aiSummary} />
              ) : (
                <div style={styles.emptyBox}>
                  <span style={{ color: '#94a3b8', fontSize: '14px' }}>AI 요약 데이터가 없습니다.</span>
                </div>
              )}
            </section>
          </>
        }
        footerNote="허브는 각 기능의 진입점입니다. QuickAction 버튼으로 즉시 실행하거나, 카드를 클릭하여 상세 페이지로 이동하세요."
      />
    </div>
  );
}

// ─── Sub Components ───

function AiSummaryCard({ data }: { data: AiSummaryData }) {
  const { insight, meta } = data;
  const riskColor =
    insight.riskLevel === 'high' ? '#dc2626' :
    insight.riskLevel === 'medium' ? '#d97706' : '#059669';
  const riskBg =
    insight.riskLevel === 'high' ? '#fef2f2' :
    insight.riskLevel === 'medium' ? '#fffbeb' : '#ecfdf5';
  const riskLabel =
    insight.riskLevel === 'high' ? '주의' :
    insight.riskLevel === 'medium' ? '관찰' : '정상';

  return (
    <div style={styles.aiCard}>
      <div style={styles.aiCardHeader}>
        <BrainCircuit style={{ width: 20, height: 20, color: '#059669' }} />
        <span style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>약국 운영 분석</span>
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          color: riskColor,
          backgroundColor: riskBg,
          padding: '2px 8px',
          borderRadius: '10px',
        }}>
          {riskLabel}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#94a3b8' }}>
          {meta.provider} · {meta.durationMs}ms
        </span>
      </div>
      <p style={styles.aiSummaryText}>{insight.summary}</p>
      {insight.recommendedActions.length > 0 && (
        <div style={styles.aiActions}>
          {insight.recommendedActions.map((action, i) => (
            <div key={i} style={styles.aiActionItem}>
              <span style={styles.aiActionDot} />
              <span style={{ fontSize: '13px', color: '#475569' }}>{action}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Styles ───

const styles: Record<string, React.CSSProperties> = {
  refreshRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '16px',
    marginTop: '-16px',
  },
  refreshButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#4b5563',
    cursor: 'pointer',
  },
  summarySection: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 16px 0',
  },
  loadingBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '32px',
    justifyContent: 'center',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
    backgroundColor: '#FEF2F2',
    borderRadius: '8px',
  },
  emptyBox: {
    padding: '24px',
    textAlign: 'center' as const,
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  aiCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  aiCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  aiSummaryText: {
    fontSize: '14px',
    lineHeight: 1.6,
    color: '#334155',
    margin: '0 0 12px 0',
  },
  aiActions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  aiActionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  aiActionDot: {
    display: 'inline-block',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    flexShrink: 0,
  },
};
