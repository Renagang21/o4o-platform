/**
 * LocalProductsPage (약국 경영자) — 매장 자체 상품
 *
 * WO-PHARMACY-HUB-STORE-HANDLED-PRODUCTS-V1
 *
 * O4O 와 무관하게 약국이 직접 등록·관리하는 상품이다.
 *   - 공급 상품(/store-owner/products, B2B 구매 대상) 과 다른 축
 *   - 매장 경영활용 제품(/store-owner/handled-products, O4O 제품 취급) 과도 다른 축
 *
 * 화면은 공통 `StoreLocalProductsManager`(@o4o/store-ui-core)를 그대로 쓴다 —
 * Pharmacy-Hub 는 API adapter 와 라벨·액션만 주입한다(UI 복제 0).
 * 삭제는 **비활성화(soft delete)** 다. 물리 삭제 경로는 만들지 않는다.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Languages } from 'lucide-react';
import { StoreLocalProductsManager } from '@o4o/store-ui-core';
import type { StoreLocalProductsApi, StoreLocalProductsExtraColumn } from '@o4o/store-ui-core';
// WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §8 (#76):
//   상품 목록이 다국어 상품 콘텐츠의 진입점이다 (KPA 와 같은 축).
import {
  getMlcSummaryMap,
  type MlcSummaryItem,
} from '../../lib/api/pharmacyHubMultilingualContents';
import {
  fetchLocalProducts,
  createLocalProduct,
  updateLocalProduct,
  deleteLocalProduct,
  type LocalProductsStoreConnection,
} from '../../lib/api/pharmacyHubLocalProducts';
import { StoreConnectionNotice } from '../../components/store-owner/StoreConnectionNotice';

const localProductsApi: StoreLocalProductsApi = {
  fetchLocalProducts: async (params) => {
    const page = await fetchLocalProducts(params);
    return { items: page.items, total: page.total };
  },
  createLocalProduct,
  updateLocalProduct,
  deleteLocalProduct,
};

export default function StoreOwnerLocalProductsPage() {
  const navigate = useNavigate();
  const [connection, setConnection] = useState<LocalProductsStoreConnection | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 상품별 다국어 콘텐츠 연결 요약 (목록 1회 조회 — 행마다 호출하지 않는다)
  const [mlcSummary, setMlcSummary] = useState<Map<string, MlcSummaryItem>>(new Map());

  // 매장 연결 상태를 먼저 확인한다. 미연결·다중 상태에서 등록·수정을 시도하면
  // 서버가 409 로 막으므로, 화면 단에서 안내만 하고 편집 UI 를 열지 않는다.
  useEffect(() => {
    let cancelled = false;
    fetchLocalProducts({ page: 1, limit: 1 })
      .then((page) => {
        if (!cancelled) setConnection(page.storeConnection);
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message || '매장 정보를 확인하지 못했습니다.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 다국어 요약은 매장이 연결된 뒤에만 의미가 있다. 실패해도 목록 자체는 계속 쓴다.
  useEffect(() => {
    if (connection?.status !== 'connected') return;
    let cancelled = false;
    getMlcSummaryMap('local')
      .then((map) => {
        if (!cancelled) setMlcSummary(map);
      })
      .catch(() => {
        /* 배지 없이 목록만 렌더 */
      });
    return () => {
      cancelled = true;
    };
  }, [connection?.status]);

  const extraColumns = useMemo<Array<StoreLocalProductsExtraColumn<any>>>(
    () => [
      {
        key: 'multilingual',
        header: '다국어',
        width: 170,
        render: (product: any) => {
          const summary = mlcSummary.get(product.id);
          return (
            <button
              type="button"
              onClick={() => navigate(`/store-owner/products/multilingual/local/${product.id}`)}
              className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-700 hover:bg-indigo-100"
              title={summary ? `언어 ${summary.localeCount}개 (${summary.locales.join(' · ')})` : '다국어 안내를 작성합니다'}
            >
              <Languages className="h-3 w-3" />
              {summary && summary.localeCount > 0 ? `다국어 ${summary.localeCount}` : '다국어 안내'}
            </button>
          );
        },
      },
    ],
    [mlcSummary, navigate],
  );

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm text-gray-500">불러오는 중…</p>
      </div>
    );
  }

  if (connection.status !== 'connected') {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="mb-1 text-xl font-bold">매장 자체 상품</h1>
        <p className="mb-6 text-sm text-gray-500">
          O4O 주문과 무관하게 매장에서 직접 등록·진열하는 상품입니다.
        </p>
        <StoreConnectionNotice connection={connection} />
        <p className="mt-6 text-sm">
          <Link to="/store-owner" className="text-gray-500 underline">
            약국 경영자 홈
          </Link>
        </p>
      </div>
    );
  }

  return (
    <StoreLocalProductsManager
      api={localProductsApi}
      labels={{
        title: '매장 자체 상품',
        description:
          'O4O 주문과 무관하게 약국에서 직접 등록·진열하는 상품입니다. 주문·결제와 연결되지 않습니다.',
        categoryPlaceholder: '예: 건강기능식품, 의약외품',
      }}
      // Pharmacy-Hub 에는 `/store/*` 후속 화면이 없다 — dead link 대신 버튼을 숨긴다.
      actions={{ onTabletDisplays: null, onMarketingAssets: null, onCreatePop: null }}
      extraColumns={extraColumns}
    />
  );
}
