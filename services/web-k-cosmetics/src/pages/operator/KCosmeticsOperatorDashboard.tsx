/**
 * KCosmeticsOperatorDashboard - Signal 기반 운영자 대시보드
 *
 * WO-K-COSMETICS-OPERATOR-DASHBOARD-UX-V1
 * WO-OPERATOR-CORE-PHASE4-KCOSMETICS: Core Shell + K-Cosmetics Config 전환
 *
 * 구조:
 *  [ Hero Summary ]     — 매장 운영 상태 배지 (3초 판단)
 *  [ Action Signals ]   — 행동 유도 카드 3장
 *  [ Recent Activity ]  — 최근 운영 활동 5건
 */

import { useState, useEffect, useCallback } from 'react';
import { OperatorLayout } from '@o4o/operator-core';
import { operatorApi, type OperatorDashboardSummary } from '@/services/operatorApi';
import { buildKCosmeticsOperatorConfig } from './operatorConfig';

export default function KCosmeticsOperatorDashboard() {
  const [summary, setSummary] = useState<OperatorDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await operatorApi.getDashboardSummary();
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

  const config = buildKCosmeticsOperatorConfig(summary);

  return (
    <OperatorLayout
      config={config}
      loading={loading}
      error={error}
      onRefresh={fetchData}
    />
  );
}
