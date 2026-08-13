/**
 * HubB2BCatalogPage - 플랫폼 B2B 상품 카탈로그 (KPA)
 *
 * WO-O4O-HUB-B2B-CATALOG-V1
 * WO-O4O-STORE-HUB-B2B-UI-REFINEMENT-V1: 내 약국에 추가/제외 UX 정비
 * WO-O4O-STORE-PRODUCT-STATUS-REMOVAL-V1: 매장 상품 상태 제거 — 단순 취급 목록 모델
 * WO-O4O-STORE-HUB-B2B-CANONICAL-DATATABLE-V1: DataTable + ActionBar bulk
 * WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1:
 *   GlycoPharm / K-Cosmetics 가 이미 쓰고 있던 공통 `SupplyCatalogHub` 로 편입(728줄 → config).
 *   KPA 고유 요소는 제거하지 않고 config 로만 표현한다:
 *     - accent(blue) · storeNoun('내 약국') · 공급자 로고 표시
 *     - 권장 소비자가 컬럼(additionalColumns)
 *     - 공급가 보조 라벨('서비스가' / '일반가')
 *     - 진열 링크 = canonical `/store/online-sales/settings` (라벨 '판매 설정')
 *   유통유형 탭(전체/B2B/운영자/공급 승인 대상) · 제외 확인 다이얼로그 · 결과 건수 ·
 *   ActionBar '미추가 N개' 는 공통 View 로 올라가 3 서비스가 함께 갖는다.
 *   inline style(theme.ts colors/borderRadius) 제거 — 동작·API·라우트 무변경.
 *
 * 사용 API (무변경):
 *   - getCatalog() : 플랫폼 B2B 상품 카탈로그 (neture_supplier_products PUBLIC)
 *   - applyBySupplyProductId() : 카탈로그 기반 상품 추가 (= 공급 상품 신청, ProductApproval PENDING)
 *   - cancelProductByOfferId() : 내 약국에서 상품 제외
 */

import { useMemo } from 'react';
import { SupplyCatalogHub } from '@o4o/store-ui-core';
import type { SupplyCatalogApi, SupplyCatalogGetParams } from '@o4o/store-ui-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import {
  getCatalog,
  applyBySupplyProductId,
  cancelProductByOfferId,
  type CatalogProduct,
} from '../../api/pharmacyProducts';

/** 공급가 보조 라벨: 서비스 공급가(priceGold) 적용 여부를 매장이 구분할 수 있게 유지한다. */
function getPriceSublabel(item: CatalogProduct): string | null {
  if (item.priceGold != null) return '서비스가';
  if (item.priceGeneral != null) return '일반가';
  return null;
}

export function HubB2BCatalogPage() {
  const api = useMemo<SupplyCatalogApi<CatalogProduct>>(
    () => ({
      getCatalog: async (params: SupplyCatalogGetParams) => {
        const res = await getCatalog(params);
        return { data: res.data, pagination: res.pagination };
      },
      applyBySupplyProductId,
      cancelProductByOfferId,
    }),
    [],
  );

  // KPA 고유 컬럼 — 소비자 참고가(권장 소비자가). 공급가와 액션 사이에 위치.
  const additionalColumns = useMemo<ListColumnDef<CatalogProduct>[]>(
    () => [
      {
        key: 'consumerReferencePrice',
        header: '권장 소비자가',
        width: '120px',
        align: 'right',
        render: (_v, row) => (
          <span className="text-[0.8125rem] text-slate-500">
            {row.consumerReferencePrice != null
              ? row.consumerReferencePrice.toLocaleString('ko-KR') + '원'
              : '-'}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <SupplyCatalogHub<CatalogProduct>
      api={api}
      accent="blue"
      tableId="kpa-store-hub-b2b-products"
      labels={{
        supplierLabel: '공급자',
        storeNoun: '내 약국',
        showSupplierLogo: true,
        channelManageHref: '/store/online-sales/settings',
        channelManageLabel: '판매 설정',
      }}
      additionalColumns={additionalColumns}
      renderPriceSublabel={getPriceSublabel}
    />
  );
}

export default HubB2BCatalogPage;
