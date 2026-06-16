/**
 * Operator Products Page — '상품 현황' (view-only)
 *
 * WO-O4O-OPERATOR-PRODUCT-ORDER-VIEW-COMMONIZE-V1:
 *   공통 컴포넌트 @o4o/operator-core-ui · OperatorProductStatusPage 로 추출.
 *   본 파일은 serviceKey='glycopharm' fetch + accent/copy 만 주입하는 thin wrapper.
 *
 * /api/v1/operator/products API (Extension Layer) · product_masters 기반 (조회 전용).
 */

import { OperatorProductStatusPage } from '@o4o/operator-core-ui';
import type { ProductStatusFetcher } from '@o4o/operator-core-ui';
import { api } from '../../lib/apiClient';

const fetchProducts: ProductStatusFetcher = async ({ page, limit, search }) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sortBy: 'createdAt',
    sortOrder: 'DESC',
    // WO-O4O-OPERATOR-CONSOLE-SERVICEKEY-ALIGNMENT-V1:
    // F6 Boundary Policy platform admin 분기에서 serviceKey 가 없으면 400 — 명시적 전달.
    serviceKey: 'glycopharm',
  });
  if (search) params.set('search', search);

  const res = await api.get(`/operator/products?${params}`);
  const body = res.data;
  return {
    products: body?.products ?? [],
    stats: body?.stats ?? { totalProducts: 0, withImage: 0, withSupplier: 0, duplicateBarcodes: 0 },
    pagination: body?.pagination ?? { page: 1, limit, total: 0, totalPages: 1 },
  };
};

export default function ProductsPage() {
  return (
    <div className="p-6">
      <OperatorProductStatusPage
        fetchProducts={fetchProducts}
        config={{
          tableId: 'glycopharm-operator-products',
          accent: {
            iconBg: 'bg-primary-100',
            iconText: 'text-primary-600',
            searchButton: 'bg-primary-500 hover:bg-primary-600',
            focusRing: 'focus:ring-primary-500',
            loaderText: 'text-primary-600',
            infoContainer: 'bg-blue-50 border-blue-200',
            infoIcon: 'text-blue-600',
            infoTitle: 'text-blue-800',
            infoBody: 'text-blue-600',
          },
        }}
      />
    </div>
  );
}
