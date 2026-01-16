/**
 * Operator Pharmacies Page (Pharmacy Network Management)
 *
 * 세미-프랜차이즈 약국 네트워크 관리
 * - 약국 목록 및 상태 관리
 * - 지역별/등급별 필터링
 * - 약국 성과 모니터링
 */

import { useState } from 'react';
import {
  Store,
  Search,
  MapPin,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Star,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Building2,
  ShoppingCart,
  BarChart3,
} from 'lucide-react';

// Types
interface Pharmacy {
  id: string;
  name: string;
  ownerName: string;
  region: string;
  address: string;
  phone: string;
  email: string;
  status: 'active' | 'pending' | 'suspended' | 'inactive';
  tier: 'gold' | 'silver' | 'bronze' | 'standard';
  joinedAt: string;
  monthlyOrders: number;
  monthlyRevenue: number;
  growthRate: number;
  lastActivityAt: string;
}

// Tab types
type TabType = 'all' | 'active' | 'pending' | 'issues';

// Sample data
const samplePharmacies: Pharmacy[] = [
  {
    id: '1',
    name: '건강한약국',
    ownerName: '김약사',
    region: '서울 강남구',
    address: '서울시 강남구 테헤란로 123',
    phone: '02-1234-5678',
    email: 'gangnam@pharmacy.kr',
    status: 'active',
    tier: 'gold',
    joinedAt: '2024-01-15',
    monthlyOrders: 156,
    monthlyRevenue: 12500000,
    growthRate: 15.3,
    lastActivityAt: '2025-01-16T10:30:00',
  },
  {
    id: '2',
    name: '행복약국',
    ownerName: '이약사',
    region: '서울 마포구',
    address: '서울시 마포구 홍익로 45',
    phone: '02-2345-6789',
    email: 'mapo@pharmacy.kr',
    status: 'active',
    tier: 'silver',
    joinedAt: '2024-03-20',
    monthlyOrders: 89,
    monthlyRevenue: 7200000,
    growthRate: 8.7,
    lastActivityAt: '2025-01-16T09:15:00',
  },
  {
    id: '3',
    name: '사랑약국',
    ownerName: '박약사',
    region: '부산 해운대구',
    address: '부산시 해운대구 해운대로 789',
    phone: '051-3456-7890',
    email: 'haeundae@pharmacy.kr',
    status: 'pending',
    tier: 'standard',
    joinedAt: '2025-01-10',
    monthlyOrders: 0,
    monthlyRevenue: 0,
    growthRate: 0,
    lastActivityAt: '2025-01-10T14:00:00',
  },
  {
    id: '4',
    name: '미래약국',
    ownerName: '최약사',
    region: '인천 남동구',
    address: '인천시 남동구 인하로 321',
    phone: '032-4567-8901',
    email: 'incheon@pharmacy.kr',
    status: 'active',
    tier: 'bronze',
    joinedAt: '2024-06-01',
    monthlyOrders: 45,
    monthlyRevenue: 3600000,
    growthRate: -2.5,
    lastActivityAt: '2025-01-15T16:45:00',
  },
  {
    id: '5',
    name: '청춘약국',
    ownerName: '정약사',
    region: '대전 유성구',
    address: '대전시 유성구 대학로 567',
    phone: '042-5678-9012',
    email: 'daejeon@pharmacy.kr',
    status: 'suspended',
    tier: 'standard',
    joinedAt: '2024-02-28',
    monthlyOrders: 12,
    monthlyRevenue: 980000,
    growthRate: -45.2,
    lastActivityAt: '2025-01-05T11:20:00',
  },
];

// Stats data
const networkStats = {
  totalPharmacies: 127,
  activePharmacies: 98,
  pendingApprovals: 15,
  issuePharmacies: 14,
  totalMonthlyRevenue: 856000000,
  avgOrdersPerPharmacy: 67,
};

