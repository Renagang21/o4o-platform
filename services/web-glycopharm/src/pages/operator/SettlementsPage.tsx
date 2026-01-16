/**
 * Operator Settlements Page (Settlement Management)
 *
 * 세미-프랜차이즈 정산 관리
 * - 약국별 정산 현황
 * - 정산 주기 관리
 * - 수수료 정책
 */

import { useState } from 'react';
import {
  CreditCard,
  Search,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Calendar,
  Store,
  DollarSign,
  TrendingUp,
  FileText,
  RefreshCw,
} from 'lucide-react';

// Types
interface Settlement {
  id: string;
  pharmacyName: string;
  pharmacyRegion: string;
  period: string;
  totalSales: number;
  commission: number;
  netAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  scheduledDate: string;
  completedDate?: string;
}

type TabType = 'all' | 'pending' | 'processing' | 'completed';

// Sample data
const sampleSettlements: Settlement[] = [
  {
    id: '1',
    pharmacyName: '건강한약국',
    pharmacyRegion: '서울 강남구',
    period: '2025년 1월 1주차',
    totalSales: 12500000,
    commission: 625000,
    netAmount: 11875000,
    status: 'pending',
    scheduledDate: '2025-01-20',
  },
  {
    id: '2',
    pharmacyName: '행복약국',
    pharmacyRegion: '서울 마포구',
    period: '2025년 1월 1주차',
    totalSales: 7200000,
    commission: 360000,
    netAmount: 6840000,
    status: 'processing',
    scheduledDate: '2025-01-20',
  },
  {
    id: '3',
    pharmacyName: '사랑약국',
    pharmacyRegion: '부산 해운대구',
    period: '2024년 12월 4주차',
    totalSales: 9800000,
    commission: 490000,
    netAmount: 9310000,
    status: 'completed',
    scheduledDate: '2025-01-06',
    completedDate: '2025-01-06',
  },
  {
    id: '4',
    pharmacyName: '미래약국',
    pharmacyRegion: '인천 남동구',
    period: '2024년 12월 4주차',
    totalSales: 5600000,
    commission: 280000,
    netAmount: 5320000,
    status: 'completed',
    scheduledDate: '2025-01-06',
    completedDate: '2025-01-06',
  },
  {
    id: '5',
    pharmacyName: '청춘약국',
    pharmacyRegion: '대전 유성구',
    period: '2024년 12월 4주차',
    totalSales: 3200000,
    commission: 160000,
    netAmount: 3040000,
    status: 'failed',
    scheduledDate: '2025-01-06',
  },
];

// Stats
const settlementStats = {
  pendingSettlements: 45,
  pendingAmount: 156000000,
  thisMonthSettled: 892000000,
  totalCommission: 44600000,
  avgSettlementCycle: 7,
  failedSettlements: 3,
};

