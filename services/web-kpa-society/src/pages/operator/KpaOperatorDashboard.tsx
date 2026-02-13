/**
 * KpaOperatorDashboard - KPA-a 커뮤니티 운영자 대시보드
 *
 * WO-KPA-A-OPERATOR-DASHBOARD-UX-V1
 * WO-OPERATOR-CORE-PHASE1-KPA: Core Shell + KPA Config 전환
 * WO-OPERATOR-AI-ACTION-LAYER-V1: AI 행동 제안 패널 추가
 *
 * 구조:
 *  [ Hero Summary ]     — 커뮤니티 상태 배지 (3초 판단)
 *  [ Action Panel ]     — AI 행동 제안 (alert/warning 기반)
 *  [ Action Signals ]   — 행동 유도 카드 3장
 *  [ Recent Activity ]  — 최근 운영 활동 5건
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { OperatorLayout, generateOperatorActions } from '@o4o/operator-core';
import { operatorApi, type OperatorSummary } from '../../api/operator';
import { buildKpaOperatorConfig } from './operatorConfig';

export default function KpaOperatorDashboard() {
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
      console.error('Failed to fetch operator dashboard:', err);
      setError('데이터를 불러오지 못했습니다.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const config = buildKpaOperatorConfig(summary);
  const actions = useMemo(
    () => (config ? generateOperatorActions(config.signalCards) : []),
    [config],
  );

  return (
    <OperatorLayout
      config={config}
      loading={loading}
      error={error}
      onRefresh={fetchData}
      actions={actions}
      onActionNavigate={(route) => navigate(route)}
    />
  );
}
