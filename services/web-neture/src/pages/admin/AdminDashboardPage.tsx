/**
 * AdminDashboardPage — 4-Block Admin 전용 대시보드
 *
 * WO-O4O-ADMIN-OPERATOR-DASHBOARD-SEPARATION-V1
 *
 * Admin 전용 API (/neture/admin/dashboard) 직접 호출.
 * 5-Block operator 데이터 변환 제거 — 백엔드에서 4-Block 직접 반환.
 *
 * Block 구조:
 *  [A] Structure Snapshot — 구조 지표 (사용자, 공급사, 승인, 파트너)
 *  [B] Policy Overview   — 승인 현황 (상품, 공급사, 가입, 파트너)
 *  [C] Governance Alerts  — AI 기반 거버넌스 경고
 *  [D] Structure Actions  — 구조 변경 진입점
 */

import { useState, useEffect, useCallback } from 'react';
import { AdminDashboardLayout, type AdminDashboardConfig } from '@o4o/admin-ux-core';
import { fetchAdminDashboard } from '../../lib/api/dashboard';

export default function AdminDashboardPage() {
  const [config, setConfig] = useState<AdminDashboardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminDashboard();
      if (data) {
        setConfig(data as AdminDashboardConfig);
      } else {
        setError('관리자 권한이 필요하거나 데이터를 불러올 수 없습니다.');
      }
    } catch (err) {
      console.error('Failed to fetch admin dashboard:', err);
      setError('데이터를 불러오지 못했습니다.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 mb-4">{error || '데이터를 불러올 수 없습니다.'}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return <AdminDashboardLayout config={config} />;
}
