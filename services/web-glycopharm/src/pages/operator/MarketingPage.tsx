/**
 * Operator Marketing Page
 *
 * 세미-프랜차이즈 마케팅 관리
 * - 프로모션/캠페인 관리
 * - 공지사항/배너 관리
 * - 쿠폰/할인 관리
 */

import { useState } from 'react';
import {
  Megaphone,
  Plus,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Tag,
  Bell,
  Image,
  Gift,
  Calendar,
  CheckCircle,
  Clock,
  PauseCircle,
  XCircle,
  Eye,
  Edit,
  Copy,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';

// Types
interface Campaign {
  id: string;
  name: string;
  type: 'promotion' | 'banner' | 'coupon' | 'notice';
  status: 'active' | 'scheduled' | 'paused' | 'ended';
  startDate: string;
  endDate: string;
  targetAudience: string;
  views: number;
  conversions: number;
  conversionRate: number;
}

type TabType = 'all' | 'promotions' | 'banners' | 'coupons';

// Sample data
const sampleCampaigns: Campaign[] = [
  {
    id: '1',
    name: '신년 맞이 혈당 관리 프로모션',
    type: 'promotion',
    status: 'active',
    startDate: '2025-01-01',
    endDate: '2025-01-31',
    targetAudience: '전체 약국',
    views: 15420,
    conversions: 856,
    conversionRate: 5.5,
  },
  {
    id: '2',
    name: '신규 가입 약국 웰컴 쿠폰',
    type: 'coupon',
    status: 'active',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    targetAudience: '신규 약국',
    views: 3200,
    conversions: 280,
    conversionRate: 8.7,
  },
  {
    id: '3',
    name: '설 연휴 배송 안내 배너',
    type: 'banner',
    status: 'scheduled',
    startDate: '2025-01-25',
    endDate: '2025-02-05',
    targetAudience: '전체 약국',
    views: 0,
    conversions: 0,
    conversionRate: 0,
  },
  {
    id: '4',
    name: '12월 연말 특별 할인',
    type: 'promotion',
    status: 'ended',
    startDate: '2024-12-01',
    endDate: '2024-12-31',
    targetAudience: 'Gold/Silver 약국',
    views: 28500,
    conversions: 1420,
    conversionRate: 5.0,
  },
  {
    id: '5',
    name: '신제품 런칭 공지',
    type: 'notice',
    status: 'paused',
    startDate: '2025-01-10',
    endDate: '2025-02-10',
    targetAudience: '전체 약국',
    views: 8900,
    conversions: 0,
    conversionRate: 0,
  },
];

// Stats
const marketingStats = {
  activeCampaigns: 5,
  totalReach: 58120,
  totalConversions: 2556,
  avgConversionRate: 4.4,
  activeCoupons: 12,
  couponUsageRate: 32.5,
};

// Type badge
function TypeBadge({ type }: { type: Campaign['type'] }) {
  const config = {
    promotion: { label: '프로모션', color: 'bg-primary-100 text-primary-700', icon: Tag },
    banner: { label: '배너', color: 'bg-purple-100 text-purple-700', icon: Image },
    coupon: { label: '쿠폰', color: 'bg-amber-100 text-amber-700', icon: Gift },
    notice: { label: '공지', color: 'bg-blue-100 text-blue-700', icon: Bell },
  };

  const { label, color, icon: Icon } = config[type];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// Status badge
function StatusBadge({ status }: { status: Campaign['status'] }) {
  const config = {
    active: { label: '진행중', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    scheduled: { label: '예약', color: 'bg-blue-100 text-blue-700', icon: Clock },
    paused: { label: '일시정지', color: 'bg-amber-100 text-amber-700', icon: PauseCircle },
    ended: { label: '종료', color: 'bg-slate-100 text-slate-600', icon: XCircle },
  };

  const { label, color, icon: Icon } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);

  const itemsPerPage = 10;

  // Filter campaigns
  const filteredCampaigns = sampleCampaigns.filter((campaign) => {
    if (activeTab === 'promotions' && campaign.type !== 'promotion') return false;
    if (activeTab === 'banners' && campaign.type !== 'banner') return false;
    if (activeTab === 'coupons' && campaign.type !== 'coupon') return false;
    return true;
  });

  const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);
  const paginatedCampaigns = filteredCampaigns.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const tabs = [
    { id: 'all' as const, label: '전체', count: sampleCampaigns.length },
    { id: 'promotions' as const, label: '프로모션', count: sampleCampaigns.filter(c => c.type === 'promotion').length },
    { id: 'banners' as const, label: '배너', count: sampleCampaigns.filter(c => c.type === 'banner').length },
    { id: 'coupons' as const, label: '쿠폰', count: sampleCampaigns.filter(c => c.type === 'coupon').length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">마케팅</h1>
          <p className="text-slate-500 text-sm">프로모션, 배너, 쿠폰 관리</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
          <Plus className="w-4 h-4" />
          캠페인 생성
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{marketingStats.activeCampaigns}</p>
              <p className="text-xs text-slate-500">진행중 캠페인</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{(marketingStats.totalReach / 1000).toFixed(1)}K</p>
              <p className="text-xs text-slate-500">총 도달</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{marketingStats.totalConversions.toLocaleString()}</p>
              <p className="text-xs text-slate-500">총 전환</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{marketingStats.avgConversionRate}%</p>
              <p className="text-xs text-slate-500">평균 전환율</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Gift className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{marketingStats.activeCoupons}</p>
              <p className="text-xs text-slate-500">활성 쿠폰</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Tag className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{marketingStats.couponUsageRate}%</p>
              <p className="text-xs text-slate-500">쿠폰 사용률</p>
            </div>
          </div>
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

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  캠페인
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  유형
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  기간
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  대상
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  노출
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  전환
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  전환율
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedCampaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Megaphone className="w-5 h-5 text-slate-400" />
                      </div>
                      <p className="font-medium text-slate-800">{campaign.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <TypeBadge type={campaign.type} />
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={campaign.status} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <Calendar className="w-3 h-3" />
                      {campaign.startDate} ~ {campaign.endDate}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">
                    {campaign.targetAudience}
                  </td>
                  <td className="px-4 py-4 text-right font-medium text-slate-800">
                    {campaign.views.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-right font-medium text-slate-800">
                    {campaign.conversions.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={`font-medium ${campaign.conversionRate > 5 ? 'text-green-600' : 'text-slate-600'}`}>
                      {campaign.conversionRate}%
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center">
                      <div className="relative">
                        <button
                          onClick={() => setSelectedCampaign(selectedCampaign === campaign.id ? null : campaign.id)}
                          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-slate-400" />
                        </button>
                        {selectedCampaign === campaign.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setSelectedCampaign(null)}
                            />
                            <div className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-lg border py-2 z-20">
                              <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                <Eye className="w-4 h-4" />
                                상세 보기
                              </button>
                              <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                <Edit className="w-4 h-4" />
                                수정
                              </button>
                              <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                <Copy className="w-4 h-4" />
                                복제
                              </button>
                              {campaign.status === 'active' && (
                                <button className="w-full px-4 py-2 text-left text-sm text-amber-600 hover:bg-amber-50 flex items-center gap-2">
                                  <PauseCircle className="w-4 h-4" />
                                  일시 정지
                                </button>
                              )}
                              {campaign.status === 'paused' && (
                                <button className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4" />
                                  재개
                                </button>
                              )}
                              <hr className="my-1" />
                              <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                <Trash2 className="w-4 h-4" />
                                삭제
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
              총 {filteredCampaigns.length}개 중 {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, filteredCampaigns.length)}개 표시
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
