/**
 * GroupbuyListPage
 *
 * 공동구매 캠페인 목록 페이지
 * - 조직별 필터링
 * - 활성화된 캠페인만 표시
 * - 진행도/마감일 표시
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import { useOrganization } from '@/context';
import { PageHeader, PageLoading, EmptyState } from '@/components/common';

// 캠페인 타입
interface GroupbuyCampaign {
  id: string;
  title: string;
  slug: string;
  description?: string;
  thumbnailUrl?: string;
  organizationId?: string;
  organization?: {
    id: string;
    name: string;
  };
  status: 'draft' | 'active' | 'ended' | 'cancelled';
  startDate: string;
  endDate: string;
  targetQuantity: number;
  currentQuantity: number;
  minQuantity: number;
  maxQuantityPerPerson: number;
  originalPrice: number;
  discountPrice: number;
  discountRate: number;
  participantCount: number;
  createdAt: string;
}

export function GroupbuyListPage() {
  const { organization, getOrganizationId } = useOrganization();

  // 상태
  const [campaigns, setCampaigns] = useState<GroupbuyCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'ending_soon'>('active');

  // 캠페인 로드
  const loadCampaigns = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const orgId = getOrganizationId();
      const params = new URLSearchParams();

      if (orgId) params.append('organizationId', orgId);
      if (filter !== 'all') params.append('status', 'active');

      const response = await authClient.api.get(`/groupbuy/campaigns?${params}`);

      let campaignList = response.data.campaigns || response.data || [];

      // 필터링
      if (filter === 'ending_soon') {
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        campaignList = campaignList.filter((c: GroupbuyCampaign) => {
          const endDate = new Date(c.endDate);
          return endDate <= threeDaysFromNow && endDate > new Date();
        });
      }

      setCampaigns(campaignList);
    } catch (err: any) {
      console.error('Failed to load campaigns:', err);
      setError('캠페인을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [getOrganizationId, filter]);

  // 초기 로드
  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns, organization?.id]);

  if (isLoading) {
    return <PageLoading message="캠페인을 불러오는 중..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="공동구매"
        subtitle={organization ? `${organization.name} 공동구매` : '진행 중인 공동구매'}
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '공동구매' },
        ]}
      />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* 필터 */}
        <div className="flex items-center gap-2 mb-6">
          <button
            type="button"
            onClick={() => setFilter('active')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              filter === 'active'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            진행 중
          </button>
          <button
            type="button"
            onClick={() => setFilter('ending_soon')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              filter === 'ending_soon'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            마감 임박
          </button>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            전체
          </button>
        </div>

        {/* 캠페인 목록 */}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyState
            icon="🛒"
            title="진행 중인 공동구매가 없습니다"
            description="새로운 공동구매가 시작되면 알려드릴게요."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <GroupbuyCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 캠페인 카드 컴포넌트
interface GroupbuyCardProps {
  campaign: GroupbuyCampaign;
}

function GroupbuyCard({ campaign }: GroupbuyCardProps) {
  const progress = Math.min(
    Math.round((campaign.currentQuantity / campaign.targetQuantity) * 100),
    100
  );

  const isEndingSoon = (() => {
    const end = new Date(campaign.endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return days <= 3 && days > 0;
  })();

  const getRemainingTime = (): string => {
    const end = new Date(campaign.endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return '마감됨';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}일 ${hours}시간`;
    return `${hours}시간`;
  };

  return (
    <Link
      to={`/groupbuy/${campaign.id}`}
      className="block bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
    >
      {/* 썸네일 */}
      <div className="relative aspect-video bg-gray-100">
        {campaign.thumbnailUrl ? (
          <img
            src={campaign.thumbnailUrl}
            alt={campaign.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl">🛒</span>
          </div>
        )}

        {/* 마감 임박 배지 */}
        {isEndingSoon && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded">
            마감 임박
          </div>
        )}

        {/* 할인율 배지 */}
        {campaign.discountRate > 0 && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded">
            {campaign.discountRate}% 할인
          </div>
        )}
      </div>

      {/* 콘텐츠 */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 mb-2">
          {campaign.title}
        </h3>

        {campaign.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
            {campaign.description}
          </p>
        )}

        {/* 가격 */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-xl font-bold text-blue-600">
            {campaign.discountPrice.toLocaleString()}원
          </span>
          {campaign.originalPrice > campaign.discountPrice && (
            <span className="text-sm text-gray-400 line-through">
              {campaign.originalPrice.toLocaleString()}원
            </span>
          )}
        </div>

        {/* 진행률 */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600">달성률</span>
            <span className="font-medium text-blue-600">{progress}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                progress >= 100 ? 'bg-green-500' : 'bg-blue-600'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
            <span>{campaign.currentQuantity}개 / {campaign.targetQuantity}개</span>
            <span>{campaign.participantCount}명 참여</span>
          </div>
        </div>

        {/* 마감일 */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {new Date(campaign.endDate).toLocaleDateString('ko-KR')} 마감
          </span>
          <span className={`font-medium ${isEndingSoon ? 'text-red-600' : 'text-gray-900'}`}>
            {getRemainingTime()} 남음
          </span>
        </div>
      </div>
    </Link>
  );
}

export default GroupbuyListPage;
