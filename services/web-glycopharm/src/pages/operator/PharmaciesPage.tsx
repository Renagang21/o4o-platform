/**
 * Operator Pharmacies Page (Pharmacy Network Management)
 *
 * 세미-프랜차이즈 약국 네트워크 관리
 * - 약국 목록 및 상태 관리
 * - 지역별/등급별 필터링
 * - 약국 성과 모니터링
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Store,
  Search,
  MapPin,
  MoreVertical,
  Star,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Building2,
  ShoppingCart,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { DataTable, ActionBar } from '@o4o/ui';
import type { Column } from '@o4o/ui';
import {
  glycopharmApi,
  type OperatorPharmacy,
  type OperatorPharmacyStats,
  type PharmacyStatus,
  type PharmacyTier,
} from '@/api/glycopharm';
import StatusBadge from '../../components/common/StatusBadge';
import PageHeader from '../../components/common/PageHeader';

// Tab types
type TabType = 'all' | 'active' | 'pending' | 'issues';

// Empty stats constant
const EMPTY_STATS: OperatorPharmacyStats = {
  totalPharmacies: 0,
  activePharmacies: 0,
  pendingApprovals: 0,
  issuePharmacies: 0,
  totalMonthlyRevenue: 0,
  avgOrdersPerPharmacy: 0,
};

// Tier badge component
function TierBadge({ tier }: { tier: PharmacyTier }) {
  const config = {
    gold: { label: 'Gold', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    silver: { label: 'Silver', color: 'bg-slate-100 text-slate-700 border-slate-300' },
    bronze: { label: 'Bronze', color: 'bg-orange-100 text-orange-700 border-orange-300' },
    standard: { label: 'Standard', color: 'bg-slate-50 text-slate-500 border-slate-200' },
  };

  const { label, color } = config[tier];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium ${color}`}>
      <Star className="w-3 h-3" />
      {label}
    </span>
  );
}

export default function PharmaciesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPharmacy, setSelectedPharmacy] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkProcessing] = useState(false);

  // API data state
  const [pharmacies, setPharmacies] = useState<OperatorPharmacy[]>([]);
  const [stats, setStats] = useState<OperatorPharmacyStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [, setTotalPages] = useState(1);

  const itemsPerPage = 10;

  // Fetch pharmacies from API
  const fetchPharmacies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Map tab to status filter
      let statusFilter: PharmacyStatus | undefined;
      if (activeTab === 'active') statusFilter = 'active';
      else if (activeTab === 'pending') statusFilter = 'pending';
      // 'issues' tab would need backend support for multiple statuses

      const response = await glycopharmApi.getOperatorPharmacies({
        status: statusFilter,
        tier: tierFilter !== 'all' ? (tierFilter as PharmacyTier) : undefined,
        region: regionFilter !== 'all' ? regionFilter : undefined,
        search: searchTerm || undefined,
        page: currentPage,
        limit: itemsPerPage,
      });

      if (response.success && response.data) {
        setPharmacies(response.data.pharmacies);
        setStats(response.data.stats);
        setTotalItems(response.data.pagination.total);
        setTotalPages(response.data.pagination.totalPages);
      } else {
        setPharmacies([]);
        setStats(EMPTY_STATS);
        setTotalItems(0);
        setTotalPages(1);
      }
    } catch (err: any) {
      console.error('Failed to fetch pharmacies:', err);
      setError(err?.message || '약국 데이터를 불러올 수 없습니다');
      setPharmacies([]);
      setStats(EMPTY_STATS);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, currentPage, regionFilter, tierFilter, searchTerm]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchPharmacies();
  }, [fetchPharmacies]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, regionFilter, tierFilter, searchTerm]);

  // Reset selection on filter changes
  useEffect(() => {
    setSelectedIds([]);
  }, [activeTab, regionFilter, tierFilter, searchTerm]);

  // Calculate tab counts from stats
  const tabs = [
    { id: 'all' as const, label: '전체', count: stats.totalPharmacies },
    { id: 'active' as const, label: '활성', count: stats.activePharmacies },
    { id: 'pending' as const, label: '승인대기', count: stats.pendingApprovals },
    { id: 'issues' as const, label: '주의필요', count: stats.issuePharmacies },
  ];

  // Loading state
  if (isLoading && pharmacies.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="약국 네트워크"
        description="가맹 약국 관리 및 모니터링"
      />

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchPharmacies}
            className="ml-auto px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Store className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.totalPharmacies}</p>
              <p className="text-xs text-slate-500">전체 약국</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.activePharmacies}</p>
              <p className="text-xs text-slate-500">활성 약국</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.pendingApprovals}</p>
              <p className="text-xs text-slate-500">승인 대기</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.issuePharmacies}</p>
              <p className="text-xs text-slate-500">주의 필요</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{(stats.totalMonthlyRevenue / 100000000).toFixed(1)}억</p>
              <p className="text-xs text-slate-500">월 거래액</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.avgOrdersPerPharmacy}</p>
              <p className="text-xs text-slate-500">평균 주문/약국</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b border-slate-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.label}
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="약국명, 대표자명, 지역 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Region Filter */}
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            >
              <option value="all">전체 지역</option>
              <option value="서울">서울</option>
              <option value="부산">부산</option>
              <option value="인천">인천</option>
              <option value="대전">대전</option>
              <option value="대구">대구</option>
              <option value="광주">광주</option>
              <option value="경기">경기</option>
            </select>

            {/* Tier Filter */}
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            >
              <option value="all">전체 등급</option>
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
              <option value="bronze">Bronze</option>
              <option value="standard">Standard</option>
            </select>

            {/* Refresh button */}
            <button
              onClick={fetchPharmacies}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 disabled:opacity-50"
            >
              {isLoading ? '로딩...' : '새로고침'}
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {(() => {
          const selectedActiveCount = selectedIds.filter(id => {
            const p = pharmacies.find(ph => ph.id === id);
            return p?.status === 'active';
          }).length;
          const selectedInactiveCount = selectedIds.filter(id => {
            const p = pharmacies.find(ph => ph.id === id);
            return p?.status !== 'active';
          }).length;
          return (
            <div className="px-4 pt-3">
              <ActionBar
                selectedCount={selectedIds.length}
                onClearSelection={() => setSelectedIds([])}
                actions={[
                  ...(selectedActiveCount > 0 ? [{
                    key: 'suspend',
                    label: `일시 정지 (${selectedActiveCount})`,
                    onClick: () => { /* TODO: wire up pharmacy status API */ },
                    variant: 'warning' as const,
                    icon: <Clock size={14} />,
                    loading: isBulkProcessing,
                  }] : []),
                  ...(selectedInactiveCount > 0 ? [{
                    key: 'activate',
                    label: `활성화 (${selectedInactiveCount})`,
                    onClick: () => { /* TODO: wire up pharmacy status API */ },
                    variant: 'primary' as const,
                    icon: <CheckCircle size={14} />,
                    loading: isBulkProcessing,
                  }] : []),
                ]}
              />
            </div>
          );
        })()}

        {/* Table */}
        {(() => {
          const columns: Column<OperatorPharmacy>[] = [
            {
              key: 'name',
              title: '약국 정보',
              render: (_v, p) => (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.ownerName} | {p.email}</p>
                  </div>
                </div>
              ),
            },
            {
              key: 'region',
              title: '지역',
              width: '100px',
              render: (_v, p) => (
                <div className="flex items-center gap-1 text-sm text-slate-600">
                  <MapPin className="w-3 h-3" />{p.region}
                </div>
              ),
            },
            {
              key: 'tier',
              title: '등급',
              width: '100px',
              render: (_v, p) => <TierBadge tier={p.tier} />,
            },
            {
              key: 'status',
              title: '상태',
              width: '110px',
              render: (_v, p) => <StatusBadge status={p.status} />,
            },
            {
              key: 'monthlyOrders',
              title: '월 주문',
              width: '90px',
              align: 'right',
              render: (_v, p) => (
                <span className="font-medium text-slate-800">{p.monthlyOrders}<span className="text-slate-400 text-xs ml-1">건</span></span>
              ),
            },
            {
              key: 'monthlyRevenue',
              title: '월 매출',
              width: '100px',
              align: 'right',
              render: (_v, p) => (
                <span className="font-medium text-slate-800">{(p.monthlyRevenue / 10000).toLocaleString()}<span className="text-slate-400 text-xs ml-1">만원</span></span>
              ),
            },
            {
              key: 'growthRate',
              title: '성장률',
              width: '80px',
              align: 'right',
              render: (_v, p) => (
                <div className={`flex items-center justify-end gap-1 ${p.growthRate > 0 ? 'text-green-600' : p.growthRate < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                  {p.growthRate > 0 ? <TrendingUp className="w-3 h-3" /> : p.growthRate < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                  <span className="font-medium">{Math.abs(p.growthRate)}%</span>
                </div>
              ),
            },
            {
              key: 'actions',
              title: '액션',
              width: '60px',
              align: 'right',
              render: (_v, p) => (
                <div className="relative flex justify-end">
                  <button onClick={() => setSelectedPharmacy(selectedPharmacy === p.id ? null : p.id)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                    <MoreVertical className="w-4 h-4 text-slate-400" />
                  </button>
                  {selectedPharmacy === p.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setSelectedPharmacy(null)} />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-2 z-20">
                        <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">상세 보기</button>
                        <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">주문 내역</button>
                        <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">성과 분석</button>
                        <hr className="my-1" />
                        {p.status === 'active' ? (
                          <button className="w-full px-4 py-2 text-left text-sm text-amber-600 hover:bg-amber-50">일시 정지</button>
                        ) : (
                          <button className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50">활성화</button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ),
            },
          ];

          return (
            <DataTable<OperatorPharmacy>
              columns={columns}
              dataSource={pharmacies}
              rowKey="id"
              loading={isLoading}
              emptyText="자료가 없습니다"
              rowSelection={{
                selectedRowKeys: selectedIds,
                onChange: setSelectedIds,
              }}
              pagination={{
                current: currentPage,
                pageSize: itemsPerPage,
                total: totalItems,
                onChange: (p) => setCurrentPage(p),
              }}
            />
          );
        })()}
      </div>
    </div>
  );
}
