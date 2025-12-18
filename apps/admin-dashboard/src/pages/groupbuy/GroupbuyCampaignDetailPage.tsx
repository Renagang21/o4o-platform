/**
 * Groupbuy Campaign Detail Page
 * Phase 3: UI Integration
 *
 * Work Order 제약: 금액/수수료/정산 정보 UI 노출 절대 금지
 */

import { FC, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit2, XCircle, CheckCircle, Trash2, Users } from 'lucide-react';
import { useCampaignDetail } from '@/hooks/groupbuy';
import { useGroupbuyCampaigns } from '@/hooks/groupbuy';
import { PermissionGuard } from '@/components/organization/PermissionGuard';
import {
  GroupbuyStatusBadge,
  DeadlineCountdown
} from '@/components/groupbuy';
import { CampaignFormModal } from './CampaignFormModal';

const GroupbuyCampaignDetailPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { campaign, loading, refetch } = useCampaignDetail(id);
  const { deleteCampaign, activateCampaign, closeCampaign, completeCampaign, cancelCampaign } = useGroupbuyCampaigns({ autoFetch: false });

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
      refetch();
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
      refetch();
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleComplete = async () => {
    if (!id || !window.confirm('이 캠페인을 완료 처리하시겠습니까?')) {
      return;
    }

    try {
      await completeCampaign(id);
      refetch();
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleCancel = async () => {
    if (!id || !window.confirm('정말 이 캠페인을 취소하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      await cancelCampaign(id);
      refetch();
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
                <h1 className="text-2xl font-semibold text-gray-900">{campaign.title}</h1>
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
                {campaign.status === 'closed' && (
                  <button
                    onClick={handleComplete}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4" />
                    완료
                  </button>
                )}
                {(campaign.status === 'draft' || campaign.status === 'active') && (
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                    취소
                  </button>
                )}
              </PermissionGuard>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Status Cards - No price information */}
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm text-gray-500 mb-2">주문 수량</div>
                <div className="text-3xl font-bold text-gray-900">{campaign.totalOrderedQuantity}</div>
                <div className="text-sm text-gray-500 mt-1">
                  전체 주문 수량
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm text-gray-500 mb-2">확정 수량</div>
                <div className="text-3xl font-bold text-green-600">{campaign.totalConfirmedQuantity}</div>
                <div className="text-sm text-gray-500 mt-1">
                  최종 확정 수량
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm text-gray-500 mb-2">참여 약국</div>
                <div className="text-3xl font-bold text-blue-600">{campaign.participantCount}</div>
                <div className="text-sm text-gray-500 mt-1">
                  참여 중인 약국 수
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

            {/* Products Info */}
            <div className="bg-white p-6 rounded-lg shadow space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">캠페인 상품</h2>
                <span className="text-sm text-gray-500">
                  {campaign.products?.length || 0}개 상품
                </span>
              </div>

              {campaign.products && campaign.products.length > 0 ? (
                <div className="space-y-3">
                  {campaign.products.map((product) => (
                    <div key={product.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900">상품 ID: {product.productId}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            최소 수량: {product.minTotalQuantity}개
                            {product.maxTotalQuantity && ` / 최대: ${product.maxTotalQuantity}개`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">
                            <span className="text-gray-500">주문:</span>{' '}
                            <span className="font-medium">{product.orderedQuantity}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-500">확정:</span>{' '}
                            <span className="font-medium text-green-600">{product.confirmedQuantity}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  등록된 상품이 없습니다
                </div>
              )}
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
            onClose={() => {
              setFormModalOpen(false);
              refetch();
            }}
          />
        )}
      </div>
    </PermissionGuard>
  );
};

export default GroupbuyCampaignDetailPage;
