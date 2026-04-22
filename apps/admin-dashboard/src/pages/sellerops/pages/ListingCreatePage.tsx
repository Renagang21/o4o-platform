/**
 * SellerOps — 리스팅 등록 폼 페이지
 *
 * WO-O4O-PRODUCT-INPUT-ASSIST-V1
 *
 * ProductSearchPage에서 선택된 ProductMaster 데이터를 route state로 받아
 * 리스팅(StoreProduct) 등록 폼에 자동 채움 값으로 전달한다.
 */

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import type { ProductMasterSearchResult } from '../../../api/product-library.api';

interface LocationState {
  master?: ProductMasterSearchResult;
}

interface ListingFormData {
  productName: string;
  sku: string;
  supplyPrice: number;
  sellingPrice: number;
  stock: number;
}

const ListingCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { master } = (location.state as LocationState) ?? {};

  const [formData, setFormData] = useState<ListingFormData>({
    productName: master?.name ?? '',
    sku: '',
    supplyPrice: 0,
    sellingPrice: 0,
    stock: 0,
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field: keyof ListingFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productName.trim()) {
      toast.error('상품명을 입력하세요');
      return;
    }
    if (formData.supplyPrice <= 0) {
      toast.error('공급가를 입력하세요');
      return;
    }

    try {
      setLoading(true);
      await authClient.api.post('/sellerops/listings', {
        ...formData,
        masterId: master?.id ?? null,
      });
      toast.success('리스팅이 등록되었습니다');
      navigate('/sellerops/listings');
    } catch {
      toast.error('리스팅 등록에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader
        title="리스팅 등록"
        subtitle={master ? '선택한 상품 정보가 자동으로 입력되었습니다' : '상품 정보를 직접 입력하세요'}
        actions={[
          {
            id: 'back',
            label: '검색으로',
            icon: <ArrowLeft className="w-4 h-4" />,
            onClick: () => navigate('/sellerops/listings/new'),
            variant: 'secondary' as const,
          },
        ]}
      />

      {/* 선택된 ProductMaster 정보 배지 */}
      {master && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-blue-900">{master.name}</p>
            <p className="text-blue-700 mt-0.5">
              {master.manufacturerName}
              {master.regulatoryType && ` · ${master.regulatoryType}`}
              {master.specification && ` · ${master.specification}`}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-5">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            상품명 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.productName}
            onChange={(e) => handleChange('productName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">SKU</label>
          <input
            type="text"
            value={formData.sku}
            onChange={(e) => handleChange('sku', e.target.value)}
            placeholder="재고 관리 코드"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              공급가 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.supplyPrice || ''}
              onChange={(e) => handleChange('supplyPrice', Number(e.target.value))}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">판매가</label>
            <input
              type="number"
              value={formData.sellingPrice || ''}
              onChange={(e) => handleChange('sellingPrice', Number(e.target.value))}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">초기 재고</label>
          <input
            type="number"
            value={formData.stock || ''}
            onChange={(e) => handleChange('stock', Number(e.target.value))}
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/sellerops/listings')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '등록 중...' : '리스팅 등록'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ListingCreatePage;
