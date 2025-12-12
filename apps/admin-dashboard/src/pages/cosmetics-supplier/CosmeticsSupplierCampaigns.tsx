/**
 * Cosmetics Supplier Campaigns
 *
 * 캠페인 관리
 * - 캠페인 생성/수정
 * - 성과 분석
 * - 타겟 관리
 *
 * Phase 6-G: Cosmetics Supplier Extension
 */

import React, { useState, useEffect, useCallback } from 'react';
import { authClient } from '@o4o/auth-client';
import {
  Megaphone,
  Plus,
  RefreshCw,
  Search,
  Eye,
  Edit,
  Trash2,
  Play,
  Pause,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  DollarSign,
  MousePointer,
  BarChart2,
  Calendar,
  X,
} from 'lucide-react';

type CampaignType = 'product_launch' | 'seasonal' | 'flash_sale' | 'collaboration' | 'event';
type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
type TargetType = 'all' | 'sellers' | 'partners' | 'selected';

interface Campaign {
  id: string;
  campaignName: string;
  description?: string;
  type: CampaignType;
  targetType: TargetType;
  status: CampaignStatus;
  budget?: number;
  spentAmount: number;
  startDate: string;
  endDate?: string;
  totalViews: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  participantCount: number;
  createdAt: string;
  publishedAt?: string;
}

