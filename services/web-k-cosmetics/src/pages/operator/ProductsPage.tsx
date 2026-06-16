/**
 * Operator Products Page — '상품 현황' (view-only)
 *
 * WO-O4O-OPERATOR-PRODUCT-ORDER-VIEW-COMMONIZE-V1:
 *   공통 컴포넌트 @o4o/operator-core-ui · OperatorProductStatusPage 로 추출.
 *   본 파일은 serviceKey='k-cosmetics' fetch + accent/copy 만 주입하는 thin wrapper.
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
    serviceKey: 'k-cosmetics',
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
    <OperatorProductStatusPage
      fetchProducts={fetchProducts}
      config={{
        tableId: 'cosmetics-products',
        accent: {
          iconBg: 'bg-pink-100',
          iconText: 'text-pink-600',
          searchButton: 'bg-pink-600 hover:bg-pink-700',
          focusRing: 'focus:ring-pink-500',
          loaderText: 'text-pink-500',
          infoContainer: 'bg-pink-50 border-pink-200',
          infoIcon: 'text-pink-600',
          infoTitle: 'text-pink-800',
          infoBody: 'text-pink-600',
        },
      }}
    />
  );
}
