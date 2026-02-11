/**
 * NetureOperatorDashboard - Signal 기반 운영자 대시보드
 *
 * WO-NETURE-OPERATOR-DASHBOARD-UX-V1
 * WO-OPERATOR-CORE-PHASE2-NETURE: Core Shell + Neture Config 전환
 *
 * 구조:
 *  [ Hero Summary ]     — 플랫폼 상태 배지 (3초 판단)
 *  [ Action Signals ]   — 행동 유도 카드 3장
 *  [ Recent Activity ]  — 최근 운영 활동 5건
 */

import { useState, useEffect, useCallback } from 'react';
import { OperatorLayout } from '@o4o/operator-core';
import { dashboardApi, type AdminDashboardSummary } from '../../lib/api';
import { buildNetureOperatorConfig } from './operatorConfig';

export default function NetureOperatorDashboard() {
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

  return (
    <OperatorLayout
      config={config}
      loading={loading}
      error={error}
      onRefresh={fetchData}
    />
  );
}
