/**
 * DashboardPage — 분회 관리자 4-Block 통합 대시보드 + 회계 섹션
 *
 * WO-O4O-OPERATOR-UX-KPA-B-PILOT-V1:
 *   @o4o/admin-ux-core 기반 4-Block 구조로 전환.
 *   기존 API(branchAdminApi) 재사용.
 *   회계 섹션(단식부기)은 4-Block 외부에 보존.
 *
 * Block 구조:
 *  [A] Structure Snapshot — 전체 회원, 활성 회원, 신상신고 대기, 연회비 대기
 *  [B] Policy Overview   — 연회비 정책, 신상신고 정책, 분회 설정
 *  [C] Governance Alerts  — 미처리 항목 경고
 *  [D] Structure Actions  — 빠른 작업 진입점
 *  ─────────────────────
 *  [회계 현황]           — 단식부기 (4-Block 외부, 보존)
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  AdminDashboardLayout,
  type AdminDashboardConfig,
  type StructureMetric,
  type PolicyItem,
  type GovernanceAlert,
  type StructureAction,
} from '@o4o/admin-ux-core';
import { AiSummaryButton } from '../../components/ai';
import { branchAdminApi, type BranchDashboardStats } from '../../api/branchAdmin';

// ─── Accounting Types (단식부기) ───

interface AccountingEntry {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  balance: number;
}

// ─── Data Transformer ───

function buildAdminConfig(
  stats: BranchDashboardStats,
  basePath: string,
): AdminDashboardConfig {
  // Block A: Structure Snapshot
  const structureMetrics: StructureMetric[] = [
    {
      key: 'total-members',
      label: '전체 회원',
      value: stats.totalMembers,
      status: stats.totalMembers === 0 ? 'attention' : 'stable',
    },
    {
      key: 'active-members',
      label: '활성 회원',
      value: stats.activeMembers,
      status: stats.activeMembers === 0 ? 'attention' : 'stable',
    },
    {
      key: 'pending-reports',
      label: '신상신고 대기',
      value: stats.pendingAnnualReports,
      status: stats.pendingAnnualReports > 0 ? 'attention' : 'stable',
    },
    {
      key: 'pending-fees',
      label: '연회비 대기',
      value: stats.pendingMembershipFees,
      status: stats.pendingMembershipFees > 0 ? 'attention' : 'stable',
    },
  ];

  // Block B: Policy Overview
  const policies: PolicyItem[] = [
    {
      key: 'membership-fee-policy',
      label: '연회비 정책',
      status: 'configured',
      link: `${basePath}/membership-fee`,
    },
    {
      key: 'annual-report-policy',
      label: '신상신고 정책',
      status: stats.pendingAnnualReports > 0 ? 'partial' : 'configured',
      link: `${basePath}/annual-report`,
    },
    {
      key: 'branch-settings',
      label: '분회 설정',
      status: 'configured',
      link: `${basePath}/settings`,
    },
  ];

  // Block C: Governance Alerts
  const governanceAlerts: GovernanceAlert[] = [];
  if (stats.pendingAnnualReports > 0) {
    governanceAlerts.push({
      id: 'ga-annual-report',
      message: `신상신고 대기 ${stats.pendingAnnualReports}건이 있습니다. 검토가 필요합니다.`,
      level: stats.pendingAnnualReports > 5 ? 'warning' : 'info',
      link: `${basePath}/annual-report`,
    });
  }
  if (stats.pendingMembershipFees > 0) {
    governanceAlerts.push({
      id: 'ga-membership-fee',
      message: `연회비 미납 ${stats.pendingMembershipFees}건이 있습니다.`,
      level: stats.pendingMembershipFees > 10 ? 'warning' : 'info',
      link: `${basePath}/membership-fee`,
    });
  }
  if (stats.totalMembers === 0) {
    governanceAlerts.push({
      id: 'ga-no-members',
      message: '등록된 회원이 없습니다. 회원 구조를 확인하세요.',
      level: 'warning',
    });
  }

  // Block D: Structure Actions
  const structureActions: StructureAction[] = [
    { id: 'sa-members', label: '회원 관리', link: `${basePath}/members`, icon: '👥', description: '회원 목록 조회 및 관리' },
    { id: 'sa-annual-report', label: '신상신고 처리', link: `${basePath}/annual-report`, icon: '📝', description: '제출된 신상신고서 검토' },
    { id: 'sa-membership-fee', label: '연회비 관리', link: `${basePath}/membership-fee`, icon: '💰', description: '연회비 납부 현황 확인' },
    { id: 'sa-news', label: '공지사항 작성', link: `${basePath}/news/new`, icon: '📢', description: '새 공지사항 등록' },
    { id: 'sa-officers', label: '임원 관리', link: `${basePath}/officers`, icon: '👔', description: '임원 정보 관리' },
    { id: 'sa-settings', label: '분회 설정', link: `${basePath}/settings`, icon: '⚙️', description: '분회 기본 정보 설정' },
  ];

  return { structureMetrics, policies, governanceAlerts, structureActions };
}

// ─── Accounting Section (4-Block 외부) ───

const MOCK_ACCOUNTING_ENTRIES: AccountingEntry[] = [
  { id: '1', date: '2025-01-02', type: 'income', category: '연회비', description: '1월 연회비 수납 (10명)', amount: 1000000, balance: 5500000 },
  { id: '2', date: '2025-01-03', type: 'expense', category: '운영비', description: '회의실 이용료', amount: 100000, balance: 5400000 },
  { id: '3', date: '2025-01-04', type: 'expense', category: '행사비', description: '신년회 경비', amount: 300000, balance: 5100000 },
  { id: '4', date: '2025-01-05', type: 'income', category: '기타', description: '광고 수입', amount: 200000, balance: 5300000 },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
}

function AccountingSection({ entries, branchId }: { entries: AccountingEntry[]; branchId?: string }) {
  const summary = {
    totalIncome: entries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0),
    totalExpense: entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0),
    currentBalance: entries.length > 0 ? entries[entries.length - 1].balance : 0,
  };

  const handleExcelDownload = () => {
    const BOM = '\uFEFF';
    const headers = ['날짜', '구분', '분류', '적요', '수입', '지출', '잔액'];
    const rows = entries.map(entry => [
      entry.date,
      entry.type === 'income' ? '수입' : '지출',
      entry.category,
      entry.description,
      entry.type === 'income' ? entry.amount : '',
      entry.type === 'expense' ? entry.amount : '',
      entry.balance,
    ]);
    const csvContent = BOM + [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `분회_회계_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-900">회계 현황</h2>
          <AiSummaryButton
            label="AI 분석"
            contextLabel="분회 회계 현황"
            size="sm"
            serviceId="kpa-society"
            contextData={{
              role: 'branch_admin',
              summary,
              recentEntries: entries.slice(0, 5),
              period: '2025년 1월',
              organizationType: 'branch',
              branchId,
            }}
          />
        </div>
        <button
          onClick={handleExcelDownload}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-md hover:bg-emerald-600 transition-colors"
        >
          엑셀 다운로드
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-50 rounded-lg p-5 text-center">
          <div className="text-sm text-slate-500 mb-2">총 수입</div>
          <div className="text-xl font-bold text-emerald-600">{formatCurrency(summary.totalIncome)}</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-5 text-center">
          <div className="text-sm text-slate-500 mb-2">총 지출</div>
          <div className="text-xl font-bold text-red-600">{formatCurrency(summary.totalExpense)}</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-5 text-center">
          <div className="text-sm text-slate-500 mb-2">현재 잔액</div>
          <div className="text-xl font-bold text-slate-700">{formatCurrency(summary.currentBalance)}</div>
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[100px_70px_80px_1fr_120px_120px] px-4 py-3 bg-slate-100 text-xs font-semibold text-slate-600">
          <span>날짜</span>
          <span>구분</span>
          <span>분류</span>
          <span>적요</span>
          <span className="text-right">금액</span>
          <span className="text-right">잔액</span>
        </div>
        {entries.slice(0, 5).map((entry) => (
          <div key={entry.id} className="grid grid-cols-[100px_70px_80px_1fr_120px_120px] px-4 py-3 border-t border-slate-100 text-sm items-center">
            <span className="text-slate-600">{entry.date}</span>
            <span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                entry.type === 'income'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {entry.type === 'income' ? '수입' : '지출'}
              </span>
            </span>
            <span className="text-slate-700">{entry.category}</span>
            <span className="text-slate-800">{entry.description}</span>
            <span className={`text-right font-medium ${
              entry.type === 'income' ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {entry.type === 'income' ? '+' : '-'}{formatCurrency(entry.amount)}
            </span>
            <span className="text-right text-slate-700">{formatCurrency(entry.balance)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───

export function DashboardPage() {
  const { branchId } = useParams();
  const basePath = `/branch/${branchId}/admin`;

  const [config, setConfig] = useState<AdminDashboardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statsRes = await branchAdminApi.getDashboardStats().catch(() => null);
      if (statsRes?.data) {
        setConfig(buildAdminConfig(statsRes.data, basePath));
      }
    } catch (err) {
      console.error('Failed to fetch branch admin dashboard:', err);
      setError('데이터를 불러오지 못했습니다.');
    }
    setLoading(false);
  }, [basePath]);

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

  return (
    <div>
      <AdminDashboardLayout config={config} />
      <AccountingSection entries={MOCK_ACCOUNTING_ENTRIES} branchId={branchId} />
    </div>
  );
}
