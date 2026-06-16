/**
 * Operator Products Page — '상품 현황' (view-only) — KPA-Society
 *
 * WO-O4O-KPA-OPERATOR-PRODUCT-ORDER-VIEW-INTRODUCE-V1:
 *   공통 컴포넌트 @o4o/operator-core-ui · OperatorProductStatusPage 도입.
 *   serviceKey='kpa-society' 로 플랫폼 extension `/operator/products` 호출 (조회 전용).
 *   coreApiClient(base /api/v1, kpa-prefix 없음) 사용 — 플랫폼 공통 도메인 endpoint.
 *
 * ⚠️ KPA 는 operator 상품 상세 화면이 없으므로 detailPathBase=null (행 클릭 비활성, 데드링크 방지).
 */

import { OperatorProductStatusPage } from '@o4o/operator-core-ui';
import type { ProductStatusFetcher } from '@o4o/operator-core-ui';
import { coreApiClient } from '../../api/client';

const fetchProducts: ProductStatusFetcher = async ({ page, limit, search }) => {
  const body: any = await coreApiClient.get('/operator/products', {
    page,
    limit,
    sortBy: 'createdAt',
    sortOrder: 'DESC',
    // F6 Boundary Policy: platform admin 분기에서 serviceKey 필수 (없으면 400).
    serviceKey: 'kpa-society',
    ...(search ? { search } : {}),
  });
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
        title: '상품 현황',
        description: 'KPA-Society 서비스 전체 상품 현황을 조회합니다.',
        tableId: 'kpa-operator-products',
        detailPathBase: null,
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
  );
}
