/**
 * SupplierOps — 상품 등록 폼 페이지
 *
 * WO-O4O-PRODUCT-INPUT-ASSIST-V1
 *
 * ProductSearchPage에서 선택된 ProductMaster 데이터를 route state로 받아
 * SupplierProductForm에 자동 채움 값으로 전달한다.
 * route state 없이 진입하면 빈 폼을 표시한다.
 */

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import { SupplierProductForm } from '../../../components/vendor/SupplierProductForm';
import type { ProductMasterSearchResult } from '../../../api/product-library.api';

interface LocationState {
  master?: ProductMasterSearchResult;
}

const ProductCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { master } = (location.state as LocationState) ?? {};

  // ProductMaster 선택값을 VendorProduct 형태로 변환 (name만 pre-fill)
  const prefillProduct = master
    ? ({
        id: '',
        name: master.name,
        sku: '',
        description: '',
        categories: [],
        supplyPrice: 0,
        sellPrice: 0,
        marginRate: 30,
        affiliateRate: 5,
        adminFeeRate: 3,
        supplierStock: 0,
        lowStockThreshold: 10,
        images: [],
        supplierId: '',
        approvalStatus: 'pending' as const,
        status: 'draft' as const,
      } as any)
    : undefined;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader
        title={master ? '상품 등록' : '신규 상품 등록'}
        subtitle={master ? '선택한 상품 정보가 자동으로 입력되었습니다' : '상품 정보를 직접 입력하세요'}
        actions={[
          {
            id: 'back',
            label: '검색으로',
            icon: <ArrowLeft className="w-4 h-4" />,
            onClick: () => navigate('/supplierops/products/new'),
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

      <SupplierProductForm
        product={prefillProduct}
        onSuccess={() => navigate('/supplierops/products')}
        onCancel={() => navigate('/supplierops/products/new')}
      />
    </div>
  );
};

export default ProductCreatePage;