// Status badge component
function StatusBadge({ status }: { status: Pharmacy['status'] }) {
  const config = {
    active: { label: '활성', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    pending: { label: '승인대기', color: 'bg-amber-100 text-amber-700', icon: Clock },
    suspended: { label: '일시정지', color: 'bg-red-100 text-red-700', icon: AlertCircle },
    inactive: { label: '비활성', color: 'bg-slate-100 text-slate-600', icon: AlertCircle },
  };

  const { label, color, icon: Icon } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// Tier badge component
function TierBadge({ tier }: { tier: Pharmacy['tier'] }) {
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

  const itemsPerPage = 10;

  // Filter pharmacies
  const filteredPharmacies = samplePharmacies.filter((pharmacy) => {
    // Tab filter
    if (activeTab === 'active' && pharmacy.status !== 'active') return false;
    if (activeTab === 'pending' && pharmacy.status !== 'pending') return false;
    if (activeTab === 'issues' && !['suspended', 'inactive'].includes(pharmacy.status)) return false;

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (
        !pharmacy.name.toLowerCase().includes(search) &&
        !pharmacy.ownerName.toLowerCase().includes(search) &&
        !pharmacy.region.toLowerCase().includes(search)
      ) {
        return false;
      }
    }

    // Region filter
    if (regionFilter !== 'all' && !pharmacy.region.includes(regionFilter)) return false;

    // Tier filter
    if (tierFilter !== 'all' && pharmacy.tier !== tierFilter) return false;

    return true;
  });

  const totalPages = Math.ceil(filteredPharmacies.length / itemsPerPage);
  const paginatedPharmacies = filteredPharmacies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const tabs = [
    { id: 'all' as const, label: '전체', count: samplePharmacies.length },
    { id: 'active' as const, label: '활성', count: samplePharmacies.filter(p => p.status === 'active').length },
    { id: 'pending' as const, label: '승인대기', count: samplePharmacies.filter(p => p.status === 'pending').length },
    { id: 'issues' as const, label: '주의필요', count: samplePharmacies.filter(p => ['suspended', 'inactive'].includes(p.status)).length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">약국 네트워크</h1>
        <p className="text-slate-500 text-sm">가맹 약국 관리 및 모니터링</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Store className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{networkStats.totalPharmacies}</p>
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
              <p className="text-2xl font-bold text-slate-800">{networkStats.activePharmacies}</p>
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
              <p className="text-2xl font-bold text-slate-800">{networkStats.pendingApprovals}</p>
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
              <p className="text-2xl font-bold text-slate-800">{networkStats.issuePharmacies}</p>
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
              <p className="text-2xl font-bold text-slate-800">{(networkStats.totalMonthlyRevenue / 100000000).toFixed(1)}억</p>
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
              <p className="text-2xl font-bold text-slate-800">{networkStats.avgOrdersPerPharmacy}</p>
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
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  약국 정보
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  지역
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  등급
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  월 주문
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  월 매출
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  성장률
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedPharmacies.map((pharmacy) => (
                <tr key={pharmacy.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{pharmacy.name}</p>
                        <p className="text-xs text-slate-500">{pharmacy.ownerName} | {pharmacy.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <MapPin className="w-3 h-3" />
                      {pharmacy.region}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <TierBadge tier={pharmacy.tier} />
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={pharmacy.status} />
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="font-medium text-slate-800">{pharmacy.monthlyOrders}</span>
                    <span className="text-slate-400 text-xs ml-1">건</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="font-medium text-slate-800">
                      {(pharmacy.monthlyRevenue / 10000).toLocaleString()}
                    </span>
                    <span className="text-slate-400 text-xs ml-1">만원</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className={`flex items-center justify-end gap-1 ${
                      pharmacy.growthRate > 0 ? 'text-green-600' : pharmacy.growthRate < 0 ? 'text-red-600' : 'text-slate-500'
                    }`}>
                      {pharmacy.growthRate > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : pharmacy.growthRate < 0 ? (
                        <TrendingDown className="w-3 h-3" />
                      ) : null}
                      <span className="font-medium">{Math.abs(pharmacy.growthRate)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center">
                      <div className="relative">
                        <button
                          onClick={() => setSelectedPharmacy(selectedPharmacy === pharmacy.id ? null : pharmacy.id)}
                          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-slate-400" />
                        </button>
                        {selectedPharmacy === pharmacy.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setSelectedPharmacy(null)}
                            />
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-2 z-20">
                              <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                                상세 보기
                              </button>
                              <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                                주문 내역
                              </button>
                              <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                                성과 분석
                              </button>
                              <hr className="my-1" />
                              {pharmacy.status === 'active' ? (
                                <button className="w-full px-4 py-2 text-left text-sm text-amber-600 hover:bg-amber-50">
                                  일시 정지
                                </button>
                              ) : (
                                <button className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50">
                                  활성화
                                </button>
                              )}
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
              총 {filteredPharmacies.length}개 중 {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, filteredPharmacies.length)}개 표시
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