// Status badge
function StatusBadge({ status }: { status: Settlement['status'] }) {
  const config = {
    pending: { label: '대기', color: 'bg-amber-100 text-amber-700', icon: Clock },
    processing: { label: '처리중', color: 'bg-blue-100 text-blue-700', icon: RefreshCw },
    completed: { label: '완료', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    failed: { label: '실패', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  };

  const { label, color, icon: Icon } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

export default function SettlementsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSettlement, setSelectedSettlement] = useState<string | null>(null);

  const itemsPerPage = 10;

  // Filter settlements
  const filteredSettlements = sampleSettlements.filter((settlement) => {
    if (activeTab === 'pending' && settlement.status !== 'pending') return false;
    if (activeTab === 'processing' && settlement.status !== 'processing') return false;
    if (activeTab === 'completed' && !['completed', 'failed'].includes(settlement.status)) return false;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (!settlement.pharmacyName.toLowerCase().includes(search)) {
        return false;
      }
    }

    return true;
  });

  const totalPages = Math.ceil(filteredSettlements.length / itemsPerPage);
  const paginatedSettlements = filteredSettlements.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const tabs = [
    { id: 'all' as const, label: '전체', count: sampleSettlements.length },
    { id: 'pending' as const, label: '대기', count: sampleSettlements.filter(s => s.status === 'pending').length },
    { id: 'processing' as const, label: '처리중', count: sampleSettlements.filter(s => s.status === 'processing').length },
    { id: 'completed' as const, label: '완료', count: sampleSettlements.filter(s => ['completed', 'failed'].includes(s.status)).length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">정산 관리</h1>
          <p className="text-slate-500 text-sm">약국 정산 현황 및 수수료 관리</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm">
            <Download className="w-4 h-4" />
            정산내역 다운로드
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
            <CreditCard className="w-4 h-4" />
            일괄 정산
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{settlementStats.pendingSettlements}</p>
              <p className="text-xs text-slate-500">정산 대기</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{(settlementStats.pendingAmount / 100000000).toFixed(1)}억</p>
              <p className="text-xs text-slate-500">대기 금액</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{(settlementStats.thisMonthSettled / 100000000).toFixed(1)}억</p>
              <p className="text-xs text-slate-500">이번달 정산</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{(settlementStats.totalCommission / 10000000).toFixed(1)}천만</p>
              <p className="text-xs text-slate-500">총 수수료</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{settlementStats.avgSettlementCycle}일</p>
              <p className="text-xs text-slate-500">평균 정산주기</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{settlementStats.failedSettlements}</p>
              <p className="text-xs text-slate-500">정산 실패</p>
            </div>
          </div>
        </div>
      </div>

      {/* Commission Policy Card */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-2">현재 수수료 정책</h2>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-3xl font-bold">5%</p>
                <p className="text-primary-200 text-sm">기본 수수료율</p>
              </div>
              <div className="h-12 w-px bg-primary-400"></div>
              <div>
                <p className="text-3xl font-bold">7일</p>
                <p className="text-primary-200 text-sm">정산 주기</p>
              </div>
              <div className="h-12 w-px bg-primary-400"></div>
              <div>
                <p className="text-3xl font-bold">매주 월요일</p>
                <p className="text-primary-200 text-sm">정산일</p>
              </div>
            </div>
          </div>
          <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm">
            정책 설정
          </button>
        </div>
      </div>

      {/* Tabs & Table */}
      <div className="bg-white rounded-xl shadow-sm">
        {/* Tabs */}
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
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="약국명 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            >
              <option value="all">전체 기간</option>
              <option value="thisWeek">이번 주</option>
              <option value="lastWeek">지난 주</option>
              <option value="thisMonth">이번 달</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  약국
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  정산 기간
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  총 매출
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  수수료
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  정산 금액
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  정산 예정일
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedSettlements.map((settlement) => (
                <tr key={settlement.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Store className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{settlement.pharmacyName}</p>
                        <p className="text-xs text-slate-500">{settlement.pharmacyRegion}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-slate-600">{settlement.period}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="font-medium text-slate-800">{(settlement.totalSales / 10000).toLocaleString()}</span>
                    <span className="text-slate-400 text-xs ml-1">만원</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-red-600">{(settlement.commission / 10000).toLocaleString()}</span>
                    <span className="text-slate-400 text-xs ml-1">만원</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="font-bold text-primary-600">{(settlement.netAmount / 10000).toLocaleString()}</span>
                    <span className="text-slate-400 text-xs ml-1">만원</span>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={settlement.status} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <Calendar className="w-3 h-3" />
                      {settlement.scheduledDate}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center">
                      <div className="relative">
                        <button
                          onClick={() => setSelectedSettlement(selectedSettlement === settlement.id ? null : settlement.id)}
                          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-slate-400" />
                        </button>
                        {selectedSettlement === settlement.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setSelectedSettlement(null)}
                            />
                            <div className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-lg border py-2 z-20">
                              <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                상세 내역
                              </button>
                              {settlement.status === 'pending' && (
                                <button className="w-full px-4 py-2 text-left text-sm text-primary-600 hover:bg-primary-50 flex items-center gap-2">
                                  <CreditCard className="w-4 h-4" />
                                  정산 처리
                                </button>
                              )}
                              {settlement.status === 'failed' && (
                                <button className="w-full px-4 py-2 text-left text-sm text-amber-600 hover:bg-amber-50 flex items-center gap-2">
                                  <RefreshCw className="w-4 h-4" />
                                  재시도
                                </button>
                              )}
                              <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                <Download className="w-4 h-4" />
                                명세서 다운로드
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              총 {filteredSettlements.length}개 중 {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, filteredSettlements.length)}개 표시
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-primary-500 text-white'
                      : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
