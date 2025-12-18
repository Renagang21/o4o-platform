/**
 * Campaign Form Modal
 * Phase 3: UI Integration
 *
 * Work Order 제약: 금액/수수료/정산 정보 UI 노출 절대 금지
 */

import { FC, useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useGroupbuyCampaigns, GroupbuyCampaign } from '@/hooks/groupbuy';
import { OrganizationSelector } from '@/components/organization/OrganizationSelector';

interface CampaignFormModalProps {
  campaign: GroupbuyCampaign | null;
  onClose: () => void;
}

export const CampaignFormModal: FC<CampaignFormModalProps> = ({ campaign, onClose }) => {
  const { createCampaign, updateCampaign } = useGroupbuyCampaigns({ autoFetch: false });
  const [submitting, setSubmitting] = useState(false);

  // Phase 3: Campaign is a container - no price fields
  const [formData, setFormData] = useState({
    organizationId: '',
    title: '',
    description: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    if (campaign) {
      setFormData({
        organizationId: campaign.organizationId || '',
        title: campaign.title || '',
        description: campaign.description || '',
        startDate: campaign.startDate ? new Date(campaign.startDate).toISOString().slice(0, 16) : '',
        endDate: campaign.endDate ? new Date(campaign.endDate).toISOString().slice(0, 16) : ''
      });
    }
  }, [campaign]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString()
      };

      if (campaign) {
        await updateCampaign(campaign.id, payload);
      } else {
        await createCampaign(payload);
      }

      onClose();
    } catch (error) {
      // Error handled in hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto m-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {campaign ? '캠페인 수정' : '새 캠페인 생성'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Campaign Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              캠페인명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="예: 2025년 봄 공동구매"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="캠페인에 대한 설명"
            />
          </div>

          {/* Organization */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              조직 <span className="text-red-500">*</span>
            </label>
            <OrganizationSelector
              value={formData.organizationId}
              onChange={(orgId) => setFormData(prev => ({ ...prev, organizationId: orgId }))}
              placeholder="조직을 선택하세요"
              filterByPermission
            />
            <p className="text-xs text-gray-500 mt-1">
              공동구매를 진행할 지부/분회를 선택하세요
            </p>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                시작일시 <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                종료일시 <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Note about products */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              캠페인 생성 후 상품을 추가할 수 있습니다.
              상품별로 최소 수량과 기간을 설정합니다.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
