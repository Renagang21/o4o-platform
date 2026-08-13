/**
 * ProductsPage (약국 경영자) — Pharmacy-Hub 제공 상품 목록
 *
 * WO-PHARMACY-HUB-SUPPLIER-PRODUCT-OFFER-DELIVERY-V1 §6-E (원본)
 * WO-O4O-STORE-HUB-SUPPLY-PRODUCT-EXPLORER-COMMONIZATION-V1:
 *   목록 · 검색 · 필터 · 페이지네이션 · loading/empty/error 를 공통 Core
 *   (@o4o/store-ui-core `useSupplyProductList` + `SupplyProductExplorer`) 로 이관.
 *   본 파일은 Pharmacy-Hub API adapter + 컬럼 + 상세 진입만 주입한다.
 *
 * 업무 경계(변경 없음):
 *   Pharmacy-Hub 는 탐색 → 상세 → 장바구니 → 주문 흐름이다.
 *   "내 매장에 추가"(공급 상품 신청 = ProductApproval PENDING)는 이 서비스의 흐름이 아니며 도입하지 않는다.
 *   담기 · 주문 · 결제는 상세(`/store-owner/products/:offerId`) 이후 단계에서 처리한다 (이번 범위 밖).
 */

import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  useSupplyProductList,
  SupplyProductExplorer,
  type SupplyProductListQuery,
  type SupplyProductExplorerColumn,
} from '@o4o/store-ui-core';
import { api } from '../../lib/apiClient';
import { BRAND } from '../../config/service';

interface ProductRow extends Record<string, any> {
  offerId: string;
  masterId: string;
  name: string | null;
  barcode: string | null;
  brandName: string | null;
  manufacturerName: string | null;
  regulatoryType: string | null;
  isRegulated: boolean;
  categoryName: string | null;
  supplierId: string;
  supplierName: string;
  priceGeneral: number;
  pharmacyHubUnitPrice: number | null;
  effectiveUnitPrice: number;
  imageUrl: string | null;
}

/** 상품 분류 = 규제 유형 축 (약국 맥락에서 의미 있는 분류) */
const REGULATORY_TABS = [
  { key: '', label: '전체' },
  { key: 'DRUG', label: '의약품' },
  { key: 'HEALTH_FUNCTIONAL', label: '건강기능식품' },
  { key: 'QUASI_DRUG', label: '의약외품' },
  { key: 'COSMETIC', label: '화장품' },
  { key: 'GENERAL', label: '일반' },
];

const PAGE_LIMIT = 20;

const won = (v: number | null | undefined) =>
  typeof v === 'number' ? `${v.toLocaleString('ko-KR')}원` : '-';

export default function StoreOwnerProductsPage() {
  // 서비스 API → 공통 Core query 어댑터. endpoint · 파라미터 · 응답 계약은 변경하지 않는다.
  const fetchPage = useCallback(
    async ({ page, limit, tab, search, filters }: SupplyProductListQuery) => {
      const res = await api.get('/pharmacy-hub/store-owner/products', {
        params: {
          q: search || undefined,
          regulatoryType: tab || undefined,
          supplierId: filters.supplierId || undefined,
          page,
          limit,
        },
      });
      return {
        items: (res.data?.data?.items ?? []) as ProductRow[],
        total: res.data?.data?.pagination?.total ?? 0,
      };
    },
    [],
  );

  const list = useSupplyProductList<ProductRow>({
    fetchPage,
    limit: PAGE_LIMIT,
    initialTab: '',
    initialFilters: { supplierId: '' },
    resolveErrorMessage: (err) =>
      (err as { response?: { status?: number } })?.response?.status === 403
        ? `${BRAND.name} 약국 경영자 승인이 완료된 계정만 상품을 조회할 수 있습니다.`
        : '상품 목록을 불러오지 못했습니다.',
  });

  const columns: SupplyProductExplorerColumn<ProductRow>[] = [
    {
      key: 'name',
      header: '상품',
      render: (_v, row) => (
        <div className="flex flex-col gap-0.5 min-w-0">
          <Link
            to={`/store-owner/products/${row.offerId}`}
            className="font-medium text-primary-600 underline"
          >
            {row.name ?? '-'}
          </Link>
          <span className="text-xs text-gray-400">
            {row.manufacturerName ?? '-'} · {row.barcode ?? '바코드 없음'}
          </span>
        </div>
      ),
    },
    {
      key: 'categoryName',
      header: '분류',
      width: '160px',
      render: (_v, row) => (
        <span className="text-xs">
          {row.categoryName ?? row.regulatoryType ?? '-'}
          {row.isRegulated && (
            <span className="ml-1 rounded bg-amber-50 px-1 text-amber-700">규제</span>
          )}
        </span>
      ),
    },
    {
      key: 'supplierName',
      header: '공급자',
      width: '150px',
      render: (_v, row) => <span className="text-xs text-gray-600">{row.supplierName}</span>,
    },
    {
      key: 'effectiveUnitPrice',
      header: '공급가',
      width: '140px',
      align: 'right',
      render: (_v, row) => (
        <div className="flex flex-col items-end">
          <span className="text-[0.8125rem] font-semibold text-slate-900">
            {won(row.effectiveUnitPrice)}
          </span>
          {row.pharmacyHubUnitPrice != null && (
            <span className="text-xs text-gray-400">서비스 공급가 적용</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <SupplyProductExplorer<ProductRow>
        list={list}
        columns={columns}
        rowKey="offerId"
        tableId="pharmacy-hub-store-owner-products"
        title={`${BRAND.name} 공급 상품`}
        description={`공급자가 ${BRAND.name} 에 제공한 상품입니다. 상세에서 장바구니에 담아 주문할 수 있습니다.`}
        tabs={REGULATORY_TABS}
        selectFilters={[
          {
            key: 'supplierId',
            allLabel: '공급자 전체',
            options: (items) =>
              Array.from(new Map(items.map((it) => [it.supplierId, it.supplierName])).entries()).map(
                ([value, label]) => ({ value, label }),
              ),
          },
        ]}
        searchPlaceholder="상품명 · 바코드 · 제조사"
        emptyMessage={`아직 ${BRAND.name} 에 제공된 상품이 없습니다.`}
        emptyFilteredMessage="조건에 맞는 상품이 없습니다."
        footer={
          <p className="mt-6 text-sm">
            <Link to="/store-owner" className="text-gray-500 underline">
              약국 경영자 홈
            </Link>
          </p>
        }
      />
    </div>
  );
}
