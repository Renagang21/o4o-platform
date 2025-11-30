import { FC, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit2, XCircle, CheckCircle, Trash2, Users } from 'lucide-react';
import { useCampaignDetail } from '@/hooks/groupbuy';
import { useGroupbuyCampaigns } from '@/hooks/groupbuy';
import { PermissionGuard } from '@/components/organization/PermissionGuard';
import {
  GroupbuyStatusBadge,
  GroupbuyQuantityProgressBar,
  DeadlineCountdown
} from '@/components/groupbuy';
import { CampaignFormModal } from './CampaignFormModal';

const GroupbuyCampaignDetailPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { campaign, loading } = useCampaignDetail(id);
  const { deleteCampaign, activateCampaign, closeCampaign } = useGroupbuyCampaigns({ autoFetch: false });

  const [formModalOpen, setFormModalOpen] = useState(false);

  const handleEdit = () => {
    setFormModalOpen(true);
  };

  const handleDelete = async () => {
    if (!id || !window.confirm('정말 이 캠페인을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deleteCampaign(id);
      navigate('/admin/groupbuy');
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleActivate = async () => {
    if (!id || !window.confirm('이 캠페인을 활성화하시겠습니까?')) {
      return;
    }

    try {
      await activateCampaign(id);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleClose = async () => {
    if (!id || !window.confirm('이 캠페인을 마감하시겠습니까?')) {
      return;
    }

    try {
      await closeCampaign(id);
    } catch (error) {
      // Error handled in hook
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-gray-500 mb-4">캠페인을 찾을 수 없습니다</p>
        <Link
          to="/admin/groupbuy"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const achievementRate = Math.round((campaign.currentQuantity / campaign.minQuantity) * 100);
  const discount = Math.round(((campaign.regularPrice - campaign.groupPrice) / campaign.regularPrice) * 100);

  return (
    <PermissionGuard required={['organization.read']}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/groupbuy')}
                className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">{campaign.name}</h1>
                <p className="text-sm text-gray-500 mt-1">캠페인 상세 정보</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={`/admin/groupbuy/${campaign.id}/participants`}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Users className="w-4 h-4" />
                참여자 관리
              </Link>
              <PermissionGuard required={['organization.manage']} showMessage={false}>
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  <Edit2 className="w-4 h-4" />
                  수정
                </button>
                {campaign.status === 'draft' && (
                  <button
                    onClick={handleActivate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <CheckCircle className="w-4 h-4" />
                    활성화
                  </button>
                )}
                {campaign.status === 'active' && (
                  <button
                    onClick={handleClose}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                  >
                    <XCircle className="w-4 h-4" />
                    마감
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  삭제
                </button>
              </PermissionGuard>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Status Cards */}
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm text-gray-500 mb-2">총 판매 수량</div>
                <div className="text-3xl font-bold text-gray-900">{campaign.currentQuantity}</div>
                <div className="text-sm text-gray-500 mt-1">
                  목표: {campaign.minQuantity}개 {campaign.maxQuantity && `(최대 ${campaign.maxQuantity})`}
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm text-gray-500 mb-2">총 판매 금액</div>
                <div className="text-3xl font-bold text-gray-900">
                  {(campaign.currentQuantity * campaign.groupPrice).toLocaleString()}원
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  개당 {campaign.groupPrice.toLocaleString()}원
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm text-gray-500 mb-2">달성률</div>
                <div className="text-3xl font-bold text-gray-900">{achievementRate}%</div>
                <div className="text-sm text-gray-500 mt-1">
                  {campaign.participantCount}명 참여
                </div>
              </div>
            </div>

            {/* Campaign Info */}
            <div className="bg-white p-6 rounded-lg shadow space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">캠페인 정보</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">상태</div>
                  <div className="mt-1">
                    <GroupbuyStatusBadge status={campaign.status} />
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">조직</div>
                  <div className="mt-1 text-gray-900">
                    {campaign.organization?.name || '전체 조직'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">상품</div>
                  <div className="mt-1 text-gray-900">
                    {campaign.product?.name || campaign.productId}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">마감</div>
                  <div className="mt-1">
                    <DeadlineCountdown deadline={campaign.endDate} />
                  </div>
                </div>
              </div>

              {campaign.description && (
                <div>
                  <div className="text-sm text-gray-500">설명</div>
                  <div className="mt-1 text-gray-900 whitespace-pre-wrap">{campaign.description}</div>
                </div>
              )}
            </div>

            {/* Pricing */}
            <div className="bg-white p-6 rounded-lg shadow space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">가격 정보</h2>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-500">정가</div>
                  <div className="mt-1 text-gray-900 line-through">
                    {campaign.regularPrice.toLocaleString()}원
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">공동구매가</div>
                  <div className="mt-1 text-2xl font-bold text-blue-600">
                    {campaign.groupPrice.toLocaleString()}원
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">할인율</div>
                  <div className="mt-1 text-lg font-medium text-red-600">
                    {discount}% 할인
                  </div>
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="bg-white p-6 rounded-lg shadow space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">진행 상황</h2>

              <GroupbuyQuantityProgressBar
                currentQuantity={campaign.currentQuantity}
                minQuantity={campaign.minQuantity}
                maxQuantity={campaign.maxQuantity}
              />
            </div>

            {/* Schedule */}
            <div className="bg-white p-6 rounded-lg shadow space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">일정</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">시작일시</div>
                  <div className="mt-1 text-gray-900">
                    {new Date(campaign.startDate).toLocaleString('ko-KR')}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">종료일시</div>
                  <div className="mt-1 text-gray-900">
                    {new Date(campaign.endDate).toLocaleString('ko-KR')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Modal */}
        {formModalOpen && (
          <CampaignFormModal
            campaign={campaign}
            onClose={() => setFormModalOpen(false)}
          />
        )}
      </div>
    </PermissionGuard>
  );
};

export default GroupbuyCampaignDetailPage;
