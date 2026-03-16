/**
 * GlycoPharmAdminDashboard — 4-Block 통합 Admin 대시보드
 *
 * WO-O4O-ADMIN-UX-GLYCOPHARM-PILOT-V1:
 *   @o4o/admin-ux-core 기반 4-Block 구조로 전환.
 *   "네트워크/조직 구조 중심" — Structure Snapshot + Governance Alerts 강조.
 *
 * Block 구조:
 *  [A] Structure Snapshot — 약국 네트워크 구조 지표
 *  [B] Policy Overview   — 승인/결제/템플릿 정책 현황
 *  [C] Governance Alerts  — 네트워크 구조 리스크
 *  [D] Structure Actions  — 구조 변경 진입점
 *
 * API: glycopharmApi.getAdminDashboard() — WO-O4O-OPERATOR-DASHBOARD-DATA-NORMALIZATION-V1
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
import { glycopharmApi, type OperatorDashboardData } from '@/api/glycopharm';

// ─── Data Transformer ───

function buildAdminConfig(data: OperatorDashboardData): AdminDashboardConfig {
  const { serviceStatus, storeStatus, channelStatus, contentStatus, trialStatus, productStats } = data;

  // Block A: Structure Snapshot (네트워크 구조 중심 — 매출/주문 KPI 금지)
  const structureMetrics: StructureMetric[] = [
    {
      key: 'pharmacies',
      label: '등록 약국',
      value: serviceStatus.activePharmacies,
      status: serviceStatus.activePharmacies === 0 ? 'critical' : 'stable',
    },
    {
      key: 'stores',
      label: '활성 스토어',
      value: storeStatus.activeStores,
      status: storeStatus.activeStores === 0 ? 'attention' : 'stable',
    },
    {
      key: 'inactive-stores',
      label: '비활성 스토어',
      value: storeStatus.inactiveStores,
      status: storeStatus.inactiveStores > 0 ? 'attention' : 'stable',
    },
    {
      key: 'total-products',
      label: '등록 상품',
      value: productStats.total,
    },
  ];

  // Block B: Policy Overview (구조 정책 중심)
  const policies: PolicyItem[] = [
    {
      key: 'approval-policy',
      label: '약국 승인 정책',
      status: storeStatus.pendingApprovals > 0 ? 'partial' : 'configured',
      link: '/admin/pharmacies',
    },
    {
      key: 'channel-web',
      label: '웹 채널 설정',
      status: channelStatus.web.active > 0 ? 'configured' : 'not_configured',
    },
    {
      key: 'channel-kiosk',
      label: '키오스크 채널 설정',
      status: channelStatus.kiosk.active > 0 ? 'configured' : 'not_configured',
    },
    {
      key: 'content-template',
      label: '콘텐츠 템플릿',
      status: (contentStatus.hero.total + contentStatus.featured.total) > 0 ? 'configured' : 'not_configured',
    },
  ];

  // Block C: Governance Alerts (네트워크 구조 리스크 — 핵심)
  const governanceAlerts: GovernanceAlert[] = [];

  if (storeStatus.pendingApprovals > 0) {
    governanceAlerts.push({
      id: 'ga-pending-approval',
      message: `스토어 승인 대기 ${storeStatus.pendingApprovals}건이 있습니다.`,
      level: storeStatus.pendingApprovals > 3 ? 'warning' : 'info',
      link: '/admin/pharmacies',
    });
  }

  if (storeStatus.supplementRequests > 0) {
    governanceAlerts.push({
      id: 'ga-supplement',
      message: `보완 요청 ${storeStatus.supplementRequests}건이 미처리 상태입니다.`,
      level: 'warning',
    });
  }

  if (storeStatus.inactiveStores > 0) {
    governanceAlerts.push({
      id: 'ga-inactive',
      message: `비활성 스토어 ${storeStatus.inactiveStores}개가 있습니다. 구조 정리를 검토하세요.`,
      level: storeStatus.inactiveStores > 5 ? 'warning' : 'info',
    });
  }

  const totalContent = contentStatus.hero.total + contentStatus.featured.total + contentStatus.eventNotice.total;
  if (totalContent === 0) {
    governanceAlerts.push({
      id: 'ga-no-content',
      message: '등록된 콘텐츠가 없습니다. 콘텐츠 구조를 확인하세요.',
      level: 'warning',
    });
  }

  if (trialStatus.pendingConnections > 0) {
    governanceAlerts.push({
      id: 'ga-trial-pending',
      message: `마켓 트라이얼 연결 대기 ${trialStatus.pendingConnections}건이 있습니다.`,
      level: 'info',
    });
  }

  // Block D: Structure Actions (Admin 전용 구조 진입점)
  const structureActions: StructureAction[] = [
    { id: 'sa-pharmacies', label: '약국 네트워크', link: '/admin/pharmacies', icon: '🏥', description: '약국 등록/승인 관리' },
    { id: 'sa-users', label: '회원 관리', link: '/admin/users', icon: '👥', description: '사용자 권한 관리' },
    { id: 'sa-settings', label: '설정', link: '/admin/settings', icon: '⚙️', description: '플랫폼 설정' },
  ];

  return { structureMetrics, policies, governanceAlerts, structureActions };
}

// ─── Component ───

export default function GlycoPharmAdminDashboard() {
  const [config, setConfig] = useState<AdminDashboardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await glycopharmApi.getAdminDashboard();
      if (res.success && res.data) {
        setConfig(buildAdminConfig(res.data));
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
