/**
 * NetureOperatorDashboard - Signal 기반 운영자 대시보드
 *
 * WO-NETURE-OPERATOR-DASHBOARD-UX-V1
 * WO-OPERATOR-CORE-PHASE2-NETURE: Core Shell + Neture Config 전환
 * WO-OPERATOR-AI-ACTION-LAYER-V1: AI 행동 제안 패널 추가
 * WO-OPERATOR-ACTION-TRIGGER-V1: 즉시 실행 트리거 추가
 *
 * 구조:
 *  [ Hero Summary ]     — 플랫폼 상태 배지 (3초 판단)
 *  [ Action Panel ]     — AI 행동 제안 + 즉시 실행 트리거
 *  [ Action Signals ]   — 행동 유도 카드 3장
 *  [ Recent Activity ]  — 최근 운영 활동 5건
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  OperatorLayout,
  generateOperatorActions,
  type OperatorActionSuggestion,
} from '@o4o/operator-core';
import { dashboardApi, type AdminDashboardSummary } from '../../lib/api';
import { buildNetureOperatorConfig } from './operatorConfig';

// ─── Trigger Definitions ───

const TRIGGER_ACTIONS: OperatorActionSuggestion[] = [
  {
    id: 'trigger-refreshSummary',
    priority: 'low',
    title: '대시보드 데이터 새로고침',
    description: '최신 운영 현황을 다시 불러옵니다',
    actionType: 'trigger',
    trigger: { key: 'refreshSummary' },
  },
];

export default function NetureOperatorDashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardApi.getAdminDashboardSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to fetch operator dashboard:', err);
      setError('데이터를 불러오지 못했습니다.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const config = buildNetureOperatorConfig(summary);
  const actions = useMemo(
    () => config
      ? [...generateOperatorActions(config.signalCards), ...TRIGGER_ACTIONS]
      : [],
    [config],
  );

  const handleTrigger = useCallback(async (key: string) => {
    switch (key) {
      case 'refreshSummary':
        await fetchData();
        break;
    }
  }, [fetchData]);

  return (
    <OperatorLayout
      config={config}
      loading={loading}
      error={error}
      onRefresh={fetchData}
      actions={actions}
      onActionNavigate={(route) => navigate(route)}
      onActionTrigger={handleTrigger}
    />
  );
}
