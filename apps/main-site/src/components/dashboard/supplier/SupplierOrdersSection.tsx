/**
 * Supplier Orders Section
 * Can be used in dashboard (summary) or full-page mode
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Package } from 'lucide-react';
import { EmptyState } from '../../common/EmptyState';
import type { SectionMode } from './SupplierProductsSection';

export interface SupplierOrdersSectionProps {
  mode?: SectionMode;
}

export const SupplierOrdersSection: React.FC<SupplierOrdersSectionProps> = ({
  mode = 'dashboard'
}) => {
  // TODO: Fetch actual orders data in Phase 3
  const orders: any[] = [];

  if (mode === 'dashboard') {
    // Summary mode for dashboard overview
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">주문 처리</h2>
          <Link
            to="/dashboard/supplier/orders"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            전체 보기 →
          </Link>
        </div>

        {orders.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart className="w-12 h-12 text-gray-400" />}
            title="처리할 주문이 없습니다"
            description="새로운 주문이 들어오면 여기에 표시됩니다."
          />
        ) : (
          <div className="space-y-3">
            {/* TODO: Orders list preview (recent 5) */}
            <p className="text-sm text-gray-500">주문 목록 요약 (Phase 3에서 구현)</p>
          </div>
        )}
      </div>
    );
  }

  // Full-page mode
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">주문 관리</h2>
        <p className="text-sm text-gray-600 mt-1">
          판매자의 주문을 확인하고 처리합니다.
        </p>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={<Package className="w-16 h-16 text-gray-400" />}
          title="처리할 주문이 없습니다"
          description="판매자로부터 주문이 접수되면 여기에 표시됩니다."
        />
      ) : (
        <div>
          {/* TODO: Full orders list with status filters, search, pagination */}
          <p className="text-gray-500">주문 목록 및 처리 기능 (Phase 3에서 구현)</p>
        </div>
      )}
    </div>
  );
};

export default SupplierOrdersSection;
