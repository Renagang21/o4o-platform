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
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { AdminDashboardLayout, type AdminDashboardConfig } from '@o4o/admin-ux-core';
import { fetchAdminDashboard } from '../../lib/api/dashboard';
// WO-O4O-PLATFORM-ADMIN-ROLE-BASED-ENTRYPOINT-V1: platform 권한자 전용 진입점
import { useAuth } from '../../contexts/AuthContext';
import { hasPlatformAdminRole } from '../../lib/role-constants';

/** platform 권한자에게만 보이는 /admin/platform 진입 카드 (neture:admin 단독엔 미노출). */
function PlatformEntryCard() {
  return (
    <Link
      to="/admin/platform"
      className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-400 transition-colors no-underline"
    >
      <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
        <ShieldCheck className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800">O4O 플랫폼 관리</p>
        <p className="text-xs text-slate-500">여러 서비스에 영향을 주는 플랫폼 계정 · 서비스 · 권한 정책을 관리합니다.</p>
      </div>
      <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 shrink-0">
        플랫폼 관리로 이동 <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </span>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const showPlatform = hasPlatformAdminRole(user?.roles);
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
      <div className="space-y-6">
        {showPlatform && <PlatformEntryCard />}
        <div className="text-center py-20">
          <p className="text-slate-500 mb-4">{error || '데이터를 불러올 수 없습니다.'}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">관리자 대시보드</h1>
        <p className="text-sm text-slate-500 mt-1">구조 지표 · 정책 현황 · 거버넌스 경고</p>
      </div>
      {showPlatform && <PlatformEntryCard />}
      <AdminDashboardLayout config={config} />
    </div>
  );
}
