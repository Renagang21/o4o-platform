import { FC, useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useGroupbuyCampaigns, GroupbuyCampaign } from '@/hooks/groupbuy';
import { OrganizationSelector } from '@/components/organization/OrganizationSelector';
import { ProductSelector } from '@/components/product/ProductSelector';

interface CampaignFormModalProps {
  campaign: GroupbuyCampaign | null;
  onClose: () => void;
}

export const CampaignFormModal: FC<CampaignFormModalProps> = ({ campaign, onClose }) => {
  const { createCampaign, updateCampaign } = useGroupbuyCampaigns({ autoFetch: false });
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    organizationId: '',
    productId: '',
    name: '',
    description: '',
    groupPrice: 0,
    regularPrice: 0,
    minQuantity: 0,
    maxQuantity: 0,
    startDate: '',
    endDate: '',
    isOrganizationExclusive: false
  });

  useEffect(() => {
    if (campaign) {
      setFormData({
        organizationId: campaign.organizationId || '',
        productId: campaign.productId || '',
        name: campaign.name || '',
        description: campaign.description || '',
        groupPrice: campaign.groupPrice || 0,
        regularPrice: campaign.regularPrice || 0,
        minQuantity: campaign.minQuantity || 0,
        maxQuantity: campaign.maxQuantity || 0,
        startDate: campaign.startDate ? new Date(campaign.startDate).toISOString().slice(0, 16) : '',
        endDate: campaign.endDate ? new Date(campaign.endDate).toISOString().slice(0, 16) : '',
        isOrganizationExclusive: campaign.isOrganizationExclusive || false
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
        endDate: new Date(formData.endDate).toISOString(),
        maxQuantity: formData.maxQuantity || undefined
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }));
    } else if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
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
          {/* Campaign Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              캠페인명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">조직</label>
            <OrganizationSelector
              value={formData.organizationId}
              onChange={(orgId) => setFormData(prev => ({ ...prev, organizationId: orgId }))}
              placeholder="전체 조직"
              filterByPermission
            />
            <p className="text-xs text-gray-500 mt-1">
              선택하지 않으면 전체 조직 대상 캠페인입니다
            </p>
          </div>

          {/* Product Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              상품 선택 <span className="text-red-500">*</span>
            </label>
            <ProductSelector
              value={formData.productId}
              onChange={(productId) => setFormData(prev => ({ ...prev, productId }))}
              placeholder="상품을 검색하거나 선택하세요"
              required
            />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                정가 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="regularPrice"
                value={formData.regularPrice}
                onChange={handleChange}
                required
                min="0"
                step="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="50000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                공동구매가 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="groupPrice"
                value={formData.groupPrice}
                onChange={handleChange}
                required
                min="0"
                step="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="35000"
              />
            </div>
          </div>

          {/* Quantity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                최소 수량 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="minQuantity"
                value={formData.minQuantity}
                onChange={handleChange}
                required
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">최대 수량</label>
              <input
                type="number"
                name="maxQuantity"
                value={formData.maxQuantity}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="제한 없음"
              />
            </div>
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

          {/* Organization Exclusive */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="isOrganizationExclusive"
              id="isOrganizationExclusive"
              checked={formData.isOrganizationExclusive}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isOrganizationExclusive" className="ml-2 block text-sm text-gray-900">
              조직 전용 캠페인 (선택한 조직 멤버만 참여 가능)
            </label>
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
