/**
 * BranchOperatorDashboard - 분회 운영자 대시보드
 *
 * WO-KPA-C-BRANCH-OPERATOR-DASHBOARD-UX-V1
 * WO-OPERATOR-CORE-PHASE1-KPA: Core Shell + Branch Config 전환
 * WO-OPERATOR-AI-ACTION-LAYER-V1: AI 행동 제안 패널 추가
 * WO-OPERATOR-ACTION-TRIGGER-V1: 즉시 실행 트리거 추가
 *
 * 구조:
 *  [ Hero Summary ]     — 분회 상태 배지 + 서브 메시지
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
import { operatorApi, type OperatorSummary } from '../../api/operator';
import { buildBranchOperatorConfig } from '../operator/operatorConfig';

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

export function BranchOperatorDashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<OperatorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await operatorApi.getSummary();
      setSummary(res.data);
    } catch (err) {
      console.error('Failed to fetch branch operator dashboard:', err);
      setError('데이터를 불러오지 못했습니다.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const config = buildBranchOperatorConfig(summary);
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
