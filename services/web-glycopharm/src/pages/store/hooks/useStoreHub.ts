/**
 * useStoreHub — Store Hub 데이터 로직 훅
 *
 * WO-STORE-HUB-MERGE-INTO-OVERVIEW-V1
 * 원본: pages/pharmacy/hub/HubPage.tsx에서 로직 분리
 *
 * 포함:
 *  - Cockpit 5종 데이터 병렬 fetch
 *  - Signal 어댑터 (buildGlycoSignals)
 *  - QuickAction 실행기 (executeAction)
 *  - Role 추출
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createSignal, createActionSignal } from '@o4o/hub-core';
import type { HubSignal, HubActionResult } from '@o4o/hub-core';
import { authClient } from '@o4o/auth-client';

// ─── Types ───

export interface AiSummaryData {
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

export interface CockpitData {
  aiSummary: AiSummaryData | null;
  todayActions: {
    todayOrders: number;
    pendingOrders: number;
    pendingReceiveOrders: number;
    pendingRequests: number;
    operatorNotices: number;
    applicationAlerts: number;
  } | null;
  signageStats: {
    enabled: boolean;
    activeContents: number;
  } | null;
  productStats: {
    total: number;
  } | null;
}

// ─── Signal Adapter ───

function buildGlycoSignals(data: CockpitData): Record<string, HubSignal> {
  const signals: Record<string, HubSignal> = {};
  const { aiSummary, todayActions } = data;

  // AI Summary 신호 (pulse: critical일 때만 — UX Guidelines §4.4)
  if (aiSummary) {
    const { riskLevel } = aiSummary.insight;
    const level = riskLevel === 'high' ? 'critical' : riskLevel === 'medium' ? 'warning' : 'info';
    signals['glycopharm.ai_summary'] = createActionSignal(level, {
      label: riskLevel === 'high' ? '주의 필요' : riskLevel === 'medium' ? '관찰' : '정상',
      pulse: riskLevel === 'high',
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

    if (todayActions.applicationAlerts > 0) {
      signals['glycopharm.pharmacy_approval'] = createSignal('warning', {
        label: '심사 대기',
        count: todayActions.applicationAlerts,
      });
    } else {
      signals['glycopharm.pharmacy_approval'] = createSignal('info', { label: '정상' });
    }
  }

  // 사이니지 신호
  if (data.signageStats) {
    if (!data.signageStats.enabled) {
      signals['glycopharm.signage'] = createSignal('info', { label: '미사용' });
    } else if (data.signageStats.activeContents === 0) {
      signals['glycopharm.signage'] = createSignal('warning', { label: '편성 없음' });
    } else {
      signals['glycopharm.signage'] = createSignal('info', {
        label: '운영중',
        count: data.signageStats.activeContents,
      });
    }
  }

  // 상품 관리 신호
  if (data.productStats) {
    if (data.productStats.total === 0) {
      signals['glycopharm.products'] = createSignal('warning', { label: '미등록' });
    } else {
      signals['glycopharm.products'] = createSignal('info', {
        label: '등록',
        count: data.productStats.total,
      });
    }
  }

  return signals;
}

// ─── QuickAction Executor ───

async function executeAction(key: string, _payload?: Record<string, unknown>): Promise<HubActionResult> {
  switch (key) {
    case 'glycopharm.trigger.review_requests': {
      // Navigate action — no API call
      return { success: true, message: '요청 페이지로 이동' };
    }
    default:
      return { success: false, message: '알 수 없는 액션' };
  }
}

// ─── Hook ───

export function useStoreHub() {
  const { user } = useAuth();
  const [cockpitData, setCockpitData] = useState<CockpitData>({
    aiSummary: null,
    todayActions: null,
    signageStats: null,
    productStats: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userRoles = useMemo(() => {
    return user?.roles ?? [];
  }, [user]);

  const signals = useMemo(() => buildGlycoSignals(cockpitData), [cockpitData]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const api = authClient.api;

    try {
      const [aiRes, actionsRes, signageRes, productsRes] = await Promise.allSettled([
        api.get('/glycopharm/pharmacy/cockpit/ai-summary'),
        api.get('/glycopharm/pharmacy/cockpit/today-actions'),
        api.get('/glycopharm/pharmacy/cockpit/franchise-services'),
        api.get('/glycopharm/pharmacy/products?pageSize=1'),
      ]);

      [aiRes, actionsRes, signageRes, productsRes].forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`[Store Hub] fetch[${i}] failed:`, r.reason);
        }
      });

      const franchiseData = signageRes.status === 'fulfilled'
        ? (signageRes.value.data as any)?.data : null;

      setCockpitData({
        aiSummary: aiRes.status === 'fulfilled' ? (aiRes.value.data as any)?.data : null,
        todayActions: actionsRes.status === 'fulfilled' ? (actionsRes.value.data as any)?.data : null,
        signageStats: franchiseData?.signage ?? null,
        productStats: productsRes.status === 'fulfilled'
          ? { total: (productsRes.value.data as any)?.data?.total ?? 0 } : null,
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

  return { cockpitData, loading, error, signals, userRoles, fetchData, handleActionTrigger };
}
