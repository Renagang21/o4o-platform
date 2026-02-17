/**
 * AdminDashboardPage — 4-Block 통합 Admin 대시보드
 *
 * WO-O4O-ADMIN-UX-NETURE-PILOT-V1:
 *   @o4o/admin-ux-core 기반 4-Block 구조로 전환.
 *   "AI 중심형" — Structure Snapshot + Governance Alerts 강조.
 *
 * Block 구조:
 *  [A] Structure Snapshot — 공급자, 파트너, 승인대기, 콘텐츠
 *  [B] Policy Overview   — AI 정책, 승인 정책, 이메일 설정
 *  [C] Governance Alerts  — 구조 경고 (승인 대기, 파트너 요청, 콘텐츠 부재)
 *  [D] Structure Actions  — 구조 변경 진입점
 *
 * API 재사용: dashboardApi.getAdminDashboardSummary()
 */

import { useState, useEffect, useCallback } from 'react';
import {
  AdminDashboardLayout,
  type AdminDashboardConfig,
  type StructureMetric,
  type PolicyItem,
  type GovernanceAlert,
  type StructureAction,
} from '@o4o/admin-ux-core';
import { dashboardApi, type AdminDashboardSummary } from '../../lib/api';

// ─── Data Transformer ───

function buildAdminConfig(summary: AdminDashboardSummary): AdminDashboardConfig {
  const { stats } = summary;

  // Block A: Structure Snapshot
  const structureMetrics: StructureMetric[] = [
    {
      key: 'suppliers',
      label: '등록 공급자',
      value: stats.totalSuppliers ?? 0,
      status: (stats.totalSuppliers ?? 0) === 0 ? 'attention' : 'stable',
    },
    {
      key: 'active-suppliers',
      label: '활성 공급자',
      value: stats.activeSuppliers ?? 0,
      status: (stats.activeSuppliers ?? 0) === 0 ? 'attention' : 'stable',
    },
    {
      key: 'partnerships',
      label: '파트너십 요청',
      value: stats.totalPartnershipRequests ?? 0,
    },
    {
      key: 'pending',
      label: '승인 대기',
      value: stats.pendingRequests ?? 0,
      status: (stats.pendingRequests ?? 0) > 0 ? 'attention' : 'stable',
    },
  ];

  // Block B: Policy Overview
  const policies: PolicyItem[] = [
    {
      key: 'ai-policy',
      label: 'AI 엔진 정책',
      status: 'configured',
      link: '/admin/ai',
    },
    {
      key: 'approval-policy',
      label: '공급자 승인 정책',
      status: (stats.pendingRequests ?? 0) > 0 ? 'partial' : 'configured',
      link: '/admin/suppliers',
    },
    {
      key: 'email-settings',
      label: '이메일 설정 (SMTP)',
      status: 'configured',
      link: '/admin/settings/email',
    },
  ];

  // Block C: Governance Alerts
  const governanceAlerts: GovernanceAlert[] = [];

  if ((stats.pendingRequests ?? 0) > 0) {
    governanceAlerts.push({
      id: 'ga-pending',
      message: `승인 대기 ${stats.pendingRequests}건이 있습니다. 검토가 필요합니다.`,
      level: (stats.pendingRequests ?? 0) > 5 ? 'warning' : 'info',
      link: '/admin/suppliers',
    });
  }

  if ((stats.openPartnershipRequests ?? 0) > 0) {
    governanceAlerts.push({
      id: 'ga-partnership',
      message: `미처리 파트너십 요청 ${stats.openPartnershipRequests}건이 있습니다.`,
      level: 'info',
      link: '/admin/partners',
    });
  }

  const publishedContents = stats.publishedContents ?? 0;
  if (publishedContents === 0) {
    governanceAlerts.push({
      id: 'ga-no-content',
      message: '발행된 콘텐츠가 없습니다. 콘텐츠 구조를 확인하세요.',
      level: 'warning',
    });
  }

  // Block D: Structure Actions
  const structureActions: StructureAction[] = [
    { id: 'sa-suppliers', label: '공급자 관리', link: '/admin/suppliers', icon: '📦', description: '공급자 등록/승인' },
    { id: 'sa-partners', label: '파트너 관리', link: '/admin/partners', icon: '🤝', description: '파트너십 관리' },
    { id: 'sa-services', label: '서비스 관리', link: '/admin/services', icon: '🏪', description: '서비스 구조 설정' },
    { id: 'sa-operators', label: '운영자 관리', link: '/workspace/admin/operators', icon: '👥', description: '운영자 권한 관리' },
    { id: 'sa-ai', label: 'AI 제어판', link: '/admin/ai', icon: '🎛️', description: 'AI 엔진/정책 설정' },
    { id: 'sa-email', label: '이메일 설정', link: '/admin/settings/email', icon: '📧', description: 'SMTP 구성' },
  ];

  return { structureMetrics, policies, governanceAlerts, structureActions };
}

// ─── Component ───

export default function AdminDashboardPage() {
  const [config, setConfig] = useState<AdminDashboardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardApi.getAdminDashboardSummary();
      setConfig(buildAdminConfig(data));
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
