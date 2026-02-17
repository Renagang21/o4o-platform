/**
 * AdminDashboardPage — 4-Block 통합 Admin 대시보드
 *
 * WO-O4O-OPERATOR-UX-KPA-C-PILOT-V1:
 *   @o4o/admin-ux-core 기반 4-Block 구조로 전환.
 *   기존 커스텀 UI(통계 카드 + 퀵 메뉴)를 교체.
 *   기존 API(adminApi.getDashboardStats())를 그대로 활용.
 *
 * Block 구조:
 *  [A] Structure Snapshot — 분회, 회원, 승인 대기, 공동구매
 *  [B] Policy Overview   — 가입 승인 정책, 역할 부여 정책, 서비스 접근 정책
 *  [C] Governance Alerts  — 미처리 승인, 구조 이상 경고
 *  [D] Structure Actions  — 관리 페이지 진입점
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
import { adminApi } from '../../api/admin';

// ─── Types ───

interface DashboardStats {
  totalBranches: number;
  totalMembers: number;
  pendingApprovals: number;
  activeGroupbuys: number;
  recentPosts: number;
}

// ─── Data Transformer ───

function buildAdminConfig(stats: DashboardStats): AdminDashboardConfig {
  // Block A: Structure Snapshot
  const structureMetrics: StructureMetric[] = [
    {
      key: 'branches',
      label: '등록 분회',
      value: stats.totalBranches,
      status: stats.totalBranches === 0 ? 'attention' : 'stable',
    },
    {
      key: 'members',
      label: '전체 회원',
      value: stats.totalMembers,
      status: stats.totalMembers === 0 ? 'attention' : 'stable',
    },
    {
      key: 'pending',
      label: '승인 대기',
      value: stats.pendingApprovals,
      status: stats.pendingApprovals > 0 ? 'attention' : 'stable',
    },
    {
      key: 'groupbuys',
      label: '진행 공동구매',
      value: stats.activeGroupbuys,
    },
  ];

  // Block B: Policy Overview
  const policies: PolicyItem[] = [
    {
      key: 'approval-policy',
      label: '가입 승인 정책',
      status: stats.pendingApprovals > 0 ? 'partial' : 'configured',
      link: '/admin/organization-requests',
    },
    {
      key: 'role-policy',
      label: '역할 부여 정책',
      status: 'configured',
      link: '/admin/members',
    },
    {
      key: 'service-policy',
      label: '서비스 접근 정책',
      status: 'configured',
      link: '/admin/service-enrollments',
    },
  ];

  // Block C: Governance Alerts
  const governanceAlerts: GovernanceAlert[] = [];
  if (stats.pendingApprovals > 0) {
    governanceAlerts.push({
      id: 'ga-pending',
      message: `승인 대기 ${stats.pendingApprovals}건이 있습니다. 검토가 필요합니다.`,
      level: stats.pendingApprovals > 5 ? 'warning' : 'info',
      link: '/admin/organization-requests',
    });
  }
  if (stats.totalBranches === 0) {
    governanceAlerts.push({
      id: 'ga-no-branches',
      message: '등록된 분회가 없습니다. 조직 구조를 설정하세요.',
      level: 'warning',
      link: '/admin/divisions',
    });
  }
  if (stats.totalMembers === 0) {
    governanceAlerts.push({
      id: 'ga-no-members',
      message: '등록된 회원이 없습니다.',
      level: 'warning',
    });
  }

  // Block D: Structure Actions
  const structureActions: StructureAction[] = [
    { id: 'sa-branches', label: '분회 관리', link: '/admin/divisions', icon: '🏢', description: '분회 생성, 수정, 삭제' },
    { id: 'sa-members', label: '회원 관리', link: '/admin/members', icon: '👥', description: '회원 목록, 승인, 관리' },
    { id: 'sa-officers', label: '임원 관리', link: '/admin/officers', icon: '👔', description: '임원진 등록 및 수정' },
    { id: 'sa-requests', label: '조직 요청', link: '/admin/organization-requests', icon: '📋', description: '가입/역할 요청 처리' },
    { id: 'sa-news', label: '공지 관리', link: '/admin/news', icon: '📰', description: '공지사항 작성 및 관리' },
    { id: 'sa-settings', label: '설정', link: '/admin/settings', icon: '⚙️', description: '지부 설정' },
  ];

  return { structureMetrics, policies, governanceAlerts, structureActions };
}

// ─── Component ───

export function AdminDashboardPage() {
  const [config, setConfig] = useState<AdminDashboardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getDashboardStats();
      setConfig(buildAdminConfig(res.data));
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
