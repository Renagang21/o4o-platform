/**
 * GroupbuyDetailPage
 *
 * 공동구매 캠페인 상세 페이지
 * - 캠페인 상세 정보
 * - 수량 선택 및 참여
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import { useAuth } from '@/context';
import { PageHeader, PageLoading, EmptyState } from '@/components/common';

// 캠페인 타입
interface GroupbuyCampaign {
  id: string;
  title: string;
  slug: string;
  description?: string;
  content?: string;
  thumbnailUrl?: string;
  images?: string[];
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
  termsAndConditions?: string;
  shippingInfo?: string;
  createdAt: string;
}

export function GroupbuyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // 상태
  const [campaign, setCampaign] = useState<GroupbuyCampaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 주문 상태
  const [quantity, setQuantity] = useState(1);
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  // 캠페인 로드
  const loadCampaign = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await authClient.api.get(`/groupbuy/campaigns/${id}`);
      setCampaign(response.data);

      // 참여 여부 확인
      if (isAuthenticated) {
        try {
          const participationResponse = await authClient.api.get(
            `/groupbuy/campaigns/${id}/my-participation`
          );
          setHasJoined(!!participationResponse.data);
        } catch {
          setHasJoined(false);
        }
      }
    } catch (err: any) {
      console.error('Failed to load campaign:', err);
      if (err.response?.status === 404) {
        setError('캠페인을 찾을 수 없습니다.');
      } else {
        setError('캠페인을 불러오는데 실패했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, isAuthenticated]);

  // 초기 로드
  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  // 수량 변경
  const handleQuantityChange = (delta: number) => {
    if (!campaign) return;

    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= campaign.maxQuantityPerPerson) {
      setQuantity(newQuantity);
    }
  };

  // 참여하기
  const handleJoin = async () => {
    if (!campaign || !isAuthenticated) {
      navigate('/login', { state: { from: `/groupbuy/${id}` } });
      return;
    }

    setIsJoining(true);

    try {
      await authClient.api.post(`/groupbuy/campaigns/${id}/join`, {
        quantity,
      });

      setHasJoined(true);
      alert('공동구매 참여가 완료되었습니다!');

      // 캠페인 정보 새로고침
      loadCampaign();
    } catch (err: any) {
      console.error('Failed to join campaign:', err);
      alert(err.response?.data?.message || '참여에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsJoining(false);
    }
  };

  // 진행률 계산
  const getProgress = (): number => {
    if (!campaign) return 0;
    return Math.min(
      Math.round((campaign.currentQuantity / campaign.targetQuantity) * 100),
      100
    );
  };

  // 남은 시간 계산
  const getRemainingTime = (): string => {
    if (!campaign) return '';

    const end = new Date(campaign.endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return '마감됨';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}일 ${hours}시간 ${minutes}분`;
    if (hours > 0) return `${hours}시간 ${minutes}분`;
    return `${minutes}분`;
  };

  // 캠페인 활성 상태 확인
  const isActive = (): boolean => {
    if (!campaign) return false;
    const now = new Date();
    const start = new Date(campaign.startDate);
    const end = new Date(campaign.endDate);
    return campaign.status === 'active' && now >= start && now <= end;
  };

  if (isLoading) {
    return <PageLoading message="캠페인 정보를 불러오는 중..." />;
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader
          title="공동구매"
          breadcrumb={[
            { label: '홈', href: '/' },
            { label: '공동구매', href: '/groupbuy' },
            { label: '상세' },
          ]}
        />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <EmptyState
            icon="😕"
            title={error || '캠페인을 찾을 수 없습니다'}
            description="요청한 캠페인이 존재하지 않거나 종료되었습니다."
            action={
              <Link
                to="/groupbuy"
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                목록으로
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const progress = getProgress();
  const totalPrice = campaign.discountPrice * quantity;

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={campaign.title}
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '공동구매', href: '/groupbuy' },
          { label: campaign.title },
        ]}
      />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* 왼쪽: 이미지 및 설명 */}
          <div className="flex-1">
            {/* 히어로 이미지 */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
              <div className="aspect-video bg-gray-100">
                {campaign.thumbnailUrl ? (
                  <img
                    src={campaign.thumbnailUrl}
                    alt={campaign.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-6xl">🛒</span>
                  </div>
                )}
              </div>
            </div>

            {/* 상세 설명 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">상세 정보</h2>

              {campaign.content ? (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: campaign.content }}
                />
              ) : campaign.description ? (
                <p className="text-gray-700 whitespace-pre-wrap">{campaign.description}</p>
              ) : (
                <p className="text-gray-500">상세 설명이 없습니다.</p>
              )}

              {/* 배송 정보 */}
              {campaign.shippingInfo && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">배송 안내</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {campaign.shippingInfo}
                  </p>
                </div>
              )}

              {/* 이용약관 */}
              {campaign.termsAndConditions && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">이용 안내</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {campaign.termsAndConditions}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 오른쪽: 참여 카드 */}
          <div className="w-full lg:w-96 flex-shrink-0">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{campaign.title}</h2>

              {campaign.organization && (
                <p className="text-sm text-gray-500 mb-4">
                  {campaign.organization.name}
                </p>
              )}

              {/* 가격 */}
              <div className="mb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-blue-600">
                    {campaign.discountPrice.toLocaleString()}원
                  </span>
                  {campaign.originalPrice > campaign.discountPrice && (
                    <>
                      <span className="text-lg text-gray-400 line-through">
                        {campaign.originalPrice.toLocaleString()}원
                      </span>
                      <span className="px-2 py-0.5 bg-red-100 text-red-600 text-sm font-medium rounded">
                        {campaign.discountRate}% 할인
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* 진행 현황 */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">달성률</span>
                  <span className="font-bold text-blue-600">{progress}%</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all ${
                      progress >= 100 ? 'bg-green-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">현재 수량</span>
                    <p className="font-medium text-gray-900">
                      {campaign.currentQuantity} / {campaign.targetQuantity}개
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">참여 인원</span>
                    <p className="font-medium text-gray-900">{campaign.participantCount}명</p>
                  </div>
                </div>
              </div>

              {/* 마감 시간 */}
              <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">⏰</span>
                  <span className="text-sm font-medium text-yellow-800">마감까지</span>
                </div>
                <p className="text-2xl font-bold text-yellow-900">{getRemainingTime()}</p>
                <p className="text-xs text-yellow-700 mt-1">
                  {new Date(campaign.endDate).toLocaleString('ko-KR')} 마감
                </p>
              </div>

              {/* 수량 선택 */}
              {isActive() && !hasJoined && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    수량 선택 (최대 {campaign.maxQuantityPerPerson}개)
                  </label>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                      className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-l-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (val >= 1 && val <= campaign.maxQuantityPerPerson) {
                          setQuantity(val);
                        }
                      }}
                      min={1}
                      max={campaign.maxQuantityPerPerson}
                      className="w-16 h-10 text-center border-t border-b border-gray-300 focus:ring-0 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(1)}
                      disabled={quantity >= campaign.maxQuantityPerPerson}
                      className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-r-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* 총 가격 */}
              {isActive() && !hasJoined && (
                <div className="flex items-center justify-between py-4 border-t border-gray-200 mb-4">
                  <span className="text-gray-600">총 금액</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {totalPrice.toLocaleString()}원
                  </span>
                </div>
              )}

              {/* 참여 버튼 */}
              {hasJoined ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                  <span className="text-lg mb-1 block">✅</span>
                  <p className="text-green-800 font-medium">이미 참여하셨습니다</p>
                  <Link
                    to="/mypage/orders"
                    className="text-sm text-green-600 hover:underline mt-1 inline-block"
                  >
                    내 참여 내역 보기
                  </Link>
                </div>
              ) : isActive() ? (
                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={isJoining}
                  className="w-full py-4 bg-blue-600 text-white text-lg font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isJoining ? '처리 중...' : '참여하기'}
                </button>
              ) : (
                <div className="p-4 bg-gray-100 rounded-lg text-center">
                  <p className="text-gray-500 font-medium">
                    {campaign.status === 'ended' ? '마감된 공동구매입니다' : '진행 중이 아닙니다'}
                  </p>
                </div>
              )}

              {/* 안내 */}
              <p className="mt-4 text-xs text-gray-500 text-center">
                목표 수량 미달성 시 공동구매가 취소될 수 있습니다
              </p>
            </div>
          </div>
        </div>

        {/* 목록으로 버튼 */}
        <div className="mt-8 flex justify-center">
          <Link
            to="/groupbuy"
            className="px-6 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            목록으로
          </Link>
        </div>
      </div>
    </div>
  );
}

export default GroupbuyDetailPage;