const CosmeticsSupplierCampaigns: React.FC = () => {
  const api = authClient.api;
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Demo data
      setCampaigns([
        {
          id: '1',
          campaignName: '겨울 스킨케어 프로모션',
          description: '건조한 겨울철 피부 관리를 위한 보습 제품 특별 프로모션',
          type: 'seasonal',
          targetType: 'all',
          status: 'active',
          budget: 5000000,
          spentAmount: 2350000,
          startDate: '2024-12-01',
          endDate: '2024-12-31',
          totalViews: 15420,
          totalClicks: 2845,
          totalConversions: 186,
          totalRevenue: 8370000,
          participantCount: 42,
          createdAt: '2024-11-25T00:00:00Z',
          publishedAt: '2024-12-01T00:00:00Z',
        },
        {
          id: '2',
          campaignName: '비타민C 앰플 런칭',
          description: '신제품 비타민C 앰플 출시 기념 캠페인',
          type: 'product_launch',
          targetType: 'partners',
          status: 'active',
          budget: 3000000,
          spentAmount: 1800000,
          startDate: '2024-12-05',
          endDate: '2024-12-20',
          totalViews: 8920,
          totalClicks: 1456,
          totalConversions: 89,
          totalRevenue: 2848000,
          participantCount: 15,
          createdAt: '2024-12-01T00:00:00Z',
          publishedAt: '2024-12-05T00:00:00Z',
        },
        {
          id: '3',
          campaignName: '연말 플래시 세일',
          description: '연말 특별 할인 이벤트',
          type: 'flash_sale',
          targetType: 'sellers',
          status: 'scheduled',
          budget: 2000000,
          spentAmount: 0,
          startDate: '2024-12-25',
          endDate: '2024-12-26',
          totalViews: 0,
          totalClicks: 0,
          totalConversions: 0,
          totalRevenue: 0,
          participantCount: 28,
          createdAt: '2024-12-10T00:00:00Z',
        },
        {
          id: '4',
          campaignName: '인플루언서 콜라보',
          type: 'collaboration',
          targetType: 'selected',
          status: 'draft',
          budget: 10000000,
          spentAmount: 0,
          startDate: '2025-01-15',
          totalViews: 0,
          totalClicks: 0,
          totalConversions: 0,
          totalRevenue: 0,
          participantCount: 0,
          createdAt: '2024-12-08T00:00:00Z',
        },
      ]);
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Play className="w-3 h-3" /> 진행중
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3" /> 예약됨
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            초안
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Pause className="w-3 h-3" /> 일시중지
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            <CheckCircle className="w-3 h-3" /> 완료
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            취소됨
          </span>
        );
    }
  };

  const getTypeBadge = (type: CampaignType) => {
    const labels: Record<CampaignType, string> = {
      product_launch: '신제품 런칭',
      seasonal: '시즌',
      flash_sale: '플래시 세일',
      collaboration: '콜라보',
      event: '이벤트',
    };
    const colors: Record<CampaignType, string> = {
      product_launch: 'bg-pink-100 text-pink-700',
      seasonal: 'bg-orange-100 text-orange-700',
      flash_sale: 'bg-red-100 text-red-700',
      collaboration: 'bg-purple-100 text-purple-700',
      event: 'bg-blue-100 text-blue-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[type]}`}>
        {labels[type]}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateROI = (campaign: Campaign) => {
    if (campaign.spentAmount === 0) return 0;
    return ((campaign.totalRevenue - campaign.spentAmount) / campaign.spentAmount) * 100;
  };

  const filteredCampaigns = campaigns.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (searchTerm && !c.campaignName.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const activeCampaigns = campaigns.filter((c) => c.status === 'active');
  const totalBudget = campaigns.reduce((sum, c) => sum + (c.budget || 0), 0);
  const totalSpent = campaigns.reduce((sum, c) => sum + c.spentAmount, 0);
  const totalRevenue = campaigns.reduce((sum, c) => sum + c.totalRevenue, 0);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">캠페인 관리</h1>
          <p className="text-gray-500 text-sm mt-1">마케팅 캠페인 생성 및 성과 분석</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            title="새로고침"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            새 캠페인
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{activeCampaigns.length}</p>
              <p className="text-sm text-gray-500">진행중 캠페인</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{(totalBudget / 1000000).toFixed(1)}M</p>
              <p className="text-sm text-gray-500">총 예산</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{totalRevenue.toLocaleString()}원</p>
              <p className="text-sm text-gray-500">총 매출</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <BarChart2 className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold text-green-600">
                {totalSpent > 0
                  ? ((totalRevenue - totalSpent) / totalSpent * 100).toFixed(0)
                  : 0}%
              </p>
              <p className="text-sm text-gray-500">평균 ROI</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="캠페인명으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as CampaignStatus | 'all')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        >
          <option value="all">전체 상태</option>
          <option value="active">진행중</option>
          <option value="scheduled">예약됨</option>
          <option value="draft">초안</option>
          <option value="paused">일시중지</option>
          <option value="completed">완료</option>
        </select>
      </div>

      {/* Campaign List */}
      <div className="space-y-4">
        {filteredCampaigns.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Megaphone className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>캠페인이 없습니다</p>
          </div>
        ) : (
          filteredCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {campaign.campaignName}
                    </h3>
                    {getTypeBadge(campaign.type)}
                    {getStatusBadge(campaign.status)}
                  </div>
                  {campaign.description && (
                    <p className="text-sm text-gray-500">{campaign.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    {formatDate(campaign.startDate)}
                    {campaign.endDate && ` ~ ${formatDate(campaign.endDate)}`}
                    <span className="mx-2">·</span>
                    <Users className="w-3 h-3" />
                    참여자 {campaign.participantCount}명
                  </p>
                </div>

                <div className="flex gap-2">
                  {campaign.status === 'active' && (
                    <button className="p-2 text-yellow-600 hover:bg-yellow-50 rounded">
                      <Pause className="w-4 h-4" />
                    </button>
                  )}
                  {(campaign.status === 'draft' || campaign.status === 'paused') && (
                    <button className="p-2 text-green-600 hover:bg-green-50 rounded">
                      <Play className="w-4 h-4" />
                    </button>
                  )}
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Budget Progress */}
              {campaign.budget && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">예산 소진</span>
                    <span className="font-medium">
                      {campaign.spentAmount.toLocaleString()} / {campaign.budget.toLocaleString()}원
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{
                        width: `${Math.min((campaign.spentAmount / campaign.budget) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {campaign.totalViews.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                    <Eye className="w-3 h-3" /> 조회수
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {campaign.totalClicks.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                    <MousePointer className="w-3 h-3" /> 클릭
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {campaign.totalConversions.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                    <TrendingUp className="w-3 h-3" /> 전환
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {(campaign.totalRevenue / 10000).toFixed(0)}만
                  </p>
                  <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                    <DollarSign className="w-3 h-3" /> 매출
                  </p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold ${calculateROI(campaign) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {calculateROI(campaign).toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                    <BarChart2 className="w-3 h-3" /> ROI
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">새 캠페인</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-500 text-sm mb-4">
              캠페인 생성 폼이 여기에 표시됩니다.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CosmeticsSupplierCampaigns;
