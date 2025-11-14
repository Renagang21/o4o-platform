/**
 * Supplier Products Section
 * Can be used in dashboard (summary) or full-page mode
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Package, Plus } from 'lucide-react';
import { EmptyState } from '../../common/EmptyState';

export type SectionMode = 'dashboard' | 'full-page';

export interface SupplierProductsSectionProps {
  mode?: SectionMode;
}

export const SupplierProductsSection: React.FC<SupplierProductsSectionProps> = ({
  mode = 'dashboard'
}) => {
  // TODO: Fetch actual products data in Phase 3
  const products: any[] = [];

  if (mode === 'dashboard') {
    // Summary mode for dashboard overview
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">제품 관리</h2>
          <Link
            to="/dashboard/supplier/products"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            전체 보기 →
          </Link>
        </div>

        {products.length === 0 ? (
          <EmptyState
            icon={<Package className="w-12 h-12 text-gray-400" />}
            title="등록된 제품이 없습니다"
            description="제품을 등록하여 판매를 시작하세요."
          />
        ) : (
          <div className="space-y-3">
            {/* TODO: Product list preview (top 5) */}
            <p className="text-sm text-gray-500">제품 목록 요약 (Phase 3에서 구현)</p>
          </div>
        )}
      </div>
    );
  }

  // Full-page mode
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">제품 목록</h2>
          <p className="text-sm text-gray-600 mt-1">
            공급 중인 제품을 관리합니다.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          새 제품 등록
        </button>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={<Package className="w-16 h-16 text-gray-400" />}
          title="등록된 제품이 없습니다"
          description="제품을 등록하여 드랍쉬핑 네트워크에서 판매를 시작하세요."
          action={
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
              첫 제품 등록하기
            </button>
          }
        />
      ) : (
        <div>
          {/* TODO: Full product list with filters, sorting, pagination */}
          <p className="text-gray-500">제품 목록 및 관리 기능 (Phase 3에서 구현)</p>
        </div>
      )}
    </div>
  );
};

export default SupplierProductsSection;
